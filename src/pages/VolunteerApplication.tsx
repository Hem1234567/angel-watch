import { useState } from "react";
import { motion } from "framer-motion";
import { ClipboardList, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const QUALIFICATIONS = [
  { value: "MBBS", label: "MBBS" },
  { value: "BDS", label: "BDS" },
  { value: "BAMS", label: "BAMS" },
  { value: "BHMS", label: "BHMS" },
  { value: "B.Pharm", label: "B.Pharm" },
  { value: "D.Pharm", label: "D.Pharm" },
  { value: "GNM", label: "GNM (Nursing)" },
  { value: "BSc Nursing", label: "BSc Nursing" },
  { value: "Paramedic Cert", label: "Paramedic Certificate" },
  { value: "First Aid Cert", label: "First Aid Certificate" },
  { value: "Other", label: "Other" },
];

const ROLES = [
  { value: "Doctor", label: "🩺 Doctor" },
  { value: "Nurse", label: "👩‍⚕️ Nurse" },
  { value: "Pharmacist", label: "💊 Pharmacist" },
  { value: "Compounder", label: "🧪 Compounder" },
  { value: "Paramedic", label: "🚑 Paramedic" },
  { value: "First Aid", label: "🩹 First Aid" },
];

const AVAILABILITY_OPTIONS = [
  "Always Available",
  "Weekdays Only",
  "Weekends Only",
  "Mornings Only",
  "Evenings Only",
];

export default function VolunteerApplication() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [qualification, setQualification] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [availability, setAvailability] = useState("Always Available");
  const [about, setAbout] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!fullName || !phone || !role || !qualification || !licenseNo) {
      toast({ title: "Missing fields", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Update profile
      await supabase.from("profiles").update({
        name: fullName,
        mobile: phone,
        is_volunteer: true,
      }).eq("id", user.id);

      // Insert volunteer record
      const { error } = await supabase.from("volunteers").insert({
        user_id: user.id,
        role,
        full_name: fullName,
        phone,
        qualification,
        specialization: specialization || null,
        license_no: licenseNo,
        experience_years: experienceYears ? parseInt(experienceYears) : null,
        workplace: workplace || null,
        availability,
        about: about || null,
        is_verified: false,
      });

      if (error) throw error;

      toast({
        title: "✅ Application Submitted!",
        description: "Your application is under admin review. You'll be notified once verified.",
      });

      navigate("/");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg space-y-6"
      >
        <div className="text-center space-y-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto"
          >
            <ClipboardList className="h-8 w-8 text-primary" />
          </motion.div>
          <h1 className="text-2xl font-display font-bold text-foreground">📋 Apply as a Volunteer</h1>
          <p className="text-sm text-muted-foreground">
            Medical professional? Submit your details. Admin will verify your license and approve you.
          </p>
        </div>

        {/* Process indicator */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs text-primary font-medium text-center">
            📌 Process: Submit → Admin Review → License Verified → <span className="text-safe font-bold">Approved & Go Live</span> on GPS map.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row: Full Name + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name *</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. / Nurse..." required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone *</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91-XXXXX-XXXXX" required />
            </div>
          </div>

          {/* Row: Role Selection */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Medical Role *</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row: Qualification + Specialization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Qualification *</label>
              <Select value={qualification} onValueChange={setQualification}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {QUALIFICATIONS.map((q) => (
                    <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Specialization</label>
              <Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="e.g. ICU, Cardiology" />
            </div>
          </div>

          {/* Row: License + Experience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">License No. *</label>
              <Input value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} placeholder="Medical Council Reg. No." required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Experience (Yrs)</label>
              <Input type="number" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} placeholder="e.g. 5" min="0" />
            </div>
          </div>

          {/* Workplace */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Workplace</label>
            <Input value={workplace} onChange={(e) => setWorkplace(e.target.value)} placeholder="e.g. Apollo Hospital" />
          </div>

          {/* Availability */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Availability</label>
            <Select value={availability} onValueChange={setAvailability}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* About */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">About You (Optional)</label>
            <Textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="CPR certified, languages, special skills..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full gap-2 h-12 text-base" disabled={loading}>
            {loading ? "Submitting..." : "📋 Submit for Admin Review"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
