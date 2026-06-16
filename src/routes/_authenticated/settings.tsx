import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getProfile, updateProfile } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getProfile);
  const save = useServerFn(updateProfile);
  const p = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [pwStatus, setPwStatus] = useState<string | null>(null);

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
    </div>
  );
}
