import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { tmdbDiscover } from "@/lib/tmdb.functions";
import { upsertRating, getUserState } from "@/lib/user-data.functions";
import { MediaCard } from "@/components/MediaCard";
import { RatingDialog } from "@/components/RatingDialog";

const searchSchema = z.object({ type: z.enum(["movie", "tv"]).default("movie") });

export const Route = createFileRoute("/_authenticated/catalog")({
  validateSearch: searchSchema,
  component: Catalog,
});

type Item = { id: number; media_type: "movie" | "tv"; title: string; poster_path: string | null; year: string; vote_average: number };

function Catalog() {
  const { type } = Route.useSearch();
  const discover = useServerFn(tmdbDiscover);
  const rate = useServerFn(upsertRating);
  const state = useServerFn(getUserState);

  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [providers, setProviders] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState<Item | null>(null);
  const [rated, setRated] = useState<Record<string, number>>({});
  const [emptyMsg, setEmptyMsg] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    state({}).then((s) => {
      setProviders(s.selectedProviders);
      setCount(0); setItems([]); setPage(1); setDone(false); setEmptyMsg(null);
      load(1, true, s.selectedProviders);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  async function load(p: number, reset: boolean, prov = providers) {
    if (loading || done) return;
    setLoading(true);
    try {
      const r = (await discover({ data: { mediaType: type, page: p, providerIds: prov } })) as Item[];
      const merged = reset ? r : [...items, ...r];
      setItems(merged);
      setPage(p + 1);
      if (r.length === 0 && merged.length === 0) {
        // retry with no provider filter as graceful fallback
        const r2 = (await discover({ data: { mediaType: type, page: 1 } })) as Item[];
        if (r2.length === 0) setEmptyMsg("Nenhum conteúdo encontrado. Tente outra plataforma.");
        else { setItems(r2); setEmptyMsg("Mostrando populares (sem filtro de plataforma)."); }
      }
      if (r.length === 0 && merged.length > 0) setDone(true);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const el = sentinel.current; if (!el) return;
    const io = new IntersectionObserver((ents) => { if (ents[0].isIntersecting) load(page, false); }, { rootMargin: "400px" });
    io.observe(el); return () => io.disconnect();
  }, [page, loading, done]);

  async function saveRating(rating: number) {
    if (!target) return;
    const k = `${target.media_type}:${target.id}`;
    await rate({ data: { tmdbId: target.id, mediaType: target.media_type, rating, source: "catalog", title: target.title, posterPath: target.poster_path } });
    setRated((s) => ({ ...s, [k]: rating }));
    setCount((c) => (rated[k] !== undefined ? c : c + 1));
    setTarget(null);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-28">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{type === "movie" ? "Filmes" : "Séries"}</h1>
        <Link to="/choose" className="text-sm text-muted-foreground hover:text-foreground">Trocar</Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Marque os que você já assistiu. <span className="text-foreground">Selecionados: <strong>{count}</strong></span>
      </p>

      {emptyMsg && <div className="mt-4 rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">{emptyMsg}</div>}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((it) => {
          const k = `${it.media_type}:${it.id}`;
          return (
            <MediaCard
              key={k}
              posterPath={it.poster_path}
              title={it.title}
              year={it.year}
              voteAverage={it.vote_average}
              selected={rated[k] !== undefined}
              badge={rated[k] !== undefined ? `${rated[k]}` : undefined}
              onClick={() => setTarget(it)}
            />
          );
        })}
      </div>

      <div ref={sentinel} className="h-10" />
      {loading && <div className="py-4 text-center text-sm text-muted-foreground">Carregando...</div>}

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">{count >= 3 ? "Pronto!" : `Selecione ao menos 3 (${count}/3)`}</div>
          <Link
            to="/recommendations"
            className={`rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground ${count < 3 ? "pointer-events-none opacity-40" : ""}`}
          >
            Continuar para Recomendações
          </Link>
        </div>
      </div>

      <RatingDialog
        open={!!target}
        title={target?.title || ""}
        initial={target ? rated[`${target.media_type}:${target.id}`] ?? 8 : 8}
        onClose={() => setTarget(null)}
        onSubmit={saveRating}
      />
    </div>
  );
}
