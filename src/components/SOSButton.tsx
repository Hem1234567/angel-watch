import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/hooks/use-toast";

export function SOSButton() {
  const { user } = useAuth();
  const [showSlider, setShowSlider] = useState(false);
  const [sliderProgress, setSliderProgress] = useState(0);
  const [sending, setSending] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const triggerSOS = async () => {
    if (!user || sending) return;
    setSending(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );

      const { error } = await supabase.from("sos_requests").insert({
        user_id: user.id,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "🚨 SOS Sent!",
        description: "Emergency alert has been broadcast. Help is on the way.",
        variant: "destructive",
      });
    } catch (err: any) {
      toast({
        title: "Failed to send SOS",
        description: err.message || "Could not get your location",
        variant: "destructive",
      });
    } finally {
      setSending(false);
      setShowSlider(false);
      setSliderProgress(0);
    }
  };

  const handleSliderDrag = (_: any, info: { point: { x: number } }) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (info.point.x - rect.left - 28) / (rect.width - 56)));
    setSliderProgress(progress);
  };

  const handleDragEnd = () => {
    if (sliderProgress > 0.85) {
      triggerSOS();
    } else {
      setSliderProgress(0);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowSlider(true)}
        className="relative w-28 h-28 rounded-full bg-sos flex items-center justify-center sos-pulse shadow-2xl"
        disabled={sending}
      >
        <div className="absolute inset-0 rounded-full bg-sos/30 animate-ping" />
        <ShieldAlert className="h-12 w-12 text-sos-foreground relative z-10" />
      </motion.button>
      <span className="text-sm font-semibold text-sos tracking-wider uppercase">SOS Emergency</span>

      <AnimatePresence>
        {showSlider && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-6 bg-foreground/40 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowSlider(false);
                setSliderProgress(0);
              }
            }}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full max-w-sm glass rounded-2xl p-6 space-y-4"
            >
              <h3 className="text-lg font-display font-bold text-center text-sos">Confirm Emergency</h3>
              <p className="text-sm text-muted-foreground text-center">
                Swipe right to send an SOS alert to nearby volunteers
              </p>
              <div
                ref={sliderRef}
                className="relative h-14 rounded-full bg-sos/10 border border-sos/20 overflow-hidden"
              >
                <div
                  className="absolute inset-y-0 left-0 bg-sos/20 rounded-full transition-none"
                  style={{ width: `${sliderProgress * 100}%` }}
                />
                <motion.div
                  drag="x"
                  dragConstraints={sliderRef}
                  dragElastic={0}
                  dragMomentum={false}
                  onDrag={handleSliderDrag}
                  onDragEnd={handleDragEnd}
                  className="absolute top-1 left-1 w-12 h-12 rounded-full bg-sos flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg"
                  style={{ x: sliderProgress * ((sliderRef.current?.clientWidth ?? 200) - 56) }}
                >
                  <ChevronRight className="h-6 w-6 text-sos-foreground" />
                </motion.div>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-sos pointer-events-none">
                  {sliderProgress > 0.5 ? "Release to send" : "Slide to confirm →"}
                </span>
              </div>
              <button
                onClick={() => { setShowSlider(false); setSliderProgress(0); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
