-- Add International Driving Permit and Defensive Driving Permit fields to drivers table
ALTER TABLE drivers
ADD COLUMN international_driving_permit_expiry DATE,
ADD COLUMN international_driving_permit_doc_url TEXT,
ADD COLUMN defensive_driving_permit_expiry DATE,
ADD COLUMN defensive_driving_permit_doc_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN drivers.international_driving_permit_expiry IS 'Expiry date of the International Driving Permit';
COMMENT ON COLUMN drivers.international_driving_permit_doc_url IS 'URL to the International Driving Permit document';
COMMENT ON COLUMN drivers.defensive_driving_permit_expiry IS 'Expiry date of the Defensive Driving Permit';
COMMENT ON COLUMN drivers.defensive_driving_permit_doc_url IS 'URL to the Defensive Driving Permit document';
