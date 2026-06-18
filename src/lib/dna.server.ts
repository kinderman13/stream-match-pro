// Server-only DNA analysis. Never import from client code.
import type { SupabaseClient } from "@supabase/supabase-js";

export interface CinematicDna {
  unlocked: boolean;
  reason?: string;
  required?: { ratings: number; likes: number; watched: number };
  current?: { ratings: number; likes: number; watched: number };
  profile?: {
    title: string;
    emoji: string;
    description: string;
  };
  genres?: { name: string; pct: number }[];
  stats?: {
    moviesRated: number;
    seriesRated: number;
    averageRating: number;
    favoriteGenre: string;
    favoriteProvider: string;
    activeDays: number;
    total: number;
  };
  trophies?: { emoji: string; name: string }[];
  providerCompat?: { name: string; pct: number }[];
  ideal?: {
    id: number;
    media_type: "movie" | "tv";
    title: string;
    poster_path: string | null;
    year: string;
  }[];
}

interface GenreCount {
  id: number;
  name: string;
  weighted: number;
}

const PROFILE_MAP: { genres: string[]; emoji: string; title: string; description: string }[] = [
  { genres: ["Mistério", "Mystery", "Suspense", "Thriller"], emoji: "🕵️", title: "Mestre do Mistério",
    description: "Você prefere histórias inteligentes, reviravoltas inesperadas e narrativas que desafiam sua percepção da realidade. Seu perfil indica forte interesse por mistérios complexos e suspense de alta qualidade." },
  { genres: ["Ficção científica", "Science Fiction", "Sci-Fi & Fantasy"], emoji: "🚀", title: "Explorador de Universos",
    description: "Mundos paralelos, viagens interestelares e tecnologia que dobra a realidade — é isso que move você. Você busca histórias que ampliam horizontes e questionam o futuro." },
  { genres: ["Ação", "Action", "Action & Adventure"], emoji: "⚔️", title: "Guerreiro Épico",
    description: "Adrenalina, conflitos grandiosos e protagonistas que encaram o impossível: você quer ser arrastado pela energia das telas." },
  { genres: ["Drama"], emoji: "🧠", title: "Estrategista Intelectual",
    description: "Personagens densos, dilemas morais e roteiros que respiram realismo. Você valoriza profundidade acima de espetáculo." },
  { genres: ["Romance"], emoji: "❤️", title: "Romântico Incorrigível",
    description: "Histórias de afeto, encontros improváveis e finais que tocam o coração. Você acredita no poder transformador das emoções." },
  { genres: ["Terror", "Horror"], emoji: "😱", title: "Caçador de Suspense",
    description: "Quanto mais o coração acelera, melhor. Você adora atmosferas densas, sustos bem construídos e o desconhecido." },
  { genres: ["Animação", "Animation"], emoji: "🎨", title: "Sonhador Animado",
    description: "Universos visuais, criatividade sem limites e narrativas que funcionam em qualquer idade. Você enxerga arte onde outros veem desenho." },
  { genres: ["Comédia", "Comedy"], emoji: "😂", title: "Mestre do Bom Humor",
    description: "Rir é prioridade. Você procura roteiros afiados, timing impecável e personagens que iluminam o dia." },
  { genres: ["Documentário", "Documentary"], emoji: "🎬", title: "Cinéfilo Curioso",
    description: "Realidade é mais surpreendente que ficção. Você consome conhecimento com a mesma intensidade que outros consomem séries." },
  { genres: ["Crime"], emoji: "🔪", title: "Detetive de Sofá",
    description: "Investigações, organizações criminosas e mentes brilhantes do lado errado da lei: você decifra antes do final." },
  { genres: ["Fantasia", "Fantasy"], emoji: "🐉", title: "Aventureiro de Mundos Mágicos",
    description: "Reinos, criaturas e jornadas heroicas. Você acredita que toda boa história começa com 'era uma vez'." },
];

const PROVIDER_NAME_BY_ID: Record<number, string> = {
  8: "Netflix",
  119: "Prime Video",
  1899: "Max",
  337: "Disney+",
  350: "Apple TV+",
  531: "Paramount+",
  307: "Globoplay",
};

const KNOWN_PROVIDER_IDS = Object.keys(PROVIDER_NAME_BY_ID).map(Number);

