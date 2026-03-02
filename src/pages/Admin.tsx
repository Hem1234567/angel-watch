import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Users, UserCheck, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminStats } from "@/components/admin/AdminStats";
import { VolunteerCard } from "@/components/admin/VolunteerCard";
import { VolunteerRow } from "@/components/admin/types";
import { SOSManagement } from "@/components/admin/SOSManagement";
import { AllUsers } from "@/components/admin/AllUsers";

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
        const [{ data: profiles }, { data: adminRoles }] = await Promise.all([
          supabase.from("profiles").select("id, name, mobile").in("id", userIds),
          supabase.from("user_roles").select("user_id, role").in("user_id", userIds).eq("role", "admin"),
        ]);
        const nameMap = new Map(profiles?.map((p) => [p.id, { name: p.name, mobile: p.mobile }]) || []);
        const adminSet = new Set(adminRoles?.map((r) => r.user_id) || []);
        setVolunteers(data.map((v) => ({
          ...v,
          userName: nameMap.get(v.user_id)?.name || "Unknown",
          userMobile: nameMap.get(v.user_id)?.mobile || "",
          isAdminUser: adminSet.has(v.user_id),
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
      toast({ title: volunteer.is_verified ? "Verification removed" : "Volunteer verified ✅" });
    }
  };

  const deleteVolunteer = async (volunteer: VolunteerRow) => {
    if (!confirm(`Delete ${volunteer.full_name || volunteer.userName}? This cannot be undone.`)) return;
    const { error } = await supabase.from("volunteers").delete().eq("id", volunteer.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setVolunteers((prev) => prev.filter((v) => v.id !== volunteer.id));
      toast({ title: "Volunteer deleted" });
    }
  };

  const updateVolunteer = async (volunteer: VolunteerRow, updates: Partial<VolunteerRow>) => {
    const { error } = await supabase.from("volunteers").update(updates).eq("id", volunteer.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setVolunteers((prev) =>
        prev.map((v) => (v.id === volunteer.id ? { ...v, ...updates } : v))
      );
      toast({ title: "Volunteer updated ✅" });
    }
  };

  const toggleAdmin = async (volunteer: VolunteerRow) => {
    if (volunteer.isAdminUser) {
      // Remove admin role
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", volunteer.user_id)
        .eq("role", "admin");
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setVolunteers((prev) =>
          prev.map((v) => (v.id === volunteer.id ? { ...v, isAdminUser: false } : v))
        );
        toast({ title: "Admin role removed" });
      }
    } else {
      // Add admin role
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: volunteer.user_id, role: "admin" });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setVolunteers((prev) =>
          prev.map((v) => (v.id === volunteer.id ? { ...v, isAdminUser: true } : v))
        );
        toast({ title: "User promoted to admin 🛡️" });
      }
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

      <AdminStats total={total} verified={verified} pending={pending} />

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
          <TabsTrigger value="sos" className="flex-1 gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> SOS
          </TabsTrigger>
        </TabsList>

        {[
          { value: "pending", list: pendingVolunteers, empty: "No pending applications 🎉" },
          { value: "verified", list: verifiedVolunteers, empty: "No verified volunteers yet" },
        ].map(({ value, list, empty }) => (
          <TabsContent key={value} value={value} className="space-y-2">
            {list.length > 0
              ? list.map((v, i) => (
                  <VolunteerCard
                    key={v.id}
                    v={v}
                    i={i}
                    isExpanded={expandedId === v.id}
                    onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
                    onToggleVerification={toggleVerification}
                    onDelete={deleteVolunteer}
                    onUpdate={updateVolunteer}
                    onToggleAdmin={toggleAdmin}
                  />
                ))
              : <EmptyState message={empty} />}
          </TabsContent>
        ))}

        <TabsContent value="all">
          <AllUsers />
        </TabsContent>

        <TabsContent value="sos">
          <SOSManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
