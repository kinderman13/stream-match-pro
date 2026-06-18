import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getProfile, getProfileStats } from "@/lib/profile.functions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ProfilePage() {
  const fetchProfile = useServerFn(getProfile);
  const fetchStats = useServerFn(getProfileStats);
  const p = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const s = useQuery({ queryKey: ["profile-stats"], queryFn: () => fetchStats() });

  const name = p.data?.displayName || p.data?.email || "";
  const initials = name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("") || "U";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center gap-5">
        <Avatar className="h-20 w-20 border border-border">
          <AvatarFallback className="bg-primary/15 text-xl font-bold text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{p.data?.displayName || "Usuário"}</h1>
          <p className="text-sm text-muted-foreground">{p.data?.email}</p>
          {p.data?.createdAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              Membro desde {new Date(p.data.createdAt).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
        <Link
          to="/settings"
          className="ml-auto rounded border border-border bg-secondary px-3 py-1.5 text-sm hover:border-primary"
        >
          Editar
        </Link>
      </div>

      <Link
        to="/dna"
        className="mt-6 flex items-center gap-4 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/15 via-card to-card p-4 transition hover:border-primary"
      >
        <div className="text-3xl">🧬</div>
        <div className="min-w-0 flex-1">
          <div className="font-bold">Descobrir Meu DNA Cinematográfico</div>
          <div className="text-xs text-muted-foreground">Perfil, gêneros, troféus e compatibilidade — gerado a partir do seu histórico.</div>
        </div>
        <span className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">Revelar</span>
      </Link>

      <h2 className="mt-8 text-lg font-semibold">Estatísticas</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Filmes avaliados" value={s.data?.moviesRated ?? 0} />
        <Stat label="Séries avaliadas" value={s.data?.seriesRated ?? 0} />
        <Stat label="Conteúdos salvos" value={s.data?.savedCount ?? 0} />
        <Stat label="Nota média" value={s.data?.averageRating ?? 0} />
        <Stat label="Curtidas" value={s.data?.likes ?? 0} />
        <Stat label="Rejeições" value={s.data?.dislikes ?? 0} />
        <Stat label="Assistidos" value={s.data?.watched ?? 0} />
        <Stat label="Plataformas" value={s.data?.providers.length ?? 0} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/list" className="rounded border border-border bg-secondary px-3 py-1.5 text-sm hover:border-primary">Minha Lista</Link>
        <Link to="/history" className="rounded border border-border bg-secondary px-3 py-1.5 text-sm hover:border-primary">Histórico</Link>
        <Link to="/providers" className="rounded border border-border bg-secondary px-3 py-1.5 text-sm hover:border-primary">Preferências</Link>
      </div>
    </div>
  );
}
