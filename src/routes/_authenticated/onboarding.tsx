import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { tmdbOnboardingFeed, tmdbSearch } from "@/lib/tmdb.functions";
import { upsertRating, completeOnboarding, getUserState } from "@/lib/user-data.functions";
import { MediaCard } from "@/components/MediaCard";
import { RatingDialog } from "@/components/RatingDialog";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

type Item = { id: number; media_type: "movie" | "tv"; title: string; poster_path: string | null; year: string; vote_average: number };

function Onboarding() {
  const router = useRouter();
  const feed = useServerFn(tmdbOnboardingFeed);
  const search = useServerFn(tmdbSearch);
  const rate = useServerFn(upsertRating);
  const complete = useServerFn(completeOnboarding);
  const state = useServerFn(getUserState);

  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<Item | null>(null);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    state({}).then((s) => setCount(s.ratingsCount));
    loadMore(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMore(p = page, reset = false) {
    if (loading) return;
    setLoading(true);
    try {
      const r = await feed({ data: { page: p } });
      setItems((prev) => reset ? r : [...prev, ...r]);
      setPage(p + 1);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const el = sentinel.current; if (!el) return;
    const io = new IntersectionObserver((ents) => { if (ents[0].isIntersecting && !q) loadMore(); }, { rootMargin: "400px" });
    io.observe(el); return () => io.disconnect();
  }, [page, loading, q]);

  async function runSearch(query: string) {
    setQ(query);
    if (!query.trim()) { loadMore(1, true); return; }
    const r = await search({ data: { query } });
    setItems(r as Item[]);
  }

  async function saveRating(rating: number) {
    if (!target) return;
    const key = `${target.media_type}:${target.id}`;
    await rate({ data: { tmdbId: target.id, mediaType: target.media_type, rating, source: "onboarding", title: target.title, posterPath: target.poster_path } });
    setSelected((s) => ({ ...s, [key]: rating }));
    setCount((c) => (selected[key] !== undefined ? c : c + 1));
    setTarget(null);
  }

  async function finish() {
    if (count < 10) return;
    await complete({});
    router.navigate({ to: "/providers" });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-32">
      <h1 className="text-2xl font-bold">Vamos conhecer seu gosto</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Selecione pelo menos <strong className="text-foreground">10 títulos</strong> que você ama e dê uma nota de 0 a 10.
      </p>

      <div className="sticky top-14 z-30 -mx-4 mt-4 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <input
            value={q}
            onChange={(e) => runSearch(e.target.value)}
            placeholder="Buscar (opcional)..."
            className="w-full max-w-xs rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="ml-auto text-sm">
            <span className="text-muted-foreground">Selecionados: </span>
            <span className={count >= 10 ? "font-bold text-success" : "font-bold text-primary"}>{count}</span>
            <span className="text-muted-foreground"> / 10</span>
          </div>
        </div>
      </div>

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
              selected={selected[k] !== undefined}
              badge={selected[k] !== undefined ? `${selected[k]}` : undefined}
              onClick={() => setTarget(it)}
            />
          );
        })}
      </div>

      <div ref={sentinel} className="h-10" />
      {loading && <div className="py-4 text-center text-sm text-muted-foreground">Carregando...</div>}

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {count < 10 ? `Faltam ${10 - count} para continuar` : "Pronto para avançar!"}
          </div>
          <button
            disabled={count < 10}
            onClick={finish}
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-40"
          >
            Continuar
          </button>
        </div>
      </div>

      <RatingDialog
        open={!!target}
        title={target?.title || ""}
        initial={target ? selected[`${target.media_type}:${target.id}`] ?? 8 : 8}
        onClose={() => setTarget(null)}
        onSubmit={saveRating}
      />
    </div>
  );
}
