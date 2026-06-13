import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PWAInstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for install prompt ready event (dispatched by RootComponent)
    const handleInstallPromptReady = (event: any) => {
      setDeferredPrompt(event.detail.prompt);
      setIsVisible(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
      setIsInstalled(true);
      console.log("[PWA] App successfully installed");
    };

    window.addEventListener("pwa-install-prompt-ready", handleInstallPromptReady);
    window.addEventListener("pwa-app-installed", handleAppInstalled);

    return () => {
      window.removeEventListener("pwa-install-prompt-ready", handleInstallPromptReady);
      window.removeEventListener("pwa-app-installed", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for user to respond
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response to install prompt: ${outcome}`);

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Install Trusit</p>
          <p className="text-xs text-muted-foreground mt-1">
            Install the app on your home screen for quick access
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleInstall}
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Download className="h-4 w-4 mr-1" />
            Install
          </Button>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-muted rounded transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
