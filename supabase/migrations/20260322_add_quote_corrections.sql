-- Migration: feedback loop — sla gebruikerscorrecties op hoeveelheden op

CREATE TABLE IF NOT EXISTS public.quote_corrections (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  unit text NOT NULL,
  ai_quantity numeric(10,2) NOT NULL,
  corrected_quantity numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.quote_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own corrections"
  ON public.quote_corrections
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_quote_corrections_user_created
  ON public.quote_corrections (user_id, created_at DESC);
