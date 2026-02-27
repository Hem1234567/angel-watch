
-- Add incentive_score to volunteers table
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS incentive_score integer NOT NULL DEFAULT 0;

-- Add attended_by_user and attended_by_volunteer columns to sos_requests for tracking confirmation
ALTER TABLE public.sos_requests ADD COLUMN IF NOT EXISTS user_confirmed boolean DEFAULT false;
ALTER TABLE public.sos_requests ADD COLUMN IF NOT EXISTS volunteer_confirmed boolean DEFAULT false;
