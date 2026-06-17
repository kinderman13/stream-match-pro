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
    <div className="w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={handleClick}
          aria-label="Voltar para página anterior"
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.97] sm:text-sm"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span>Voltar</span>
        </button>
      </div>
    </div>
  );
}
