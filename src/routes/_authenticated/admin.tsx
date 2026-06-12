import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getMyRoles,
  adminListUsers,
  adminGrantRole,
  adminRevokeRole,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

const ROLES = ["admin", "moderator", "user"] as const;

function AdminPage() {
  const router = useRouter();
  const fetchMyRoles = useServerFn(getMyRoles);
  const fetchUsers = useServerFn(adminListUsers);
  const grant = useServerFn(adminGrantRole);
  const revoke = useServerFn(adminRevokeRole);
  const qc = useQueryClient();

  const meQ = useQuery({ queryKey: ["my-roles"], queryFn: () => fetchMyRoles() });

  if (meQ.isLoading) {
    return <div className="mx-auto max-w-4xl p-8 text-muted-foreground">Verificando permissões…</div>;
  }
  if (!meQ.data?.isAdmin) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-bold">Acesso negado</h1>
        <p className="mt-2 text-muted-foreground">
          Esta área é restrita a administradores.
        </p>
        <button
          onClick={() => router.navigate({ to: "/recommendations" })}
          className="mt-4 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Voltar
        </button>
      </div>
    );
  }

  return <AdminDashboard fetchUsers={fetchUsers} grant={grant} revoke={revoke} qc={qc} />;
}

function AdminDashboard({ fetchUsers, grant, revoke, qc }: any) {
  const usersQ = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchUsers() });
  const [busy, setBusy] = useState<string | null>(null);

  const grantM = useMutation({
    mutationFn: (v: { userId: string; role: "admin" | "moderator" | "user" }) =>
      grant({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
  const revokeM = useMutation({
    mutationFn: (v: { userId: string; role: "admin" | "moderator" | "user" }) =>
      revoke({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-black">Painel Admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gerencie papéis dos usuários do StreamMatch.
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left">
            <tr>
              <th className="px-4 py-2">Usuário</th>
              <th className="px-4 py-2">Papéis</th>
              <th className="px-4 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usersQ.data?.map((u: any) => (
              <tr key={u.id} className="border-t border-border/40">
                <td className="px-4 py-3">
                  <div className="font-medium">{u.displayName || "(sem nome)"}</div>
                  <div className="text-xs text-muted-foreground">{u.id}</div>
                </td>
                <td className="px-4 py-3">
                  {u.roles.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r: string) => (
                        <span key={r} className="rounded bg-primary/15 px-2 py-0.5 text-xs text-primary">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    {ROLES.map((r) => {
                      const has = u.roles.includes(r);
                      const key = `${u.id}:${r}`;
                      return (
                        <button
                          key={r}
                          disabled={busy === key}
                          onClick={async () => {
                            setBusy(key);
                            try {
                              if (has) await revokeM.mutateAsync({ userId: u.id, role: r });
                              else await grantM.mutateAsync({ userId: u.id, role: r });
                            } catch (e: any) {
                              alert(e.message);
                            } finally {
                              setBusy(null);
                            }
                          }}
                          className={`rounded px-2 py-1 text-xs font-medium ${
                            has
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground hover:bg-secondary/80"
                          }`}
                        >
                          {has ? `− ${r}` : `+ ${r}`}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {usersQ.isLoading && (
          <div className="p-6 text-center text-muted-foreground">Carregando…</div>
        )}
        {usersQ.data?.length === 0 && (
          <div className="p-6 text-center text-muted-foreground">Nenhum usuário.</div>
        )}
      </div>
    </div>
  );
}
