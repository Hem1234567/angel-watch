
-- App settings table for configurable values like SOS radius
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Anyone can read settings" ON public.app_settings FOR SELECT USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can manage settings" ON public.app_settings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Insert default SOS radius (50 km)
INSERT INTO public.app_settings (key, value) VALUES ('sos_radius_km', '50');

-- Allow admins to delete SOS requests
CREATE POLICY "Admins can delete SOS requests" ON public.sos_requests FOR DELETE USING (has_role(auth.uid(), 'admin'));
