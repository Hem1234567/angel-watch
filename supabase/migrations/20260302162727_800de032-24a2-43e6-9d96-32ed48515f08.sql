
ALTER TABLE public.volunteers
  ADD COLUMN IF NOT EXISTS qualification text,
  ADD COLUMN IF NOT EXISTS specialization text,
  ADD COLUMN IF NOT EXISTS license_no text,
  ADD COLUMN IF NOT EXISTS experience_years integer,
  ADD COLUMN IF NOT EXISTS workplace text,
  ADD COLUMN IF NOT EXISTS availability text DEFAULT 'Always Available',
  ADD COLUMN IF NOT EXISTS about text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text;
