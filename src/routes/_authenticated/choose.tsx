import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/choose")({
  component: Choose,
});

type Choice = "movie" | "tv";

function Choose() {
  const router = useRouter();
  const [choice, setChoice] = useState<Choice | null>(null);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">O que deseja assistir hoje?</h1>
      <p className="mt-2 text-sm text-muted-foreground">Escolha uma opção para continuar.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setChoice("movie")}
          className={`rounded-xl border p-8 text-center transition ${
            choice === "movie" ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/60"
          }`}
        >
          <div className="text-5xl">🎬</div>
          <div className="mt-3 text-xl font-bold">FILMES</div>
        </button>
        <button
          type="button"
          onClick={() => setChoice("tv")}
          className={`rounded-xl border p-8 text-center transition ${
            choice === "tv" ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/60"
          }`}
        >
          <div className="text-5xl">📺</div>
          <div className="mt-3 text-xl font-bold">SÉRIES</div>
        </button>
      </div>

      <button
        type="button"
        disabled={!choice}
        onClick={() => choice && router.navigate({ to: "/catalog", search: { type: choice } })}
        className="mt-8 w-full rounded-md bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
      >
        CONTINUAR
      </button>
    </div>
  );
}
