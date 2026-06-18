import { useEffect, useState } from "react";
import { Download, Share, Plus, Check, MoreVertical, MonitorDown, Smartphone, Apple, Monitor } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Device = "android" | "ios" | "desktop";

function detectDevice(): Device {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export function InstallAppButton({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [open, setOpen] = useState(false);
  const [device, setDevice] = useState<Device>("desktop");

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(isStandalone);
    setDevice(detectDevice());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setOpen(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function handleClick() {
    // If a native prompt is available (Android/Chromium desktop), use it directly.
    if (deferred) {
      try {
        await deferred.prompt();
        const { outcome } = await deferred.userChoice;
        if (outcome === "accepted") {
          setDeferred(null);
          return;
        }
      } catch {
        // fall through to instructions
      }
    }
    setOpen(true);
  }

  const DeviceIcon = device === "ios" ? Apple : device === "android" ? Smartphone : Monitor;
  const title =
    device === "ios"
      ? "Instale o StreamMatch no seu iPhone"
      : device === "android"
        ? "Instale o StreamMatch no seu celular"
        : "Instale o StreamMatch no seu computador";
  const subtitle =
    device === "desktop"
      ? "Adicione o StreamMatch ao seu computador e utilize como um aplicativo nativo."
      : "Adicione o StreamMatch à sua tela inicial e utilize como um aplicativo nativo.";

  return (
    <>
      <button
        onClick={handleClick}
        className={
          className ??
          "inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary"
        }
        aria-label="Instalar aplicativo"
      >
        <Download className="h-3.5 w-3.5" />
        Instalar App
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm border-border bg-card">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <DeviceIcon className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">{title}</DialogTitle>
            <DialogDescription className="text-center">{subtitle}</DialogDescription>
          </DialogHeader>

          <ol className="space-y-2.5 text-sm">
            {device === "android" && (
              <>
                <Step n={1} icon={<MoreVertical className="h-4 w-4" />}>
                  Toque nos <strong>três pontos</strong> do navegador.
                </Step>
                <Step n={2} icon={<Plus className="h-4 w-4" />}>
                  Selecione <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.
                </Step>
                <Step n={3} icon={<Check className="h-4 w-4" />}>
                  Confirme a instalação.
                </Step>
              </>
            )}
            {device === "ios" && (
              <>
                <Step n={1} icon={<Share className="h-4 w-4" />}>
                  Toque no botão <strong>Compartilhar</strong> do Safari.
                </Step>
                <Step n={2} icon={<Plus className="h-4 w-4" />}>
                  Selecione <strong>Adicionar à Tela de Início</strong>.
                </Step>
                <Step n={3} icon={<Check className="h-4 w-4" />}>
                  Confirme a instalação.
                </Step>
              </>
            )}
            {device === "desktop" && (
              <>
                <Step n={1} icon={<MonitorDown className="h-4 w-4" />}>
                  Clique no <strong>ícone de instalação</strong> na barra de endereço do navegador.
                </Step>
                <Step n={2} icon={<Check className="h-4 w-4" />}>
                  Confirme a instalação.
                </Step>
              </>
            )}
          </ol>

          <p className="text-center text-xs text-muted-foreground">
            O StreamMatch aparecerá como um aplicativo no seu dispositivo.
          </p>

          <button
            onClick={() => setOpen(false)}
            className="mt-1 w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Entendi
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Step({ n, icon, children }: { n: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-md border border-border bg-card/60 p-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {n}
      </span>
      <span className="flex-1 text-muted-foreground">{children}</span>
      <span className="text-muted-foreground">{icon}</span>
    </li>
  );
}
