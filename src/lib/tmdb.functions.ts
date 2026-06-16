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
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { page?: number; mediaType?: "movie" | "tv" }) =>
    z.object({
      page: z.number().int().min(1).max(50).optional(),
      mediaType: MediaTypeSchema.optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { discover, trending } = await import("./tmdb.server");
    const page = data.page ?? 1;
    const { data: prefs } = await context.supabase
      .from("user_preferences")
      .select("selected_providers")
      .eq("user_id", context.userId)
      .maybeSingle();
    const providerIds = (prefs?.selected_providers as number[] | null) ?? [];
    if (!providerIds.length) {
      return trending(data.mediaType ?? "all", page);
    }
    if (data.mediaType) {
      return discover({ mediaType: data.mediaType, page, providerIds, sortBy: "popularity.desc" });
    }
    const [movies, tv] = await Promise.all([
      discover({ mediaType: "movie", page, providerIds, sortBy: "popularity.desc" }),
      discover({ mediaType: "tv", page, providerIds, sortBy: "popularity.desc" }),
    ]);
    const merged: typeof movies = [];
    const max = Math.max(movies.length, tv.length);
    for (let i = 0; i < max; i++) {
      if (movies[i]) merged.push(movies[i]);
      if (tv[i]) merged.push(tv[i]);
    }
    return merged;
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
