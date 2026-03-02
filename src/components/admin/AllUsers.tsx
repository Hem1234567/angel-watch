import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Shield, UserCheck, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface UserProfile {
  id: string;
  name: string | null;
  mobile: string | null;
  avatar_url: string | null;
  is_volunteer: boolean | null;
  created_at: string | null;
  isAdmin: boolean;
  isVolunteer: boolean;
  volunteerRole: string | null;
  isVerified: boolean;
}

export function AllUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllUsers = async () => {
      const [{ data: profiles }, { data: roles }, { data: volunteers }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
        supabase.from("volunteers").select("user_id, role, is_verified"),
      ]);

      const adminSet = new Set(roles?.map((r) => r.user_id) || []);
      const volunteerMap = new Map(
        volunteers?.map((v) => [v.user_id, { role: v.role, is_verified: v.is_verified }]) || []
      );

      setUsers(
        (profiles || []).map((p) => ({
          id: p.id,
          name: p.name,
          mobile: p.mobile,
          avatar_url: p.avatar_url,
          is_volunteer: p.is_volunteer,
          created_at: p.created_at,
          isAdmin: adminSet.has(p.id),
          isVolunteer: volunteerMap.has(p.id),
          volunteerRole: volunteerMap.get(p.id)?.role || null,
          isVerified: volunteerMap.get(p.id)?.is_verified || false,
        }))
      );
      setLoading(false);
    };
    fetchAllUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>No users found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-3">
        Total users: {users.length}
      </p>
      {users.map((user, i) => (
        <motion.div
          key={user.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03 }}
          className="rounded-xl bg-card border border-border/50 p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <User className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{user.name || "Unnamed"}</p>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {user.isAdmin && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <Shield className="h-3 w-3" /> Admin
                </Badge>
              )}
              {user.isVolunteer && (
                <Badge variant={user.isVerified ? "default" : "secondary"} className="text-xs gap-1">
                  <UserCheck className="h-3 w-3" /> {user.volunteerRole || "Volunteer"}
                  {user.isVerified ? " ✓" : " (pending)"}
                </Badge>
              )}
              {!user.isAdmin && !user.isVolunteer && (
                <Badge variant="outline" className="text-xs">User</Badge>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            {user.mobile && (
              <a href={`tel:${user.mobile}`} className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> {user.mobile}
              </a>
            )}
            {user.created_at && (
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(user.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
