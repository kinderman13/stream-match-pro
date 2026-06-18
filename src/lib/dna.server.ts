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
  animal?: {
    key: string;
    emoji: string;
    title: string;
    description: string;
    rarity: "Comum" | "Incomum" | "Raro" | "Épico" | "Lendário";
    rarityPct: number; // % of users with this animal (lower = rarer)
  };
  character?: {
    key: string;
    name: string;
    franchise: string;
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
  viral?: {
    analyticsPct: number;   // "mais analítico que X%"
    qualityPct: number;     // "avalia melhor que X%"
    rarityPct: number;      // "perfil mais raro que X%"
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
    description: "Você prefere histórias inteligentes, reviravoltas inesperadas e narrativas que desafiam sua percepção da realidade." },
  { genres: ["Ficção científica", "Science Fiction", "Sci-Fi & Fantasy"], emoji: "🚀", title: "Explorador de Universos",
    description: "Mundos paralelos, viagens interestelares e tecnologia que dobra a realidade movem você." },
  { genres: ["Ação", "Action", "Action & Adventure"], emoji: "⚔️", title: "Guerreiro Épico",
    description: "Adrenalina, conflitos grandiosos e protagonistas que encaram o impossível." },
  { genres: ["Drama"], emoji: "🧠", title: "Estrategista Intelectual",
    description: "Personagens densos, dilemas morais e roteiros que respiram realismo." },
  { genres: ["Romance"], emoji: "❤️", title: "Romântico Incorrigível",
    description: "Histórias de afeto, encontros improváveis e finais que tocam o coração." },
  { genres: ["Terror", "Horror"], emoji: "😱", title: "Caçador de Suspense",
    description: "Quanto mais o coração acelera, melhor. Atmosferas densas e o desconhecido." },
  { genres: ["Animação", "Animation"], emoji: "🎨", title: "Sonhador Animado",
    description: "Universos visuais, criatividade sem limites e narrativas atemporais." },
  { genres: ["Comédia", "Comedy"], emoji: "😂", title: "Mestre do Bom Humor",
    description: "Roteiros afiados, timing impecável e personagens que iluminam o dia." },
  { genres: ["Documentário", "Documentary"], emoji: "🎬", title: "Cinéfilo Curioso",
    description: "Realidade é mais surpreendente que ficção." },
  { genres: ["Crime"], emoji: "🔪", title: "Detetive de Sofá",
    description: "Investigações, organizações criminosas e mentes brilhantes do lado errado da lei." },
  { genres: ["Fantasia", "Fantasy"], emoji: "🐉", title: "Aventureiro de Mundos Mágicos",
    description: "Reinos, criaturas e jornadas heroicas." },
];

// Animal archetypes — selected by dominant genre clusters + behaviors.
const ANIMALS = {
  lion:      { key: "lion",      emoji: "🦁", title: "Leão do Cinema",       description: "Líder. Ama histórias épicas, grandes produções, ação e aventura." },
  owl:       { key: "owl",       emoji: "🦉", title: "Coruja Analítica",     description: "Adora mistério, suspense, ficção científica e narrativas inteligentes." },
  wolf:      { key: "wolf",      emoji: "🐺", title: "Lobo Estrategista",    description: "Prefere histórias profundas, anti-heróis e séries complexas." },
  eagle:     { key: "eagle",     emoji: "🦅", title: "Águia Visionária",     description: "Busca inovação, filmes premiados e narrativas diferenciadas." },
  bear:      { key: "bear",      emoji: "🐻", title: "Urso Maratonista",     description: "Assiste séries por horas e consome temporadas inteiras rapidamente." },
  dolphin:   { key: "dolphin",   emoji: "🐬", title: "Golfinho Social",      description: "Ama comédias, conteúdos leves e filmes para assistir acompanhado." },
  fox:       { key: "fox",       emoji: "🦊", title: "Raposa Curiosa",       description: "Explora diversos gêneros e está sempre atrás de novidades." },
  tiger:     { key: "tiger",     emoji: "🐯", title: "Tigre Intenso",        description: "Ama ação, suspense e alta adrenalina." },
  penguin:   { key: "penguin",   emoji: "🐧", title: "Pinguim Nostálgico",   description: "Prefere clássicos, filmes antigos e franquias tradicionais." },
  dragon:    { key: "dragon",    emoji: "🐲", title: "Dragão Lendário",      description: "Perfil raro. Usuários extremamente ativos com alto índice de avaliações." },
} as const;

type AnimalKey = keyof typeof ANIMALS;

