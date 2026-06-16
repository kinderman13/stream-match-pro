import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PROVIDERS, PROVIDER_LABELS, type ProviderKey } from "@/lib/tmdb.server.types";
import { setProviders } from "@/lib/user-data.functions";

export const Route = createFileRoute("/_authenticated/providers")({
  component: ProvidersPage,
});

function ProvidersPage() {
  const router = useRouter();
  const save = useServerFn(setProviders);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Single platform per session — always start fresh
    try { sessionStorage.removeItem("streammatch:contentType"); } catch {}
  }, []);

  async function submit() {
    if (selected == null || busy) return;
    setBusy(true);
    try {
      await save({ data: { providerIds: [selected] } });
      router.navigate({ to: "/choose" });
    } finally {
      setBusy(false);
    }
  }

  const entries = Object.entries(PROVIDERS) as [ProviderKey, number][];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Onde você pretende assistir hoje?</h1>
      <p className="mt-2 text-sm text-muted-foreground">Selecione apenas uma plataforma. Vamos sugerir somente o que está disponível nela.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {entries.map(([key, id]) => {
          const on = selected === id;
          return (
            <button
              key={key}
              onClick={() => setSelected(id)}
              className={`rounded-xl border-2 p-6 text-center text-lg font-bold transition ${
                on
                  ? "border-primary bg-primary/10 text-foreground shadow-lg shadow-primary/20 scale-[1.02]"
                  : "border-border bg-card text-muted-foreground hover:border-primary/60 hover:text-foreground"
              }`}
            >
              {PROVIDER_LABELS[key]}
            </button>
          );
        })}
      </div>

      <button
        disabled={selected == null || busy}
        onClick={submit}
        className="mt-8 w-full rounded-md bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
      >
        CONTINUAR
      </button>
    </div>
  );
}
