import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MediaTypeSchema = z.enum(["movie", "tv"]);

export const tmdbSearch = createServerFn({ method: "POST" })
  .inputValidator((d: { query: string; page?: number }) =>
    z.object({ query: z.string().min(1).max(100), page: z.number().int().min(1).max(50).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { searchMulti } = await import("./tmdb.server");
    return searchMulti(data.query, data.page ?? 1);
  });

export const tmdbDiscover = createServerFn({ method: "POST" })
  .inputValidator((d: {
    mediaType: "movie" | "tv";
    page?: number;
    providerIds?: number[];
    sortBy?: string;
  }) =>
    z.object({
      mediaType: MediaTypeSchema,
      page: z.number().int().min(1).max(500).optional(),
      providerIds: z.array(z.number().int()).max(20).optional(),
      sortBy: z.string().max(40).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { discover } = await import("./tmdb.server");
    return discover({
      mediaType: data.mediaType,
      page: data.page ?? 1,
      providerIds: data.providerIds,
      sortBy: data.sortBy,
    });
  });

export const tmdbOnboardingFeed = createServerFn({ method: "POST" })
  .inputValidator((d: { page?: number }) =>
    z.object({ page: z.number().int().min(1).max(50).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { trending } = await import("./tmdb.server");
    return trending("all", data.page ?? 1);
  });

export const tmdbDetails = createServerFn({ method: "POST" })
  .inputValidator((d: { mediaType: "movie" | "tv"; id: number }) =>
    z.object({ mediaType: MediaTypeSchema, id: z.number().int() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { getDetails } = await import("./tmdb.server");
    const d = await getDetails(data.mediaType, data.id);
    // Trim to safe DTO
    return {
      id: d.id,
      title: d.title || d.name,
      overview: d.overview,
      poster_path: d.poster_path,
      backdrop_path: d.backdrop_path,
      vote_average: d.vote_average,
      year: (d.release_date || d.first_air_date || "").slice(0, 4),
      genres: (d.genres || []).map((g: any) => ({ id: g.id, name: g.name })),
      providers: (d["watch/providers"]?.results?.BR?.flatrate || []).map((p: any) => ({
        provider_id: p.provider_id,
        provider_name: p.provider_name,
      })),
    };
  });

// Personalized recommendations
export const tmdbRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { mediaType?: "movie" | "tv" | "all"; limit?: number; surprise?: boolean }) =>
    z.object({
      mediaType: z.enum(["movie", "tv", "all"]).optional(),
      limit: z.number().int().min(1).max(20).optional(),
      surprise: z.boolean().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { buildRecommendations } = await import("./recommendation.server");
    return buildRecommendations({
      userId: context.userId,
      supabase: context.supabase,
      mediaType: data.mediaType ?? "all",
      limit: data.limit ?? 10,
      surprise: data.surprise ?? false,
    });
  });
