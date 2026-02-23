-- Add document fields to drivers table
ALTER TABLE public.drivers
  ADD COLUMN photo_url TEXT,
  ADD COLUMN passport_number TEXT,
  ADD COLUMN passport_expiry DATE,
  ADD COLUMN passport_doc_url TEXT,
  ADD COLUMN id_number TEXT,
  ADD COLUMN id_doc_url TEXT,
  ADD COLUMN drivers_license TEXT,
  ADD COLUMN drivers_license_expiry DATE,
  ADD COLUMN drivers_license_doc_url TEXT,
  ADD COLUMN retest_certificate_expiry DATE,
  ADD COLUMN retest_certificate_doc_url TEXT,
  ADD COLUMN medical_certificate_expiry DATE,
  ADD COLUMN medical_certificate_doc_url TEXT;

-- Create storage bucket for driver documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-documents', 'driver-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload
CREATE POLICY "Authenticated users can upload driver documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'driver-documents');

-- Create policy to allow authenticated users to update
CREATE POLICY "Authenticated users can update driver documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'driver-documents');

-- Create policy to allow public to read
CREATE POLICY "Public can view driver documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'driver-documents');

-- Create policy to allow authenticated users to delete
CREATE POLICY "Authenticated users can delete driver documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'driver-documents');
