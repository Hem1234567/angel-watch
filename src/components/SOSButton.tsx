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
import { NearbyVolunteers } from "@/components/NearbyVolunteers";

export function SOSButton() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showVolunteers, setShowVolunteers] = useState(false);
  const [sosId, setSosId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const triggerSOS = async () => {
    if (!user || sending) return;
    setSending(true);
    setShowConfirm(false);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      const { data, error } = await supabase.from("sos_requests").insert({
        user_id: user.id,
        latitude: lat,
        longitude: lng,
        status: "pending",
      }).select("id").single();

      if (error) throw error;

      setUserLocation({ lat, lng });
      setSosId(data.id);

      toast({
        title: "🚨 SOS Sent!",
        description: "Finding nearby medical volunteers...",
        variant: "destructive",
      });

      // Show nearby volunteers instead of navigating to map
      setShowVolunteers(true);
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

      {userLocation && (
        <NearbyVolunteers
          sosId={sosId}
          userLat={userLocation.lat}
          userLng={userLocation.lng}
          open={showVolunteers}
          onClose={() => setShowVolunteers(false)}
        />
      )}
    </div>
  );
}
