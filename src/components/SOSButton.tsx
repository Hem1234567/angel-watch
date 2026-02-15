import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/hooks/use-toast";

export function SOSButton() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);

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
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={triggerSOS}
        className="relative w-28 h-28 rounded-full bg-sos flex items-center justify-center sos-pulse shadow-2xl"
        disabled={sending}
      >
        <div className="absolute inset-0 rounded-full bg-sos/30 animate-ping" />
        <ShieldAlert className="h-12 w-12 text-sos-foreground relative z-10" />
      </motion.button>
      <span className="text-sm font-semibold text-sos tracking-wider uppercase">
        {sending ? "Sending..." : "SOS Emergency"}
      </span>
    </div>
  );
}
