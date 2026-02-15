import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Phone, Mail, LogOut, Save, Shield, MapPin, Locate, CheckCircle } from "lucide-react";
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
  const [locationSharing, setLocationSharing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setName(data.name || "");
        setMobile(data.mobile || "");
        setIsVolunteer(data.is_volunteer || false);
      }
      // Check if volunteer record exists with location
      const { data: vol } = await supabase.from("volunteers").select("latitude, longitude").eq("user_id", user.id).single();
      if (vol?.latitude && vol?.longitude) {
        setCurrentLocation({ lat: vol.latitude, lng: vol.longitude });
        setLocationSharing(true);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const updateVolunteerLocation = useCallback(async (lat: number, lng: number) => {
    if (!user) return;
    setCurrentLocation({ lat, lng });
    await supabase
      .from("volunteers")
      .update({ latitude: lat, longitude: lng })
      .eq("user_id", user.id);
  }, [user]);

  const startLocationSharing = useCallback(() => {
    if (!navigator.geolocation) {
      toast({ title: "Error", description: "Geolocation not supported", variant: "destructive" });
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        updateVolunteerLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        toast({ title: "Location error", description: err.message, variant: "destructive" });
        setLocationSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    setWatchId(id);
    setLocationSharing(true);
    toast({ title: "📍 Location sharing active", description: "Your position is being shared with the network." });
  }, [updateVolunteerLocation]);

  const stopLocationSharing = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setLocationSharing(false);
    toast({ title: "Location sharing stopped" });
  }, [watchId]);

  useEffect(() => {
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [watchId]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name, mobile, is_volunteer: isVolunteer })
      .eq("id", user.id);

    if (isVolunteer) {
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

        {/* Location Sharing - only visible when volunteer */}
        <AnimatePresence>
          {isVolunteer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-xl bg-card border border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${locationSharing ? "bg-safe/10" : "bg-muted"}`}>
                      <MapPin className={`h-5 w-5 ${locationSharing ? "text-safe" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Live Location Sharing</p>
                      <p className="text-xs text-muted-foreground">
                        {locationSharing ? "Broadcasting your position" : "Share your location with the network"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={locationSharing}
                    onCheckedChange={(checked) => {
                      if (checked) startLocationSharing();
                      else stopLocationSharing();
                    }}
                  />
                </div>

                {currentLocation && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-safe/5 border border-safe/10"
                  >
                    <Locate className="h-4 w-4 text-safe" />
                    <span className="text-xs text-muted-foreground">
                      {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
                    </span>
                    {locationSharing && (
                      <span className="ml-auto flex items-center gap-1 text-xs text-safe">
                        <CheckCircle className="h-3 w-3" /> Live
                      </span>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
