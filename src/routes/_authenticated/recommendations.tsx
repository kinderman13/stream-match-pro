import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { tmdbRecommendations } from "@/lib/tmdb.functions";
import { addInteraction, addToWatchlist, upsertRating, getUserState } from "@/lib/user-data.functions";
import { RatingDialog } from "@/components/RatingDialog";
import { buildProviderLink, trailerUrl } from "@/lib/watch-links";

export const Route = createFileRoute("/_authenticated/recommendations")({
  component: Recs,
});

interface Rec {
  id: number; media_type: "movie" | "tv"; title: string; poster_path: string | null;
  year: string; vote_average: number; overview: string; match: number;
  providers: { provider_id: number; provider_name: string }[]; genres: string[];
  trailerKey: string | null; tmdbWatchUrl: string;
}

function Recs() {
  const recsFn = useServerFn(tmdbRecommendations);
  const interact = useServerFn(addInteraction);
  const save = useServerFn(addToWatchlist);
  const rate = useServerFn(upsertRating);
  const stateFn = useServerFn(getUserState);

  const [items, setItems] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<Rec | null>(null);
  const [trailer, setTrailer] = useState<{ key: string; title: string } | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<number[]>([]);

  async function load(surprise = false) {
    setLoading(true);
    try {
      let mt: "movie" | "tv" | "all" = "all";
      try {
        const v = sessionStorage.getItem("streammatch:contentType");
        if (v === "movie" || v === "tv") mt = v;
      } catch {}
      const r = (await recsFn({ data: { mediaType: mt, limit: 10, surprise } })) as Rec[];
      setItems(r);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load(false);
    stateFn().then((s) => setSelectedProviders(s.selectedProviders || [])).catch(() => {});
    /* eslint-disable-next-line */
  }, []);

  function removeFromFeed(item: Rec) {
    setItems((prev) => prev.filter((x) => !(x.id === item.id && x.media_type === item.media_type)));
  }

  async function handleLike(item: Rec) {
    try {
      await interact({ data: { tmdbId: item.id, mediaType: item.media_type, action: "like" } });
      removeFromFeed(item);
      toast.success("✅ Gostei registrado");
    } catch (e) { console.error(e); toast.error("Não foi possível registrar."); }
  }

  async function handleDislike(item: Rec) {
    try {
      await interact({ data: { tmdbId: item.id, mediaType: item.media_type, action: "dislike" } });
      await rate({ data: { tmdbId: item.id, mediaType: item.media_type, rating: 2, source: "recommendation", title: item.title, posterPath: item.poster_path } });
      removeFromFeed(item);
      toast.success("✅ Preferência atualizada");
    } catch (e) { console.error(e); toast.error("Não foi possível registrar."); }
  }

  async function handleSkip(item: Rec) {
    try {
      await interact({ data: { tmdbId: item.id, mediaType: item.media_type, action: "skip" } });
      removeFromFeed(item);
      toast.success("✅ Conteúdo ocultado por 15 dias");
    } catch (e) { console.error(e); toast.error("Não foi possível registrar."); }
  }

  async function handleSave(item: Rec) {
    try {
      await interact({ data: { tmdbId: item.id, mediaType: item.media_type, action: "save" } });
      await save({ data: { tmdbId: item.id, mediaType: item.media_type, title: item.title, posterPath: item.poster_path, year: item.year } });
      toast.success("✅ Adicionado à sua lista");
    } catch (e) { console.error(e); toast.error("Não foi possível salvar."); }
  }

  async function watchNow(item: Rec) {
    const link = buildProviderLink(item.providers, item.title, item.year, selectedProviders);
    const url = link?.isDirect ? link.url : item.tmdbWatchUrl;
    const providerId = link?.providerId ?? null;
    // fire-and-forget tracking
    interact({ data: { tmdbId: item.id, mediaType: item.media_type, action: "watch_click", providerId } }).catch(() => {});
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openTrailer(item: Rec) {
    if (!item.trailerKey) return;
    interact({ data: { tmdbId: item.id, mediaType: item.media_type, action: "trailer_click" } }).catch(() => {});
    // Open YouTube in a new tab; on mobile this universal-links into the YouTube app.
    window.open(trailerUrl(item.trailerKey), "_blank", "noopener,noreferrer");
    setTrailer({ key: item.trailerKey, title: item.title });
  }

  async function saveRating(rating: number) {
    if (!target) return;
    try {
      await interact({ data: { tmdbId: target.id, mediaType: target.media_type, action: "watched" } });
      await rate({ data: { tmdbId: target.id, mediaType: target.media_type, rating, source: "recommendation", title: target.title, posterPath: target.poster_path } });
      removeFromFeed(target);
      toast.success("✅ Nota salva");
    } catch (e) { console.error(e); toast.error("Não foi possível salvar."); }
    setTarget(null);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Recomendado para você</h1>
        <div className="flex gap-2">
          <button onClick={() => load(true)} className="rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:border-primary">🎲 Surpreenda-me</button>
          <button onClick={() => load(false)} className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">Atualizar</button>
        </div>
      </div>

      <Link
        to="/dna"
        className="mt-4 flex items-center gap-3 rounded-xl border border-primary/40 bg-gradient-to-r from-primary/15 via-card to-card p-3 transition hover:border-primary"
      >
        <span className="text-2xl">🧬</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">Descobrir Meu DNA Cinematográfico</div>
          <div className="text-xs text-muted-foreground">Veja seu perfil completo e compartilhe com os amigos.</div>
        </div>
        <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">Revelar</span>
      </Link>

      {loading && <div className="py-10 text-center text-sm text-muted-foreground">Calculando seu match...</div>}
      {!loading && items.length === 0 && (
        <div className="mt-6 rounded-md border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Não encontramos recomendações. Avalie mais títulos no catálogo.
        </div>
      )}

      <div className="mt-6 space-y-4">
        {items.map((it) => {
          const link = buildProviderLink(it.providers, it.title, it.year, selectedProviders);
          const hasDirect = !!link?.isDirect;
          const watchLabel = hasDirect ? `▶️ Assistir no ${link!.providerName}` : "▶️ Assistir neste streaming";
          return (
            <div key={`${it.media_type}:${it.id}`} className="flex gap-4 rounded-xl border border-border bg-card p-3 poster-shadow">
              <div className="h-36 w-24 flex-shrink-0 overflow-hidden rounded-md bg-secondary sm:h-44 sm:w-28">
                {it.poster_path ? (
                  <img src={`https://image.tmdb.org/t/p/w342${it.poster_path}`} alt={it.title} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-base font-bold sm:text-lg">{it.title} <span className="font-normal text-muted-foreground">({it.year})</span></div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>★ {it.vote_average.toFixed(1)}</span>
                      {it.genres.slice(0, 3).map((g) => <span key={g}>{g}</span>)}
                    </div>
                  </div>
                  <div className="rounded-md bg-match px-2 py-1 text-sm font-black text-black">{it.match}%</div>
                </div>
                <p className="mt-2 line-clamp-3 text-xs text-muted-foreground sm:text-sm">{it.overview}</p>
                {it.providers.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>📺 {it.providers.map((p) => p.provider_name).join(", ")}</span>
                    {hasDirect && (
                      <span className="rounded-md bg-success/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
                        ✅ Disponível agora
                      </span>
                    )}
                  </div>
                )}

                {/* Primary CTAs */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {it.providers.length > 0 && (
                    <button
                      onClick={() => watchNow(it)}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"
                    >
                      {watchLabel}
                    </button>
                  )}
                  {it.trailerKey && (
                    <button
                      onClick={() => openTrailer(it)}
                      className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-semibold hover:border-primary"
                    >
                      🎬 Ver Trailer
                    </button>
                  )}
                  <button
                    onClick={() => handleSave(it)}
                    className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-semibold hover:border-primary"
                  >
                    ➕ Minha Lista
                  </button>
                </div>

                {/* Unified rating actions — same as Tinder screen */}
                <div className="mt-3 grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleLike(it)}
                    className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-border bg-secondary px-2 py-2.5 transition hover:border-success hover:bg-success/10 active:scale-95"
                  >
                    <span className="text-2xl leading-none">👍</span>
                    <span className="text-[11px] font-semibold leading-tight">Gostei</span>
                  </button>
                  <button
                    onClick={() => setTarget(it)}
                    className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-border bg-secondary px-2 py-2.5 transition hover:border-blue-500 hover:bg-blue-500/10 active:scale-95"
                  >
                    <span className="text-2xl leading-none">👀</span>
                    <span className="text-[11px] font-semibold leading-tight">Já Assisti</span>
                  </button>
                  <button
                    onClick={() => handleSkip(it)}
                    className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-border bg-secondary px-2 py-2.5 transition hover:border-foreground hover:bg-foreground/10 active:scale-95"
                  >
                    <span className="text-2xl leading-none">🤔</span>
                    <span className="text-[11px] font-semibold leading-tight">Não Assisti</span>
                  </button>
                  <button
                    onClick={() => handleDislike(it)}
                    className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-border bg-secondary px-2 py-2.5 transition hover:border-destructive hover:bg-destructive/10 active:scale-95"
                  >
                    <span className="text-2xl leading-none">👎</span>
                    <span className="text-[11px] font-semibold leading-tight">Não Gostei</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <RatingDialog open={!!target} title={target?.title || ""} onClose={() => setTarget(null)} onSubmit={saveRating} />


      {trailer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setTrailer(null)}
        >
          <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setTrailer(null)}
              className="absolute -top-10 right-0 text-sm font-semibold text-white"
            >
              ✕ Fechar
            </button>
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`}
                title={trailer.title}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
