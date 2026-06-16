// Recommendation engine — server-only.
import type { SupabaseClient } from "@supabase/supabase-js";

interface UserRating {
  tmdb_id: number;
  media_type: "movie" | "tv";
  rating: number;
  weight: number;
  source: string;
}

export interface ScoredRecommendation {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  year: string;
  vote_average: number;
  overview: string;
  match: number; // 0-100
  providers: { provider_id: number; provider_name: string }[];
  genres: string[];
}

export async function buildRecommendations(opts: {
  userId: string;
  supabase: SupabaseClient;
  mediaType: "movie" | "tv" | "all";
  limit: number;
  surprise: boolean;
}): Promise<ScoredRecommendation[]> {
  const { supabase, userId, mediaType, limit, surprise } = opts;
  const { getSimilar, getDetails } = await import("./tmdb.server");

  // Load user signals
  const [{ data: ratingsData }, { data: prefsData }, { data: interactionsData }, { data: historyData }] = await Promise.all([
    supabase.from("ratings").select("tmdb_id,media_type,rating,weight,source").eq("user_id", userId),
    supabase.from("user_preferences").select("selected_providers").eq("user_id", userId).maybeSingle(),
    supabase.from("interactions").select("tmdb_id,media_type,action").eq("user_id", userId),
    supabase.from("recommendation_history").select("tmdb_id,media_type").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
  ]);

  const ratings: UserRating[] = (ratingsData || []) as UserRating[];
  const providerIds: number[] = (prefsData?.selected_providers as number[]) || [];
  const interactions = (interactionsData || []) as { tmdb_id: number; media_type: "movie" | "tv"; action: string }[];
  const history = (historyData || []) as { tmdb_id: number; media_type: "movie" | "tv" }[];

  // Build exclusion set
  const exclude = new Set<string>();
  for (const r of ratings) exclude.add(`${r.media_type}:${r.tmdb_id}`);
  for (const i of interactions) {
    // Block any content the user already engaged with — only "skip" remains eligible to resurface.
    if (i.action !== "skip") exclude.add(`${i.media_type}:${i.tmdb_id}`);
  }
  // Recent history dedupe (last 30)
  history.slice(0, 30).forEach((h) => exclude.add(`${h.media_type}:${h.tmdb_id}`));

  // Pick top-rated seeds (rating >= 7), weighted by rating * weight
  const seeds = ratings
    .filter((r) => r.rating >= 6)
    .filter((r) => (mediaType === "all" ? true : r.media_type === mediaType))
    .sort((a, b) => b.rating * Number(b.weight) - a.rating * Number(a.weight))
    .slice(0, 8);

  // If user has no rated items in this media type, fall back to all
  const effectiveSeeds = seeds.length > 0 ? seeds : ratings
    .filter((r) => r.rating >= 6)
    .sort((a, b) => b.rating * Number(b.weight) - a.rating * Number(a.weight))
    .slice(0, 8);

  // Score map
  const scores = new Map<string, { item: any; score: number; type: "movie" | "tv" }>();

  // For each seed, fetch similar/recommended and accumulate score
  const seedResults = await Promise.all(
    effectiveSeeds.map(async (s) => {
      try {
        const sim = await getSimilar(s.media_type, s.tmdb_id, 1);
        return { seed: s, items: sim };
      } catch {
        return { seed: s, items: [] };
      }
    }),
  );

  for (const { seed, items } of seedResults) {
    const seedScore = (Number(seed.rating) / 10) * Number(seed.weight);
    items.forEach((item, idx) => {
      if (mediaType !== "all" && item.media_type !== mediaType) return;
      const key = `${item.media_type}:${item.id}`;
      if (exclude.has(key)) return;
      const positional = 1 - idx / Math.max(items.length, 1);
      const popularity = Math.min(item.vote_average / 10, 1);
      const add = seedScore * (0.6 + 0.3 * positional + 0.1 * popularity);
      const existing = scores.get(key);
      if (existing) existing.score += add;
      else scores.set(key, { item, score: add, type: item.media_type });
    });
  }

  // If no seeds (cold start), fall back to trending
  if (scores.size === 0) {
    const { trending } = await import("./tmdb.server");
    const t = await trending(mediaType === "all" ? "all" : mediaType, 1);
    t.forEach((item, idx) => {
      const key = `${item.media_type}:${item.id}`;
      if (exclude.has(key)) return;
      scores.set(key, { item, score: 0.5 + (1 - idx / t.length) * 0.5, type: item.media_type });
    });
  }

  // Sort candidates by score
  let candidates = Array.from(scores.values()).sort((a, b) => b.score - a.score);

  if (surprise) {
    // Take a random sample from top half
    const top = candidates.slice(0, Math.min(40, candidates.length));
    candidates = top.sort(() => Math.random() - 0.5);
  }

  // Filter by selected streaming providers (BR)
  const final: ScoredRecommendation[] = [];
  const maxScore = candidates[0]?.score || 1;

  for (const c of candidates) {
    if (final.length >= limit) break;
    try {
      const details = await getDetails(c.type, c.item.id);
      const brProviders = (details["watch/providers"]?.results?.BR?.flatrate || []) as any[];
      if (providerIds.length > 0) {
        const ok = brProviders.some((p) => providerIds.includes(p.provider_id));
        if (!ok) continue;
      }
      const matchPct = Math.max(50, Math.min(99, Math.round((c.score / maxScore) * 95 + 4)));
      final.push({
        id: c.item.id,
        media_type: c.type,
        title: details.title || details.name || c.item.title,
        poster_path: details.poster_path ?? c.item.poster_path,
        backdrop_path: details.backdrop_path ?? c.item.backdrop_path,
        year: (details.release_date || details.first_air_date || c.item.year || "").slice(0, 4),
        vote_average: Number(details.vote_average ?? c.item.vote_average),
        overview: details.overview || c.item.overview,
        match: matchPct,
        providers: brProviders.map((p) => ({ provider_id: p.provider_id, provider_name: p.provider_name })),
        genres: (details.genres || []).map((g: any) => g.name),
      });
    } catch {
      // skip
    }
  }

  // Persist into history (best-effort)
  if (final.length > 0) {
    await supabase.from("recommendation_history").insert(
      final.map((f) => ({ user_id: userId, tmdb_id: f.id, media_type: f.media_type })),
    );
  }

  return final;
}
