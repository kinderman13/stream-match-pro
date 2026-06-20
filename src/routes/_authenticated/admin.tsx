import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getMyRoles, adminListUsers, adminGrantRole, adminRevokeRole, adminGetDashboard,
  adminGetRetention, adminListLogs, adminGetSettings, adminUpdateSetting,
  adminBlockUser, adminDeleteUser,
  adminListReports, adminResolveReport,
  adminListAlerts, adminResolveAlert, adminRunAlertChecks,
  adminGetDnaStats,
  adminGetResetStats,
} from "@/lib/admin.functions";
import { adminListTickets, adminUpdateTicketStatus, getTicket, replyTicket } from "@/lib/support.functions";


export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    try {
      const me = await getMyRoles();
      if (!me?.isAdmin) throw redirect({ to: "/recommendations" });
    } catch (err) {
      if (err && typeof err === "object" && "to" in (err as any)) throw err;
      throw redirect({ to: "/recommendations" });
    }
  },
  component: AdminPage,
});

const ROLES = ["admin", "moderator", "user"] as const;
const CHART_COLORS = ["#a855f7", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#f43f5e"];

function AdminPage() {
  const dashFn = useServerFn(adminGetDashboard);
  const usersFn = useServerFn(adminListUsers);
  const grantFn = useServerFn(adminGrantRole);
  const revokeFn = useServerFn(adminRevokeRole);
  const retentionFn = useServerFn(adminGetRetention);
  const logsFn = useServerFn(adminListLogs);
  const settingsFn = useServerFn(adminGetSettings);
  const updateSettingFn = useServerFn(adminUpdateSetting);
  const blockFn = useServerFn(adminBlockUser);
  const deleteFn = useServerFn(adminDeleteUser);
  const reportsFn = useServerFn(adminListReports);
  const resolveReportFn = useServerFn(adminResolveReport);
  const alertsFn = useServerFn(adminListAlerts);
  const resolveAlertFn = useServerFn(adminResolveAlert);
  const runChecksFn = useServerFn(adminRunAlertChecks);
  const qc = useQueryClient();
  type Tab = "overview" | "users" | "rankings" | "platforms" | "recs" | "retention" | "support" | "moderation" | "alerts" | "logs" | "settings" | "dna" | "resets";
  const [tab, setTab] = useState<Tab>("overview");
  const dnaStatsFn = useServerFn(adminGetDnaStats);
  const dnaStatsQ = useQuery({ queryKey: ["admin-dna"], queryFn: () => dnaStatsFn(), enabled: tab === "dna" });
  const resetStatsFn = useServerFn(adminGetResetStats);
  const resetStatsQ = useQuery({ queryKey: ["admin-resets"], queryFn: () => resetStatsFn(), enabled: tab === "resets" });

  const ticketsListFn = useServerFn(adminListTickets);
  const ticketGetFn = useServerFn(getTicket);
  const ticketReplyFn = useServerFn(replyTicket);
  const ticketStatusFn = useServerFn(adminUpdateTicketStatus);

  const dashQ = useQuery({ queryKey: ["admin-dash"], queryFn: () => dashFn() });
  const usersQ = useQuery({ queryKey: ["admin-users"], queryFn: () => usersFn() });
  const retentionQ = useQuery({ queryKey: ["admin-retention"], queryFn: () => retentionFn(), enabled: tab === "retention" });
  const logsQ = useQuery({ queryKey: ["admin-logs"], queryFn: () => logsFn({ data: {} }), enabled: tab === "logs" });
  const settingsQ = useQuery({ queryKey: ["admin-settings"], queryFn: () => settingsFn(), enabled: tab === "settings" });
  const reportsQ = useQuery({ queryKey: ["admin-reports"], queryFn: () => reportsFn({ data: {} }), enabled: tab === "moderation" });
  const alertsQ = useQuery({ queryKey: ["admin-alerts"], queryFn: () => alertsFn({ data: {} }), enabled: tab === "alerts" });
  const ticketsQ = useQuery({ queryKey: ["admin-tickets"], queryFn: () => ticketsListFn({ data: {} }), enabled: tab === "support" });

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Visão Geral" },
    { id: "users", label: "Usuários" },
    { id: "rankings", label: "Rankings" },
    { id: "platforms", label: "Plataformas" },
    { id: "recs", label: "Recomendações" },
    { id: "retention", label: "Retenção" },
    { id: "support", label: "Suporte" },
    { id: "moderation", label: "Moderação" },
    { id: "alerts", label: "Alertas" },
    { id: "logs", label: "Logs" },
    { id: "dna", label: "DNA" },
    { id: "resets", label: "Resets" },
    { id: "settings", label: "Configurações" },
  ];

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Painel Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Centro de inteligência do StreamMatch.
          </p>
        </div>
        <Link to="/recommendations" className="text-sm text-muted-foreground hover:text-foreground">
          ← voltar ao app
        </Link>
      </div>

      <nav className="mt-6 flex gap-1 border-b border-border/60 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition ${
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "overview" && (dashQ.data ? <Overview data={dashQ.data} /> : <Loading q={dashQ} />)}
        {tab === "rankings" && (dashQ.data ? <Rankings data={dashQ.data} /> : <Loading q={dashQ} />)}
        {tab === "platforms" && (dashQ.data ? <Platforms data={dashQ.data} /> : <Loading q={dashQ} />)}
        {tab === "recs" && (dashQ.data ? <Recs data={dashQ.data} /> : <Loading q={dashQ} />)}
        {tab === "users" && (
          <Users usersQ={usersQ} grantFn={grantFn} revokeFn={revokeFn} blockFn={blockFn} deleteFn={deleteFn} qc={qc} />
        )}
        {tab === "retention" && <Retention q={retentionQ} />}
        {tab === "support" && <Support q={ticketsQ} getFn={ticketGetFn} replyFn={ticketReplyFn} statusFn={ticketStatusFn} qc={qc} />}
        {tab === "moderation" && <Moderation q={reportsQ} resolve={resolveReportFn} qc={qc} />}
        {tab === "alerts" && <Alerts q={alertsQ} resolve={resolveAlertFn} runChecks={runChecksFn} qc={qc} />}
        {tab === "logs" && <Logs q={logsQ} />}
        {tab === "settings" && <Settings q={settingsQ} update={updateSettingFn} qc={qc} />}
        {tab === "dna" && <DnaStats q={dnaStatsQ} />}
        {tab === "resets" && <ResetStats q={resetStatsQ} />}
      </div>
    </div>
  );
}

