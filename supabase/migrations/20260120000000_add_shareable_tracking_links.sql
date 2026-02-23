-- Create table for shareable tracking links
-- These allow external users to track a vehicle for a limited time without authentication

CREATE TABLE public.tracking_share_links
(
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    load_id UUID REFERENCES public.loads(id) ON DELETE CASCADE,
    telematics_asset_id TEXT NOT NULL,

    -- Link details
    expires_at TIMESTAMP
    WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP
    WITH TIME ZONE NOT NULL DEFAULT now
    (),
  created_by UUID REFERENCES auth.users
    (id) ON
    DELETE
    SET NULL
    ,
  
  -- Track usage
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMP
    WITH TIME ZONE
);

    -- Enable RLS
    ALTER TABLE public.tracking_share_links ENABLE ROW LEVEL SECURITY;

    -- Authenticated users can create and view their own links
    CREATE POLICY "Authenticated users can create share links"
  ON public.tracking_share_links FOR
    INSERT
  TO authenticated
  WITH CHECK (
    true);

    CREATE POLICY "Authenticated users can view share links"
  ON public.tracking_share_links FOR
    SELECT
        TO authenticated
    USING
    (true);

    CREATE POLICY "Authenticated users can delete share links"
  ON public.tracking_share_links FOR
    DELETE
  TO authenticated
  USING (true);

    -- Anonymous users can view active share links (for public tracking page)
    CREATE POLICY "Anyone can view active share links by token"
  ON public.tracking_share_links FOR
    SELECT
        TO anon
    USING
    (expires_at > now
    ());

    -- Anonymous users can update view count
    CREATE POLICY "Anyone can update view count"
  ON public.tracking_share_links FOR
    UPDATE
  TO anon
  USING (expires_at > now())
    WITH CHECK
    (expires_at > now
    ());

    -- Create index for fast token lookup
    CREATE INDEX idx_tracking_share_links_token ON public.tracking_share_links(token);
    CREATE INDEX idx_tracking_share_links_expires ON public.tracking_share_links(expires_at);
