import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, CheckCircle, Clock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { formatDistanceToNow } from "date-fns";

interface SOSRequest {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  status: string | null;
  created_at: string | null;
  accepted_by: string | null;
  userName?: string;
  acceptedByName?: string;
}

export function SOSManagement() {
  const [requests, setRequests] = useState<SOSRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(50);
  const [savingRadius, setSavingRadius] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: sos }, { data: settings }] = await Promise.all([
      supabase.from("sos_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("app_settings").select("value").eq("key", "sos_radius_km").single(),
    ]);

    if (settings?.value) setRadius(parseInt(settings.value) || 50);

    if (sos && sos.length > 0) {
      const userIds = [...new Set([...sos.map((s) => s.user_id), ...sos.filter((s) => s.accepted_by).map((s) => s.accepted_by!)])];
      const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", userIds);
      const nameMap = new Map(profiles?.map((p) => [p.id, p.name || "Unknown"]) || []);
      setRequests(sos.map((s) => ({
        ...s,
        userName: nameMap.get(s.user_id) || "Unknown",
        acceptedByName: s.accepted_by ? nameMap.get(s.accepted_by) || "Unknown" : undefined,
      })));
    } else {
      setRequests([]);
    }
    setLoading(false);
  };

  const deleteRequest = async (id: string) => {
    if (!confirm("Delete this SOS request? This cannot be undone.")) return;
    const { error } = await supabase.from("sos_requests").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setRequests((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "SOS request deleted" });
    }
  };

  const resolveRequest = async (id: string) => {
    const { error } = await supabase.from("sos_requests").update({ status: "resolved" }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "resolved" } : r)));
      toast({ title: "SOS marked as resolved ✅" });
    }
  };

  const saveRadius = async (val: number) => {
    setSavingRadius(true);
    const { error } = await supabase.from("app_settings").update({ value: String(val) }).eq("key", "sos_radius_km");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `SOS radius updated to ${val} km` });
    }
    setSavingRadius(false);
  };

  const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    pending: { color: "text-sos", bg: "bg-sos/10", label: "Pending" },
    accepted: { color: "text-warning", bg: "bg-warning/10", label: "Accepted" },
    resolved: { color: "text-safe", bg: "bg-safe/10", label: "Resolved" },
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Radius Setting */}
      <div className="rounded-xl bg-card border border-border/50 p-4 space-y-3">
        <h3 className="font-medium text-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" /> SOS Search Radius
        </h3>
        <div className="flex items-center gap-4">
          <Slider
            value={[radius]}
            onValueChange={(v) => setRadius(v[0])}
            onValueCommit={(v) => saveRadius(v[0])}
            min={5}
            max={200}
            step={5}
            className="flex-1"
          />
          <span className="text-sm font-bold text-primary min-w-[60px] text-right">{radius} km</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Volunteers within this radius will be shown to users during SOS emergencies.
        </p>
      </div>

      {/* SOS Requests List */}
      {requests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No SOS requests found</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {requests.map((r, i) => {
            const config = statusConfig[r.status || "pending"] || statusConfig.pending;
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl bg-card border border-border/50 p-4 space-y-2"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.bg}`}>
                    <AlertTriangle className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {r.userName}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className={`text-xs ${config.color}`}>
                        {config.label}
                      </Badge>
                      {r.created_at && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    {r.acceptedByName && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Accepted by: {r.acceptedByName}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {r.status === "pending" && (
                      <Button size="sm" variant="outline" className="gap-1 text-safe" onClick={() => resolveRequest(r.id)}>
                        <CheckCircle className="h-3.5 w-3.5" /> Resolve
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" className="gap-1" onClick={() => deleteRequest(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}
