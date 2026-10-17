-- ====================================================================
-- CLIPVAULT: DATABASE MIGRATION 002 - ROW LEVEL SECURITY (RLS) POLICIES
-- Zero-trust tenant isolation: users access ONLY their own data
-- ====================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipboard_items ENABLE ROW LEVEL SECURITY;

-- 2. Devices Table Policies
DROP POLICY IF EXISTS "Users can read own devices" ON public.devices;
CREATE POLICY "Users can read own devices"
    ON public.devices
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own devices" ON public.devices;
CREATE POLICY "Users can insert own devices"
    ON public.devices
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own devices" ON public.devices;
CREATE POLICY "Users can update own devices"
    ON public.devices
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own devices" ON public.devices;
CREATE POLICY "Users can delete own devices"
    ON public.devices
    FOR DELETE
    USING (auth.uid() = user_id);

-- 3. Clipboard Items Table Policies
DROP POLICY IF EXISTS "Users can read own clipboard items" ON public.clipboard_items;
CREATE POLICY "Users can read own clipboard items"
    ON public.clipboard_items
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own clipboard items" ON public.clipboard_items;
CREATE POLICY "Users can insert own clipboard items"
    ON public.clipboard_items
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own clipboard items" ON public.clipboard_items;
CREATE POLICY "Users can update own clipboard items"
    ON public.clipboard_items
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own clipboard items" ON public.clipboard_items;
CREATE POLICY "Users can delete own clipboard items"
    ON public.clipboard_items
    FOR DELETE
    USING (auth.uid() = user_id);
