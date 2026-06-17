import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Política de Privacidade · StreamMatch" }] }),
  component: () => (
    <main className="mx-auto max-w-2xl px-4 py-16 text-sm leading-relaxed text-muted-foreground">
      <h1 className="mb-4 text-2xl font-semibold text-foreground">Política de Privacidade</h1>
      <p>Coletamos apenas os dados necessários para fornecer recomendações personalizadas: email, preferências de provedores, avaliações e interações com conteúdos. Esses dados nunca são compartilhados com terceiros.</p>
    </main>
  ),
});
