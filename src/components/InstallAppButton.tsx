import { useEffect, useState } from "react";
import { Smartphone, Apple, Monitor, Download, Share, Plus, Check } from "lucide-react";
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

type DeviceChoice = "android" | "ios" | "desktop" | null;

export function InstallAppButton({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [open, setOpen] = useState(false);
  const [device, setDevice] = useState<DeviceChoice>(null);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(isStandalone);

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

  function reset() {
    setOpen(false);
    setTimeout(() => setDevice(null), 200);
  }

  async function triggerNative() {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      setDeferred(null);
      reset();
    }
    return true;
  }

  async function pickDevice(d: Exclude<DeviceChoice, null>) {
    setDevice(d);
    if (d === "android" || d === "desktop") {
      await triggerNative();
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary"
        }
        aria-label="Baixar aplicativo"
      >
        <Download className="h-3.5 w-3.5" />
        Baixar App
      </button>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : reset())}>
        <DialogContent className="max-w-sm">
          {!device && (
            <>
              <DialogHeader>
                <DialogTitle>Instalar StreamMatch</DialogTitle>
                <DialogDescription>Qual dispositivo você está utilizando?</DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <DeviceOption icon={<Smartphone className="h-5 w-5" />} label="Android" onClick={() => pickDevice("android")} />
                <DeviceOption icon={<Apple className="h-5 w-5" />} label="iPhone / iPad" onClick={() => pickDevice("ios")} />
                <DeviceOption icon={<Monitor className="h-5 w-5" />} label="Computador" onClick={() => pickDevice("desktop")} />
              </div>
            </>
          )}

          {device === "ios" && (
            <>
              <DialogHeader>
                <DialogTitle>Instalar no iPhone / iPad</DialogTitle>
                <DialogDescription>Use o Safari para adicionar à Tela de Início.</DialogDescription>
              </DialogHeader>
              <ol className="space-y-3 text-sm">
                <Step n={1} icon={<Share className="h-4 w-4" />}>
                  Toque no botão <strong>Compartilhar</strong> do Safari.
                </Step>
                <Step n={2} icon={<Plus className="h-4 w-4" />}>
                  Selecione <strong>Adicionar à Tela de Início</strong>.
                </Step>
                <Step n={3} icon={<Check className="h-4 w-4" />}>
                  Toque em <strong>Adicionar</strong> para confirmar.
                </Step>
              </ol>
              <button
                onClick={reset}
                className="mt-2 w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Entendi
              </button>
            </>
          )}

          {(device === "android" || device === "desktop") && !deferred && (
            <>
              <DialogHeader>
                <DialogTitle>Instalação não disponível agora</DialogTitle>
                <DialogDescription>
                  Seu navegador ainda não ofereceu o prompt de instalação. Abra o menu do navegador
                  e procure por <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.
                </DialogDescription>
              </DialogHeader>
              <button
                onClick={reset}
                className="mt-2 w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Fechar
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function DeviceOption({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left text-sm font-medium transition hover:border-primary hover:bg-secondary"
    >
      <span className="text-primary">{icon}</span>
      <span>{label}</span>
    </button>
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
