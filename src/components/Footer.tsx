import { Link } from "@tanstack/react-router";
import { useSupport } from "@/components/SupportPanel";

export function Footer() {
  const support = useSupport();
  return (
    <footer className="mt-16 border-t border-border/60 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row">
        <div>© {new Date().getFullYear()} StreamMatch</div>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link to="/about" className="hover:text-foreground">Sobre Nós</Link>
          <Link to="/privacy" className="hover:text-foreground">Política de Privacidade</Link>
          <Link to="/terms" className="hover:text-foreground">Termos de Uso</Link>
          <button onClick={support.open} className="hover:text-foreground">Fale Conosco</button>
        </nav>
      </div>
    </footer>
  );
}
