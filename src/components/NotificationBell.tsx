import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Fetch pending SOS count
    const fetchCount = async () => {
      const { count: c } = await supabase
        .from("sos_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setCount(c || 0);
    };
    fetchCount();

    const channel = supabase
      .channel("sos-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sos_requests" }, (payload) => {
        setCount((prev) => prev + 1);
        toast({
          title: "🚨 New SOS Alert!",
          description: "Someone nearby needs help. Check the map.",
          variant: "destructive",
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sos_requests" }, () => {
        fetchCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
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
  );
}
