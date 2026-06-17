import { useRouter, useRouterState } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

const HIDDEN_PATHS = ["/", "/auth", "/reset-password"];

export function BackButton() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (HIDDEN_PATHS.includes(pathname)) return null;

  const handleClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/" });
    }
  };

  return (
    <div className="pointer-events-none fixed left-3 top-3 z-50 sm:left-4 sm:top-4">
      <button
        type="button"
        onClick={handleClick}
        aria-label="Voltar para página anterior"
        className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md transition-all hover:border-border hover:bg-background/90 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.97] sm:text-sm"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        <span>Voltar</span>
      </button>
    </div>
  );
}