const CHARACTERS = {
  batman:   { key: "batman",   name: "Batman",          franchise: "DC",        emoji: "🦇", description: "Detetive sombrio, justiceiro metódico." },
  sherlock: { key: "sherlock", name: "Sherlock Holmes", franchise: "BBC",       emoji: "🔍", description: "Deduções afiadas e olhar clínico para detalhes." },
  stark:    { key: "stark",    name: "Tony Stark",      franchise: "Marvel",    emoji: "🤖", description: "Genialidade, inovação e charme irreverente." },
  yoda:     { key: "yoda",     name: "Yoda",            franchise: "Star Wars", emoji: "🧙", description: "Sabedoria ancestral em uma jornada interior." },
  indiana:  { key: "indiana",  name: "Indiana Jones",   franchise: "Lucasfilm", emoji: "🤠", description: "Aventura, história e coragem em campo." },
  neo:      { key: "neo",      name: "Neo",             franchise: "Matrix",    emoji: "🕶️", description: "Questiona a realidade e abraça o desconhecido." },
  ellen:    { key: "ellen",    name: "Ellen Ripley",    franchise: "Alien",     emoji: "👩‍🚀", description: "Determinação inabalável diante do impossível." },
  hermione: { key: "hermione", name: "Hermione Granger", franchise: "HP",       emoji: "📚", description: "Inteligência, estudo e lealdade." },
} as const;

const PROVIDER_NAME_BY_ID: Record<number, string> = {
  8: "Netflix", 119: "Prime Video", 1899: "Max", 337: "Disney+", 350: "Apple TV+", 531: "Paramount+", 307: "Globoplay",
};
const KNOWN_PROVIDER_IDS = Object.keys(PROVIDER_NAME_BY_ID).map(Number);

function pickAnimal(opts: {
  topGenres: string[];
  ratedCount: number;
  seriesRated: number;
  moviesRated: number;
  avgRating: number;
  genreDiversity: number;
}): AnimalKey {
  const g = opts.topGenres.map((x) => x.toLowerCase());
  const has = (...names: string[]) => names.some((n) => g.includes(n.toLowerCase()));

  // Dragon = legendary outliers (very active + high diversity)
  if (opts.ratedCount >= 60 && opts.genreDiversity >= 7) return "dragon";
  // Bear = series marathoner
  if (opts.seriesRated >= 12 && opts.seriesRated >= opts.moviesRated * 1.6) return "bear";
  // Penguin = nostalgic / classic-only signal (drama + low diversity, modest avg)
  if (has("drama") && opts.genreDiversity <= 3 && opts.avgRating >= 7) return "penguin";
  // Fox = explorer (high diversity, no clear top)
  if (opts.genreDiversity >= 6 && !has("ação", "action", "mistério", "mystery")) return "fox";
  // Owl = mystery / sci-fi / thriller
  if (has("mistério", "mystery", "thriller", "suspense", "ficção científica", "science fiction", "sci-fi & fantasy")) return "owl";
  // Tiger = pure action/adventure adrenaline
  if (has("ação", "action", "action & adventure") && opts.avgRating >= 7) return "tiger";
  // Lion = epic / action / adventure / fantasy
  if (has("ação", "action", "aventura", "adventure", "action & adventure", "fantasia", "fantasy")) return "lion";
  // Eagle = drama + premiated taste (high avg)
  if (has("drama") && opts.avgRating >= 8) return "eagle";
  // Wolf = crime / dark drama / war
  if (has("crime", "guerra", "war", "drama")) return "wolf";
  // Dolphin = comedy / romance / family
  if (has("comédia", "comedy", "romance", "family", "família")) return "dolphin";
  return "fox";
}

function pickCharacter(animal: AnimalKey, topGenres: string[]): keyof typeof CHARACTERS {
  const g = topGenres.map((x) => x.toLowerCase());
  const has = (...names: string[]) => names.some((n) => g.includes(n.toLowerCase()));
  switch (animal) {
    case "owl":     return has("mistério", "mystery") ? "sherlock" : "neo";
    case "wolf":    return "batman";
    case "tiger":   return "stark";
    case "lion":    return has("fantasia", "fantasy") ? "indiana" : "stark";
    case "eagle":   return "neo";
    case "bear":    return "hermione";
    case "fox":     return "indiana";
    case "dolphin": return "hermione";
    case "penguin": return "yoda";
    case "dragon":  return "ellen";
  }
}

