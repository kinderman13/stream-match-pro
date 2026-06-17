import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

import { lovable } from "@/integrations/lovable";
import { SplashScreen } from "@/components/SplashScreen";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);


  async function routeAfterAuth() {
    router.navigate({ to: "/providers" });
  }


  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        routeAfterAuth();
      } else {
        setCheckingSession(false);
      }
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checkingSession) {
    return <SplashScreen />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setInfo(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        await routeAfterAuth();
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setInfo("Se este email existir, enviamos um link de recuperação. Verifique sua caixa de entrada.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await routeAfterAuth();
      }
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
          <h1 className="text-xl font-semibold">
            {mode === "signin" ? "Entrar" : mode === "signup" ? "Criar conta" : "Recuperar senha"}
          </h1>
          {mode === "forgot" && (
            <p className="mt-2 text-xs text-muted-foreground">
              Informe seu email e enviaremos um link para você redefinir a senha.
            </p>
          )}
          <form onSubmit={submit} className="mt-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            {mode !== "forgot" && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Senha</label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); setErr(null); setInfo(null); }}
                      className="text-[11px] text-muted-foreground hover:text-primary"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <input
                  type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            )}
            {err && <div className="rounded-md bg-destructive/15 p-2 text-xs text-destructive">{err}</div>}
            {info && <div className="rounded-md bg-emerald-500/15 p-2 text-xs text-emerald-400">{info}</div>}
            <button disabled={busy} className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {busy ? "Aguarde..." : mode === "signin" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}
            </button>
          </form>
          {mode !== "forgot" && (
            <>
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
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setErr(null); setInfo(null);
            }}
            className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "Não tem conta? Criar agora"
              : mode === "signup" ? "Já tem conta? Entrar"
              : "← Voltar para o login"}
          </button>
        </div>
      </div>
    </div>
  );
}
