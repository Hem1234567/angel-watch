import { toast } from "sonner";
import { useEffect } from "react";

export function ReloadPrompt() {
  useEffect(() => {
    // @ts-ignore - virtual module provided by vite-plugin-pwa
    import("virtual:pwa-register").then(({ registerSW }: any) => {
      const updateSW = registerSW({
        onNeedRefresh() {
          toast("New content available, click on reload button to update.", {
            action: {
              label: "Reload",
              onClick: () => updateSW(true),
            },
            duration: Infinity,
          });
        },
        onRegistered(r: any) {
          console.log("SW Registered: " + r);
        },
        onRegisterError(error: any) {
          console.log("SW registration error", error);
        },
      });
    }).catch(() => {
      // PWA registration not available
    });
  }, []);

  return null;
}
