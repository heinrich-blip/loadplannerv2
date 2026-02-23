-- Update cargo_type enum to new values
-- First, we need to handle existing data and update the enum

-- Create new enum type with delivery types and backload types (BV, CBC as destinations, Packaging, Fertilizer as cargo)
CREATE TYPE public.cargo_type_new AS ENUM
('VanSalesRetail', 'Retail', 'Vendor', 'RetailVendor', 'Fertilizer', 'BV', 'CBC', 'Packaging');

-- Add a temporary column with the new type
ALTER TABLE public.loads ADD COLUMN cargo_type_temp cargo_type_new;

-- Migrate existing data to new values
UPDATE public.loads SET cargo_type_temp = 
  CASE cargo_type::text
    WHEN 'BV' THEN 'Vendor'::cargo_type_new
    WHEN 'CBC' THEN 'Retail'::cargo_type_new
    WHEN 'Retail' THEN 'Retail'::cargo_type_new
    WHEN 'VanSales' THEN 'VanSalesRetail'::cargo_type_new
    ELSE 'Retail'
::cargo_type_new
END;

-- Drop the old column and rename the new one
ALTER TABLE public.loads DROP COLUMN cargo_type;
ALTER TABLE public.loads RENAME COLUMN cargo_type_temp TO cargo_type;

-- Make the column NOT NULL
ALTER TABLE public.loads ALTER COLUMN cargo_type
SET
NOT NULL;

-- Drop the old enum type and rename the new one
DROP TYPE public.cargo_type;
ALTER TYPE public.cargo_type_new RENAME TO cargo_type;
