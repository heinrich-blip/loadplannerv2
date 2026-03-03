-- Add Vansales and Vansales/Vendor cargo types
ALTER TYPE cargo_type ADD VALUE IF NOT EXISTS 'Vansales';
ALTER TYPE cargo_type ADD VALUE IF NOT EXISTS 'Vansales/Vendor';
