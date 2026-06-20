// Client-safe helpers for building "Watch Now" deeplinks.
// We can't get per-title deeplinks from TMDB, so we use the provider's
// search/title URL with the title as query — universal links open the
// installed app on mobile, or the web player on desktop.

export interface ProviderLinkInfo {
  providerId: number;
  providerName: string;
  url: string;
  isDirect: boolean; // true when we have a known provider deeplink
}

const BUILDERS: Record<number, (title: string, year: string) => string> = {
  // Netflix
  8: (t) => `https://www.netflix.com/search?q=${encodeURIComponent(t)}`,
  // Amazon Prime Video
  119: (t) => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(t)}`,
  9: (t) => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(t)}`,
  // Max / HBO Max
  1899: (t) => `https://play.max.com/search?q=${encodeURIComponent(t)}`,
  384: (t) => `https://play.max.com/search?q=${encodeURIComponent(t)}`,
  // Disney+
  337: (t) => `https://www.disneyplus.com/search?q=${encodeURIComponent(t)}`,
  // Apple TV+
  350: (t) => `https://tv.apple.com/search?term=${encodeURIComponent(t)}`,
  // Paramount+
  531: (t) => `https://www.paramountplus.com/search/?query=${encodeURIComponent(t)}`,
  // Globoplay
  307: (t) => `https://globoplay.globo.com/busca/?q=${encodeURIComponent(t)}`,
};

export function buildProviderLink(
  providers: { provider_id: number; provider_name: string }[],
  title: string,
  year: string,
  preferredProviderIds: number[] = [],
): ProviderLinkInfo | null {
  if (!providers.length) return null;
  // Prefer a provider the user selected
  const ordered = [
    ...providers.filter((p) => preferredProviderIds.includes(p.provider_id)),
    ...providers.filter((p) => !preferredProviderIds.includes(p.provider_id)),
  ];
  for (const p of ordered) {
    const builder = BUILDERS[p.provider_id];
    if (builder) {
      return {
        providerId: p.provider_id,
        providerName: p.provider_name,
        url: builder(title, year),
        isDirect: true,
      };
    }
  }
  // Fallback: first provider with no known builder
  const p = ordered[0];
  return {
    providerId: p.provider_id,
    providerName: p.provider_name,
    url: "",
    isDirect: false,
  };
}

export function trailerUrl(youtubeKey: string): string {
  return `https://www.youtube.com/watch?v=${youtubeKey}`;
}
