// Server-only TMDB helpers. Never import from client code.
const BASE = "https://api.themoviedb.org/3";
const REGION = "BR";
const LANG = "pt-BR";

// Provider IDs per TMDB (watch/providers)
export const PROVIDERS = {
  netflix: 8,
  prime: 119,
  max: 1899, // HBO Max / Max
  disney: 337,
  apple: 350,
  paramount: 531,
  globoplay: 307,
} as const;

export type ProviderKey = keyof typeof PROVIDERS;

export const PROVIDER_LABELS: Record<ProviderKey, string> = {
  netflix: "Netflix",
  prime: "Prime Video",
  max: "Max",
  disney: "Disney+",
  apple: "Apple TV+",
  paramount: "Paramount+",
  globoplay: "Globoplay",
};

function key() {
  const k = process.env.TMDB_API_KEY;
  if (!k) throw new Error("TMDB_API_KEY not configured");
  return k;
}

function isBearer(k: string) {
  return k.length > 60 && k.includes(".");
}

async function tmdbFetch(path: string, params: Record<string, string | number | undefined> = {}) {
  const k = key();
  const url = new URL(BASE + path);
  url.searchParams.set("language", LANG);
  for (const [pk, pv] of Object.entries(params)) {
    if (pv !== undefined && pv !== null && pv !== "") url.searchParams.set(pk, String(pv));
  }
  const headers: Record<string, string> = { accept: "application/json" };
  if (isBearer(k)) {
    headers.authorization = `Bearer ${k}`;
  } else {
    url.searchParams.set("api_key", k);
  }
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TMDB ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export type MediaType = "movie" | "tv";

export interface MediaItem {
  id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  year: string;
  vote_average: number;
  overview: string;
  genre_ids: number[];
}

function normalize(raw: any, fallbackType: MediaType): MediaItem {
  const mt: MediaType = (raw.media_type === "movie" || raw.media_type === "tv" ? raw.media_type : fallbackType);
  const title = raw.title || raw.name || "";
  const date = raw.release_date || raw.first_air_date || "";
  return {
    id: raw.id,
    media_type: mt,
    title,
    poster_path: raw.poster_path ?? null,
    backdrop_path: raw.backdrop_path ?? null,
    year: date ? date.slice(0, 4) : "",
    vote_average: Number(raw.vote_average ?? 0),
    overview: raw.overview ?? "",
    genre_ids: raw.genre_ids ?? [],
  };
}

export async function searchMulti(query: string, page = 1): Promise<MediaItem[]> {
  const data = await tmdbFetch("/search/multi", { query, page, include_adult: "false" });
  return (data.results || [])
    .filter((r: any) => r.media_type === "movie" || r.media_type === "tv")
    .map((r: any) => normalize(r, r.media_type));
}

export async function discover(opts: {
  mediaType: MediaType;
  page?: number;
  providerIds?: number[];
  sortBy?: string;
  withGenres?: string;
}): Promise<MediaItem[]> {
  const params: Record<string, any> = {
    page: opts.page ?? 1,
    sort_by: opts.sortBy ?? "popularity.desc",
    include_adult: "false",
    watch_region: REGION,
    "vote_count.gte": 50,
  };
  if (opts.providerIds && opts.providerIds.length) {
    params.with_watch_providers = opts.providerIds.join("|");
    params.with_watch_monetization_types = "flatrate";
  }
  if (opts.withGenres) params.with_genres = opts.withGenres;
  const data = await tmdbFetch(`/discover/${opts.mediaType}`, params);
  return (data.results || []).map((r: any) => normalize(r, opts.mediaType));
}

export async function trending(mediaType: MediaType | "all", page = 1): Promise<MediaItem[]> {
  const data = await tmdbFetch(`/trending/${mediaType}/week`, { page });
  return (data.results || [])
    .filter((r: any) => mediaType === "all" ? (r.media_type === "movie" || r.media_type === "tv") : true)
    .map((r: any) => normalize(r, mediaType === "all" ? r.media_type : mediaType));
}

export async function getSimilar(mediaType: MediaType, id: number, page = 1): Promise<MediaItem[]> {
  const data = await tmdbFetch(`/${mediaType}/${id}/recommendations`, { page });
  return (data.results || []).map((r: any) => normalize(r, mediaType));
}

export async function getDetails(mediaType: MediaType, id: number) {
  return tmdbFetch(`/${mediaType}/${id}`, { append_to_response: "credits,watch/providers,recommendations,videos" });
}

export async function getWatchProviders(mediaType: MediaType, id: number): Promise<number[]> {
  try {
    const data = await tmdbFetch(`/${mediaType}/${id}/watch/providers`, {});
    const br = data.results?.BR;
    if (!br) return [];
    const all = [...(br.flatrate || []), ...(br.ads || []), ...(br.free || [])];
    return all.map((p: any) => p.provider_id);
  } catch {
    return [];
  }
}

// Check whether a single title is available on any of the selected providers in BR.
export async function isAvailableOn(mediaType: MediaType, id: number, providerIds: number[]): Promise<boolean> {
  if (!providerIds.length) return true;
  const avail = await getWatchProviders(mediaType, id);
  return avail.some((p) => providerIds.includes(p));
}