function computeRarity(animalSharePct: number): { rarity: CinematicDna["animal"] extends infer A ? A extends { rarity: infer R } ? R : never : never; rarityPct: number } {
  // animalSharePct = percentage of users who share this animal. Lower = rarer.
  let rarity: "Comum" | "Incomum" | "Raro" | "Épico" | "Lendário";
  if (animalSharePct < 4) rarity = "Lendário";
  else if (animalSharePct < 9) rarity = "Épico";
  else if (animalSharePct < 16) rarity = "Raro";
  else if (animalSharePct < 28) rarity = "Incomum";
  else rarity = "Comum";
  return { rarity: rarity as any, rarityPct: Math.max(1, Math.round(animalSharePct)) };
}

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

  const detailResults = await Promise.allSettled(seeds.map((s) => getDetails(s.media_type, s.id)));

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
      for (const pid of KNOWN_PROVIDER_IDS) if (ids.has(pid)) providerHits.set(pid, (providerHits.get(pid) ?? 0) + 1);
    }
    idealCandidates.push({
      id: d.id, media_type: seed.media_type,
      title: d.title || d.name || "",
      poster_path: d.poster_path ?? null,
      year: ((d.release_date || d.first_air_date || "") as string).slice(0, 4),
      score: w * (Number(d.vote_average ?? 0) / 10),
    });
  });

  const genresArr = Array.from(genreAcc.values()).sort((a, b) => b.weighted - a.weighted);
  const topW = genresArr[0]?.weighted ?? 1;
  const genres = genresArr.slice(0, 8).map((g, i) => ({
    name: g.name,
    pct: Math.max(8, Math.min(99, Math.round((g.weighted / topW) * (98 - i * 1.5)))),
  }));

  const topGenreNames = genresArr.slice(0, 3).map((g) => g.name);
  let profile = PROFILE_MAP.find((p) => p.genres.some((g) => topGenreNames.map(x=>x.toLowerCase()).includes(g.toLowerCase()))) ?? PROFILE_MAP[3];
  const moviesRated = ratings.filter((r) => r.media_type === "movie").length;
  const seriesRated = ratings.filter((r) => r.media_type === "tv").length;
  if (seriesRated >= moviesRated * 2 && seriesRated >= 8) {
    profile = { genres: [], emoji: "🔥", title: "Maratonista de Séries", description: "Você devora temporadas inteiras e não tem medo de arcos longos." };
  } else if (moviesRated >= seriesRated * 2 && moviesRated >= 8) {
    profile = { genres: [], emoji: "🎬", title: "Cinéfilo Clássico", description: "Você valoriza a experiência fechada de um bom filme." };
  }

  const avgRating = ratings.length
    ? Math.round((ratings.reduce((s, r) => s + Number(r.rating), 0) / ratings.length) * 10) / 10
    : 0;
  const dates = new Set([
    ...ratings.map((r) => r.created_at?.slice(0, 10)),
    ...interactions.map((i) => i.created_at?.slice(0, 10)),
  ].filter(Boolean));

  // Animal + character
  const animalKey = pickAnimal({
    topGenres: topGenreNames,
    ratedCount,
    seriesRated,
    moviesRated,
    avgRating,
    genreDiversity: genresArr.length,
  });
  const characterKey = pickCharacter(animalKey, topGenreNames);

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

  const ideal = idealCandidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ score: _s, ...r }) => r);

  // Persist + compute percentiles vs other users
  const totalInteractions = ratedCount + likeCount + watchedCount;
  await supabase.from("dna_results").upsert({
    user_id: userId,
    profile_title: profile.title,
    animal_key: animalKey,
    character_key: characterKey,
    rarity: null,
    total_interactions: totalInteractions,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  // Read aggregates (population for percentile + animal share)
  const [{ data: pop }, { data: animalRows }] = await Promise.all([
    supabase.from("dna_results").select("total_interactions"),
    supabase.from("dna_results").select("animal_key"),
  ]);
  const popN = pop?.length ?? 1;
  const sortedTotals = (pop ?? []).map((r: any) => Number(r.total_interactions ?? 0)).sort((a, b) => a - b);
  const rank = sortedTotals.filter((v) => v < totalInteractions).length;
  const analyticsPct = Math.max(1, Math.min(99, Math.round((rank / popN) * 100)));

  const animalCounts = new Map<string, number>();
  for (const r of (animalRows ?? []) as { animal_key: string | null }[]) {
    if (!r.animal_key) continue;
    animalCounts.set(r.animal_key, (animalCounts.get(r.animal_key) ?? 0) + 1);
  }
  const totalAnimals = Array.from(animalCounts.values()).reduce((s, v) => s + v, 0) || 1;
  const myAnimalCount = animalCounts.get(animalKey) ?? 1;
  const animalSharePct = (myAnimalCount / totalAnimals) * 100;
  const { rarity, rarityPct } = computeRarity(animalSharePct);

  // Quality percentile based on avg rating informativeness (proxy: avg deviating from 6)
  const qualityPct = Math.max(40, Math.min(99, Math.round(40 + Math.abs(avgRating - 6) * 8 + Math.min(20, ratedCount / 4))));
  const rarityViralPct = Math.max(50, Math.min(99, 100 - rarityPct));

  // Persist rarity
  await supabase.from("dna_results").update({
    rarity,
    percentile_analytics: analyticsPct,
    percentile_quality: qualityPct,
    percentile_rarity: rarityViralPct,
  }).eq("user_id", userId);

  return {
    unlocked: true,
    profile,
    animal: { ...ANIMALS[animalKey], rarity, rarityPct },
    character: CHARACTERS[characterKey],
    genres,
    stats: {
      moviesRated, seriesRated,
      averageRating: avgRating,
      favoriteGenre: genresArr[0]?.name ?? "—",
      favoriteProvider,
      activeDays: dates.size,
      total: totalInteractions,
    },
    viral: { analyticsPct, qualityPct, rarityPct: rarityViralPct },
    trophies,
    providerCompat,
    ideal,
  };
}
