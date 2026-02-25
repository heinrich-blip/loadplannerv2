-- Create client_feedback table for Happy/Unhappy ratings on loads
CREATE TABLE IF NOT EXISTS public.client_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID NOT NULL REFERENCES public.loads(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  rating TEXT NOT NULL CHECK (rating IN ('happy', 'unhappy')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One feedback per load per client (upsert-friendly)
  UNIQUE (load_id, client_id)
);

-- Enable RLS
ALTER TABLE public.client_feedback ENABLE ROW LEVEL SECURITY;

-- Authenticated users (admin) can do everything
CREATE POLICY "Authenticated users can view all feedback"
  ON public.client_feedback FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert feedback"
  ON public.client_feedback FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update feedback"
  ON public.client_feedback FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete feedback"
  ON public.client_feedback FOR DELETE
  TO authenticated
  USING (true);

-- Anonymous users (portal) can view and submit feedback
CREATE POLICY "Anonymous users can view feedback"
  ON public.client_feedback FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can insert feedback"
  ON public.client_feedback FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update feedback"
  ON public.client_feedback FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Service role has full access
CREATE POLICY "Service role has full access to feedback"
  ON public.client_feedback FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX idx_client_feedback_client_id ON public.client_feedback(client_id);
CREATE INDEX idx_client_feedback_load_id ON public.client_feedback(load_id);
CREATE INDEX idx_client_feedback_rating ON public.client_feedback(rating);
