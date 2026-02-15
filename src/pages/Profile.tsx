import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Phone, Mail, LogOut, Save, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

export default function Profile() {
  const { user, signOut } = useAuth();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [isVolunteer, setIsVolunteer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setName(data.name || "");
        setMobile(data.mobile || "");
        setIsVolunteer(data.is_volunteer || false);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name, mobile, is_volunteer: isVolunteer })
      .eq("id", user.id);

    if (isVolunteer) {
      // Upsert volunteer record
      const { data: existing } = await supabase.from("volunteers").select("id").eq("user_id", user.id).single();
      if (!existing) {
        await supabase.from("volunteers").insert({ user_id: user.id, role: "Volunteer" });
      }
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated ✅" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 px-5 pt-6">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-display font-bold mb-6 text-foreground"
      >
        Profile
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-6"
      >
        {/* Avatar */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20">
            <User className="h-12 w-12 text-primary" />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground flex items-center gap-2">
            <Mail className="h-3.5 w-3.5" /> Email
          </label>
          <div className="px-3 py-2.5 rounded-lg bg-secondary text-sm text-muted-foreground">{user?.email}</div>
        </div>

        {/* Name */}
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground flex items-center gap-2">
            <User className="h-3.5 w-3.5" /> Name
          </label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>

        {/* Mobile */}
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground flex items-center gap-2">
            <Phone className="h-3.5 w-3.5" /> Mobile
          </label>
          <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Phone number" />
        </div>

        {/* Volunteer Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-safe/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-safe" />
            </div>
            <div>
              <p className="font-medium text-foreground">Register as Volunteer</p>
              <p className="text-xs text-muted-foreground">Help others in emergencies</p>
            </div>
          </div>
          <Switch checked={isVolunteer} onCheckedChange={setIsVolunteer} />
        </div>

        <Button onClick={saveProfile} className="w-full gap-2" disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>

        <Button onClick={signOut} variant="outline" className="w-full gap-2 text-sos border-sos/20 hover:bg-sos/10">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </motion.div>
    </div>
  );
}
