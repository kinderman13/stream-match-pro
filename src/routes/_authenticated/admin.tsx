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
} from "@/lib/admin.functions";


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
  const qc = useQueryClient();
  type Tab = "overview" | "users" | "rankings" | "platforms" | "recs" | "retention" | "logs" | "settings";
  const [tab, setTab] = useState<Tab>("overview");

  const dashQ = useQuery({ queryKey: ["admin-dash"], queryFn: () => dashFn() });
  const usersQ = useQuery({ queryKey: ["admin-users"], queryFn: () => usersFn() });
  const retentionQ = useQuery({ queryKey: ["admin-retention"], queryFn: () => retentionFn(), enabled: tab === "retention" });
  const logsQ = useQuery({ queryKey: ["admin-logs"], queryFn: () => logsFn({ data: {} }), enabled: tab === "logs" });
  const settingsQ = useQuery({ queryKey: ["admin-settings"], queryFn: () => settingsFn(), enabled: tab === "settings" });

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Visão Geral" },
    { id: "users", label: "Usuários" },
    { id: "rankings", label: "Rankings" },
    { id: "platforms", label: "Plataformas" },
    { id: "recs", label: "Recomendações" },
    { id: "retention", label: "Retenção" },
    { id: "logs", label: "Logs" },
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
        {tab === "logs" && <Logs q={logsQ} />}
        {tab === "settings" && <Settings q={settingsQ} update={updateSettingFn} qc={qc} />}
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

function Users({ usersQ, grantFn, revokeFn, qc }: any) {
  const [filter, setFilter] = useState("");
  const grantM = useMutation({
    mutationFn: (v: any) => grantFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
  const revokeM = useMutation({
    mutationFn: (v: any) => revokeFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const filtered = useMemo(() => {
    const list = usersQ.data ?? [];
    if (!filter) return list;
    const f = filter.toLowerCase();
    return list.filter((u: any) =>
      (u.displayName ?? "").toLowerCase().includes(f) || u.id.includes(f),
    );
  }, [usersQ.data, filter]);

  const exportRows = useMemo(() => filtered.map((u: any) => ({
    nome: u.displayName ?? "",
    id: u.id,
    cadastro: new Date(u.createdAt).toLocaleString("pt-BR"),
    papeis: u.roles.join(", "),
  })), [filtered]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar por nome ou ID…"
          className="flex-1 min-w-[200px] rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
        />
        <button
          onClick={() => downloadCSV("usuarios.csv", exportRows)}
          className="rounded-md bg-secondary px-3 py-2 text-sm font-medium hover:bg-secondary/80"
        >Exportar CSV</button>
        <button
          onClick={() => downloadPDF("Usuários StreamMatch", exportRows)}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >Exportar PDF</button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left">
            <tr>
              <th className="px-4 py-2">Usuário</th>
              <th className="px-4 py-2">Cadastro</th>
              <th className="px-4 py-2">Papéis</th>
              <th className="px-4 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u: any) => (
              <tr key={u.id} className="border-t border-border/40">
                <td className="px-4 py-3">
                  <div className="font-medium">{u.displayName || "(sem nome)"}</div>
                  <div className="text-xs text-muted-foreground">{u.id}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3">
                  {u.roles.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r: string) => (
                        <span key={r} className="rounded bg-primary/15 px-2 py-0.5 text-xs text-primary">{r}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
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
                          className={`rounded px-2 py-1 text-xs font-medium ${
                            has ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
                          }`}
                        >{has ? `− ${r}` : `+ ${r}`}</button>
                      );
                    })}
                  </div>
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
