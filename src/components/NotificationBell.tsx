import { useState, useEffect } from "react";
import { Bell, AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface SOSNotification {
  id: string;
  status: string;
  created_at: string;
  latitude: number;
  longitude: number;
}

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<SOSNotification[]>([]);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    const { data, count: c } = await supabase
      .from("sos_requests")
      .select("id, status, created_at, latitude, longitude", { count: "exact" })
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10);
    setCount(c || 0);
    setNotifications(data || []);
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("sos-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sos_requests" }, (payload) => {
        fetchNotifications();
        toast({
          title: "🚨 New SOS Alert!",
          description: "Someone nearby needs help. Check the map.",
          variant: "destructive",
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sos_requests" }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full bg-secondary hover:bg-accent transition-colors"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        <AnimatePresence>
          {count > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-sos text-sos-foreground text-[10px] font-bold flex items-center justify-center"
            >
              {count > 9 ? "9+" : count}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-12 z-50 w-72 rounded-xl bg-card border border-border shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-secondary">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    No pending alerts 🎉
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        setOpen(false);
                        navigate("/map");
                      }}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left border-b border-border/30 last:border-0"
                    >
                      <div className="p-1.5 rounded-lg bg-sos/10 mt-0.5">
                        <AlertTriangle className="h-4 w-4 text-sos" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">SOS Alert</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/map");
                  }}
                  className="w-full px-4 py-2.5 text-xs font-medium text-primary hover:bg-secondary/50 transition-colors border-t border-border"
                >
                  View all on map →
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
