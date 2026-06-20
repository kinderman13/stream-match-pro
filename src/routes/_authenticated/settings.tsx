import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getProfile, updateProfile } from "@/lib/profile.functions";
import { resetUserChoices } from "@/lib/user-data.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const fetchProfile = useServerFn(getProfile);
  const save = useServerFn(updateProfile);
  const resetChoices = useServerFn(resetUserChoices);
  const p = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [pwStatus, setPwStatus] = useState<string | null>(null);

  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  useEffect(() => { if (p.data?.displayName) setName(p.data.displayName); }, [p.data?.displayName]);

  async function onSave() {
    setSaving(true);
    setStatus(null);
    try {
      await save({ data: { displayName: name.trim() } });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      await qc.invalidateQueries({ queryKey: ["my-profile"] });
      setStatus("Perfil atualizado.");
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword() {
    setPwStatus(null);
    if (password.length < 6) { setPwStatus("Senha deve ter pelo menos 6 caracteres."); return; }
    const { error } = await supabase.auth.updateUser({ password });
    setPwStatus(error ? error.message : "Senha alterada.");
    if (!error) setPassword("");
  }

  async function doReset() {
    setResetting(true);
    setResetMsg(null);
    try {
      await resetChoices();
      await qc.invalidateQueries();
      setResetMsg("✅ Preferências redefinidas com sucesso. Redirecionando ao onboarding...");
      setTimeout(() => router.navigate({ to: "/providers" }), 1200);
    } catch (e) {
      setResetMsg((e as Error).message);
    } finally {
      setResetting(false);
      setResetStep(0);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <h2 className="font-semibold">Perfil</h2>
        <label className="mt-3 block text-sm">
          <span className="text-muted-foreground">Nome</span>
          <input
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
          />
        </label>
        <button
          onClick={onSave}
          disabled={saving || !name.trim()}
          className="mt-3 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
        {status && <p className="mt-2 text-xs text-muted-foreground">{status}</p>}
      </section>

      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <h2 className="font-semibold">Senha</h2>
        <label className="mt-3 block text-sm">
          <span className="text-muted-foreground">Nova senha</span>
          <input
            type="password"
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>
        <button
          onClick={onChangePassword}
          disabled={!password}
          className="mt-3 rounded border border-border bg-secondary px-4 py-2 text-sm hover:border-primary disabled:opacity-50"
        >
          Alterar senha
        </button>
        {pwStatus && <p className="mt-2 text-xs text-muted-foreground">{pwStatus}</p>}
      </section>

      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <h2 className="font-semibold">Preferências</h2>
        <p className="mt-1 text-sm text-muted-foreground">Plataformas de streaming e tipo de conteúdo.</p>
        <Link to="/providers" className="mt-3 inline-block rounded border border-border bg-secondary px-4 py-2 text-sm hover:border-primary">
          Gerenciar preferências
        </Link>
      </section>

      <section className="mt-6 rounded-lg border border-destructive/40 bg-card p-5">
        <h2 className="font-semibold text-destructive">🔄 Resetar Escolhas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Apaga avaliações, histórico, recomendações e seu DNA Cinematográfico. Sua conta, login e dados de perfil são mantidos.
        </p>
        <button
          onClick={() => { setResetMsg(null); setResetStep(1); }}
          disabled={resetting}
          className="mt-3 rounded border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
        >
          {resetting ? "Resetando..." : "🔄 Resetar Escolhas"}
        </button>
        {resetMsg && <p className="mt-2 text-xs text-muted-foreground">{resetMsg}</p>}
      </section>

      <AlertDialog open={resetStep === 1} onOpenChange={(o) => !o && setResetStep(0)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar Preferências?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação apagará seu histórico de avaliações, preferências e recomendações personalizadas.
              Você poderá reconstruir seu perfil assistindo e avaliando novos conteúdos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); setResetStep(2); }}>
              Tem certeza?
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetStep === 2} onOpenChange={(o) => !o && setResetStep(0)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Esta ação não poderá ser desfeita.</AlertDialogTitle>
            <AlertDialogDescription>
              Confirmar o reset apagará permanentemente suas escolhas, DNA Cinematográfico e estatísticas pessoais.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); doReset(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
