import { Loader2 } from "lucide-react";

export function SplashScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <div className="flex items-center gap-1">
        <span className="text-3xl font-black tracking-tight text-primary">STREAM</span>
        <span className="text-3xl font-black tracking-tight text-foreground">MATCH</span>
      </div>
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Carregando" />
    </div>
  );
}
