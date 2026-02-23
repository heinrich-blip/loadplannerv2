-- Add 'Export' to cargo_type enum
ALTER TYPE cargo_type
ADD VALUE
IF NOT EXISTS 'Export';

-- Add comment
COMMENT ON TYPE cargo_type IS 'Cargo types including Export for international/export loads';
