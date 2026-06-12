import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PROVIDERS, PROVIDER_LABELS, type ProviderKey } from "@/lib/tmdb.server.types";
import { setProviders, getUserState } from "@/lib/user-data.functions";

export const Route = createFileRoute("/_authenticated/providers")({
  component: ProvidersPage,
});

function ProvidersPage() {
  const router = useRouter();
  const save = useServerFn(setProviders);
  const state = useServerFn(getUserState);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => { state({}).then((s) => setSelected(new Set(s.selectedProviders))); }, [state]);

  function toggle(id: number) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function submit() {
    await save({ data: { providerIds: Array.from(selected) } });
    router.navigate({ to: "/choose" });
  }

  const entries = Object.entries(PROVIDERS) as [ProviderKey, number][];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Onde você pretende assistir?</h1>
      <p className="mt-1 text-sm text-muted-foreground">Selecione suas plataformas. Você só verá conteúdos disponíveis nelas.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {entries.map(([key, id]) => {
          const on = selected.has(id);
          return (
            <button
              key={key}
              onClick={() => toggle(id)}
              className={`rounded-lg border p-4 text-center font-semibold transition ${
                on ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {PROVIDER_LABELS[key]}
            </button>
          );
        })}
      </div>
      <button
        disabled={selected.size === 0}
        onClick={submit}
        className="mt-8 w-full rounded-md bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
      >
        Continuar
      </button>

    </div>
  );
}
