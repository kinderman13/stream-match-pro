import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MediaTypeSchema = z.enum(["movie", "tv"]);

export const getUserState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: prefs }, { count: ratingsCount }] = await Promise.all([
      supabase.from("user_preferences").select("selected_providers,onboarding_completed").eq("user_id", userId).maybeSingle(),
      supabase.from("ratings").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    return {
      onboardingCompleted: !!prefs?.onboarding_completed,
      selectedProviders: (prefs?.selected_providers as number[]) || [],
      ratingsCount: ratingsCount ?? 0,
    };
  });

export const upsertRating = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    tmdbId: number;
    mediaType: "movie" | "tv";
    rating: number;
    source?: "onboarding" | "catalog" | "recommendation";
    title?: string;
    posterPath?: string | null;
  }) =>
    z.object({
      tmdbId: z.number().int(),
      mediaType: MediaTypeSchema,
      rating: z.number().min(0).max(10),
      source: z.enum(["onboarding", "catalog", "recommendation"]).optional(),
      title: z.string().max(300).optional(),
      posterPath: z.string().max(300).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const source = data.source ?? "catalog";
    const weight = source === "onboarding" ? 1.2 : 1.0;
    const { error } = await supabase.from("ratings").upsert({
      user_id: userId,
      tmdb_id: data.tmdbId,
      media_type: data.mediaType,
      rating: data.rating,
      source,
      weight,
      title: data.title ?? null,
      poster_path: data.posterPath ?? null,
    }, { onConflict: "user_id,tmdb_id,media_type" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeRating = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tmdbId: number; mediaType: "movie" | "tv" }) =>
    z.object({ tmdbId: z.number().int(), mediaType: MediaTypeSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("ratings").delete()
      .eq("user_id", context.userId).eq("tmdb_id", data.tmdbId).eq("media_type", data.mediaType);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listRatings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("ratings")
      .select("tmdb_id,media_type,rating,title,poster_path,source,created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  });

export const setProviders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { providerIds: number[] }) =>
    z.object({ providerIds: z.array(z.number().int()).max(20) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("user_preferences").upsert({
      user_id: context.userId,
      selected_providers: data.providerIds,
    }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.from("user_preferences").upsert({
      user_id: context.userId,
      onboarding_completed: true,
    }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addInteraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tmdbId: number; mediaType: "movie" | "tv"; action: "like" | "dislike" | "watched" | "save" | "skip" | "watch_click" | "trailer_click"; providerId?: number | null }) =>
    z.object({
      tmdbId: z.number().int(),
      mediaType: MediaTypeSchema,
      action: z.enum(["like", "dislike", "watched", "save", "skip", "watch_click", "trailer_click"]),
      providerId: z.number().int().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("interactions").insert({
      user_id: context.userId,
      tmdb_id: data.tmdbId,
      media_type: data.mediaType,
      action: data.action,
      provider_id: data.providerId ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addToWatchlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tmdbId: number; mediaType: "movie" | "tv"; title?: string; posterPath?: string | null; year?: string }) =>
    z.object({
      tmdbId: z.number().int(),
      mediaType: MediaTypeSchema,
      title: z.string().max(300).optional(),
      posterPath: z.string().max(300).nullable().optional(),
      year: z.string().max(8).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("watchlist").upsert({
      user_id: context.userId,
      tmdb_id: data.tmdbId,
      media_type: data.mediaType,
      title: data.title ?? null,
      poster_path: data.posterPath ?? null,
      year: data.year ?? null,
    }, { onConflict: "user_id,tmdb_id,media_type" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeFromWatchlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tmdbId: number; mediaType: "movie" | "tv" }) =>
    z.object({ tmdbId: z.number().int(), mediaType: MediaTypeSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("watchlist").delete()
      .eq("user_id", context.userId).eq("tmdb_id", data.tmdbId).eq("media_type", data.mediaType);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listWatchlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("watchlist")
      .select("tmdb_id,media_type,title,poster_path,year,created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  });
