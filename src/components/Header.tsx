import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  List,
  History,
  SlidersHorizontal,
  Settings,
  LogOut,
  Mail,
  Menu,
  Home,
  Clapperboard,
} from "lucide-react";
import { useSupport } from "@/components/SupportPanel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getMyRoles } from "@/lib/admin.functions";
import { getProfile } from "@/lib/profile.functions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { InstallAppButton } from "@/components/InstallAppButton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  const [mobileOpen, setMobileOpen] = useState(false);
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
  const initials =
    name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U";

  const mobileLinks = [
    { to: "/providers" as const, label: "Início", icon: Home },
    { to: "/recommendations" as const, label: "Minhas Recomendações", icon: Clapperboard },
    { to: "/list" as const, label: "Minha Lista", icon: List },
    { to: "/history" as const, label: "Histórico", icon: History },
    { to: "/profile" as const, label: "Meu Perfil", icon: User },
    { to: "/settings" as const, label: "Configurações", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full max-w-full overflow-x-hidden border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
        <Link to="/" className="flex shrink-0 items-center gap-1">
          <span className="text-lg font-black tracking-tight text-primary sm:text-xl">STREAM</span>
          <span className="text-lg font-black tracking-tight text-foreground sm:text-xl">MATCH</span>
        </Link>

        {user ? (
          <>
            {/* Desktop nav */}
            <nav className="hidden items-center gap-1 text-sm lg:flex">
              <Link to="/providers" className="rounded px-3 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">Início</Link>
              <Link to="/recommendations" className="rounded px-3 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">Recomendações</Link>
              <Link to="/list" className="rounded px-3 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">Minha Lista</Link>
              {rolesQ.data?.isAdmin && (
                <Link to="/admin" className="rounded px-3 py-1.5 text-primary hover:bg-secondary">Admin</Link>
              )}
              <InstallAppButton className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary" />
              <DropdownMenu>
                <DropdownMenuTrigger className="ml-2 rounded-full outline-none ring-primary/40 focus-visible:ring-2">
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="truncate font-semibold">{profileQ.data?.displayName || "Usuário"}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">{profileQ.data?.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/profile"><User className="mr-2 h-4 w-4" />Meu Perfil</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/list"><List className="mr-2 h-4 w-4" />Minha Lista</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/history"><History className="mr-2 h-4 w-4" />Histórico</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/providers"><SlidersHorizontal className="mr-2 h-4 w-4" />Preferências</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/settings"><Settings className="mr-2 h-4 w-4" />Configurações</Link></DropdownMenuItem>
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

            {/* Mobile: avatar + hamburger */}
            <div className="flex items-center gap-2 lg:hidden">
              <Avatar className="h-8 w-8 shrink-0 border border-border">
                <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger
                  aria-label="Abrir menu"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary/60 text-foreground transition hover:bg-secondary"
                >
                  <Menu className="h-5 w-5" />
                </SheetTrigger>
                <SheetContent side="left" className="w-[85vw] max-w-sm border-border bg-background p-0">
                  <div className="flex h-full flex-col">
                    <div className="border-b border-border/60 px-5 py-5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black tracking-tight text-primary">STREAM</span>
                        <span className="text-lg font-black tracking-tight text-foreground">MATCH</span>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <Avatar className="h-10 w-10 shrink-0 border border-border">
                          <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{profileQ.data?.displayName || "Usuário"}</p>
                          <p className="truncate text-xs text-muted-foreground">{profileQ.data?.email}</p>
                        </div>
                      </div>
                    </div>
                    <nav className="flex-1 overflow-y-auto px-3 py-3">
                      {mobileLinks.map(({ to, label, icon: Icon }) => (
                        <Link
                          key={to}
                          to={to}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-secondary"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{label}</span>
                        </Link>
                      ))}
                      {rolesQ.data?.isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-primary hover:bg-secondary"
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                          <span>Admin</span>
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => { setMobileOpen(false); support.open(); }}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-foreground hover:bg-secondary"
                      >
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>Fale Conosco</span>
                      </button>
                      <div className="my-2 px-3">
                        <InstallAppButton className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-secondary/60 px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary" />
                      </div>
                    </nav>
                    <div className="border-t border-border/60 p-3">
                      <button
                        type="button"
                        onClick={() => { setMobileOpen(false); signOut(); }}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10"
                      >
                        <LogOut className="h-4 w-4" />
                        Sair
                      </button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </>
        ) : (
          <Link to="/auth" className="rounded bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Entrar</Link>
        )}
      </div>
    </header>
  );
}
