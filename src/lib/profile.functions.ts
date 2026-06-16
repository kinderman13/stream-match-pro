import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id,display_name,created_at")
      .eq("id", userId)
      .maybeSingle();
    return {
      id: userId,
      email: (claims as { email?: string })?.email ?? null,
      displayName: profile?.display_name ?? null,
      createdAt: profile?.created_at ?? null,
    };
  });

export const getProfileStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [ratings, watchlist, interactions, prefs] = await Promise.all([
      supabase.from("ratings").select("media_type,rating").eq("user_id", userId),
      supabase.from("watchlist").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("interactions").select("action").eq("user_id", userId),
      supabase.from("user_preferences").select("selected_providers").eq("user_id", userId).maybeSingle(),
    ]);
    const rs = ratings.data ?? [];
    const ints = interactions.data ?? [];
    const avg = rs.length ? rs.reduce((s, r) => s + Number(r.rating), 0) / rs.length : 0;
    return {
      moviesRated: rs.filter((r) => r.media_type === "movie").length,
      seriesRated: rs.filter((r) => r.media_type === "tv").length,
      savedCount: watchlist.count ?? 0,
      averageRating: Number(avg.toFixed(2)),
      likes: ints.filter((i) => i.action === "like").length,
      dislikes: ints.filter((i) => i.action === "dislike").length,
      watched: ints.filter((i) => i.action === "watched").length,
      providers: (prefs.data?.selected_providers as number[]) ?? [],
    };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { displayName: string }) =>
    z.object({ displayName: z.string().min(1).max(80) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ display_name: data.displayName })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [ratings, interactions] = await Promise.all([
      supabase.from("ratings").select("tmdb_id,media_type,rating,title,poster_path,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
      supabase.from("interactions").select("tmdb_id,media_type,action,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    ]);
    return {
      ratings: ratings.data ?? [],
      interactions: interactions.data ?? [],
    };
  });
