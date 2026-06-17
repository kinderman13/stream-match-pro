import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "Sobre Nós · StreamMatch" }, { name: "description", content: "Conheça o StreamMatch." }] }),
  component: () => (
    <main className="mx-auto max-w-2xl px-4 py-16 text-sm leading-relaxed text-foreground">
      <h1 className="mb-4 text-2xl font-semibold">Sobre Nós</h1>
      <p className="text-muted-foreground">O StreamMatch ajuda você a descobrir o que assistir nos serviços de streaming que você já possui, com recomendações personalizadas baseadas no seu gosto.</p>
    </main>
  ),
});
