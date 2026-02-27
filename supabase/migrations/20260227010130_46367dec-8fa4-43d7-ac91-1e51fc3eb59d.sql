
CREATE OR REPLACE FUNCTION public.increment_incentive_score(volunteer_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.volunteers
  SET incentive_score = incentive_score + 1
  WHERE user_id = volunteer_user_id;
END;
$$;
