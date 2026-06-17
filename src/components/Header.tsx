import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { User, List, History, SlidersHorizontal, Settings, LogOut, Mail } from "lucide-react";
import { useSupport } from "@/components/SupportPanel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getMyRoles } from "@/lib/admin.functions";
import { getProfile } from "@/lib/profile.functions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { InstallAppButton } from "@/components/InstallAppButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { user } = useAuth();
  const router = useRouter();
  const support = useSupport();
  const fetchMyRoles = useServerFn(getMyRoles);
  const fetchProfile = useServerFn(getProfile);
  const rolesQ = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => fetchMyRoles(),
    enabled: !!user,
  });
  const profileQ = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    enabled: !!user,
  });

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  }

  const name = profileQ.data?.displayName || profileQ.data?.email || user?.email || "";
  const initials = name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "U";

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
            <InstallAppButton className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary" />
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-2 outline-none ring-primary/40 focus-visible:ring-2 rounded-full">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="font-semibold truncate">{profileQ.data?.displayName || "Usuário"}</span>
                  <span className="text-xs font-normal text-muted-foreground truncate">{profileQ.data?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile"><User className="mr-2 h-4 w-4" />Meu Perfil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/list"><List className="mr-2 h-4 w-4" />Minha Lista</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/history"><History className="mr-2 h-4 w-4" />Histórico</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/providers"><SlidersHorizontal className="mr-2 h-4 w-4" />Preferências</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings"><Settings className="mr-2 h-4 w-4" />Configurações</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); support.open(); }}>
                  <Mail className="mr-2 h-4 w-4" />Fale Conosco
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        ) : (
          <Link to="/auth" className="rounded bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Entrar</Link>
        )}
      </div>
    </header>
  );
}
