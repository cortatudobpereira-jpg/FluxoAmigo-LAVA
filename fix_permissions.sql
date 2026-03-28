-- 1. Enable RLS on all main tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wash_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 2. Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 3. Wash Queue Policies (For now, let's allow all authenticated users to see the queue)
DROP POLICY IF EXISTS "Authenticated users can view wash queue" ON public.wash_queue;
CREATE POLICY "Authenticated users can view wash queue" ON public.wash_queue FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert wash queue" ON public.wash_queue;
CREATE POLICY "Authenticated users can insert wash queue" ON public.wash_queue FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update wash queue" ON public.wash_queue;
CREATE POLICY "Authenticated users can update wash queue" ON public.wash_queue FOR UPDATE TO authenticated USING (true);

-- 4. Clients and Vehicles Policies
DROP POLICY IF EXISTS "Authenticated users can manage clients" ON public.clients;
CREATE POLICY "Authenticated users can manage clients" ON public.clients FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage vehicles" ON public.vehicles;
CREATE POLICY "Authenticated users can manage vehicles" ON public.vehicles FOR ALL TO authenticated USING (true);

-- 5. Services Policies
DROP POLICY IF EXISTS "Authenticated users can view services" ON public.services;
CREATE POLICY "Authenticated users can view services" ON public.services FOR SELECT TO authenticated USING (true);

-- 6. Transactions Policies
DROP POLICY IF EXISTS "All authenticated users can manage transactions" ON public.transactions;
CREATE POLICY "All authenticated users can manage transactions" ON public.transactions FOR ALL TO authenticated USING (true);