function Loading({ q }: { q: { isLoading: boolean; error: unknown } }) {
  if (q.error) return <div className="text-destructive">Erro: {(q.error as Error).message}</div>;
  if (q.isLoading) return <div className="text-muted-foreground">Carregando…</div>;
  return null;
}

function Kpi({ label, value, icon, tone = "default" }: { label: string; value: string | number; icon: string; tone?: "default" | "good" | "warn" | "bad" }) {
  const toneClass = {
    default: "from-primary/15 to-primary/5 border-primary/20",
    good: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/20",
    warn: "from-amber-500/15 to-amber-500/5 border-amber-500/20",
    bad: "from-rose-500/15 to-rose-500/5 border-rose-500/20",

  }[tone];
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${toneClass}`}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{icon} {label}</div>
      <div className="mt-1 text-2xl font-black tabular-nums">{value}</div>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Overview({ data }: { data: any }) {
  const { kpis, engagement, series } = data;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon="👤" label="Total de usuários" value={kpis.totalUsers} />
        <Kpi icon="🟢" label="Ativos hoje" value={kpis.active1} tone="good" />
        <Kpi icon="🟢" label="Ativos 7 dias" value={kpis.active7} tone="good" />
        <Kpi icon="🟢" label="Ativos 30 dias" value={kpis.active30} tone="good" />
        <Kpi icon="🔴" label="Inativos" value={kpis.inactive} tone="bad" />
        <Kpi icon="📈" label="Novos hoje" value={kpis.newToday} />
        <Kpi icon="📈" label="Novos na semana" value={kpis.newWeek} />
        <Kpi icon="📈" label="Novos no mês" value={kpis.newMonth} />
      </div>

      <Section title="Engajamento">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi icon="⭐" label="Avaliações" value={engagement.totalRatings} />
          <Kpi icon="👍" label="Curtidas" value={engagement.likes} tone="good" />
          <Kpi icon="👎" label="Rejeições" value={engagement.dislikes} tone="bad" />
          <Kpi icon="✅" label="Assistidos" value={engagement.watched} />
          <Kpi icon="🔖" label="Salvos" value={engagement.savedCount} />
          <Kpi icon="📊" label="Nota média" value={engagement.avgRating.toFixed(2)} />
          <Kpi icon="🤖" label="Recomendações" value={engagement.totalRecs} />
          <Kpi icon="⏭️" label="Pulados" value={engagement.skips} tone="warn" />
        </div>
      </Section>

      <Section title="Crescimento de usuários (30 dias)">
        <ChartCard>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={series.growth}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
              <Area type="monotone" dataKey="value" stroke="#a855f7" fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Novos cadastros por dia">
          <ChartCard>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={series.signups}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Section>
        <Section title="Avaliações por dia">
          <ChartCard>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={series.ratings}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="value" stroke="#ec4899" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Section>
      </div>
    </>
  );
}

function ChartCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border/60 bg-card/40 p-3">{children}</div>;
}

function RankList({ title, items, valueLabel = "curtidas" }: { title: string; items: any[]; valueLabel?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <h3 className="mb-2 font-semibold">{title}</h3>
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground">Sem dados ainda.</div>
      ) : (
        <ol className="space-y-1.5 text-sm">
          {items.map((it, i) => (
            <li key={`${it.media_type}:${it.tmdb_id}`} className="flex items-center justify-between gap-2">
              <span className="truncate">
                <span className="mr-2 text-muted-foreground tabular-nums">#{i + 1}</span>
                {it.title}
              </span>
              <span className="shrink-0 rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary tabular-nums">
                {(it.count ?? it.avg?.toFixed(2)) ?? "—"} {it.count != null ? valueLabel : ""}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Rankings({ data }: { data: any }) {
  const r = data.rankings;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <RankList title="🎬 Filmes mais curtidos" items={r.topLikedMovies} />
      <RankList title="📺 Séries mais curtidas" items={r.topLikedSeries} />
      <RankList title="🎬 Filmes mais rejeitados" items={r.topDislikedMovies} valueLabel="rejeições" />
      <RankList title="📺 Séries mais rejeitadas" items={r.topDislikedSeries} valueLabel="rejeições" />
      <RankList title="⭐ Maior nota média" items={r.topRated} valueLabel="" />
      <RankList title="⭐ Menor nota média" items={r.bottomRated} valueLabel="" />
    </div>
  );
}

function Platforms({ data }: { data: any }) {
  const plats = data.platforms;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ChartCard>
        <h3 className="mb-2 font-semibold">Distribuição</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={plats} dataKey="count" nameKey="name" outerRadius={100} label={(e: any) => e.name}>
              {plats.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
      <div className="rounded-xl border border-border/60 bg-card/40 p-4">
        <h3 className="mb-3 font-semibold">Ranking de plataformas</h3>
        <ol className="space-y-2 text-sm">
          {plats.map((p: any, i: number) => (
            <li key={p.id} className="flex items-center justify-between">
              <span>
                <span className="mr-2 text-muted-foreground tabular-nums">#{i + 1}</span>
                {p.name}
              </span>
              <span className="tabular-nums text-muted-foreground">{p.count} usuários · {p.pct}%</span>
            </li>
          ))}
          {plats.length === 0 && <li className="text-muted-foreground">Sem dados.</li>}
        </ol>
      </div>
    </div>
  );
}

function Recs({ data }: { data: any }) {
  const r = data.recommendations;
  const w = data.watchNow ?? { totalClicks: 0, trailerClicks: 0, platforms: [], topContent: [], conversionRate: 0 };
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi icon="🤖" label="Total geradas" value={r.totalRecs} />
        <Kpi icon="✅" label="Taxa de aceitação" value={`${r.acceptanceRate}%`} tone="good" />
        <Kpi icon="❌" label="Taxa de rejeição" value={`${r.rejectionRate}%`} tone="bad" />
        <Kpi icon="📺" label="Taxa de assistidos" value={`${r.watchedRate}%`} />
        <Kpi icon="🎯" label="Conversão" value={`${r.conversion}%`} tone="good" />
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Métricas calculadas comparando interações (like/dislike/watched) contra total de recomendações geradas.
      </p>

      <Section title="▶️ Assistir Agora">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi icon="▶️" label="Cliques Assistir Agora" value={w.totalClicks} tone="good" />
          <Kpi icon="🎬" label="Cliques em Trailer" value={w.trailerClicks} />
          <Kpi icon="🎯" label="Conversão recs → play" value={`${w.conversionRate}%`} tone="good" />
          <Kpi icon="🏷️" label="Plataformas distintas" value={w.platforms.length} />
        </div>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 font-bold">Cliques por plataforma</h3>
            {w.platforms.length === 0 ? (
              <div className="text-xs text-muted-foreground">Nenhum clique registrado ainda.</div>
            ) : (
              <ul className="space-y-1 text-sm">
                {w.platforms.map((p: any) => (
                  <li key={p.id} className="flex justify-between"><span>{p.name}</span><span className="font-mono">{p.count}</span></li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 font-bold">Top conteúdo (cliques)</h3>
            {w.topContent.length === 0 ? (
              <div className="text-xs text-muted-foreground">Sem dados ainda.</div>
            ) : (
              <ul className="space-y-1 text-sm">
                {w.topContent.map((c: any) => (
                  <li key={`${c.media_type}:${c.tmdb_id}`} className="flex justify-between gap-2">
                    <span className="truncate">{c.media_type === "tv" ? "📺" : "🎬"} {c.title}</span>
                    <span className="font-mono">{c.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}

function downloadCSV(filename: string, rows: any[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(title: string, rows: any[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(10);
  doc.text(new Date().toLocaleString("pt-BR"), 14, 22);
  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => headers.map((h) => String(r[h] ?? ""))),
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [168, 85, 247] },
  });
  doc.save(`${title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}

function Users({ usersQ, grantFn, revokeFn, blockFn, deleteFn, qc }: any) {
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "blocked">("all");
  const [minRatings, setMinRatings] = useState(0);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-users"] });
  const grantM = useMutation({ mutationFn: (v: any) => grantFn({ data: v }), onSuccess: invalidate });
  const revokeM = useMutation({ mutationFn: (v: any) => revokeFn({ data: v }), onSuccess: invalidate });
  const blockM = useMutation({ mutationFn: (v: any) => blockFn({ data: v }), onSuccess: invalidate });
  const deleteM = useMutation({ mutationFn: (v: any) => deleteFn({ data: v }), onSuccess: invalidate });

  const filtered = useMemo(() => {
    const list = usersQ.data ?? [];
    const f = filter.toLowerCase();
    return list.filter((u: any) => {
      if (f && !(u.displayName ?? "").toLowerCase().includes(f) && !u.id.includes(f)) return false;
      if (statusFilter === "active" && !u.active) return false;
      if (statusFilter === "inactive" && u.active) return false;
      if (statusFilter === "blocked" && !u.blocked) return false;
      if (u.ratingsCount < minRatings) return false;
      return true;
    });
  }, [usersQ.data, filter, statusFilter, minRatings]);

  const exportRows = useMemo(() => filtered.map((u: any) => ({
    nome: u.displayName ?? "",
    id: u.id,
    cadastro: u.createdAt ? new Date(u.createdAt).toLocaleString("pt-BR") : "",
    ultimo_acesso: u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString("pt-BR") : "—",
    status: u.blocked ? "Bloqueado" : u.active ? "Ativo" : "Inativo",
    avaliacoes: u.ratingsCount,
    nota_media: u.avgRating,
    curtidas: u.likes,
    assistidos: u.watched,
    papeis: u.roles.join(", "),
  })), [filtered]);

  return (
    <div>
      <div className="mb-3 grid gap-2 md:grid-cols-[1fr,auto,auto,auto,auto]">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar por nome ou ID…"
          className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
        >
          <option value="all">Todos status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="blocked">Bloqueados</option>
        </select>
        <input
          type="number"
          min={0}
          value={minRatings}
          onChange={(e) => setMinRatings(Number(e.target.value) || 0)}
          placeholder="Mín. avaliações"
          className="w-32 rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
        />
        <button
          onClick={() => downloadCSV("usuarios.csv", exportRows)}
          className="rounded-md bg-secondary px-3 py-2 text-sm font-medium hover:bg-secondary/80"
        >CSV</button>
        <button
          onClick={() => downloadPDF("Usuários StreamMatch", exportRows)}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >PDF</button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left">
            <tr>
              <th className="px-3 py-2">Usuário</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Cadastro</th>
              <th className="px-3 py-2">Último acesso</th>
              <th className="px-3 py-2 text-right">Aval.</th>
              <th className="px-3 py-2 text-right">Nota</th>
              <th className="px-3 py-2 text-right">👍/👎/✅</th>
              <th className="px-3 py-2">Papéis</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u: any) => (
              <tr key={u.id} className="border-t border-border/40 align-top">
                <td className="px-3 py-2">
                  <div className="font-medium">{u.displayName || "(sem nome)"}</div>
                  <div className="text-[10px] text-muted-foreground">{u.id}</div>
                </td>
                <td className="px-3 py-2">
                  {u.blocked ? (
                    <span className="rounded bg-rose-500/15 px-2 py-0.5 text-xs text-rose-400">Bloqueado</span>
                  ) : u.active ? (
                    <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">Ativo</span>
                  ) : (
                    <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">Inativo</span>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground text-xs">
                  {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-3 py-2 text-muted-foreground text-xs">
                  {u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleDateString("pt-BR") : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{u.ratingsCount}</td>
                <td className="px-3 py-2 text-right tabular-nums">{u.avgRating || "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums text-xs">
                  {u.likes}/{u.dislikes}/{u.watched}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.length === 0 ? (
                      <span className="text-muted-foreground text-xs">—</span>
                    ) : u.roles.map((r: string) => (
                      <span key={r} className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">{r}</span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <details className="inline-block">
                    <summary className="cursor-pointer rounded bg-secondary px-2 py-1 text-xs hover:bg-secondary/80">⋯</summary>
                    <div className="mt-1 flex flex-col items-stretch gap-1 rounded-md border border-border/60 bg-popover p-2 text-xs shadow-lg">
                      {ROLES.map((r) => {
                        const has = u.roles.includes(r);
                        return (
                          <button
                            key={r}
                            onClick={async () => {
                              try {
                                if (has) await revokeM.mutateAsync({ userId: u.id, role: r });
                                else await grantM.mutateAsync({ userId: u.id, role: r });
                              } catch (e: any) { alert(e.message); }
                            }}
                            className={`rounded px-2 py-1 text-left ${has ? "bg-primary/15 text-primary" : "hover:bg-secondary"}`}
                          >{has ? `Remover ${r}` : `Tornar ${r}`}</button>
                        );
                      })}
                      <hr className="my-1 border-border/40" />
                      <button
                        onClick={async () => {
                          const reason = u.blocked ? undefined : prompt("Motivo do bloqueio:") ?? undefined;
                          try { await blockM.mutateAsync({ userId: u.id, block: !u.blocked, reason }); }
                          catch (e: any) { alert(e.message); }
                        }}
                        className="rounded px-2 py-1 text-left text-amber-400 hover:bg-amber-500/10"
                      >{u.blocked ? "Desbloquear" : "Bloquear"}</button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Excluir permanentemente ${u.displayName || u.id}?`)) return;
                          try { await deleteM.mutateAsync({ userId: u.id }); }
                          catch (e: any) { alert(e.message); }
                        }}
                        className="rounded px-2 py-1 text-left text-rose-400 hover:bg-rose-500/10"
                      >Excluir conta</button>
                    </div>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {usersQ.isLoading && <div className="p-6 text-center text-muted-foreground">Carregando…</div>}
        {filtered.length === 0 && !usersQ.isLoading && (
          <div className="p-6 text-center text-muted-foreground">Nenhum usuário.</div>
        )}
      </div>
    </div>
  );
}

function Retention({ q }: { q: any }) {
  if (q.isLoading) return <div className="text-muted-foreground">Carregando…</div>;
  if (q.error) return <div className="text-destructive">Erro: {(q.error as Error).message}</div>;
  if (!q.data) return null;
  const items: { label: string; data: any }[] = [
    { label: "1 dia", data: q.data.d1 },
    { label: "7 dias", data: q.data.d7 },
    { label: "30 dias", data: q.data.d30 },
    { label: "90 dias", data: q.data.d90 },
  ];
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((it) => (
          <Kpi key={it.label} icon="🔁" label={`Retenção ${it.label}`} value={`${it.data.rate}%`} tone="good" />
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-border/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left">
            <tr><th className="px-4 py-2">Janela</th><th className="px-4 py-2 text-right">Elegíveis</th><th className="px-4 py-2 text-right">Retidos</th><th className="px-4 py-2 text-right">Taxa</th></tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.label} className="border-t border-border/40">
                <td className="px-4 py-2">{it.label}</td>
                <td className="px-4 py-2 text-right tabular-nums">{it.data.eligible}</td>
                <td className="px-4 py-2 text-right tabular-nums">{it.data.retained}</td>
                <td className="px-4 py-2 text-right tabular-nums">{it.data.rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Retenção = usuários cadastrados há mais que N dias que tiveram atividade nos últimos N dias.
      </p>
    </>
  );
}

function Logs({ q }: { q: any }) {
  if (q.isLoading) return <div className="text-muted-foreground">Carregando…</div>;
  if (q.error) return <div className="text-destructive">Erro: {(q.error as Error).message}</div>;
  const rows = q.data ?? [];
  const exportRows = rows.map((r: any) => ({
    data: new Date(r.created_at).toLocaleString("pt-BR"),
    categoria: r.category,
    nivel: r.level,
    mensagem: r.message,
    user_id: r.user_id ?? "",
  }));
  return (
    <div>
      <div className="mb-3 flex justify-end gap-2">
        <button onClick={() => downloadCSV("logs.csv", exportRows)} className="rounded-md bg-secondary px-3 py-2 text-sm">CSV</button>
        <button onClick={() => downloadPDF("Logs do Sistema", exportRows)} className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">PDF</button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left">
            <tr><th className="px-3 py-2">Data</th><th className="px-3 py-2">Nível</th><th className="px-3 py-2">Categoria</th><th className="px-3 py-2">Mensagem</th><th className="px-3 py-2">Usuário</th></tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t border-border/40 align-top">
                <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                <td className="px-3 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${
                    r.level === "error" ? "bg-rose-500/15 text-rose-400"
                    : r.level === "warn" ? "bg-amber-500/15 text-amber-400"
                    : "bg-primary/15 text-primary"
                  }`}>{r.level}</span>
                </td>
                <td className="px-3 py-2 text-xs">{r.category}</td>
                <td className="px-3 py-2">{r.message}</td>
                <td className="px-3 py-2 text-[10px] text-muted-foreground">{r.user_id ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum log registrado ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const SETTING_META: Record<string, { label: string; help: string; min?: number; max?: number; step?: number }> = {
  min_ratings_for_recs: { label: "Mínimo de avaliações para gerar recomendações", help: "Quantos conteúdos o usuário precisa avaliar antes de receber recomendações.", min: 1, max: 20 },
  recs_to_generate: { label: "Quantidade de recomendações por sessão", help: "Quantos itens são sugeridos por vez.", min: 5, max: 100 },
  weight_like: { label: "Peso de Curtida", help: "Impacto positivo de uma curtida no algoritmo.", step: 0.1 },
  weight_watched: { label: "Peso de Assistido", help: "Impacto positivo de marcar como assistido.", step: 0.1 },
  weight_dislike: { label: "Peso de Rejeição", help: "Impacto negativo de uma rejeição (use valor negativo).", step: 0.1 },
};

function Settings({ q, update, qc }: any) {
  const updateM = useMutation({
    mutationFn: (v: { key: string; value: unknown }) => update({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-settings"] }),
  });
  if (q.isLoading) return <div className="text-muted-foreground">Carregando…</div>;
  if (q.error) return <div className="text-destructive">Erro: {(q.error as Error).message}</div>;
  const settings = q.data ?? {};
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Object.entries(SETTING_META).map(([key, meta]) => {
        const value = settings[key];
        return (
          <div key={key} className="rounded-lg border border-border/60 bg-card/40 p-4">
            <label className="block text-sm font-semibold">{meta.label}</label>
            <p className="mt-1 text-xs text-muted-foreground">{meta.help}</p>
            <div className="mt-2 flex gap-2">
              <input
                type="number"
                defaultValue={Number(value ?? 0)}
                min={meta.min}
                max={meta.max}
                step={meta.step ?? 1}
                onBlur={async (e) => {
                  const next = Number(e.target.value);
                  if (Number.isNaN(next) || next === Number(value)) return;
                  try { await updateM.mutateAsync({ key, value: next }); }
                  catch (err: any) { alert(err.message); }
                }}
                className="w-32 rounded-md border border-border/60 bg-background px-3 py-2 text-sm tabular-nums"
              />
              <span className="self-center text-xs text-muted-foreground">atual: {String(value ?? "—")}</span>
            </div>
          </div>
        );
      })}
      <p className="md:col-span-2 mt-2 text-xs text-muted-foreground">
        Alterações são salvas ao sair do campo. Os pesos influenciam o algoritmo de recomendação.
      </p>
    </div>
  );
}


function Moderation({ q, resolve, qc }: any) {
  const [filter, setFilter] = useState<"pending" | "resolved" | "dismissed" | "all">("pending");
  const resolveM = useMutation({
    mutationFn: (v: { id: string; status: "resolved" | "dismissed"; notes?: string }) => resolve({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reports"] }),
  });
  if (q.isLoading) return <div className="text-muted-foreground">Carregando…</div>;
  if (q.error) return <div className="text-destructive">Erro: {(q.error as Error).message}</div>;
  const rows = (q.data ?? []).filter((r: any) => filter === "all" ? true : r.status === filter);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Filtro:</span>
        {(["pending", "resolved", "dismissed", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1 text-xs ${filter === s ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
          >
            {s === "pending" ? "Pendentes" : s === "resolved" ? "Resolvidas" : s === "dismissed" ? "Descartadas" : "Todas"}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{rows.length} registro(s)</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Denunciante</th>
              <th className="px-3 py-2">Alvo</th>
              <th className="px-3 py-2">Motivo</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t border-border/40 align-top">
                <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                <td className="px-3 py-2 text-xs">{r.reporter_name}</td>
                <td className="px-3 py-2 text-xs">
                  <div className="font-semibold">{r.target_label || r.target_id}</div>
                  <div className="text-[10px] text-muted-foreground">{r.target_type} · {r.target_id}</div>
                </td>
                <td className="px-3 py-2">
                  <div className="text-sm">{r.reason}</div>
                  {r.details && <div className="mt-1 text-[11px] text-muted-foreground line-clamp-3">{r.details}</div>}
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${
                    r.status === "pending" ? "bg-amber-500/15 text-amber-400"
                    : r.status === "resolved" ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-muted text-muted-foreground"
                  }`}>{r.status}</span>
                  {r.moderator_notes && <div className="mt-1 text-[10px] text-muted-foreground line-clamp-2">{r.moderator_notes}</div>}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.status === "pending" && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={async () => {
                          const notes = prompt("Notas (opcional):") ?? undefined;
                          try { await resolveM.mutateAsync({ id: r.id, status: "resolved", notes }); }
                          catch (err: any) { alert(err.message); }
                        }}
                        className="rounded-md bg-emerald-500/20 px-3 py-1 text-xs text-emerald-400 hover:bg-emerald-500/30"
                      >Resolver</button>
                      <button
                        onClick={async () => {
                          try { await resolveM.mutateAsync({ id: r.id, status: "dismissed" }); }
                          catch (err: any) { alert(err.message); }
                        }}
                        className="rounded-md bg-secondary px-3 py-1 text-xs"
                      >Descartar</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma denúncia neste filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Alerts({ q, resolve, runChecks, qc }: any) {
  const resolveM = useMutation({
    mutationFn: (v: { id: string }) => resolve({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-alerts"] }),
  });
  const runM = useMutation({
    mutationFn: () => runChecks(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-alerts"] }),
  });
  if (q.isLoading) return <div className="text-muted-foreground">Carregando…</div>;
  if (q.error) return <div className="text-destructive">Erro: {(q.error as Error).message}</div>;
  const rows = q.data ?? [];
  const openCount = rows.filter((r: any) => r.status === "open").length;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm">
          <span className="font-semibold">{openCount}</span> alerta(s) aberto(s) de {rows.length}
        </div>
        <button
          onClick={() => runM.mutate()}
          disabled={runM.isPending}
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60"
        >
          {runM.isPending ? "Verificando…" : "Verificar agora"}
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((a: any) => (
          <div
            key={a.id}
            className={`rounded-lg border p-4 ${
              a.severity === "critical" ? "border-rose-500/40 bg-rose-500/5"
              : a.severity === "warning" ? "border-amber-500/40 bg-amber-500/5"
              : "border-border/60 bg-card/40"
            } ${a.status === "resolved" ? "opacity-60" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] uppercase ${
                    a.severity === "critical" ? "bg-rose-500/20 text-rose-300"
                    : a.severity === "warning" ? "bg-amber-500/20 text-amber-300"
                    : "bg-primary/20 text-primary"
                  }`}>{a.severity}</span>
                  <span className="text-xs text-muted-foreground">{a.type}</span>
                  <span className="text-xs text-muted-foreground">· {new Date(a.created_at).toLocaleString("pt-BR")}</span>
                </div>
                <h4 className="mt-1 font-semibold">{a.title}</h4>
                {a.message && <p className="mt-1 text-sm text-muted-foreground">{a.message}</p>}
                {a.metadata && Object.keys(a.metadata).length > 0 && (
                  <pre className="mt-2 overflow-x-auto rounded bg-background/60 p-2 text-[10px] text-muted-foreground">
{JSON.stringify(a.metadata, null, 2)}
                  </pre>
                )}
              </div>
              {a.status === "open" ? (
                <button
                  onClick={async () => {
                    try { await resolveM.mutateAsync({ id: a.id }); }
                    catch (err: any) { alert(err.message); }
                  }}
                  className="shrink-0 rounded-md bg-emerald-500/20 px-3 py-1 text-xs text-emerald-400 hover:bg-emerald-500/30"
                >Marcar como resolvido</button>
              ) : (
                <span className="shrink-0 rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-400">resolvido</span>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="rounded-lg border border-border/60 bg-card/40 p-8 text-center text-muted-foreground">
            Nenhum alerta. Clique em "Verificar agora" para rodar as heurísticas.
          </div>
        )}
      </div>
    </div>
  );
}

const TICKET_STATUS_LABEL: Record<string, string> = {
  open: "Aberto", in_review: "Em análise", answered: "Respondido", closed: "Fechado",
};
const TICKET_CATEGORY_LABEL: Record<string, string> = {
  bug: "Problema", feature: "Sugestão", question: "Dúvida", content_report: "Denúncia", contact: "Contato",
};

function Support({
  q, getFn, replyFn, statusFn, qc,
}: { q: any; getFn: any; replyFn: any; statusFn: any; qc: any }) {
  const [filter, setFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const threadQ = useQuery({
    queryKey: ["admin-ticket", selectedId],
    queryFn: () => getFn({ data: { id: selectedId! } }),
    enabled: !!selectedId,
  });
  const replyMut = useMutation({
    mutationFn: async () => replyFn({ data: { id: selectedId!, message: reply } }),
    onSuccess: async () => {
      setReply("");
      await qc.invalidateQueries({ queryKey: ["admin-ticket", selectedId] });
      await qc.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
  });
  const statusMut = useMutation({
    mutationFn: async (status: string) => statusFn({ data: { id: selectedId!, status } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-ticket", selectedId] });
      await qc.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
  });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  const tickets = (q.data ?? []).filter((t: any) => filter === "all" || t.status === filter);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {["all", "open", "in_review", "answered", "closed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 text-xs ${filter === f ? "border-primary text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {f === "all" ? "Todos" : TICKET_STATUS_LABEL[f]}
            </button>
          ))}
        </div>
        <ul className="divide-y divide-border/60 rounded-md border border-border/60">
          {tickets.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhuma solicitação.</li>
          )}
          {tickets.map((t: any) => (
            <li key={t.id}>
              <button
                onClick={() => setSelectedId(t.id)}
                className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/60 ${selectedId === t.id ? "bg-secondary/60" : ""}`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{t.subject}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {t.user_name || t.user_email || t.user_id.slice(0, 8)} · {TICKET_CATEGORY_LABEL[t.category]} · {new Date(t.last_message_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {TICKET_STATUS_LABEL[t.status]}
                  </span>
                  {t.admin_unread_count > 0 && <span className="h-2 w-2 rounded-full bg-primary" />}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-md border border-border/60 p-4">
        {!selectedId && <p className="text-sm text-muted-foreground">Selecione uma solicitação para ver os detalhes.</p>}
        {selectedId && threadQ.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {selectedId && threadQ.data && (
          <div className="flex h-full flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
              <div className="min-w-0">
                <div className="text-base font-semibold">{threadQ.data.ticket.subject}</div>
                <div className="text-xs text-muted-foreground">
                  {TICKET_CATEGORY_LABEL[threadQ.data.ticket.category]} · {new Date(threadQ.data.ticket.created_at).toLocaleString()}
                </div>
              </div>
              <select
                value={threadQ.data.ticket.status}
                onChange={(e) => statusMut.mutate(e.target.value)}
                className="rounded border border-border bg-background px-2 py-1 text-xs"
              >
                {Object.entries(TICKET_STATUS_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <ul className="flex-1 space-y-3 overflow-y-auto">
              {threadQ.data.messages.map((m: any) => (
                <li key={m.id} className={`flex ${m.sender_role === "admin" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.sender_role === "admin" ? "bg-primary/10" : "bg-secondary"}`}>
                    <div className="whitespace-pre-wrap">{m.body}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {m.sender_role === "admin" ? "Admin" : "Usuário"} · {new Date(m.created_at).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <form
              className="flex items-end gap-2 border-t border-border/60 pt-3"
              onSubmit={(e) => { e.preventDefault(); if (reply.trim()) replyMut.mutate(); }}
            >
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                placeholder="Escreva uma resposta…"
                className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={replyMut.isPending || !reply.trim()}
                className="rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {replyMut.isPending ? "Enviando…" : "Enviar resposta"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function DnaStats({ q }: { q: any }) {
  if (q.isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  const d = q.data;
  if (!d) return null;
  const ANIMAL_LABEL: Record<string, string> = {
    lion: "🦁 Leão", owl: "🦉 Coruja", wolf: "🐺 Lobo", eagle: "🦅 Águia", bear: "🐻 Urso",
    dolphin: "🐬 Golfinho", fox: "🦊 Raposa", tiger: "🐯 Tigre", penguin: "🐧 Pinguim", dragon: "🐲 Dragão",
  };
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi icon="🧬" label="Total de DNAs gerados" value={d.totalDnas} />
        <Kpi icon="📤" label="Compartilhamentos" value={d.totalShares} />
        <Kpi icon="📊" label="Taxa de share" value={`${d.shareRate}%`} />
        <Kpi icon="🦁" label="Animal mais comum" value={ANIMAL_LABEL[d.mostCommonAnimal] ?? "—"} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-bold">Animais por frequência</h3>
          <ul className="space-y-1 text-sm">
            {d.animals.map(([k, n]: [string, number]) => (
              <li key={k} className="flex justify-between"><span>{ANIMAL_LABEL[k] ?? k}</span><span className="font-mono">{n}</span></li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-bold">Canais de compartilhamento</h3>
          <ul className="space-y-1 text-sm">
            {d.channels.map(([k, n]: [string, number]) => (
              <li key={k} className="flex justify-between"><span>{k}</span><span className="font-mono">{n}</span></li>
            ))}
          </ul>
          {d.channels.length === 0 && <div className="text-xs text-muted-foreground">Nenhum compartilhamento ainda.</div>}
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-bold">Raridades</h3>
          <ul className="space-y-1 text-sm">
            {d.rarities.map(([k, n]: [string, number]) => (
              <li key={k} className="flex justify-between"><span>{k}</span><span className="font-mono">{n}</span></li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-bold">Mais raro / mais compartilhado</h3>
          <div className="space-y-1 text-sm">
            <div>Mais raro: <strong>{ANIMAL_LABEL[d.rarestAnimal] ?? "—"}</strong></div>
            <div>Mais compartilhado: <strong>{ANIMAL_LABEL[d.mostSharedAnimal] ?? "—"}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

