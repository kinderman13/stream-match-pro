import { createContext, useContext, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Bug, Lightbulb, HelpCircle, Flag, Mail, ChevronLeft, Send } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  createTicket, listMyTickets, getTicket, replyTicket, getUnreadSupport,
} from "@/lib/support.functions";

const CATS = [
  { id: "bug", label: "Reportar Problema", icon: Bug },
  { id: "feature", label: "Sugerir Funcionalidade", icon: Lightbulb },
  { id: "question", label: "Tirar Dúvida", icon: HelpCircle },
  { id: "content_report", label: "Reportar Conteúdo", icon: Flag },
  { id: "contact", label: "Entrar em Contato", icon: Mail },
] as const;

const STATUS_LABEL: Record<string, string> = {
  open: "Aberto", in_review: "Em análise", answered: "Respondido", closed: "Fechado",
};

type Ctx = { open: () => void; close: () => void };
const SupportCtx = createContext<Ctx>({ open: () => {}, close: () => {} });
export const useSupport = () => useContext(SupportCtx);

export function SupportProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"home" | "new" | "thread">("home");
  const [category, setCategory] = useState<typeof CATS[number]["id"] | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const listFn = useServerFn(listMyTickets);
  const createFn = useServerFn(createTicket);
  const getFn = useServerFn(getTicket);
  const replyFn = useServerFn(replyTicket);
  const unreadFn = useServerFn(getUnreadSupport);
  const qc = useQueryClient();

  const ticketsQ = useQuery({
    queryKey: ["my-tickets"], queryFn: () => listFn(), enabled: open && view === "home",
  });
  const threadQ = useQuery({
    queryKey: ["my-ticket", ticketId],
    queryFn: () => getFn({ data: { id: ticketId! } }),
    enabled: open && view === "thread" && !!ticketId,
  });
  const unreadQ = useQuery({
    queryKey: ["support-unread"], queryFn: () => unreadFn(), refetchInterval: 60_000,
  });

  function reset() { setView("home"); setCategory(null); setTicketId(null); }

  return (
    <SupportCtx.Provider value={{
      open: () => { reset(); setOpen(true); },
      close: () => setOpen(false),
    }}>
      {children}

      {/* Floating button */}
      <button
        onClick={() => { reset(); setOpen(true); }}
        aria-label="Suporte"
        className="fixed bottom-5 right-5 z-30 grid h-10 w-10 place-items-center rounded-full border border-border bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition hover:text-foreground hover:border-foreground/30"
      >
        <MessageCircle className="h-4 w-4" />
        {(unreadQ.data?.count ?? 0) > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="border-b px-5 py-4">
            <div className="flex items-center gap-2">
              {view !== "home" && (
                <button onClick={reset} className="text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <SheetTitle className="text-base font-semibold">
                {view === "home" ? "Fale Conosco" : view === "new" ? "Nova solicitação" : "Conversa"}
              </SheetTitle>
            </div>
            {view === "home" && (
              <SheetDescription className="text-xs">Como podemos ajudar?</SheetDescription>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {view === "home" && (
              <div className="space-y-6">
                <ul className="divide-y divide-border/60 rounded-md border border-border/60">
                  {CATS.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => { setCategory(c.id); setView("new"); }}
                        className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm hover:bg-secondary/60"
                      >
                        <c.icon className="h-4 w-4 text-muted-foreground" />
                        <span>{c.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Minhas solicitações
                  </div>
                  {ticketsQ.isLoading ? (
                    <p className="text-xs text-muted-foreground">Carregando…</p>
                  ) : (ticketsQ.data ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma solicitação ainda.</p>
                  ) : (
                    <ul className="divide-y divide-border/60 rounded-md border border-border/60">
                      {(ticketsQ.data ?? []).map((t: any) => (
                        <li key={t.id}>
                          <button
                            onClick={() => { setTicketId(t.id); setView("thread"); }}
                            className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left hover:bg-secondary/60"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm">{t.subject}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {STATUS_LABEL[t.status]} · {new Date(t.last_message_at).toLocaleDateString()}
                              </div>
                            </div>
                            {t.user_unread_count > 0 && (
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {view === "new" && category && (
              <NewTicketForm
                category={category}
                onCreated={(id) => {
                  qc.invalidateQueries({ queryKey: ["my-tickets"] });
                  setTicketId(id); setView("thread");
                }}
                onSubmit={(payload) => createFn({ data: { ...payload, category } })}
              />
            )}

            {view === "thread" && ticketId && (
              <ThreadView
                data={threadQ.data}
                loading={threadQ.isLoading}
                onReply={async (message) => {
                  await replyFn({ data: { id: ticketId, message } });
                  await qc.invalidateQueries({ queryKey: ["my-ticket", ticketId] });
                  await qc.invalidateQueries({ queryKey: ["my-tickets"] });
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </SupportCtx.Provider>
  );
}

function NewTicketForm({
  category,
  onSubmit,
  onCreated,
}: {
  category: string;
  onSubmit: (p: { subject: string; message: string }) => Promise<{ id: string }>;
  onCreated: (id: string) => void;
}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const mut = useMutation({
    mutationFn: async () => onSubmit({ subject, message }),
    onSuccess: (r) => { toast.success("Enviado"); onCreated(r.id); },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao enviar"),
  });
  const catLabel = CATS.find((c) => c.id === category)?.label ?? category;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
    >
      <div className="text-xs text-muted-foreground">Categoria: <span className="text-foreground">{catLabel}</span></div>
      <div className="space-y-1.5">
        <Label htmlFor="subj" className="text-xs">Assunto</Label>
        <Input id="subj" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="msg" className="text-xs">Mensagem</Label>
        <Textarea id="msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={6} maxLength={4000} required />
      </div>
      <Button type="submit" disabled={mut.isPending} className="w-full" size="sm">
        {mut.isPending ? "Enviando…" : "Enviar"}
      </Button>
    </form>
  );
}

function ThreadView({
  data, loading, onReply,
}: { data: any; loading: boolean; onReply: (m: string) => Promise<void> }) {
  const [reply, setReply] = useState("");
  const mut = useMutation({
    mutationFn: async () => onReply(reply),
    onSuccess: () => { setReply(""); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });
  if (loading || !data) return <p className="text-xs text-muted-foreground">Carregando…</p>;
  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <div className="text-sm font-medium">{data.ticket.subject}</div>
        <div className="text-[11px] text-muted-foreground">
          {STATUS_LABEL[data.ticket.status]} · {new Date(data.ticket.created_at).toLocaleString()}
        </div>
      </div>
      <ul className="space-y-3">
        {data.messages.map((m: any) => (
          <li key={m.id} className={`flex ${m.sender_role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              m.sender_role === "user" ? "bg-primary/10 text-foreground" : "bg-secondary text-foreground"
            }`}>
              <div className="whitespace-pre-wrap">{m.body}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                {m.sender_role === "user" ? "Você" : "Suporte"} · {new Date(m.created_at).toLocaleString()}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {data.ticket.status !== "closed" && (
        <form
          className="mt-auto flex items-end gap-2 border-t pt-3"
          onSubmit={(e) => { e.preventDefault(); if (reply.trim()) mut.mutate(); }}
        >
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder="Escreva uma resposta…" className="flex-1" />
          <Button type="submit" size="icon" disabled={mut.isPending || !reply.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
}
