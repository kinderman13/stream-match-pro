import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { tmdbRecommendations } from "@/lib/tmdb.functions";
import { addInteraction, addToWatchlist, upsertRating } from "@/lib/user-data.functions";
import { RatingDialog } from "@/components/RatingDialog";

export const Route = createFileRoute("/_authenticated/recommendations")({
  component: Recs,
});

interface Rec {
  id: number; media_type: "movie" | "tv"; title: string; poster_path: string | null;
  year: string; vote_average: number; overview: string; match: number;
  providers: { provider_id: number; provider_name: string }[]; genres: string[];
}

function Recs() {
  const recsFn = useServerFn(tmdbRecommendations);
  const interact = useServerFn(addInteraction);
  const save = useServerFn(addToWatchlist);
  const rate = useServerFn(upsertRating);

  const [items, setItems] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<Rec | null>(null);

  async function load(surprise = false) {
    setLoading(true);
    try {
      const r = (await recsFn({ data: { mediaType: "all", limit: 10, surprise } })) as Rec[];
      setItems(r);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(false); /* eslint-disable-line */ }, []);

  async function react(item: Rec, action: "like" | "dislike" | "watched" | "save") {
    await interact({ data: { tmdbId: item.id, mediaType: item.media_type, action } });
    if (action === "save") {
      await save({ data: { tmdbId: item.id, mediaType: item.media_type, title: item.title, posterPath: item.poster_path, year: item.year } });
    }
    if (action === "watched" || action === "dislike") {
      setItems((prev) => prev.filter((x) => !(x.id === item.id && x.media_type === item.media_type)));
    }
  }

  async function saveRating(rating: number) {
    if (!target) return;
    await rate({ data: { tmdbId: target.id, mediaType: target.media_type, rating, source: "recommendation", title: target.title, posterPath: target.poster_path } });
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

      {loading && <div className="py-10 text-center text-sm text-muted-foreground">Calculando seu match...</div>}
      {!loading && items.length === 0 && (
        <div className="mt-6 rounded-md border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Não encontramos recomendações. Avalie mais títulos no catálogo.
        </div>
      )}

      <div className="mt-6 space-y-4">
        {items.map((it) => (
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
                <div className="mt-2 text-xs text-muted-foreground">📺 {it.providers.map((p) => p.provider_name).join(", ")}</div>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button onClick={() => react(it, "like")} className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs hover:border-success" title="Gostei">👍</button>
                <button onClick={() => react(it, "dislike")} className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs hover:border-destructive" title="Não gostei">👎</button>
                <button onClick={() => react(it, "watched")} className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs hover:border-foreground" title="Já assisti">👀</button>
                <button onClick={() => react(it, "save")} className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs hover:border-primary" title="Salvar">⭐ Salvar</button>
                <button onClick={() => setTarget(it)} className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs hover:border-primary">Avaliar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <RatingDialog open={!!target} title={target?.title || ""} onClose={() => setTarget(null)} onSubmit={saveRating} />
    </div>
  );
}
