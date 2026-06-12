import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getUserState } from "@/lib/user-data.functions";

export const Route = createFileRoute("/_authenticated/choose")({
  component: Choose,
});

function Choose() {
  const router = useRouter();
  const state = useServerFn(getUserState);

  useEffect(() => {
    state({}).then((s) => {
      if (!s.onboardingCompleted) router.navigate({ to: "/onboarding" });
      else if (!s.selectedProviders.length) router.navigate({ to: "/providers" });
    });
  }, [state, router]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">O que você quer assistir hoje?</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link to="/catalog" search={{ type: "movie" }} className="group rounded-xl border border-border bg-card p-8 text-center hover:border-primary">
          <div className="text-5xl">🎬</div>
          <div className="mt-3 text-xl font-bold">Filmes</div>
        </Link>
        <Link to="/catalog" search={{ type: "tv" }} className="group rounded-xl border border-border bg-card p-8 text-center hover:border-primary">
          <div className="text-5xl">📺</div>
          <div className="mt-3 text-xl font-bold">Séries</div>
        </Link>
      </div>
      <div className="mt-6 text-center">
        <Link to="/recommendations" className="text-sm text-muted-foreground hover:text-primary">
          Ou pular para minhas recomendações →
        </Link>
      </div>
    </div>
  );
}
