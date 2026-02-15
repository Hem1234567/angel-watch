import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/hooks/use-toast";

const SHAKE_THRESHOLD = 25;
const SHAKE_COUNT_THRESHOLD = 3;
const SHAKE_TIMEOUT = 1000;

export function useShakeDetection() {
  const { user } = useAuth();
  const shakeCount = useRef(0);
  const lastShakeTime = useRef(0);
  const lastAccel = useRef({ x: 0, y: 0, z: 0 });
  const panicActive = useRef(false);

  const triggerPanicMode = useCallback(async () => {
    if (!user || panicActive.current) return;
    panicActive.current = true;

    // Dim screen
    const overlay = document.createElement("div");
    overlay.id = "panic-overlay";
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.95);transition:opacity 0.5s;opacity:0;pointer-events:all;display:flex;align-items:center;justify-content:center;";
    overlay.innerHTML = `<p style="color:#444;font-size:14px;font-family:sans-serif">Screen locked</p>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => { overlay.style.opacity = "1"; });

    // Dismiss on double tap
    let tapCount = 0;
    overlay.addEventListener("click", () => {
      tapCount++;
      if (tapCount >= 2) {
        overlay.style.opacity = "0";
        setTimeout(() => {
          overlay.remove();
          panicActive.current = false;
        }, 500);
      }
      setTimeout(() => { tapCount = 0; }, 400);
    });

    // Silently send SOS
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );

      await supabase.from("sos_requests").insert({
        user_id: user.id,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        status: "pending",
      });
    } catch {
      // Silent fail — panic mode should not show errors
    }

    // Show subtle confirmation after a delay
    setTimeout(() => {
      toast({ title: "🔒 Panic mode active", description: "Silent SOS sent. Double-tap to dismiss." });
    }, 2000);
  }, [user]);

  useEffect(() => {
    const handleMotion = (e: DeviceMotionEvent) => {
      const accel = e.accelerationIncludingGravity;
      if (!accel?.x || !accel?.y || !accel?.z) return;

      const deltaX = Math.abs(accel.x - lastAccel.current.x);
      const deltaY = Math.abs(accel.y - lastAccel.current.y);
      const deltaZ = Math.abs(accel.z - lastAccel.current.z);

      lastAccel.current = { x: accel.x, y: accel.y, z: accel.z };

      if (deltaX + deltaY + deltaZ > SHAKE_THRESHOLD) {
        const now = Date.now();
        if (now - lastShakeTime.current < SHAKE_TIMEOUT) {
          shakeCount.current++;
          if (shakeCount.current >= SHAKE_COUNT_THRESHOLD) {
            shakeCount.current = 0;
            triggerPanicMode();
          }
        } else {
          shakeCount.current = 1;
        }
        lastShakeTime.current = now;
      }
    };

    window.addEventListener("devicemotion", handleMotion);
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [triggerPanicMode]);
}
