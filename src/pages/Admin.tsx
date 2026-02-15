import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, CheckCircle, XCircle, Users, UserCheck, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

interface VolunteerRow {
  id: string;
  user_id: string;
  role: string;
  is_verified: boolean;
  created_at: string;
  profiles?: { name: string | null; mobile: string | null } | null;
}

export default function Admin() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [volunteers, setVolunteers] = useState<VolunteerRow[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
      toast({ title: "Access denied", description: "Admin privileges required.", variant: "destructive" });
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    const fetchVolunteers = async () => {
      const { data } = await supabase
        .from("volunteers")
        .select("*, profiles:user_id(name, mobile)")
        .order("created_at", { ascending: false });
      if (data) setVolunteers(data as unknown as VolunteerRow[]);
      setFetching(false);
    };
    fetchVolunteers();
  }, []);

  const toggleVerification = async (volunteer: VolunteerRow) => {
    const { error } = await supabase
      .from("volunteers")
      .update({ is_verified: !volunteer.is_verified })
      .eq("id", volunteer.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setVolunteers((prev) =>
        prev.map((v) => (v.id === volunteer.id ? { ...v, is_verified: !v.is_verified } : v))
      );
      toast({
        title: volunteer.is_verified ? "Verification removed" : "Volunteer verified ✅",
      });
    }
  };

  const total = volunteers.length;
  const verified = volunteers.filter((v) => v.is_verified).length;
  const pending = total - verified;

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const stats = [
    { label: "Total", value: total, icon: Users, color: "text-primary" },
    { label: "Verified", value: verified, icon: UserCheck, color: "text-safe" },
    { label: "Pending", value: pending, icon: Clock, color: "text-warning" },
  ];

  return (
    <div className="min-h-screen pb-20 px-5 pt-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground">Admin Dashboard</h1>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 rounded-xl bg-card border border-border/50 text-center"
          >
            <stat.icon className={`h-5 w-5 mx-auto mb-1 ${stat.color}`} />
            <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Volunteer Table */}
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
        Volunteer Management
      </h2>
      <div className="space-y-2">
        {volunteers.map((v, i) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${v.is_verified ? "bg-safe/10" : "bg-warning/10"}`}>
              {v.is_verified ? (
                <CheckCircle className="h-5 w-5 text-safe" />
              ) : (
                <XCircle className="h-5 w-5 text-warning" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{(v.profiles as any)?.name || "Unknown"}</p>
              <p className="text-sm text-muted-foreground">{v.role}</p>
            </div>
            <Switch checked={v.is_verified} onCheckedChange={() => toggleVerification(v)} />
          </motion.div>
        ))}
        {volunteers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No volunteers registered yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
