-- Create a database webhook to trigger Google Sheets sync when load times change.
-- This uses pg_net to POST to the edge function whenever actual times are updated.
--
-- Target Google Sheet: https://docs.google.com/spreadsheets/d/1Ep1ZpTBMT416mm9ZeC6sxl5tIrk1uU8RfSQy30xyMgM/edit
--
-- NOTE: pg_net must be enabled in your Supabase project (Dashboard > Database > Extensions).
-- The edge function URL and service role key are read from app.settings (set in Supabase Dashboard).

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.notify_google_sheets_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url text;
  service_role_key text;
BEGIN
  -- Only fire when actual times change
  IF (
    OLD.actual_loading_arrival IS DISTINCT FROM NEW.actual_loading_arrival OR
    OLD.actual_loading_departure IS DISTINCT FROM NEW.actual_loading_departure OR
    OLD.actual_offloading_arrival IS DISTINCT FROM NEW.actual_offloading_arrival OR
    OLD.actual_offloading_departure IS DISTINCT FROM NEW.actual_offloading_departure OR
    OLD.time_window IS DISTINCT FROM NEW.time_window
  ) THEN
    -- Build the edge function URL from project settings
    -- Replace with your actual values or use vault secrets
    edge_function_url := current_setting('app.settings.supabase_url', true) 
                         || '/functions/v1/google-sheets-sync';
    service_role_key := current_setting('app.settings.service_role_key', true);

    -- Only attempt the call if pg_net is available and settings are configured
    IF edge_function_url IS NOT NULL AND service_role_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := edge_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'loadIds', jsonb_build_array(NEW.id)
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger (drop first if it already exists)
DROP TRIGGER IF EXISTS on_load_times_changed ON public.loads;

CREATE TRIGGER on_load_times_changed
  AFTER UPDATE ON public.loads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_google_sheets_sync();

-- Add a comment for documentation
COMMENT ON FUNCTION public.notify_google_sheets_sync() IS 
  'Triggers a Google Sheets sync via the google-sheets-sync edge function whenever actual load times are updated.';
