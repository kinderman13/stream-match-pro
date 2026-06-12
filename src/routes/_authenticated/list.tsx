import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listWatchlist, removeFromWatchlist } from "@/lib/user-data.functions";

export const Route = createFileRoute("/_authenticated/list")({
  component: ListPage,
});

interface Item { tmdb_id: number; media_type: "movie" | "tv"; title: string | null; poster_path: string | null; year: string | null }

function ListPage() {
  const fetchList = useServerFn(listWatchlist);
  const remove = useServerFn(removeFromWatchlist);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => { fetchList({}).then((r) => setItems(r as Item[])); }, [fetchList]);

  async function rm(it: Item) {
    await remove({ data: { tmdbId: it.tmdb_id, mediaType: it.media_type } });
    setItems((s) => s.filter((x) => !(x.tmdb_id === it.tmdb_id && x.media_type === it.media_type)));
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold">Minha Lista</h1>
      {items.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Você ainda não salvou nada. Vá em Recomendações e toque em ⭐ Salvar.</p>}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((it) => (
          <div key={`${it.media_type}:${it.tmdb_id}`} className="overflow-hidden rounded-lg border border-border bg-card poster-shadow">
            <div className="aspect-[2/3] bg-secondary">
              {it.poster_path && <img src={`https://image.tmdb.org/t/p/w342${it.poster_path}`} alt={it.title || ""} className="h-full w-full object-cover" />}
            </div>
            <div className="p-2">
              <div className="line-clamp-1 text-sm font-medium">{it.title}</div>
              <div className="text-xs text-muted-foreground">{it.year}</div>
              <button onClick={() => rm(it)} className="mt-2 w-full rounded border border-border bg-secondary py-1 text-xs hover:border-destructive">Remover</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
