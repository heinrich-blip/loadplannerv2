-- Create diesel_orders table
CREATE TABLE IF NOT EXISTS public.diesel_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    load_id UUID NOT NULL REFERENCES public.loads(id) ON DELETE CASCADE,
    fuel_station VARCHAR(255) NOT NULL,
    quantity_liters NUMERIC(10, 2) NOT NULL,
    cost_per_liter NUMERIC(10, 2),
    total_cost NUMERIC(10, 2),
    recipient_name VARCHAR(255),
    recipient_phone VARCHAR(50),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'fulfilled', 'cancelled')),
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    fulfilled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_diesel_orders_load_id ON public.diesel_orders(load_id);
CREATE INDEX IF NOT EXISTS idx_diesel_orders_status ON public.diesel_orders(status);
CREATE INDEX IF NOT EXISTS idx_diesel_orders_created_at ON public.diesel_orders(created_at DESC);

-- Enable RLS
ALTER TABLE public.diesel_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for diesel_orders
CREATE POLICY "Enable read access for authenticated users" ON public.diesel_orders
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.diesel_orders
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.diesel_orders
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON public.diesel_orders
    FOR DELETE TO authenticated USING (true);

-- Service role policies
CREATE POLICY "Service role full access to diesel_orders" ON public.diesel_orders
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_diesel_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER diesel_orders_updated_at
    BEFORE UPDATE ON public.diesel_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_diesel_orders_updated_at();

-- Add comment
COMMENT ON TABLE public.diesel_orders IS 'Diesel orders associated with trips/loads';
