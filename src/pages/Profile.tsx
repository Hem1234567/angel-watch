import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Phone, Mail, LogOut, Save, Shield, MapPin, Locate, CheckCircle, Camera, Trophy, Star, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const VOLUNTEER_ROLES = [
  { value: "Doctor", label: "🩺 Doctor" },
  { value: "Paramedic", label: "🚑 Paramedic" },
  { value: "First Aid", label: "🩹 First Aid" },
];

interface LeaderboardEntry {
  user_id: string;
  incentive_score: number;
  role: string;
  name: string;
  avatar_url: string | null;
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [isVolunteer, setIsVolunteer] = useState(false);
  const [volunteerRole, setVolunteerRole] = useState("Volunteer");
  const [incentiveScore, setIncentiveScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locationSharing, setLocationSharing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setName(data.name || "");
        setMobile(data.mobile || "");
        setIsVolunteer(data.is_volunteer || false);
        setAvatarUrl(data.avatar_url || null);
      }
      // Check if volunteer record exists
      const { data: volArr } = await supabase.from("volunteers").select("latitude, longitude, role, incentive_score").eq("user_id", user.id).limit(1);
      const vol = volArr?.[0];
      if (vol) {
        setVolunteerRole(vol.role || "Volunteer");
        setIncentiveScore((vol as any).incentive_score || 0);
        if (vol.latitude && vol.longitude) {
          setCurrentLocation({ lat: vol.latitude, lng: vol.longitude });
          setLocationSharing(true);
        }
      }
      setLoading(false);
    };
    fetchProfile();
    fetchLeaderboard();
  }, [user]);

  const fetchLeaderboard = async () => {
    const { data: vols } = await supabase
      .from("volunteers")
      .select("user_id, incentive_score, role")
      .order("incentive_score", { ascending: false })
      .limit(10);

    if (!vols || vols.length === 0) return;

    const userIds = vols.map((v) => v.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    setLeaderboard(
      vols.map((v) => ({
        user_id: v.user_id,
        incentive_score: (v as any).incentive_score || 0,
        role: v.role || "Volunteer",
        name: profileMap.get(v.user_id)?.name || "Volunteer",
        avatar_url: profileMap.get(v.user_id)?.avatar_url || null,
      }))
    );
  };

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage
      .from("contact-avatars")
      .upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploadingAvatar(false);
      return;
    }
    const { data } = supabase.storage.from("contact-avatars").getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setAvatarUrl(url);
    setUploadingAvatar(false);
    toast({ title: "Profile photo updated ✅" });
  };

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
        await supabase.from("volunteers").insert({ user_id: user.id, role: volunteerRole });
      } else {
        await supabase.from("volunteers").update({ role: volunteerRole }).eq("user_id", user.id);
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

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Award className="h-5 w-5 text-muted-foreground" />;
    if (index === 2) return <Award className="h-5 w-5 text-orange-400" />;
    return <span className="text-xs font-bold text-muted-foreground w-5 text-center">#{index + 1}</span>;
  };

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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20 overflow-hidden hover:border-primary transition-colors group"
            disabled={uploadingAvatar}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="h-12 w-12 text-primary" />
            )}
            <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-6 w-6 text-background" />
            </div>
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-background border-t-transparent rounded-full" />
              </div>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">Tap to change photo</p>

        {/* Incentive Score Card - only for volunteers */}
        <AnimatePresence>
          {isVolunteer && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Star className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Incentive Score</p>
                    <p className="text-2xl font-display font-bold text-foreground">{incentiveScore}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="text-sm font-medium text-primary">{volunteerRole}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

        {/* Volunteer Role Selector */}
        <AnimatePresence>
          {isVolunteer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5" /> Volunteer Role
                </label>
                <Select value={volunteerRole} onValueChange={setVolunteerRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {VOLUNTEER_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

        {/* Leaderboard */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
            <Trophy className="h-4 w-4" /> Volunteer Leaderboard
          </h2>
          <div className="space-y-2">
            {leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No volunteers yet</p>
            ) : (
              leaderboard.map((entry, i) => (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    entry.user_id === user?.id
                      ? "bg-primary/5 border-primary/20"
                      : "bg-card border-border/50"
                  }`}
                >
                  <div className="shrink-0">{getRankIcon(i)}</div>
                  <Avatar className="h-9 w-9 shrink-0">
                    {entry.avatar_url ? (
                      <AvatarImage src={entry.avatar_url} alt={entry.name} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {entry.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {entry.name}
                      {entry.user_id === user?.id && (
                        <span className="text-xs text-primary ml-1">(You)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{entry.role}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Star className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-bold text-foreground">{entry.incentive_score}</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
