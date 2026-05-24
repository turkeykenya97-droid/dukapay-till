CREATE TABLE public.pin_attempts (
  shop_id uuid PRIMARY KEY,
  attempt_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pin_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all to anon and authenticated"
  ON public.pin_attempts
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);