import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const roles = (data ?? []).map((r: { role: string }) => r.role);
    return { roles, isAdmin: roles.includes("admin") };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profilesRes, rolesRes, ratingsRes, interactionsRes, prefsRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, display_name, created_at, last_seen_at, blocked_at, blocked_reason")
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("ratings").select("user_id, rating"),
      supabaseAdmin.from("interactions").select("user_id, action"),
      supabaseAdmin.from("user_preferences").select("user_id, selected_providers"),
    ]);
    if (profilesRes.error) throw new Error(profilesRes.error.message);

    const rolesByUser = new Map<string, string[]>();
    for (const r of rolesRes.data ?? []) {
      const list = rolesByUser.get(r.user_id) ?? [];
      list.push(r.role);
      rolesByUser.set(r.user_id, list);
    }
    const ratingsByUser = new Map<string, { count: number; avg: number }>();
    for (const r of ratingsRes.data ?? []) {
      const prev = ratingsByUser.get(r.user_id) ?? { count: 0, avg: 0 };
      prev.avg = (prev.avg * prev.count + Number(r.rating)) / (prev.count + 1);
      prev.count += 1;
      ratingsByUser.set(r.user_id, prev);
    }
    const actsByUser = new Map<string, { likes: number; dislikes: number; watched: number }>();
    for (const i of interactionsRes.data ?? []) {
      const prev = actsByUser.get(i.user_id) ?? { likes: 0, dislikes: 0, watched: 0 };
      if (i.action === "like") prev.likes++;
      else if (i.action === "dislike") prev.dislikes++;
      else if (i.action === "watched") prev.watched++;
      actsByUser.set(i.user_id, prev);
    }
    const prefsByUser = new Map<string, number[]>();
    for (const p of prefsRes.data ?? []) {
      prefsByUser.set(p.user_id, p.selected_providers ?? []);
    }

    const now = Date.now();
    return (profilesRes.data ?? []).map((p) => {
      const acts = actsByUser.get(p.id) ?? { likes: 0, dislikes: 0, watched: 0 };
      const r = ratingsByUser.get(p.id);
      const lastSeen = p.last_seen_at ? new Date(p.last_seen_at).getTime() : 0;
      const active = lastSeen > 0 && now - lastSeen < 30 * 86400_000;
      return {
        id: p.id,
        displayName: p.display_name,
        createdAt: p.created_at,
        lastSeenAt: p.last_seen_at,
        blocked: !!p.blocked_at,
        blockedReason: p.blocked_reason,
        active,
        ratingsCount: r?.count ?? 0,
        avgRating: r ? Math.round(r.avg * 100) / 100 : 0,
        likes: acts.likes,
        dislikes: acts.dislikes,
        watched: acts.watched,
        providers: prefsByUser.get(p.id) ?? [],
        roles: rolesByUser.get(p.id) ?? [],
      };
    });
  });


