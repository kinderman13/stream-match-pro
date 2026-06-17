import { createFileRoute } from "@tanstack/react-router";
import {
  Shield,
  FileText,
  Database,
  Settings2,
  Sparkles,
  Share2,
  Lock,
  Cookie,
  UserCheck,
  Trash2,
  Plug,
  RefreshCw,
  Mail,
} from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade · StreamMatch" },
      {
        name: "description",
        content:
          "Como o StreamMatch coleta, utiliza, armazena e protege suas informações.",
      },
    ],
  }),
  component: PrivacyPage,
});

type Section = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
};

const sections: Section[] = [
  {
    id: "introducao",
    title: "Introdução",
    icon: FileText,
    content: (
      <>
        <p>Sua privacidade é importante para nós.</p>
        <p>
          Esta Política de Privacidade explica como o StreamMatch coleta,
          utiliza, armazena e protege suas informações quando você utiliza
          nossa plataforma.
        </p>
        <p>
          Ao utilizar nossos serviços, você concorda com as práticas descritas
          nesta política.
        </p>
      </>
    ),
  },
  {
    id: "informacoes",
    title: "Informações que coletamos",
    icon: Database,
    content: (
      <>
        <p>Podemos coletar as seguintes informações:</p>
        <SubList
          title="Dados de cadastro"
          items={["Nome", "E-mail", "Foto de perfil (quando fornecida)"]}
        />
        <SubList
          title="Dados de uso"
          items={[
            "Filmes avaliados",
            "Séries avaliadas",
            "Conteúdos curtidos",
            "Conteúdos rejeitados",
            "Conteúdos assistidos",
            "Conteúdos salvos",
            "Preferências de streaming",
          ]}
        />
        <SubList
          title="Dados técnicos"
          items={[
            "Endereço IP",
            "Navegador utilizado",
            "Dispositivo utilizado",
            "Data e horário de acesso",
          ]}
        />
      </>
    ),
  },
  {
    id: "uso",
    title: "Como utilizamos suas informações",
    icon: Settings2,
    content: (
      <>
        <p>Utilizamos seus dados para:</p>
        <BulletList
          items={[
            "Personalizar recomendações",
            "Melhorar a precisão do algoritmo",
            "Aprimorar a experiência do usuário",
            "Corrigir erros da plataforma",
            "Gerar estatísticas internas",
            "Garantir a segurança da aplicação",
            "Prestar suporte ao usuário",
          ]}
        />
      </>
    ),
  },
  {
    id: "recomendacoes",
    title: "Recomendações personalizadas",
    icon: Sparkles,
    content: (
      <>
        <p>
          O StreamMatch utiliza suas interações para criar recomendações mais
          relevantes.
        </p>
        <p>As informações utilizadas incluem:</p>
        <BulletList
          items={[
            "Avaliações",
            "Curtidas",
            "Rejeições",
            "Histórico de conteúdos assistidos",
            "Plataformas selecionadas",
          ]}
        />
        <p>
          Esses dados são utilizados exclusivamente para melhorar sua
          experiência dentro da plataforma.
        </p>
      </>
    ),
  },
  {
    id: "compartilhamento",
    title: "Compartilhamento de dados",
    icon: Share2,
    content: (
      <>
        <p>O StreamMatch não vende informações pessoais dos usuários.</p>
        <p>Seus dados não são comercializados com terceiros.</p>
        <p>Poderemos compartilhar informações apenas quando:</p>
        <BulletList
          items={[
            "Exigido por lei",
            "Necessário para proteger direitos legais",
            "Necessário para funcionamento de serviços essenciais integrados à plataforma",
          ]}
        />
      </>
    ),
  },
  {
    id: "seguranca",
    title: "Armazenamento e segurança",
    icon: Lock,
    content: (
      <>
        <p>
          Adotamos medidas técnicas e organizacionais para proteger seus dados
          contra:
        </p>
        <BulletList
          items={[
            "Acesso não autorizado",
            "Alteração indevida",
            "Divulgação indevida",
            "Perda de informações",
          ]}
        />
        <p>
          Apesar dos nossos esforços, nenhum sistema é totalmente imune a
          riscos de segurança.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies e tecnologias semelhantes",
    icon: Cookie,
    content: (
      <>
        <p>Podemos utilizar cookies para:</p>
        <BulletList
          items={[
            "Manter sua sessão ativa",
            "Salvar preferências",
            "Melhorar desempenho",
            "Analisar uso da plataforma",
          ]}
        />
        <p>
          Você pode gerenciar cookies diretamente nas configurações do seu
          navegador.
        </p>
      </>
    ),
  },
  {
    id: "direitos",
    title: "Seus direitos",
    icon: UserCheck,
    content: (
      <>
        <p>Você pode solicitar:</p>
        <BulletList
          items={[
            "Acesso aos seus dados",
            "Correção de informações",
            "Atualização de informações",
            "Exclusão da conta",
            "Exclusão de dados pessoais",
          ]}
        />
        <p>
          Para exercer seus direitos, utilize o canal de contato disponível na
          plataforma.
        </p>
      </>
    ),
  },
  {
    id: "exclusao",
    title: "Exclusão de conta",
    icon: Trash2,
    content: (
      <>
        <p>
          O usuário pode solicitar a exclusão de sua conta a qualquer momento.
        </p>
        <p>
          Após a solicitação, os dados pessoais serão removidos conforme
          exigido pela legislação aplicável.
        </p>
      </>
    ),
  },
  {
    id: "terceiros",
    title: "Serviços de terceiros",
    icon: Plug,
    content: (
      <>
        <p>
          O StreamMatch pode utilizar serviços externos para funcionamento da
          plataforma, incluindo:
        </p>
        <BulletList
          items={[
            "Sistemas de autenticação",
            "Hospedagem",
            "Banco de dados",
            "APIs de conteúdo audiovisual",
          ]}
        />
        <p>Esses serviços possuem suas próprias políticas de privacidade.</p>
      </>
    ),
  },
  {
    id: "alteracoes",
    title: "Alterações desta política",
    icon: RefreshCw,
    content: (
      <>
        <p>
          Esta Política de Privacidade poderá ser atualizada periodicamente.
        </p>
        <p>
          Sempre que houver alterações relevantes, os usuários serão informados
          através da plataforma.
        </p>
      </>
    ),
  },
  {
    id: "contato",
    title: "Contato",
    icon: Mail,
    content: (
      <p>
        Em caso de dúvidas sobre esta Política de Privacidade, utilize a seção
        <span className="text-foreground"> "Fale Conosco" </span>
        disponível dentro do StreamMatch.
      </p>
    ),
  },
];

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-1.5 pl-5 marker:text-primary/60 list-disc">
      {items.map((it) => (
        <li key={it}>{it}</li>
      ))}
    </ul>
  );
}

