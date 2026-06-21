// Recommendation engine — server-only.
import type { SupabaseClient } from "@supabase/supabase-js";

interface UserRating {
  tmdb_id: number;
  media_type: "movie" | "tv";
  rating: number;
  weight: number;
  source: string;
}

export type RecBadge = "trending" | "highly_rated" | "classic" | "most_watched" | null;

export interface ScoredRecommendation {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  year: string;
  vote_average: number;
  vote_count: number;
  overview: string;
  match: number; // 0-100
  providers: { provider_id: number; provider_name: string }[];
  genres: string[];
  trailerKey: string | null; // YouTube key
  tmdbWatchUrl: string; // canonical fallback
  badge: RecBadge;
}

// TMDB genre IDs
const KIDS_GENRES = new Set<number>([16 /* Animation */, 10751 /* Family */, 10762 /* Kids */]);
// Adult-leaning genres (movie + tv ids)
const ADULT_GENRES = new Set<number>([
  80 /* Crime */, 53 /* Thriller */, 9648 /* Mystery */, 18 /* Drama */,
  878 /* Sci-Fi (movie) */, 10765 /* Sci-Fi & Fantasy (tv) */,
  28 /* Action (movie) */, 10759 /* Action & Adventure (tv) */,
  99 /* Documentary */,
]);

// Premium / iconic titles — boost when surfaced
const PREMIUM_IDS = new Set<string>([
  "tv:1396",   // Breaking Bad
  "tv:70523",  // Dark
  "tv:87108",  // Chernobyl
  "tv:100088", // The Last of Us
  "tv:95396",  // Severance
  "tv:104254", // The Bear
  "movie:157336", // Interstellar
  "movie:872585", // Oppenheimer
  "movie:278",    // Shawshank Redemption
  "movie:155",    // The Dark Knight
  "movie:438631", // Dune
  "tv:1399",   // Game of Thrones
  "tv:46648",  // True Detective
  "tv:42009",  // Mindhunter
  "tv:1398",   // The Sopranos
]);

