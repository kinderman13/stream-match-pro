import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Share2, Download, Sparkles, Instagram, Facebook, MessageCircle } from "lucide-react";
import { getCinematicDna, logDnaShare } from "@/lib/dna.functions";
import { getProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/dna")({
  component: DnaPage,
});

const STAGES = [
  "Analisando perfil…",
  "Cruzando preferências…",
  "Identificando seu animal cinematográfico…",
  "Resultado revelado.",
];

const RARITY_COLORS: Record<string, string> = {
  "Comum": "#9ca3af",
  "Incomum": "#22c55e",
  "Raro": "#3b82f6",
  "Épico": "#a855f7",
  "Lendário": "#f59e0b",
};

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
    const t = [
      setTimeout(() => setStage(1), 700),
      setTimeout(() => setStage(2), 1400),
      setTimeout(() => setStage(3), 2100),
      setTimeout(() => setRevealed(true), 2400),
    ];
    return () => t.forEach(clearTimeout);
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
  const userName = profile.data?.displayName || profile.data?.email?.split("@")[0] || "Você";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {!revealed && (
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/20 via-card to-card p-10 text-center">
          <div className="text-6xl">🧬</div>
          <h1 className="mt-4 text-2xl font-black">Decodificando seu DNA…</h1>
          <ul className="mx-auto mt-6 flex max-w-sm flex-col gap-2 text-left text-sm">
            {STAGES.map((s, i) => (
              <li key={s} className={"flex items-center gap-2 transition-opacity " + (i <= stage ? "opacity-100" : "opacity-30")}>
                <span>{i < stage ? "✅" : i === stage ? "⏳" : "•"}</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {revealed && <Reveal d={d} userName={userName} />}
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
  const logShareFn = useServerFn(logDnaShare);
  const [busy, setBusy] = useState<string | null>(null);
  const animal = d.animal;
  const character = d.character;
  const rarityColor = RARITY_COLORS[animal?.rarity] ?? "#a855f7";

  async function buildImage(format: "story" | "square"): Promise<Blob | null> {
    const w = 1080;
    const h = format === "story" ? 1920 : 1080;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#1e0b3a");
    grad.addColorStop(0.5, "#3b0b5c");
    grad.addColorStop(1, "#0b1638");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Decorative blobs
    const blob = (x: number, y: number, r: number, color: string) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    };
    blob(w * 0.15, h * 0.18, 420, "rgba(236,72,153,0.35)");
    blob(w * 0.85, h * 0.85, 520, "rgba(59,130,246,0.35)");
    blob(w * 0.5, h * 0.5, 380, "rgba(168,85,247,0.25)");

    // Header
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "bold 36px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("STREAMMATCH · DNA CINEMATOGRÁFICO", w / 2, 90);

    // Animal emoji big
    const cy = format === "story" ? 380 : 260;
    ctx.font = "260px system-ui, Apple Color Emoji, Segoe UI Emoji";
    ctx.fillText(animal?.emoji ?? "🧬", w / 2, cy);

    // Animal title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 90px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText(animal?.title ?? d.profile.title, w / 2, cy + 140);

    // Rarity pill
    const rarityText = `RARIDADE: ${(animal?.rarity ?? "").toUpperCase()}`;
    ctx.font = "bold 38px system-ui, sans-serif";
    const padX = 30; const pillH = 70;
    const tw = ctx.measureText(rarityText).width;
    const pillW = tw + padX * 2;
    const pillX = (w - pillW) / 2;
    const pillY = cy + 190;
    ctx.fillStyle = rarityColor;
    roundRect(ctx, pillX, pillY, pillW, pillH, 36); ctx.fill();
    ctx.fillStyle = "#0b0b1a";
    ctx.fillText(rarityText, w / 2, pillY + 48);

    // User name
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 44px system-ui, sans-serif";
    ctx.fillText(userName, w / 2, pillY + 150);

    // Description (wrap)
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "32px system-ui, sans-serif";
    wrapText(ctx, animal?.description ?? "", w / 2, pillY + 220, w - 160, 42);

    // Top genres bars
    const startY = format === "story" ? 1180 : 720;
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 38px system-ui, sans-serif";
    ctx.fillText("Compatibilidade", 90, startY);
    const genres = (d.genres ?? []).slice(0, 4);
    genres.forEach((g: any, i: number) => {
      const y = startY + 50 + i * 80;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "bold 32px system-ui, sans-serif";
      ctx.fillText(g.name, 90, y);
      ctx.textAlign = "right";
      ctx.fillText(`${g.pct}%`, w - 90, y);
      ctx.textAlign = "left";
      // bar
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      roundRect(ctx, 90, y + 12, w - 180, 16, 8); ctx.fill();
      ctx.fillStyle = "#ffffff";
      roundRect(ctx, 90, y + 12, ((w - 180) * g.pct) / 100, 16, 8); ctx.fill();
    });

    // Character footer
    const charY = format === "story" ? 1640 : (h - 220);
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "bold 32px system-ui, sans-serif";
    ctx.fillText(`🎭 Você é como ${character?.name ?? "—"} (${character?.franchise ?? ""})`, w / 2, charY);

    // Brand footer
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "bold 28px system-ui, sans-serif";
    ctx.fillText("Descubra o seu em streammatch.app", w / 2, h - 70);

    return await new Promise((res) => canvas.toBlob((b) => res(b), "image/png", 0.95));
  }

  async function logShare(channel: string) {
    try {
      await logShareFn({ data: { channel, animalKey: animal?.key, characterKey: character?.key, rarity: animal?.rarity } });
    } catch { /* swallow */ }
  }

  async function downloadImage(format: "story" | "square") {
    setBusy(`download-${format}`);
    try {
      const blob = await buildImage(format);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dna-cinematografico-${format}.png`;
      a.click();
      URL.revokeObjectURL(url);
      logShare(`download_${format}`);
    } finally { setBusy(null); }
  }

  async function shareNative(channel: string) {
    setBusy(channel);
    try {
      const blob = await buildImage("square");
      const text = `Meu DNA Cinematográfico no StreamMatch: ${animal?.emoji} ${animal?.title} (${animal?.rarity}). Descubra o seu:`;
      const url = typeof window !== "undefined" ? window.location.origin : "";
      const file = blob ? new File([blob], "dna.png", { type: "image/png" }) : null;
      const nav: any = navigator;
      if (file && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: "Meu DNA Cinematográfico", text, url });
        logShare(channel);
        return;
      }
      if (channel === "whatsapp") {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank");
      } else if (channel === "facebook") {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, "_blank");
      } else {
        // Stories — no web intent. Download story-format image.
        await downloadImage("story");
      }
      logShare(channel);
    } catch { /* user cancelled */ }
    finally { setBusy(null); }
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Hero card */}
      <div
        className="relative overflow-hidden rounded-3xl border border-border p-6 sm:p-8"
        style={{ background: "linear-gradient(135deg, oklch(0.42 0.18 27 / 0.85) 0%, oklch(0.25 0.12 280 / 0.95) 60%, oklch(0.18 0.08 250 / 1) 100%)" }}
      >
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-white/70">
          <span>StreamMatch</span><span>DNA Cinematográfico</span>
        </div>
        <div className="mt-6 text-center">
          <div className="text-6xl sm:text-7xl">{d.profile.emoji}</div>
          <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">{d.profile.title}</h1>
          <p className="mt-1 text-sm text-white/70">{userName}</p>
        </div>
        <p className="mx-auto mt-5 max-w-xl text-center text-sm text-white/85 sm:text-base">{d.profile.description}</p>
      </div>

      {/* Animal Card */}
      {animal && (
        <div className="overflow-hidden rounded-3xl border-2 p-6 text-center sm:p-8" style={{ borderColor: rarityColor, background: `linear-gradient(135deg, ${rarityColor}22, transparent)` }}>
          <div className="inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest" style={{ background: rarityColor, color: "#0b0b1a" }}>
            🦁 Animal Cinematográfico · {animal.rarity}
          </div>
          <div className="mt-4 text-7xl sm:text-8xl">{animal.emoji}</div>
          <h2 className="mt-3 text-2xl font-black sm:text-3xl">{animal.title}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">{animal.description}</p>
          <p className="mt-3 text-xs text-muted-foreground">Apenas <strong>{animal.rarityPct}%</strong> dos usuários possuem este perfil.</p>
        </div>
      )}

      {/* Character Card */}
      {character && (
        <div className="rounded-2xl border border-border bg-gradient-to-br from-secondary/40 to-card p-6 text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">🎭 Personagem Cinematográfico</div>
          <div className="mt-2 text-5xl">{character.emoji}</div>
          <h3 className="mt-2 text-xl font-black sm:text-2xl">{character.name}</h3>
          <p className="text-xs text-muted-foreground">{character.franchise}</p>
          <p className="mx-auto mt-2 max-w-md text-sm">{character.description}</p>
        </div>
      )}

      {/* Viral stats */}
      {d.viral && (
        <Section title="📊 Suas estatísticas virais">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ViralStat label="Mais analítico que" value={d.viral.analyticsPct} />
            <ViralStat label="Avalia melhor que" value={d.viral.qualityPct} />
            <ViralStat label="Perfil mais raro que" value={d.viral.rarityPct} />
          </div>
        </Section>
      )}

      {/* Share buttons */}
      <Section title="📲 Compartilhe seu DNA">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ShareBtn busy={busy === "whatsapp"} onClick={() => shareNative("whatsapp")} icon={<MessageCircle className="h-4 w-4" />} label="WhatsApp" />
          <ShareBtn busy={busy === "stories"} onClick={() => shareNative("stories")} icon={<Instagram className="h-4 w-4" />} label="Stories" />
          <ShareBtn busy={busy === "facebook"} onClick={() => shareNative("facebook")} icon={<Facebook className="h-4 w-4" />} label="Facebook" />
          <ShareBtn busy={busy === "download-square"} onClick={() => downloadImage("square")} icon={<Download className="h-4 w-4" />} label="Baixar imagem" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">A imagem 1080×1080 é gerada automaticamente. Use “Stories” para baixar 1080×1920.</p>
      </Section>

      {/* Genre compat */}
      <Section title="Gêneros que combinam com você">
        <div className="space-y-2">
          {d.genres.slice(0, 6).map((g: any) => (
            <div key={g.name}>
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{g.name}</span>
                <span className="font-black text-primary">{g.pct}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-primary" style={{ width: `${g.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Section>

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

      {d.trophies?.length > 0 && (
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

      {d.providerCompat?.length > 0 && (
        <Section title="Compatibilidade com streamings">
          <div className="space-y-2">
            {d.providerCompat.map((p: any) => (
              <div key={p.name}>
                <div className="flex justify-between text-sm">
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

      {d.ideal?.length > 0 && (
        <Section title="🎯 Seu conteúdo ideal">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {d.ideal.map((it: any) => (
              <div key={`${it.media_type}:${it.id}`} className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="aspect-[2/3] bg-secondary">
                  {it.poster_path && (
                    <img src={`https://image.tmdb.org/t/p/w342${it.poster_path}`} alt={it.title} className="h-full w-full object-cover" loading="lazy" />
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

function ShareBtn({ icon, label, onClick, busy }: { icon: React.ReactNode; label: string; onClick: () => void; busy?: boolean }) {
  return (
    <button onClick={onClick} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
      {busy ? <Share2 className="h-4 w-4 animate-pulse" /> : icon}
      <span>{busy ? "Gerando…" : label}</span>
    </button>
  );
}

function ViralStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 to-card p-4 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-black text-primary">{value}%</div>
      <div className="text-xs text-muted-foreground">dos usuários</div>
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

// Canvas helpers
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  let cy = y;
  for (let n = 0; n < words.length; n++) {
    const test = line + words[n] + " ";
    if (ctx.measureText(test).width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, cy);
      line = words[n] + " ";
      cy += lineHeight;
    } else line = test;
  }
  ctx.fillText(line.trim(), x, cy);
}
