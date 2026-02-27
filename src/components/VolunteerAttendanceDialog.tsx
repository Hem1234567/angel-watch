import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/hooks/use-toast";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function VolunteerAttendanceDialog() {
  const { user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [sosId, setSosId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");

  useEffect(() => {
    if (!user) return;

    // Listen for SOS requests accepted by this volunteer
    const channel = supabase
      .channel("volunteer-attendance")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "sos_requests",
      }, async (payload) => {
        const updated = payload.new as any;
        if (updated.accepted_by === user.id && updated.status === "accepted" && !updated.volunteer_confirmed) {
          setSosId(updated.id);
          const { data } = await supabase.from("profiles").select("name").eq("id", updated.user_id).single();
          setPatientName(data?.name || "the patient");
          setShowConfirm(true);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleConfirm = async () => {
    if (!sosId || !user) return;
    await supabase.from("sos_requests").update({ volunteer_confirmed: true }).eq("id", sosId);

    // Check if user also confirmed
    const { data } = await supabase.from("sos_requests").select("user_confirmed").eq("id", sosId).single();
    if (data?.user_confirmed) {
      // Increment incentive score
      await supabase.rpc("increment_incentive_score" as any, { volunteer_user_id: user.id });
    }

    toast({ title: "✅ Attendance confirmed!", description: "Your incentive score has been updated." });
    setShowConfirm(false);
  };

  return (
    <Dialog open={showConfirm} onOpenChange={(o) => !o && setShowConfirm(false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-safe">
            <CheckCircle className="h-5 w-5" /> Attended the Patient
          </DialogTitle>
          <DialogDescription>
            Did you attend to {patientName}? Confirm to receive your incentive score.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setShowConfirm(false)}>Not Yet</Button>
          <Button onClick={handleConfirm} className="gap-1">
            <CheckCircle className="h-4 w-4" /> Yes, Attended
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
