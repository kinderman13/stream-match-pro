import { createFileRoute } from "@tanstack/react-router";
import { Film, Target, Eye, Sparkles, Heart, Brain, Lock, Star, Rocket } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Sobre o StreamMatch" },
      { name: "description", content: "Descubra exatamente o que assistir. Recomendações inteligentes baseadas nos seus gostos." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 -z-10 opacity-60">
          <div className="absolute left-1/2 top-0 h-[480px] w-[680px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        </div>
        <div className="mx-auto max-w-3xl px-6 py-20 text-center animate-fade-in sm:py-28">
          <div className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/50">
            <Film className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            Descubra exatamente o que assistir.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-sm text-muted-foreground sm:text-base">
            Recomendações inteligentes baseadas nos seus gostos e nas plataformas que você já possui.
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="mx-auto max-w-2xl px-6 py-16 animate-fade-in">
        <h2 className="mb-6 text-xl font-semibold tracking-tight sm:text-2xl">Bem-vindo ao StreamMatch.</h2>
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          <p>
            O StreamMatch nasceu para resolver um problema que milhões de pessoas enfrentam todos os dias: passar mais tempo procurando o que assistir do que realmente assistindo.
          </p>
          <p>
            Com tantas opções disponíveis em plataformas como Netflix, Prime Video, Max, Disney+, Apple TV+ e outras, encontrar um filme ou série que realmente combine com seu gosto pode ser frustrante. Foi pensando nisso que criamos uma experiência simples, inteligente e personalizada.
          </p>
          <p>
            Nosso sistema aprende continuamente com suas avaliações, conteúdos assistidos e preferências para oferecer recomendações cada vez mais precisas. Quanto mais você utiliza o StreamMatch, melhor ele entende seus gostos.
          </p>
          <p>
            Nosso objetivo é transformar a descoberta de filmes e séries em algo rápido, divertido e eficiente, ajudando você a encontrar sua próxima grande experiência de entretenimento em poucos minutos.
          </p>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="mx-auto max-w-4xl px-6 pb-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: Target, title: "Missão", text: "Facilitar a escolha do que assistir, eliminando a indecisão e conectando cada usuário aos conteúdos que realmente têm potencial para agradá-lo." },
            { icon: Eye, title: "Visão", text: "Ser a principal plataforma de recomendação inteligente de filmes e séries, tornando a experiência de streaming mais personalizada e eficiente para pessoas em todo o mundo." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border border-border/60 bg-card/40 p-6 animate-fade-in">
              <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <h3 className="mb-2 text-base font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-6 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Valores</h3>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: Heart, label: "Experiência do usuário em primeiro lugar" },
            { icon: Brain, label: "Tecnologia e personalização inteligente" },
            { icon: Lock, label: "Privacidade e segurança dos dados" },
            { icon: Star, label: "Transparência nas recomendações" },
            { icon: Rocket, label: "Evolução contínua da plataforma" },
          ].map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/30 px-4 py-3 text-sm animate-fade-in">
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-foreground/90">{label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Closing */}
      <section className="mx-auto max-w-2xl px-6 py-16 text-center animate-fade-in">
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Obrigado por fazer parte da comunidade StreamMatch.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground sm:text-base">
          Agora é só dar o play e descobrir sua próxima série ou filme favorito. 🍿🎥
        </p>
      </section>
    </main>
  );
}
