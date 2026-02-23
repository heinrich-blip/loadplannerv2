-- Create enums for load status, cargo type, and priority
CREATE TYPE public.load_status AS ENUM ('scheduled', 'in-transit', 'pending', 'delivered');
CREATE TYPE public.cargo_type AS ENUM ('BV', 'CBC', 'Retail', 'VanSales');
CREATE TYPE public.priority_level AS ENUM ('high', 'medium', 'low');

-- Create drivers table
CREATE TABLE public.drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fleet_vehicles table
CREATE TABLE public.fleet_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  capacity NUMERIC(10,2) NOT NULL,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create loads table with foreign keys
CREATE TABLE public.loads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  load_id TEXT NOT NULL UNIQUE,
  priority priority_level NOT NULL DEFAULT 'medium',
  loading_date DATE NOT NULL,
  offloading_date DATE NOT NULL,
  time_window TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  cargo_type cargo_type NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  weight NUMERIC(10,2) NOT NULL DEFAULT 0,
  special_handling TEXT[] DEFAULT '{}',
  fleet_vehicle_id UUID REFERENCES public.fleet_vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  co_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  status load_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for drivers (authenticated users can manage)
CREATE POLICY "Authenticated users can view drivers"
  ON public.drivers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert drivers"
  ON public.drivers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update drivers"
  ON public.drivers FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete drivers"
  ON public.drivers FOR DELETE
  TO authenticated
  USING (true);

-- Create RLS policies for fleet_vehicles
CREATE POLICY "Authenticated users can view fleet vehicles"
  ON public.fleet_vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert fleet vehicles"
  ON public.fleet_vehicles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update fleet vehicles"
  ON public.fleet_vehicles FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete fleet vehicles"
  ON public.fleet_vehicles FOR DELETE
  TO authenticated
  USING (true);

-- Create RLS policies for loads
CREATE POLICY "Authenticated users can view loads"
  ON public.loads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert loads"
  ON public.loads FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update loads"
  ON public.loads FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete loads"
  ON public.loads FOR DELETE
  TO authenticated
  USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fleet_vehicles_updated_at
  BEFORE UPDATE ON public.fleet_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loads_updated_at
  BEFORE UPDATE ON public.loads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_loads_status ON public.loads(status);
CREATE INDEX idx_loads_loading_date ON public.loads(loading_date);
CREATE INDEX idx_loads_driver_id ON public.loads(driver_id);
CREATE INDEX idx_loads_fleet_vehicle_id ON public.loads(fleet_vehicle_id);
CREATE INDEX idx_drivers_available ON public.drivers(available);
CREATE INDEX idx_fleet_vehicles_available ON public.fleet_vehicles(available);