export async function buildRecommendations(opts: {
  userId: string;
  supabase: SupabaseClient;
  mediaType: "movie" | "tv" | "all";
  limit: number;
  surprise: boolean;
}): Promise<ScoredRecommendation[]> {
  const { supabase, userId, mediaType, limit, surprise } = opts;
  const { getSimilar, getDetails, trending } = await import("./tmdb.server");

  // Load user signals + admin algorithm settings
  const [{ data: ratingsData }, { data: prefsData }, { data: interactionsData }, { data: historyData }, { data: settingsData }] = await Promise.all([
    supabase.from("ratings").select("tmdb_id,media_type,rating,weight,source").eq("user_id", userId),
    supabase.from("user_preferences").select("selected_providers").eq("user_id", userId).maybeSingle(),
    supabase.from("interactions").select("tmdb_id,media_type,action").eq("user_id", userId),
    supabase.from("recommendation_history").select("tmdb_id,media_type").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
    supabase.from("admin_settings").select("key,value"),
  ]);

  const ratings: UserRating[] = (ratingsData || []) as UserRating[];
  const providerIds: number[] = (prefsData?.selected_providers as number[]) || [];
  const interactions = (interactionsData || []) as { tmdb_id: number; media_type: "movie" | "tv"; action: string }[];
  const history = (historyData || []) as { tmdb_id: number; media_type: "movie" | "tv" }[];

  const settingsMap = new Map<string, any>((settingsData || []).map((r: any) => [r.key, r.value]));
  const numSetting = (k: string, d: number) => {
    const v = settingsMap.get(k);
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : d;
  };
  const minRatingsForRecs = numSetting("min_ratings_for_recs", 3);
  const weightLike = numSetting("weight_like", 1.0);
  const weightWatched = numSetting("weight_watched", 1.5);
  const weightDislike = numSetting("weight_dislike", -1.0);
  // Quality thresholds (admin-tunable)
  const minVoteAverage = numSetting("min_vote_average", 7.0);
  const minVoteCount = numSetting("min_vote_count", 300);

  // Exclusions
  const exclude = new Set<string>();
  for (const r of ratings) exclude.add(`${r.media_type}:${r.tmdb_id}`);
  for (const i of interactions) {
    if (i.action !== "skip") exclude.add(`${i.media_type}:${i.tmdb_id}`);
  }
  history.slice(0, 30).forEach((h) => exclude.add(`${h.media_type}:${h.tmdb_id}`));

  const positiveSignals =
    ratings.filter((r) => r.rating >= 6).length +
    interactions.filter((i) => i.action === "like" || i.action === "watched").length;
  const hasEnoughSignals = positiveSignals >= minRatingsForRecs;

  // Detect user genre affinity from positive seeds (we need details for that — approximate via fetched candidate genres later).
  // We compute an explicit kids-interest flag from any liked/highly-rated seed having kids genres.
  // To keep this lightweight, we infer affinity from the genres present on the items returned by getSimilar (they ship genre_ids).

  // Pick top-rated seeds
  const seeds = ratings
    .filter((r) => r.rating >= 6)
    .filter((r) => (mediaType === "all" ? true : r.media_type === mediaType))
    .sort((a, b) => b.rating * Number(b.weight) - a.rating * Number(a.weight))
    .slice(0, 8);

  const effectiveSeeds = seeds.length > 0 ? seeds : ratings
    .filter((r) => r.rating >= 6)
    .sort((a, b) => b.rating * Number(b.weight) - a.rating * Number(a.weight))
    .slice(0, 8);

  type InteractionSeed = { tmdb_id: number; media_type: "movie" | "tv"; w: number };
  const interactionSeeds: InteractionSeed[] = [];
  for (const i of interactions) {
    if (mediaType !== "all" && i.media_type !== mediaType) continue;
    if (i.action === "like") interactionSeeds.push({ ...i, w: weightLike });
    else if (i.action === "watched") interactionSeeds.push({ ...i, w: weightWatched });
    else if (i.action === "dislike") interactionSeeds.push({ ...i, w: weightDislike });
  }
  const cappedInteractionSeeds = interactionSeeds.slice(0, 12);

  // Candidate map: stores accumulated compatibility score + the raw MediaItem
  const candidates = new Map<string, { item: any; compat: number; type: "movie" | "tv" }>();

  // Trending boost set (and cold-start fallback)
  let trendingItems: any[] = [];
  try {
    trendingItems = await trending(mediaType === "all" ? "all" : mediaType, 1);
  } catch { trendingItems = []; }
  const trendingSet = new Set<string>(trendingItems.map((t) => `${t.media_type}:${t.id}`));

  // Track genre interest from positive seeds' resulting candidate pool
  const userGenreCount = new Map<number, number>();
  const bumpGenres = (ids: number[], w = 1) => {
    for (const g of ids) userGenreCount.set(g, (userGenreCount.get(g) || 0) + w);
  };

  if (hasEnoughSignals) {
    const seedResults = await Promise.all(
      effectiveSeeds.map(async (s) => {
        try { return { seed: s, items: await getSimilar(s.media_type, s.tmdb_id, 1) }; }
        catch { return { seed: s, items: [] }; }
      }),
    );
    for (const { seed, items } of seedResults) {
      const seedScore = (Number(seed.rating) / 10) * Number(seed.weight);
      bumpGenres(items.flatMap((i) => i.genre_ids || []).slice(0, 20), 0.5);
      items.forEach((item, idx) => {
        if (mediaType !== "all" && item.media_type !== mediaType) return;
        const key = `${item.media_type}:${item.id}`;
        if (exclude.has(key)) return;
        const positional = 1 - idx / Math.max(items.length, 1);
        const add = seedScore * (0.7 + 0.3 * positional);
        const ex = candidates.get(key);
        if (ex) ex.compat += add;
        else candidates.set(key, { item, compat: add, type: item.media_type });
      });
    }

    const interactionResults = await Promise.all(
      cappedInteractionSeeds.map(async (s) => {
        try { return { seed: s, items: await getSimilar(s.media_type, s.tmdb_id, 1) }; }
        catch { return { seed: s, items: [] }; }
      }),
    );
    for (const { seed, items } of interactionResults) {
      if (seed.w > 0) bumpGenres(items.flatMap((i) => i.genre_ids || []).slice(0, 15), seed.w);
      items.forEach((item, idx) => {
        if (mediaType !== "all" && item.media_type !== mediaType) return;
        const key = `${item.media_type}:${item.id}`;
        if (exclude.has(key)) return;
        const positional = 1 - idx / Math.max(items.length, 1);
        const add = seed.w * (0.6 + 0.4 * positional);
        const ex = candidates.get(key);
        if (ex) ex.compat += add;
        else candidates.set(key, { item, compat: add, type: item.media_type });
      });
    }

    for (const [k, v] of candidates) {
      if (v.compat <= 0) candidates.delete(k);
    }
  }

  // Cold start — seed from trending
  if (candidates.size === 0) {
    trendingItems.forEach((item, idx) => {
      const key = `${item.media_type}:${item.id}`;
      if (exclude.has(key)) return;
      candidates.set(key, { item, compat: 0.5 + (1 - idx / Math.max(trendingItems.length, 1)) * 0.5, type: item.media_type });
    });
  }

  // Profile: kids-interested?
  const kidsInterest =
    Array.from(userGenreCount.entries()).some(([g, c]) => KIDS_GENRES.has(g) && c >= 3);
  // Adult profile: clear majority of positive signals in adult-leaning genres
  const adultGenreScore = Array.from(userGenreCount.entries())
    .filter(([g]) => ADULT_GENRES.has(g))
    .reduce((a, [, c]) => a + c, 0);
  const totalGenreScore = Array.from(userGenreCount.values()).reduce((a, c) => a + c, 0) || 1;
  const adultProfile = adultGenreScore / totalGenreScore >= 0.5;

  // Normalize bases
  const maxCompat = Math.max(...Array.from(candidates.values()).map((c) => c.compat), 0.0001);

  // Build initial scored list using item fields (vote_average, vote_count, popularity, genre_ids)
  type Scored = { item: any; type: "movie" | "tv"; score: number; badge: RecBadge };
  const scored: Scored[] = [];
  for (const { item, compat, type } of candidates.values()) {
    const va = Number(item.vote_average ?? 0);
    const vc = Number(item.vote_count ?? 0);
    const pop = Number(item.popularity ?? 0);
    const ids: number[] = item.genre_ids || [];

    // Hard quality filter
    if (va < minVoteAverage) continue;
    if (vc < minVoteCount) continue;

    // Kids penalty
    const isKids = ids.some((g) => KIDS_GENRES.has(g));
    let kidsMultiplier = 1;
    if (isKids && !kidsInterest) kidsMultiplier = adultProfile ? 0.1 : 0.35;

    // Adult-genre small boost when adult profile
    const adultBoost = adultProfile && ids.some((g) => ADULT_GENRES.has(g)) ? 1.1 : 1;

    // Premium boost
    const key = `${type}:${item.id}`;
    const premiumBoost = PREMIUM_IDS.has(key) ? 1.25 : 1;

    // Normalized components (0..1)
    const compatN = compat / maxCompat;
    const ratingN = Math.max(0, Math.min(1, (va - 5) / 5)); // 5→0, 10→1
    const voteCountN = Math.min(1, Math.log10(1 + vc) / 6); // 1M ≈ 1
    const popN = Math.min(1, pop / 200);
    const trendingN = trendingSet.has(key) ? 1 : 0;

    const base =
      0.40 * compatN +
      0.25 * ratingN +
      0.10 * voteCountN +
      0.20 * popN +
      0.05 * trendingN;

    const score = base * kidsMultiplier * adultBoost * premiumBoost;

    // Badge selection (priority: classic > most_watched > highly_rated > trending)
    let badge: RecBadge = null;
    if (va >= 8.3 && vc >= 100000) badge = "classic";
    else if (vc >= 200000) badge = "most_watched";
    else if (va >= 8.5) badge = "highly_rated";
    else if (trendingSet.has(key)) badge = "trending";

    scored.push({ item, type, score, badge });
  }

  // Sort
  scored.sort((a, b) => b.score - a.score);
  let pool = scored;
  if (surprise) {
    const top = pool.slice(0, Math.min(40, pool.length));
    pool = top.sort(() => Math.random() - 0.5);
  }

  // Recompute maxScore for percentage display
  const maxScore = pool[0]?.score || 1;

  const final: ScoredRecommendation[] = [];
  for (const c of pool) {
    if (final.length >= limit) break;
    try {
      const details = await getDetails(c.type, c.item.id);
      const brProviders = (details["watch/providers"]?.results?.BR?.flatrate || []) as any[];
      if (providerIds.length > 0) {
        const ok = brProviders.some((p) => providerIds.includes(p.provider_id));
        if (!ok) continue;
      }
      const matchPct = Math.max(50, Math.min(99, Math.round((c.score / maxScore) * 95 + 4)));
      const videos = (details.videos?.results || []) as any[];
      const yt = videos.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official)
        ?? videos.find((v) => v.site === "YouTube" && v.type === "Trailer")
        ?? videos.find((v) => v.site === "YouTube");
      final.push({
        id: c.item.id,
        media_type: c.type,
        title: details.title || details.name || c.item.title,
        poster_path: details.poster_path ?? c.item.poster_path,
        backdrop_path: details.backdrop_path ?? c.item.backdrop_path,
        year: (details.release_date || details.first_air_date || c.item.year || "").slice(0, 4),
        vote_average: Number(details.vote_average ?? c.item.vote_average),
        vote_count: Number(details.vote_count ?? c.item.vote_count ?? 0),
        overview: details.overview || c.item.overview,
        match: matchPct,
        providers: brProviders.map((p) => ({ provider_id: p.provider_id, provider_name: p.provider_name })),
        genres: (details.genres || []).map((g: any) => g.name),
        trailerKey: yt?.key ?? null,
        tmdbWatchUrl: `https://www.themoviedb.org/${c.type}/${c.item.id}/watch?locale=BR`,
        badge: c.badge,
      });
    } catch {
      // skip
    }
  }

  if (final.length > 0) {
    await supabase.from("recommendation_history").insert(
      final.map((f) => ({ user_id: userId, tmdb_id: f.id, media_type: f.media_type })),
    );
  }

  return final;
}
