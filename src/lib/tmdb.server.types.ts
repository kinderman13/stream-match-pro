// Client-safe constants mirrored from tmdb.server.ts (no fetch logic).
export const PROVIDERS = {
  netflix: 8,
  prime: 119,
  max: 1899,
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