export const adminGrantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: "admin" | "moderator" | "user" }) =>
    z.object({
      userId: z.string().uuid(),
      role: z.enum(["admin", "moderator", "user"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRevokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: "admin" | "moderator" | "user" }) =>
    z.object({
      userId: z.string().uuid(),
      role: z.enum(["admin", "moderator", "user"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId && data.role === "admin") {
      throw new Error("Cannot revoke your own admin role");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- Dashboard ----------------

const PROVIDER_NAMES: Record<number, string> = {
  8: "Netflix",
  119: "Prime Video",
  1899: "Max",
  337: "Disney+",
  350: "Apple TV+",
  307: "Globoplay",
  531: "Paramount+",
  283: "Crunchyroll",
  167: "Claro tv+",
  484: "Star+",
};

function startOfDayISO(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

export const adminGetDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = new Date();
    const today = startOfDayISO(now);
    const w7 = new Date(now); w7.setDate(w7.getDate() - 7);
    const w30 = new Date(now); w30.setDate(w30.getDate() - 30);
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const wStart = new Date(now); wStart.setDate(wStart.getDate() - now.getDay()); wStart.setHours(0,0,0,0);

    // Counts in parallel
    const [
      profilesAll,
      newToday,
      newWeek,
      newMonth,
      interactionsAll,
      ratingsAll,
      watchlistCount,
      recHistoryCount,
      prefsAll,
      growth30,
      ratings30,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, display_name, created_at", { count: "exact" }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", today),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", wStart.toISOString()),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", mStart),
      supabaseAdmin.from("interactions").select("user_id, action, media_type, tmdb_id, created_at"),
      supabaseAdmin.from("ratings").select("user_id, rating, tmdb_id, media_type, title, poster_path, created_at"),
      supabaseAdmin.from("watchlist").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("recommendation_history").select("id, user_id, created_at", { count: "exact" }),
      supabaseAdmin.from("user_preferences").select("user_id, selected_providers"),
      supabaseAdmin.from("profiles").select("created_at").gte("created_at", w30.toISOString()),
      supabaseAdmin.from("ratings").select("created_at").gte("created_at", w30.toISOString()),
    ]);

    const profiles = profilesAll.data ?? [];
    const interactions = interactionsAll.data ?? [];
    const ratings = ratingsAll.data ?? [];
    const prefs = prefsAll.data ?? [];
    const recHistory = recHistoryCount.data ?? [];

    // Active users based on interactions+ratings activity
    const activityByUser = new Map<string, Date>();
    for (const r of [...interactions, ...ratings] as any[]) {
      const d = new Date(r.created_at);
      const prev = activityByUser.get(r.user_id);
      if (!prev || d > prev) activityByUser.set(r.user_id, d);
    }
    let active1 = 0, active7 = 0, active30 = 0;
    for (const d of activityByUser.values()) {
      if (d >= new Date(today)) active1++;
      if (d >= w7) active7++;
      if (d >= w30) active30++;
    }
    const totalUsers = profilesAll.count ?? profiles.length;
    const inactive = totalUsers - active30;

    // Engagement
    const likes = interactions.filter((i: any) => i.action === "like").length;
    const dislikes = interactions.filter((i: any) => i.action === "dislike").length;
    const watched = interactions.filter((i: any) => i.action === "watched").length;
    const skips = interactions.filter((i: any) => i.action === "skip").length;
    const totalRatings = ratings.length;
    const avgRating = totalRatings ? ratings.reduce((s: number, r: any) => s + Number(r.rating), 0) / totalRatings : 0;

    // Title lookup for tmdb items
    const titleMap = new Map<string, { title: string; poster_path: string | null }>();
    for (const r of ratings as any[]) {
      if (r.title) titleMap.set(`${r.media_type}:${r.tmdb_id}`, { title: r.title, poster_path: r.poster_path });
    }

    // Rankings from interactions
    function rank(action: string, mediaType: string, asc = false, limit = 5) {
      const counts = new Map<string, number>();
      for (const i of interactions as any[]) {
        if (i.action !== action || i.media_type !== mediaType) continue;
        const k = `${i.media_type}:${i.tmdb_id}`;
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      return [...counts.entries()]
        .sort((a, b) => (asc ? a[1] - b[1] : b[1] - a[1]))
        .slice(0, limit)
        .map(([k, count]) => {
          const [mt, id] = k.split(":");
          const meta = titleMap.get(k);
          return { tmdb_id: Number(id), media_type: mt, title: meta?.title ?? `#${id}`, poster_path: meta?.poster_path ?? null, count };
        });
    }
    const topLikedMovies = rank("like", "movie");
    const topLikedSeries = rank("like", "tv");
    const topDislikedMovies = rank("dislike", "movie");
    const topDislikedSeries = rank("dislike", "tv");

    // Ratings aggregates
    const ratingAgg = new Map<string, { sum: number; n: number; title: string; media_type: string; tmdb_id: number; poster_path: string | null }>();
    for (const r of ratings as any[]) {
      const k = `${r.media_type}:${r.tmdb_id}`;
      const prev = ratingAgg.get(k);
      if (prev) { prev.sum += Number(r.rating); prev.n += 1; }
      else ratingAgg.set(k, { sum: Number(r.rating), n: 1, title: r.title ?? `#${r.tmdb_id}`, media_type: r.media_type, tmdb_id: r.tmdb_id, poster_path: r.poster_path });
    }
    const ratingItems = [...ratingAgg.values()].filter((x) => x.n >= 2).map((x) => ({ ...x, avg: x.sum / x.n }));
    const topRated = [...ratingItems].sort((a, b) => b.avg - a.avg).slice(0, 5);
    const bottomRated = [...ratingItems].sort((a, b) => a.avg - b.avg).slice(0, 5);

    // Platforms
    const providerCounts = new Map<number, number>();
    for (const p of prefs as any[]) {
      for (const id of p.selected_providers ?? []) {
        providerCounts.set(id, (providerCounts.get(id) ?? 0) + 1);
      }
    }
    const totalPrefs = prefs.length || 1;
    const platforms = [...providerCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({
        id,
        name: PROVIDER_NAMES[id] ?? `Provider #${id}`,
        count,
        pct: Math.round((count / totalPrefs) * 1000) / 10,
      }));

    // Recommendation funnel
    const totalRecs = recHistoryCount.count ?? recHistory.length;
    const recsLike = likes;
    const recsDislike = dislikes;
    const recsWatched = watched;
    const acceptanceRate = totalRecs ? (recsLike / totalRecs) * 100 : 0;
    const rejectionRate = totalRecs ? (recsDislike / totalRecs) * 100 : 0;
    const watchedRate = totalRecs ? (recsWatched / totalRecs) * 100 : 0;
    const conversion = totalRecs ? ((recsLike + recsWatched) / totalRecs) * 100 : 0;

    // Time series last 30 days
    function bucket(rows: { created_at: string }[]) {
      const map = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
        map.set(d.toISOString().slice(0,10), 0);
      }
      for (const r of rows) {
        const k = r.created_at.slice(0,10);
        if (map.has(k)) map.set(k, (map.get(k) ?? 0) + 1);
      }
      return [...map.entries()].map(([date, value]) => ({ date, value }));
    }
    const signupsSeries = bucket(growth30.data ?? []);
    const ratingsSeries = bucket(ratings30.data ?? []);

    // Cumulative growth
    let acc = totalUsers - (growth30.data?.length ?? 0);
    const growthSeries = signupsSeries.map((p) => ({ date: p.date, value: (acc += p.value) }));

    return {
      kpis: {
        totalUsers,
        newToday: newToday.count ?? 0,
        newWeek: newWeek.count ?? 0,
        newMonth: newMonth.count ?? 0,
        active1, active7, active30, inactive,
      },
      engagement: {
        totalRatings, likes, dislikes, watched, skips,
        savedCount: watchlistCount.count ?? 0,
        avgRating: Math.round(avgRating * 100) / 100,
        totalRecs,
      },
      rankings: { topLikedMovies, topLikedSeries, topDislikedMovies, topDislikedSeries, topRated, bottomRated },
      platforms,
      recommendations: {
        totalRecs,
        acceptanceRate: Math.round(acceptanceRate * 10) / 10,
        rejectionRate: Math.round(rejectionRate * 10) / 10,
        watchedRate: Math.round(watchedRate * 10) / 10,
        conversion: Math.round(conversion * 10) / 10,
      },
      series: { signups: signupsSeries, ratings: ratingsSeries, growth: growthSeries },
    };
  });


