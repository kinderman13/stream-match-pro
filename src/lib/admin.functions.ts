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

// ---------------- Fase 3: ping de atividade ----------------

export const pingActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.rpc("touch_last_seen");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- Fase 3: retenção ----------------

export const adminGetRetention = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("created_at, last_seen_at");
    if (error) throw new Error(error.message);

    function ret(days: number) {
      const cutoff = Date.now() - days * 86400_000;
      const eligible = (data ?? []).filter((p) => new Date(p.created_at).getTime() <= cutoff);
      if (eligible.length === 0) return { eligible: 0, retained: 0, rate: 0 };
      const retained = eligible.filter(
        (p) => p.last_seen_at && new Date(p.last_seen_at).getTime() >= cutoff,
      ).length;
      return {
        eligible: eligible.length,
        retained,
        rate: Math.round((retained / eligible.length) * 1000) / 10,
      };
    }
    return { d1: ret(1), d7: ret(7), d30: ret(30), d90: ret(90) };
  });

// ---------------- Fase 4: logs ----------------

export const adminListLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { category?: string; level?: string; limit?: number } | undefined) =>
    z.object({
      category: z.string().optional(),
      level: z.string().optional(),
      limit: z.number().min(1).max(500).optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("system_logs")
      .select("id, user_id, category, level, message, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.category) q = q.eq("category", data.category);
    if (data.level) q = q.eq("level", data.level);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const logEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { category: string; level?: string; message: string; metadata?: Record<string, unknown> }) =>
    z.object({
      category: z.string().min(1).max(64),
      level: z.enum(["info", "warn", "error"]).optional(),
      message: z.string().min(1).max(500),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("system_logs").insert({
      user_id: context.userId,
      category: data.category,
      level: data.level ?? "info",
      message: data.message,
      metadata: (data.metadata ?? {}) as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- Fase 4: configurações ----------------

export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("admin_settings")
      .select("key, value, updated_at");
    if (error) throw new Error(error.message);
    const out: Record<string, string | number | boolean | null> = {};
    for (const row of data ?? []) out[row.key] = row.value as string | number | boolean | null;
    return out;

  });

export const adminUpdateSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string; value: unknown }) =>
    z.object({ key: z.string().min(1).max(64), value: z.any() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("admin_settings")
      .upsert({ key: data.key, value: data.value as never, updated_at: new Date().toISOString(), updated_by: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- Fase 4: moderação ----------------

export const adminBlockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; reason?: string; block: boolean }) =>
    z.object({
      userId: z.string().uuid(),
      reason: z.string().max(500).optional(),
      block: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Cannot block yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        blocked_at: data.block ? new Date().toISOString() : null,
        blocked_reason: data.block ? (data.reason ?? "Bloqueado pelo administrador") : null,
      })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    if (data.block) {
      await supabaseAdmin.auth.admin.signOut(data.userId).catch(() => null);
    }
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) =>
    z.object({ userId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Cannot delete yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


// ---------------- Fase 5: moderação (denúncias) ----------------

export const createReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    target_type: "movie" | "tv" | "user" | "review";
    target_id: string;
    target_label?: string;
    reason: string;
    details?: string;
  }) =>
    z.object({
      target_type: z.enum(["movie", "tv", "user", "review"]),
      target_id: z.string().min(1).max(128),
      target_label: z.string().max(200).optional(),
      reason: z.string().min(2).max(120),
      details: z.string().max(1000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("content_reports").insert({
      reporter_id: context.userId,
      target_type: data.target_type,
      target_id: data.target_id,
      target_label: data.target_label ?? null,
      reason: data.reason,
      details: data.details ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: "pending" | "resolved" | "dismissed" | "all" }) =>
    z.object({ status: z.enum(["pending", "resolved", "dismissed", "all"]).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("content_reports")
      .select("id, reporter_id, target_type, target_id, target_label, reason, details, status, resolved_by, resolved_at, moderator_notes, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // Enrich with reporter display name
    const reporterIds = Array.from(new Set((rows ?? []).map((r) => r.reporter_id)));
    const namesMap = new Map<string, string>();
    if (reporterIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .in("id", reporterIds);
      for (const p of profs ?? []) namesMap.set(p.id, p.display_name ?? "—");
    }
    return (rows ?? []).map((r) => ({ ...r, reporter_name: namesMap.get(r.reporter_id) ?? "—" }));
  });

export const adminResolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "resolved" | "dismissed"; notes?: string }) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["resolved", "dismissed"]),
      notes: z.string().max(1000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("content_reports")
      .update({
        status: data.status,
        resolved_by: context.userId,
        resolved_at: new Date().toISOString(),
        moderator_notes: data.notes ?? null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- Fase 5: alertas do sistema ----------------

export const adminListAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: "open" | "resolved" | "all" }) =>
    z.object({ status: z.enum(["open", "resolved", "all"]).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("admin_alerts")
      .select("id, type, severity, title, message, metadata, status, resolved_by, resolved_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminResolveAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("admin_alerts")
      .update({ status: "resolved", resolved_by: context.userId, resolved_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Roda heurísticas e abre alertas quando algo sai do esperado.
 * Idempotente: cada tipo só tem 1 alerta "open" por vez (unique index).
 */
export const adminRunAlertChecks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = Date.now();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(now - 48 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();

    type AlertDraft = {
      type: string;
      severity: "info" | "warning" | "critical";
      title: string;
      message: string;
      metadata: Record<string, unknown>;
    };
    const drafts: AlertDraft[] = [];

    // 1) Queda de engajamento: interactions 24h vs média 7d/7
    const [last24, last7d] = await Promise.all([
      supabaseAdmin.from("interactions").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
      supabaseAdmin.from("interactions").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    ]);
    const c24 = last24.count ?? 0;
    const avg7 = Math.round(((last7d.count ?? 0) / 7));
    if (avg7 >= 10 && c24 < avg7 * 0.5) {
      drafts.push({
        type: "engagement_drop",
        severity: "warning",
        title: "Queda de engajamento nas últimas 24h",
        message: `Interações nas últimas 24h (${c24}) caíram mais de 50% abaixo da média semanal (${avg7}/dia).`,
        metadata: { last_24h: c24, avg_7d_per_day: avg7 },
      });
    }

    // 2) Sem novos cadastros em 48h
    const { count: signups48 } = await supabaseAdmin
      .from("profiles").select("id", { count: "exact", head: true }).gte("created_at", twoDaysAgo);
    if ((signups48 ?? 0) === 0) {
      drafts.push({
        type: "no_signups_48h",
        severity: "info",
        title: "Nenhum novo cadastro em 48h",
        message: "Não houve novos cadastros nas últimas 48 horas.",
        metadata: { window_hours: 48 },
      });
    }

    // 3) Pico de erros nos logs (última hora >= 20 OU >= 3x média horária 24h)
    const [errLastHour, errLast24h] = await Promise.all([
      supabaseAdmin.from("system_logs").select("id", { count: "exact", head: true })
        .eq("level", "error").gte("created_at", hourAgo),
      supabaseAdmin.from("system_logs").select("id", { count: "exact", head: true })
        .eq("level", "error").gte("created_at", dayAgo),
    ]);
    const eHour = errLastHour.count ?? 0;
    const eAvgHour = Math.round(((errLast24h.count ?? 0) / 24));
    if (eHour >= 20 || (eAvgHour >= 2 && eHour >= eAvgHour * 3)) {
      drafts.push({
        type: "error_spike",
        severity: eHour >= 50 ? "critical" : "warning",
        title: "Pico de erros nos logs",
        message: `${eHour} erros na última hora (média 24h: ${eAvgHour}/h).`,
        metadata: { errors_last_hour: eHour, avg_per_hour_24h: eAvgHour },
      });
    }

    // 4) Denúncias pendentes acumuladas
    const { count: pendingReports } = await supabaseAdmin
      .from("content_reports").select("id", { count: "exact", head: true }).eq("status", "pending");
    if ((pendingReports ?? 0) >= 10) {
      drafts.push({
        type: "reports_backlog",
        severity: (pendingReports ?? 0) >= 50 ? "critical" : "warning",
        title: "Denúncias pendentes acumuladas",
        message: `${pendingReports} denúncias aguardam moderação.`,
        metadata: { pending: pendingReports },
      });
    }

    // Insere apenas as que não têm "open" do mesmo tipo (unique index garante)
    const created: string[] = [];
    for (const d of drafts) {
      const { error } = await supabaseAdmin.from("admin_alerts").insert({
        type: d.type, severity: d.severity, title: d.title, message: d.message, metadata: d.metadata as never,
      });
      if (!error) created.push(d.type);
    }
    return { checked: drafts.length, created };
  });
