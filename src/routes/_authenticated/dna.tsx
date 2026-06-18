import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Share2, Download, Sparkles } from "lucide-react";
import { getCinematicDna } from "@/lib/dna.functions";
import { getProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/dna")({
  component: DnaPage,
});

const STAGES = [
  "Analisando perfil…",
  "Cruzando preferências…",
  "Calculando DNA…",
  "Resultado revelado.",
];

function DnaPage() {
  const dnaFn = useServerFn(getCinematicDna);
  const profileFn = useServerFn(getProfile);
  const dna = useQuery({ queryKey: ["cinematic-dna"], queryFn: () => dnaFn() });
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => profileFn() });

  const [stage, setStage] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!dna.data?.unlocked) return;
    setStage(0);
    setRevealed(false);
    const t1 = setTimeout(() => setStage(1), 700);
    const t2 = setTimeout(() => setStage(2), 1400);
    const t3 = setTimeout(() => setStage(3), 2100);
    const t4 = setTimeout(() => setRevealed(true), 2400);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [dna.data?.unlocked]);

  if (dna.isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <Sparkles className="h-5 w-5 animate-pulse text-primary" />
          Carregando seu DNA Cinematográfico…
        </div>
      </div>
    );
  }

  if (dna.data && !dna.data.unlocked) {
    const c = dna.data.current!;
    const r = dna.data.required!;
    return (
      <div className="mx-auto max-w-2xl px-4 py-14">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-8 text-center">
          <div className="text-5xl">🧬</div>
          <h1 className="mt-4 text-2xl font-black sm:text-3xl">DNA Cinematográfico</h1>
          <p className="mt-3 text-muted-foreground">{dna.data.reason}</p>
          <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <ProgressTile label="Avaliados" cur={c.ratings} target={r.ratings} />
            <ProgressTile label="Gostei" cur={c.likes} target={r.likes} />
            <ProgressTile label="Assistidos" cur={c.watched} target={r.watched} />
          </div>
          <Link to="/recommendations" className="mt-6 inline-block rounded-md bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:opacity-90">
            Avaliar conteúdos
          </Link>
        </div>
      </div>
    );
  }

  if (!dna.data) return null;
  const d = dna.data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Stage animation overlay */}
      {!revealed && (
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/20 via-card to-card p-10 text-center">
          <div className="text-6xl">🧬</div>
          <h1 className="mt-4 text-2xl font-black">Decodificando seu DNA…</h1>
          <ul className="mx-auto mt-6 flex max-w-sm flex-col gap-2 text-left text-sm">
            {STAGES.map((s, i) => (
              <li
                key={s}
                className={
                  "flex items-center gap-2 transition-opacity " +
                  (i <= stage ? "opacity-100" : "opacity-30")
                }
              >
                <span>{i < stage ? "✅" : i === stage ? "⏳" : "•"}</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {revealed && <Reveal d={d} userName={profile.data?.displayName || profile.data?.email?.split("@")[0] || "Você"} />}
    </div>
  );
}

function ProgressTile({ label, cur, target }: { label: string; cur: number; target: number }) {
  const pct = Math.min(100, Math.round((cur / target) * 100));
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold">{cur}/{target}</div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Reveal({ d, userName }: { d: any; userName: string }) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `Meu DNA Cinematográfico no StreamMatch: ${d.profile.emoji} ${d.profile.title}\nGênero #1: ${d.stats.favoriteGenre}\nDescubra o seu:`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Meu DNA Cinematográfico", text, url });
        return;
      }
    } catch { /* user cancelled */ }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      alert("Link copiado! Cole onde quiser compartilhar.");
    } catch {
      window.prompt("Copie o link:", url);
    }
  }

  async function downloadCard() {
    const node = cardRef.current;
    if (!node) return;
    // Lightweight SVG snapshot — wraps the DOM in foreignObject for a quick PNG download.
    const rect = node.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    const xml = new XMLSerializer().serializeToString(node);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${xml}</div></foreignObject></svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meu-dna-cinematografico.svg";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Shareable card */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-3xl border border-border p-6 sm:p-8"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.42 0.18 27 / 0.85) 0%, oklch(0.25 0.12 280 / 0.95) 60%, oklch(0.18 0.08 250 / 1) 100%)",
        }}
      >
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-white/70">
          <span>StreamMatch</span>
          <span>DNA Cinematográfico</span>
        </div>
        <div className="mt-6 text-center">
          <div className="text-6xl sm:text-7xl">{d.profile.emoji}</div>
          <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">{d.profile.title}</h1>
          <p className="mt-1 text-sm text-white/70">{userName}</p>
        </div>
        <p className="mx-auto mt-5 max-w-xl text-center text-sm text-white/85 sm:text-base">
          {d.profile.description}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2 text-white sm:grid-cols-3">
          {d.genres.slice(0, 6).map((g: any) => (
            <div key={g.name} className="rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">{g.name}</span>
                <span className="font-black">{g.pct}%</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/15">
                <div className="h-full bg-white" style={{ width: `${g.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        {d.trophies[0] && (
          <div className="mt-5 text-center text-sm font-semibold text-white">
            {d.trophies[0].emoji} {d.trophies[0].name}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={share} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90">
          <Share2 className="h-4 w-4" /> Compartilhar meu DNA
        </button>
        <button onClick={downloadCard} className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-semibold hover:border-primary">
          <Download className="h-4 w-4" /> Baixar card
        </button>
      </div>

      {/* Stats */}
      <Section title="Estatísticas">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="🎬 Filmes avaliados" value={d.stats.moviesRated} />
          <Stat label="📺 Séries avaliadas" value={d.stats.seriesRated} />
          <Stat label="⭐ Nota média" value={d.stats.averageRating} />
          <Stat label="🔥 Gênero favorito" value={d.stats.favoriteGenre} />
          <Stat label="🍿 Plataforma favorita" value={d.stats.favoriteProvider} />
          <Stat label="📅 Dias ativos" value={d.stats.activeDays} />
          <Stat label="🏆 Total analisado" value={d.stats.total} />
        </div>
      </Section>

      {/* Trophies */}
      {d.trophies.length > 0 && (
        <Section title="Troféus">
          <div className="flex flex-wrap gap-2">
            {d.trophies.map((t: any) => (
              <div key={t.name} className="rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                {t.emoji} <span className="font-semibold">{t.name}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Provider compat */}
      {d.providerCompat.length > 0 && (
        <Section title="Compatibilidade com streamings">
          <div className="space-y-2">
            {d.providerCompat.map((p: any) => (
              <div key={p.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{p.name}</span>
                  <span className="font-black text-primary">{p.pct}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-primary" style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Ideal */}
      {d.ideal.length > 0 && (
        <Section title="🎯 Seu conteúdo ideal">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {d.ideal.map((it: any) => (
              <div key={`${it.media_type}:${it.id}`} className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="aspect-[2/3] bg-secondary">
                  {it.poster_path && (
                    <img
                      src={`https://image.tmdb.org/t/p/w342${it.poster_path}`}
                      alt={it.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="p-2">
                  <div className="line-clamp-2 text-xs font-semibold">{it.title}</div>
                  <div className="text-xs text-muted-foreground">{it.year}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-bold">{value}</div>
    </div>
  );
}
