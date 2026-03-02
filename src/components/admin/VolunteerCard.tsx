import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, XCircle, ChevronDown, ChevronUp, Phone, Briefcase,
  Award, MapPin, Stethoscope, GraduationCap, FileText, Clock,
  Trash2, Edit2, ShieldCheck, ShieldOff,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { VolunteerRow } from "./types";

interface VolunteerCardProps {
  v: VolunteerRow;
  i: number;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onToggleVerification: (v: VolunteerRow) => void;
  onDelete: (v: VolunteerRow) => void;
  onUpdate: (v: VolunteerRow, updates: Partial<VolunteerRow>) => void;
  onToggleAdmin: (v: VolunteerRow) => void;
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | number | null | undefined }) {
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
}

export function VolunteerCard({ v, i, isExpanded, onToggleExpand, onToggleVerification, onDelete, onUpdate, onToggleAdmin }: VolunteerCardProps) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    full_name: v.full_name || "",
    phone: v.phone || "",
    qualification: v.qualification || "",
    specialization: v.specialization || "",
    workplace: v.workplace || "",
    experience_years: v.experience_years ?? 0,
  });

  const handleSave = () => {
    onUpdate(v, {
      full_name: editData.full_name || null,
      phone: editData.phone || null,
      qualification: editData.qualification || null,
      specialization: editData.specialization || null,
      workplace: editData.workplace || null,
      experience_years: editData.experience_years || null,
    });
    setEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.05 }}
      className="rounded-xl bg-card border border-border/50 overflow-hidden"
    >
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => onToggleExpand(v.id)}
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${v.is_verified ? "bg-safe/10" : "bg-warning/10"}`}>
          {v.is_verified ? <CheckCircle className="h-5 w-5 text-safe" /> : <XCircle className="h-5 w-5 text-warning" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{v.full_name || v.userName}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={v.is_verified ? "default" : "secondary"} className="text-xs">
              {v.role || "Volunteer"}
            </Badge>
            {v.isAdminUser && (
              <Badge variant="destructive" className="text-xs">Admin</Badge>
            )}
            {v.qualification && (
              <span className="text-xs text-muted-foreground">{v.qualification}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={v.is_verified}
            onCheckedChange={() => onToggleVerification(v)}
            onClick={(e) => e.stopPropagation()}
          />
          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

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
              {editing ? (
                <div className="space-y-2">
                  <Input placeholder="Full Name" value={editData.full_name} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })} />
                  <Input placeholder="Phone" value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
                  <Input placeholder="Qualification" value={editData.qualification} onChange={(e) => setEditData({ ...editData, qualification: e.target.value })} />
                  <Input placeholder="Specialization" value={editData.specialization} onChange={(e) => setEditData({ ...editData, specialization: e.target.value })} />
                  <Input placeholder="Workplace" value={editData.workplace} onChange={(e) => setEditData({ ...editData, workplace: e.target.value })} />
                  <Input type="number" placeholder="Experience (years)" value={editData.experience_years} onChange={(e) => setEditData({ ...editData, experience_years: parseInt(e.target.value) || 0 })} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
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
                </>
              )}

              {!editing && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {!v.is_verified ? (
                    <Button size="sm" className="gap-1" onClick={() => onToggleVerification(v)}>
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => onToggleVerification(v)}>
                      <XCircle className="h-3.5 w-3.5" /> Revoke
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditing(true)}>
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => onToggleAdmin(v)}
                  >
                    {v.isAdminUser ? (
                      <><ShieldOff className="h-3.5 w-3.5" /> Remove Admin</>
                    ) : (
                      <><ShieldCheck className="h-3.5 w-3.5" /> Make Admin</>
                    )}
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1" onClick={() => onDelete(v)}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                  {v.phone && (
                    <Button size="sm" variant="outline" className="gap-1" asChild>
                      <a href={`tel:${v.phone}`}><Phone className="h-3.5 w-3.5" /> Call</a>
                    </Button>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Applied: {new Date(v.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
