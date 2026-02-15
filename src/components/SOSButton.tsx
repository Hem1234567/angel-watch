import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";

export function SOSButton() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const triggerSOS = async () => {
    if (!user || sending) return;
    setSending(true);
    setShowConfirm(false);

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

      // Navigate to map to track the SOS
      navigate("/map");
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
        onClick={() => setShowConfirm(true)}
        className="relative w-28 h-28 rounded-full bg-sos flex items-center justify-center sos-pulse shadow-2xl"
        disabled={sending}
      >
        <div className="absolute inset-0 rounded-full bg-sos/30 animate-ping" />
        <ShieldAlert className="h-12 w-12 text-sos-foreground relative z-10" />
      </motion.button>
      <span className="text-sm font-semibold text-sos tracking-wider uppercase">
        {sending ? "Sending..." : "SOS Emergency"}
      </span>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sos">🚨 Confirm SOS Emergency</AlertDialogTitle>
            <AlertDialogDescription>
              This will send an emergency alert with your location to all nearby volunteers. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={triggerSOS}
              className="bg-sos text-sos-foreground hover:bg-sos/90"
            >
              Send SOS Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
