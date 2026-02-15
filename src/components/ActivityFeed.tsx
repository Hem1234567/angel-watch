import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, Clock, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface SOSEvent {
  id: string;
  status: string;
  created_at: string;
  profiles?: { name: string | null } | null;
}

export function ActivityFeed() {
  const [events, setEvents] = useState<SOSEvent[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("sos_requests")
        .select("id, status, created_at, profiles:user_id(name)")
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setEvents(data as unknown as SOSEvent[]);
    };
    fetchEvents();

    const channel = supabase
      .channel("sos-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "sos_requests" }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const statusConfig = {
    pending: { icon: AlertTriangle, color: "text-sos", bg: "bg-sos/10", label: "SOS Active" },
    accepted: { icon: UserCheck, color: "text-warning", bg: "bg-warning/10", label: "Help En Route" },
    resolved: { icon: CheckCircle, color: "text-safe", bg: "bg-safe/10", label: "Resolved" },
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {events.map((event, i) => {
          const config = statusConfig[event.status as keyof typeof statusConfig] || statusConfig.pending;
          const Icon = config.icon;
          const profileName = (event.profiles as any)?.name || "Someone";

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-border transition-colors"
            >
              <div className={`p-2 rounded-lg ${config.bg}`}>
                <Icon className={`h-4 w-4 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {profileName} — <span className={config.color}>{config.label}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                </p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
