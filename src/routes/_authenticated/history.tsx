import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listHistory } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const fetchHistory = useServerFn(listHistory);
  const q = useQuery({ queryKey: ["history"], queryFn: () => fetchHistory() });

  const ratings = q.data?.ratings ?? [];
  const interactions = q.data?.interactions ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">Histórico</h1>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Avaliações</h2>
        {ratings.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhuma avaliação ainda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
            {ratings.map((r) => (
              <li key={`${r.media_type}:${r.tmdb_id}:${r.created_at}`} className="flex items-center gap-3 p-3">
                {r.poster_path && (
                  <img src={`https://image.tmdb.org/t/p/w92${r.poster_path}`} alt="" className="h-14 w-10 rounded object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-sm font-medium">{r.title || `#${r.tmdb_id}`}</div>
                  <div className="text-xs text-muted-foreground">{r.media_type === "movie" ? "Filme" : "Série"} • {new Date(r.created_at).toLocaleDateString("pt-BR")}</div>
                </div>
                <div className="rounded bg-primary/15 px-2 py-1 text-sm font-semibold text-primary">{Number(r.rating).toFixed(1)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Interações</h2>
        {interactions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhuma interação ainda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
            {interactions.map((i, idx) => (
              <li key={idx} className="flex items-center justify-between p-3 text-sm">
                <span>
                  <span className="font-medium capitalize">{i.action}</span>
                  <span className="ml-2 text-muted-foreground">{i.media_type === "movie" ? "Filme" : "Série"} #{i.tmdb_id}</span>
                </span>
                <span className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleDateString("pt-BR")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