export async function buildCinematicDna(opts: {
  userId: string;
  supabase: SupabaseClient;
}): Promise<CinematicDna> {
  const { supabase, userId } = opts;
  const { getDetails } = await import("./tmdb.server");

  const [{ data: ratingsData }, { data: interactionsData }, { data: prefsData }] = await Promise.all([
    supabase.from("ratings").select("tmdb_id,media_type,rating,weight,created_at").eq("user_id", userId),
    supabase.from("interactions").select("tmdb_id,media_type,action,created_at").eq("user_id", userId),
    supabase.from("user_preferences").select("selected_providers").eq("user_id", userId).maybeSingle(),
  ]);

  const ratings = (ratingsData ?? []) as { tmdb_id: number; media_type: "movie" | "tv"; rating: number; weight: number; created_at: string }[];
  const interactions = (interactionsData ?? []) as { tmdb_id: number; media_type: "movie" | "tv"; action: string; created_at: string }[];

  const ratedCount = ratings.length;
  const likeCount = interactions.filter((i) => i.action === "like").length;
  const watchedCount = interactions.filter((i) => i.action === "watched").length;

  const required = { ratings: 10, likes: 5, watched: 5 };
  const unlocked = ratedCount >= required.ratings || likeCount >= required.likes || watchedCount >= required.watched;

  if (!unlocked) {
    return {
      unlocked: false,
      reason: "Continue avaliando conteúdos para revelar seu DNA Cinematográfico.",
      required,
      current: { ratings: ratedCount, likes: likeCount, watched: watchedCount },
    };
  }

  // Build seed list: rated >=6 + like + watched, weighted
  type Seed = { id: number; media_type: "movie" | "tv"; weight: number };
  const seedMap = new Map<string, Seed>();
  for (const r of ratings) {
    if (r.rating >= 6) {
      const k = `${r.media_type}:${r.tmdb_id}`;
      const w = (r.rating / 10) * Number(r.weight || 1);
      const prev = seedMap.get(k);
      seedMap.set(k, { id: r.tmdb_id, media_type: r.media_type, weight: (prev?.weight ?? 0) + w });
    }
  }
  for (const i of interactions) {
    if (i.action !== "like" && i.action !== "watched") continue;
    const k = `${i.media_type}:${i.tmdb_id}`;
    const w = i.action === "watched" ? 1.2 : 0.8;
    const prev = seedMap.get(k);
    seedMap.set(k, { id: i.tmdb_id, media_type: i.media_type, weight: (prev?.weight ?? 0) + w });
  }
  const seeds = Array.from(seedMap.values()).sort((a, b) => b.weight - a.weight).slice(0, 24);

  // Fetch details in parallel (capped)
  const detailResults = await Promise.allSettled(
    seeds.map((s) => getDetails(s.media_type, s.id)),
  );

  const genreAcc = new Map<string, GenreCount>();
  const providerHits = new Map<number, number>();
  let providerScanned = 0;
  const idealCandidates: { id: number; media_type: "movie" | "tv"; title: string; poster_path: string | null; year: string; score: number }[] = [];

  detailResults.forEach((res, idx) => {
    if (res.status !== "fulfilled") return;
    const d = res.value as any;
    const seed = seeds[idx];
    const w = seed.weight;
    for (const g of (d.genres ?? []) as { id: number; name: string }[]) {
      const cur = genreAcc.get(g.name);
      if (cur) cur.weighted += w;
      else genreAcc.set(g.name, { id: g.id, name: g.name, weighted: w });
    }
    const brFlat = (d["watch/providers"]?.results?.BR?.flatrate ?? []) as { provider_id: number }[];
    if (brFlat.length) {
      providerScanned += 1;
      const ids = new Set(brFlat.map((p) => p.provider_id));
      for (const pid of KNOWN_PROVIDER_IDS) {
        if (ids.has(pid)) providerHits.set(pid, (providerHits.get(pid) ?? 0) + 1);
      }
    }
    idealCandidates.push({
      id: d.id,
      media_type: seed.media_type,
      title: d.title || d.name || "",
      poster_path: d.poster_path ?? null,
      year: ((d.release_date || d.first_air_date || "") as string).slice(0, 4),
      score: w * (Number(d.vote_average ?? 0) / 10),
    });
  });

  // Compute genre percentages — normalize to top genre = ~95-99%
  const genresArr = Array.from(genreAcc.values()).sort((a, b) => b.weighted - a.weighted);
  const topW = genresArr[0]?.weighted ?? 1;
  const genres = genresArr.slice(0, 8).map((g, i) => ({
    name: g.name,
    pct: Math.max(8, Math.min(99, Math.round((g.weighted / topW) * (98 - i * 1.5)))),
  }));

  // Pick profile archetype based on top genres
  const topGenreNames = genresArr.slice(0, 3).map((g) => g.name.toLowerCase());
  let profile = PROFILE_MAP.find((p) => p.genres.some((g) => topGenreNames.includes(g.toLowerCase()))) ?? PROFILE_MAP[3]; // Drama fallback
  // Override: if user has many series → "Maratonista de Séries"; many movies → "Cinéfilo Clássico"
  const moviesRated = ratings.filter((r) => r.media_type === "movie").length;
  const seriesRated = ratings.filter((r) => r.media_type === "tv").length;
  if (seriesRated >= moviesRated * 2 && seriesRated >= 8) {
    profile = { genres: [], emoji: "🔥", title: "Maratonista de Séries",
      description: "Você devora temporadas inteiras e não tem medo de arcos longos. Histórias que evoluem episódio a episódio são o seu refúgio." };
  } else if (moviesRated >= seriesRated * 2 && moviesRated >= 8) {
    profile = { genres: [], emoji: "🎬", title: "Cinéfilo Clássico",
      description: "Você valoriza a experiência fechada de um bom filme: começo, meio, fim e uma assinatura visual marcante." };
  }

  // Stats
  const avgRating = ratings.length
    ? Math.round((ratings.reduce((s, r) => s + Number(r.rating), 0) / ratings.length) * 10) / 10
    : 0;
  const dates = new Set([
    ...ratings.map((r) => r.created_at?.slice(0, 10)),
    ...interactions.map((i) => i.created_at?.slice(0, 10)),
  ].filter(Boolean));

  // Provider compat
  const providerCompat = KNOWN_PROVIDER_IDS.map((pid) => ({
    name: PROVIDER_NAME_BY_ID[pid],
    pct: providerScanned > 0 ? Math.round(((providerHits.get(pid) ?? 0) / providerScanned) * 100) : 0,
  })).sort((a, b) => b.pct - a.pct).slice(0, 5);

  const selectedProviders = (prefsData?.selected_providers as number[] | null) ?? [];
  const favProviderId = providerCompat[0]?.pct ? KNOWN_PROVIDER_IDS.find((pid) => PROVIDER_NAME_BY_ID[pid] === providerCompat[0].name) : selectedProviders[0];
  const favoriteProvider = favProviderId ? PROVIDER_NAME_BY_ID[favProviderId] ?? "—" : "—";

  // Trophies
  const trophies: { emoji: string; name: string }[] = [];
  if (genresArr[0]) trophies.push({ emoji: "🏆", name: `Mestre de ${genresArr[0].name}` });
  if (seriesRated >= 10) trophies.push({ emoji: "🍿", name: "Maratonista" });
  if (moviesRated >= 10) trophies.push({ emoji: "🎞️", name: "Cinéfilo" });
  if (avgRating >= 8) trophies.push({ emoji: "⭐", name: "Crítico Generoso" });
  else if (avgRating > 0 && avgRating <= 5) trophies.push({ emoji: "🧐", name: "Crítico Exigente" });
  if (providerCompat[0]?.pct >= 60) trophies.push({ emoji: "📺", name: `Especialista ${providerCompat[0].name}` });

  // Ideal recommendations from analyzed pool (top 5)
  const ideal = idealCandidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ score: _s, ...r }) => r);

  return {
    unlocked: true,
    profile,
    genres,
    stats: {
      moviesRated,
      seriesRated,
      averageRating: avgRating,
      favoriteGenre: genresArr[0]?.name ?? "—",
      favoriteProvider,
      activeDays: dates.size,
      total: ratedCount + likeCount + watchedCount,
    },
    trophies,
    providerCompat,
    ideal,
  };
}
