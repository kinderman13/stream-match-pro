import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getUserState } from "@/lib/user-data.functions";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const fetchState = useServerFn(getUserState);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [guestOpen, setGuestOpen] = useState(false);

  async function enterAsGuest() {
    setBusy(true); setErr(null);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      await routeAfterAuth();
    } catch (e: any) {
      setErr(e.message || "Erro ao entrar como visitante");
      setBusy(false);
    }
  }

  async function routeAfterAuth() {
    try {
      const s = await fetchState({});
      if (!s.onboardingCompleted) router.navigate({ to: "/onboarding" });
      else router.navigate({ to: "/providers" });
    } catch {
      router.navigate({ to: "/onboarding" });
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) routeAfterAuth();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await routeAfterAuth();
    } catch (e: any) {
      setErr(e.message || "Erro ao autenticar");
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-6 flex items-center justify-center gap-1">
          <span className="text-2xl font-black text-primary">STREAM</span>
          <span className="text-2xl font-black">MATCH</span>
        </Link>
        <div className="rounded-xl border border-border bg-card p-6 poster-shadow">
          <h1 className="text-xl font-semibold">{mode === "signin" ? "Entrar" : "Criar conta"}</h1>
          <form onSubmit={submit} className="mt-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Senha</label>
              <input
                type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            {err && <div className="rounded-md bg-destructive/15 p-2 text-xs text-destructive">{err}</div>}
            <button disabled={busy} className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {busy ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
            </button>
          </form>
          <div className="my-4 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true); setErr(null);
              try {
                const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
                if (r.error) throw r.error;
                if (r.redirected) return;
                await routeAfterAuth();
              } catch (e: any) {
                setErr(e.message || "Erro ao entrar com Google");
                setBusy(false);
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card py-2.5 text-sm font-semibold hover:bg-accent disabled:opacity-60"
          >
            <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Entrar com Google
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setGuestOpen(true)}
            className="mt-2 w-full rounded-md border border-border bg-card py-2.5 text-sm font-semibold hover:bg-accent disabled:opacity-60"
          >
            Entrar como visitante
          </button>

          <AlertDialog open={guestOpen} onOpenChange={setGuestOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Entrar como visitante</AlertDialogTitle>
                <AlertDialogDescription>
                  Neste modo o seu perfil e os itens sugeridos não serão salvos.
                  Deseja continuar mesmo assim?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white text-black hover:bg-white/90">
                  Voltar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={enterAsGuest}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  Concordo, continuar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
