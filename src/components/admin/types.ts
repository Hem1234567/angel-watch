export interface VolunteerRow {
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
  isAdminUser?: boolean;
}
