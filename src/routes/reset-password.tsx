import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery token from the URL hash and emits PASSWORD_RECOVERY
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // Also check current session: when arriving from the email link, the SDK
    // exchanges the hash on load and we already have a session.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 6) { setErr("A senha precisa ter ao menos 6 caracteres."); return; }
    if (password !== confirm) { setErr("As senhas não coincidem."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setOk(true);
      setTimeout(() => router.navigate({ to: "/auth" }), 1500);
    } catch (e: any) {
      setErr(e.message || "Não foi possível redefinir a senha.");
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
          <h1 className="text-xl font-semibold">Redefinir senha</h1>

          {ok ? (
            <div className="mt-4 rounded-md bg-emerald-500/15 p-3 text-sm text-emerald-400">
              Senha atualizada! Redirecionando para o login…
            </div>
          ) : !ready ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Validando link de recuperação… Se você não veio do email, abra o link enviado para sua caixa de entrada.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nova senha</label>
                <input
                  type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Confirmar nova senha</label>
                <input
                  type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              {err && <div className="rounded-md bg-destructive/15 p-2 text-xs text-destructive">{err}</div>}
              <button disabled={busy} className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
                {busy ? "Atualizando..." : "Atualizar senha"}
              </button>
            </form>
          )}

          <Link to="/auth" className="mt-4 block w-full text-center text-xs text-muted-foreground hover:text-foreground">
            ← Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}
