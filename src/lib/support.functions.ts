import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CATEGORIES = ["bug", "feature", "question", "content_report", "contact"] as const;
const STATUSES = ["open", "in_review", "answered", "closed"] as const;

async function isAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  return !!data;
}

// ---------- USER ----------
export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { category: string; subject: string; message: string; attachmentUrl?: string | null }) =>
    z.object({
      category: z.enum(CATEGORIES),
      subject: z.string().trim().min(2).max(140),
      message: z.string().trim().min(2).max(4000),
      attachmentUrl: z.string().url().max(2000).nullish(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: ticket, error } = await context.supabase
      .from("support_tickets")
      .insert({
        user_id: context.userId,
        category: data.category,
        subject: data.subject,
        attachment_url: data.attachmentUrl ?? null,
        admin_unread_count: 1,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { error: mErr } = await context.supabase.from("support_messages").insert({
      ticket_id: ticket.id,
      sender_id: context.userId,
      sender_role: "user",
      body: data.message,
      attachment_url: data.attachmentUrl ?? null,
    });
    if (mErr) throw new Error(mErr.message);
    return { id: ticket.id };
  });

export const listMyTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("support_tickets")
      .select("id, category, subject, status, last_message_at, created_at, user_unread_count")
      .eq("user_id", context.userId)
      .order("last_message_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getTicket = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: t, error } = await context.supabase
      .from("support_tickets")
      .select("id, user_id, category, subject, status, attachment_url, created_at")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: msgs, error: mErr } = await context.supabase
      .from("support_messages")
      .select("id, sender_role, body, attachment_url, created_at")
      .eq("ticket_id", data.id)
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);
    // Clear unread for the side that opened it
    const admin = await isAdmin(context);
    const field = admin ? "admin_unread_count" : "user_unread_count";
    await context.supabase.from("support_tickets").update({ [field]: 0 }).eq("id", data.id);
    return { ticket: t, messages: msgs ?? [] };
  });

export const replyTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; message: string; attachmentUrl?: string | null }) =>
    z.object({
      id: z.string().uuid(),
      message: z.string().trim().min(1).max(4000),
      attachmentUrl: z.string().url().max(2000).nullish(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const admin = await isAdmin(context);
    const { error } = await context.supabase.from("support_messages").insert({
      ticket_id: data.id,
      sender_id: context.userId,
      sender_role: admin ? "admin" : "user",
      body: data.message,
      attachment_url: data.attachmentUrl ?? null,
    });
    if (error) throw new Error(error.message);
    if (admin) {
      // Bump user unread, set answered, touch last_message_at
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: cur } = await supabaseAdmin.from("support_tickets").select("user_unread_count").eq("id", data.id).single();
      await supabaseAdmin.from("support_tickets").update({
        user_unread_count: ((cur?.user_unread_count as number | undefined) ?? 0) + 1,
        status: "answered",
        last_message_at: new Date().toISOString(),
      }).eq("id", data.id);
    } else {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: cur } = await supabaseAdmin.from("support_tickets").select("admin_unread_count").eq("id", data.id).single();
      await supabaseAdmin.from("support_tickets").update({
        admin_unread_count: ((cur?.admin_unread_count as number | undefined) ?? 0) + 1,
        last_message_at: new Date().toISOString(),
      }).eq("id", data.id);
    }
    return { ok: true };
  });

export const getUnreadSupport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("support_tickets")
      .select("user_unread_count")
      .eq("user_id", context.userId);
    if (error) return { count: 0 };
    return { count: (data ?? []).reduce((a: number, r: any) => a + (r.user_unread_count ?? 0), 0) };
  });

// ---------- ADMIN ----------
export const adminListTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string }) =>
    z.object({ status: z.enum(STATUSES).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("support_tickets")
      .select("id, user_id, category, subject, status, last_message_at, created_at, admin_unread_count")
      .order("last_message_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status);
    const { data: tickets, error } = await q;
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((tickets ?? []).map((t: any) => t.user_id)));
    const profilesRes = ids.length
      ? await supabaseAdmin.from("profiles").select("id, display_name").in("id", ids)
      : { data: [] as any[] };
    const nameById = new Map<string, string>();
    for (const p of profilesRes.data ?? []) nameById.set(p.id, p.display_name ?? "");
    // Emails via auth admin
    const emailById = new Map<string, string>();
    try {
      const { data: list } = await (supabaseAdmin as any).auth.admin.listUsers({ page: 1, perPage: 1000 });
      for (const u of list?.users ?? []) emailById.set(u.id, u.email ?? "");
    } catch {}
    return (tickets ?? []).map((t: any) => ({
      ...t,
      user_name: nameById.get(t.user_id) ?? "",
      user_email: emailById.get(t.user_id) ?? "",
    }));
  });

export const adminUpdateTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string }) =>
    z.object({ id: z.string().uuid(), status: z.enum(STATUSES) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Forbidden");
    const { error } = await context.supabase
      .from("support_tickets")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
