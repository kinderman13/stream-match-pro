import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getMyRoles } from "@/lib/admin.functions";

export function Header() {
  const { user } = useAuth();
  const router = useRouter();
  const fetchMyRoles = useServerFn(getMyRoles);
  const rolesQ = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => fetchMyRoles(),
    enabled: !!user,
  });

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tight text-primary">STREAM</span>
          <span className="text-xl font-black tracking-tight text-foreground">MATCH</span>
        </Link>
        {user ? (
          <nav className="flex items-center gap-1 text-sm">
            <Link to="/providers" className="rounded px-3 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">Início</Link>
            <Link to="/recommendations" className="rounded px-3 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">Recomendações</Link>
            <Link to="/list" className="rounded px-3 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">Minha Lista</Link>
            {rolesQ.data?.isAdmin && (
              <Link to="/admin" className="rounded px-3 py-1.5 text-primary hover:bg-secondary">Admin</Link>
            )}
            <button onClick={signOut} className="ml-2 rounded px-3 py-1.5 text-muted-foreground hover:text-primary">Sair</button>
          </nav>
        ) : (
          <Link to="/auth" className="rounded bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Entrar</Link>
        )}
      </div>
    </header>
  );
}
