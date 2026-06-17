import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Termos de Uso · StreamMatch" }] }),
  component: () => (
    <main className="mx-auto max-w-2xl px-4 py-16 text-sm leading-relaxed text-muted-foreground">
      <h1 className="mb-4 text-2xl font-semibold text-foreground">Termos de Uso</h1>
      <p>Ao usar o StreamMatch você concorda em respeitar a comunidade, não publicar conteúdo ilegal e não tentar burlar mecanismos do sistema. Podemos suspender contas que violem essas regras.</p>
    </main>
  ),
});