function SubList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <p className="font-medium text-foreground">{title}</p>
      <BulletList items={items} />
    </div>
  );
}

function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 -z-10 opacity-60">
          <div className="absolute left-1/2 top-0 h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        </div>
        <div className="mx-auto max-w-3xl px-6 py-16 text-center animate-fade-in sm:py-24">
          <div className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/50">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            Política de Privacidade
          </h1>
          <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
            Última atualização: 16/06/2026
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        {/* Índice */}
        <nav
          aria-label="Índice"
          className="mb-12 rounded-xl border border-border/50 bg-card/30 p-5 animate-fade-in"
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Índice
          </p>
          <ol className="grid gap-1.5 text-sm sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="inline-flex items-baseline gap-2 text-muted-foreground transition-colors hover:text-primary"
                >
                  <span className="tabular-nums text-xs text-muted-foreground/60">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Sections */}
        <div className="space-y-12">
          {sections.map((s, i) => {
            const Icon = s.icon;
            return (
              <section
                key={s.id}
                id={s.id}
                className="scroll-mt-24 animate-fade-in"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-card/50">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    <span className="mr-2 text-sm tabular-nums text-muted-foreground/60">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {s.title}
                  </h2>
                </div>
                <div className="space-y-3 pl-11 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                  {s.content}
                </div>
              </section>
            );
          })}
        </div>

        <p className="mt-16 text-center text-xs text-muted-foreground/70">
          © {new Date().getFullYear()} StreamMatch. Todos os direitos reservados.
        </p>
      </div>
    </main>
  );
}
