import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, User, MapPin, Star, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface NearbyVolunteer {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  role: string;
  incentive_score: number;
  name: string;
  mobile: string;
  avatar_url: string | null;
  distance: number;
}

interface NearbyVolunteersProps {
  sosId: string | null;
  userLat: number;
  userLng: number;
  open: boolean;
  onClose: () => void;
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function NearbyVolunteers({ sosId, userLat, userLng, open, onClose }: NearbyVolunteersProps) {
  const { user } = useAuth();
  const [volunteers, setVolunteers] = useState<NearbyVolunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserConfirm, setShowUserConfirm] = useState(false);
  const [acceptedVolunteerName, setAcceptedVolunteerName] = useState("");

  useEffect(() => {
    if (!open || !sosId) return;
    fetchNearbyVolunteers();

    // Listen for volunteer acceptance
    const channel = supabase
      .channel(`sos-${sosId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "sos_requests",
        filter: `id=eq.${sosId}`,
      }, (payload) => {
        const updated = payload.new as any;
        if (updated.status === "accepted" && updated.accepted_by) {
          // Fetch volunteer name
          supabase.from("profiles").select("name").eq("id", updated.accepted_by).single()
            .then(({ data }) => {
              setAcceptedVolunteerName(data?.name || "A volunteer");
              setShowUserConfirm(true);
            });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open, sosId]);

  const fetchNearbyVolunteers = async () => {
    setLoading(true);
    const { data: vols } = await supabase
      .from("volunteers")
      .select("*")
      .eq("is_verified", true)
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (!vols || vols.length === 0) {
      setVolunteers([]);
      setLoading(false);
      return;
    }

    const userIds = vols.map((v) => v.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, mobile, avatar_url")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    const nearby = vols
      .filter((v) => v.latitude && v.longitude && v.user_id !== user?.id)
      .map((v) => {
        const profile = profileMap.get(v.user_id);
        return {
          id: v.id,
          user_id: v.user_id,
          latitude: v.latitude!,
          longitude: v.longitude!,
          role: v.role || "Volunteer",
          incentive_score: (v as any).incentive_score || 0,
          name: profile?.name || "Volunteer",
          mobile: profile?.mobile || "",
          avatar_url: profile?.avatar_url || null,
          distance: getDistanceKm(userLat, userLng, v.latitude!, v.longitude!),
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);

    setVolunteers(nearby);
    setLoading(false);
  };

  const callVolunteer = (phone: string) => {
    window.open(`tel:${phone}`, "_self");
  };

  const handleUserConfirm = async () => {
    if (!sosId) return;
    await supabase.from("sos_requests").update({ user_confirmed: true }).eq("id", sosId);

    // Check if volunteer also confirmed
    const { data } = await supabase.from("sos_requests").select("volunteer_confirmed, accepted_by").eq("id", sosId).single();
    if (data?.volunteer_confirmed && data?.accepted_by) {
      // Increment incentive score
      await supabase.rpc("increment_incentive_score" as any, { volunteer_user_id: data.accepted_by });
    }

    toast({ title: "✅ Confirmed", description: "Thank you for confirming attendance." });
    setShowUserConfirm(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open && !showUserConfirm} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sos flex items-center gap-2">
              🚨 Nearby Medical Volunteers
            </DialogTitle>
            <DialogDescription>
              Volunteers closest to your location are listed below. Tap to call them directly.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : volunteers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No nearby volunteers found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {volunteers.map((v, i) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20 shrink-0">
                    {v.avatar_url ? (
                      <img src={v.avatar_url} alt={v.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{v.name}</p>
                    <p className="text-xs text-muted-foreground">{v.role}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {v.distance.toFixed(1)} km
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500" /> {v.incentive_score}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={v.mobile ? "default" : "outline"}
                    onClick={() => v.mobile ? callVolunteer(v.mobile) : toast({ title: "No phone number", description: "This volunteer has not added a phone number." })}
                    className="shrink-0 gap-1"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Call
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* User confirmation dialog */}
      <Dialog open={showUserConfirm} onOpenChange={(o) => !o && setShowUserConfirm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-safe">
              <CheckCircle className="h-5 w-5" /> Doctor Attended You
            </DialogTitle>
            <DialogDescription>
              {acceptedVolunteerName} has accepted your case. Please confirm that the volunteer attended to you.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowUserConfirm(false)}>Not Yet</Button>
            <Button onClick={handleUserConfirm} className="gap-1">
              <CheckCircle className="h-4 w-4" /> Yes, Confirmed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
