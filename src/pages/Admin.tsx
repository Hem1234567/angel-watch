import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, CheckCircle, XCircle, Users, UserCheck, Clock, ChevronDown, ChevronUp, Phone, Briefcase, Award, MapPin, Stethoscope, GraduationCap, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface VolunteerRow {
  id: string;
  user_id: string;
  role: string;
  is_verified: boolean;
  created_at: string;
  full_name: string | null;
  phone: string | null;
  qualification: string | null;
  specialization: string | null;
  license_no: string | null;
  experience_years: number | null;
  workplace: string | null;
  availability: string | null;
  about: string | null;
  incentive_score: number;
  userName?: string;
  userMobile?: string;
}

export default function Admin() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [volunteers, setVolunteers] = useState<VolunteerRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        .select("*")
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const userIds = data.map((v) => v.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, mobile")
          .in("id", userIds);
        const nameMap = new Map(profiles?.map((p) => [p.id, { name: p.name, mobile: p.mobile }]) || []);
        setVolunteers(data.map((v) => ({
          ...v,
          userName: nameMap.get(v.user_id)?.name || "Unknown",
          userMobile: nameMap.get(v.user_id)?.mobile || "",
        })));
      } else {
        setVolunteers([]);
      }
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
  const pendingVolunteers = volunteers.filter((v) => !v.is_verified);
  const verifiedVolunteers = volunteers.filter((v) => v.is_verified);

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

  const DetailRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-2 text-sm">
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <span className="text-muted-foreground">{label}: </span>
          <span className="text-foreground font-medium">{value}</span>
        </div>
      </div>
    );
  };

  const VolunteerCard = ({ v, i }: { v: VolunteerRow; i: number }) => {
    const isExpanded = expandedId === v.id;
    return (
      <motion.div
        key={v.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.05 }}
        className="rounded-xl bg-card border border-border/50 overflow-hidden"
      >
        {/* Header row */}
        <div
          className="flex items-center gap-3 p-4 cursor-pointer"
          onClick={() => setExpandedId(isExpanded ? null : v.id)}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${v.is_verified ? "bg-safe/10" : "bg-warning/10"}`}>
            {v.is_verified ? (
              <CheckCircle className="h-5 w-5 text-safe" />
            ) : (
              <XCircle className="h-5 w-5 text-warning" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{v.full_name || v.userName}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={v.is_verified ? "default" : "secondary"} className="text-xs">
                {v.role || "Volunteer"}
              </Badge>
              {v.qualification && (
                <span className="text-xs text-muted-foreground">{v.qualification}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={v.is_verified}
              onCheckedChange={(e) => {
                e; // prevent propagation handled by stopPropagation
                toggleVerification(v);
              }}
              onClick={(e) => e.stopPropagation()}
            />
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-1 border-t border-border/30 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <DetailRow icon={Phone} label="Phone" value={v.phone || v.userMobile} />
                  <DetailRow icon={GraduationCap} label="Qualification" value={v.qualification} />
                  <DetailRow icon={Stethoscope} label="Specialization" value={v.specialization} />
                  <DetailRow icon={FileText} label="License No" value={v.license_no} />
                  <DetailRow icon={Briefcase} label="Workplace" value={v.workplace} />
                  <DetailRow icon={Clock} label="Experience" value={v.experience_years ? `${v.experience_years} years` : null} />
                  <DetailRow icon={MapPin} label="Availability" value={v.availability} />
                  <DetailRow icon={Award} label="Credits" value={v.incentive_score} />
                </div>
                {v.about && (
                  <div className="text-sm">
                    <p className="text-muted-foreground mb-1">About:</p>
                    <p className="text-foreground bg-muted/50 rounded-lg p-2 text-xs">{v.about}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  {!v.is_verified ? (
                    <Button size="sm" className="gap-1" onClick={() => toggleVerification(v)}>
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => toggleVerification(v)}>
                      <XCircle className="h-3.5 w-3.5" /> Revoke
                    </Button>
                  )}
                  {v.phone && (
                    <Button size="sm" variant="outline" className="gap-1" asChild>
                      <a href={`tel:${v.phone}`}>
                        <Phone className="h-3.5 w-3.5" /> Call
                      </a>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Applied: {new Date(v.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-12 text-muted-foreground">
      <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p>{message}</p>
    </div>
  );

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

      {/* Tabs: Pending / Verified */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="pending" className="flex-1 gap-1">
            <Clock className="h-3.5 w-3.5" /> Pending ({pending})
          </TabsTrigger>
          <TabsTrigger value="verified" className="flex-1 gap-1">
            <UserCheck className="h-3.5 w-3.5" /> Verified ({verified})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex-1 gap-1">
            <Users className="h-3.5 w-3.5" /> All ({total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-2">
          {pendingVolunteers.length > 0
            ? pendingVolunteers.map((v, i) => <VolunteerCard key={v.id} v={v} i={i} />)
            : <EmptyState message="No pending applications 🎉" />}
        </TabsContent>

        <TabsContent value="verified" className="space-y-2">
          {verifiedVolunteers.length > 0
            ? verifiedVolunteers.map((v, i) => <VolunteerCard key={v.id} v={v} i={i} />)
            : <EmptyState message="No verified volunteers yet" />}
        </TabsContent>

        <TabsContent value="all" className="space-y-2">
          {volunteers.length > 0
            ? volunteers.map((v, i) => <VolunteerCard key={v.id} v={v} i={i} />)
            : <EmptyState message="No volunteers registered yet" />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
