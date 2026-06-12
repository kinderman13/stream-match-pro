import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StreamMatch — Descubra exatamente o que assistir" },
      { name: "description", content: "Consultor inteligente que recomenda filmes e séries para você em segundos, com base no que você ama." },
      { property: "og:title", content: "StreamMatch — Descubra exatamente o que assistir" },
      { property: "og:description", content: "Consultor inteligente de streaming. Recomendações personalizadas em menos de 30 segundos." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(60% 60% at 50% 0%, oklch(0.58 0.24 27 / 0.45), transparent 70%)",
          }}
        />
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight text-primary">STREAM</span>
            <span className="text-2xl font-black tracking-tight">MATCH</span>
          </div>
          <Link to="/auth" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Entrar
          </Link>
        </header>

        <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-24 pt-12 text-center sm:pt-20">
          <span className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            Recomendações em menos de 30 segundos
          </span>
          <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            Descubra exatamente
            <br />
            <span className="text-primary">o que assistir.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            StreamMatch aprende seu gosto e recomenda apenas o que está disponível nos seus streamings favoritos.
            Sem rolar por horas. Sem sugestões irrelevantes.
          </p>
          <Link
            to="/auth"
            className="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground transition hover:opacity-90"
          >
            COMEÇAR
          </Link>
          <div className="mt-12 grid w-full grid-cols-3 gap-4 text-left sm:gap-6">
            {[
              { t: "Catálogo visual", d: "Reconheça pelo poster, marque o que já assistiu." },
              { t: "Match Score", d: "Compatibilidade calculada com seu perfil." },
              { t: "Por streaming", d: "Filtra só o que está disponível pra você." },
            ].map((f) => (
              <div key={f.t} className="rounded-lg border border-border bg-card/60 p-3 sm:p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-primary sm:text-sm">{f.t}</div>
                <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{f.d}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
