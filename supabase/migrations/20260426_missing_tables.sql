-- ============================================================
-- Missing Tables: notices & notifications
-- Run this in Supabase SQL Editor
-- ============================================================

-- Notices / Announcements table
CREATE TABLE IF NOT EXISTS public.notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT,
    audience TEXT DEFAULT 'all' CHECK (audience IN ('all', 'admin', 'teacher', 'student', 'parent')),
    pinned BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications table (personal alerts)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notices
CREATE POLICY "Notices viewable by all" 
ON public.notices FOR SELECT 
TO authenticated 
USING (
    audience = 'all' 
    OR audience = (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1)
);

CREATE POLICY "Notices editable by admin" 
ON public.notices FOR ALL 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for notifications
CREATE POLICY "Users view own notifications" 
ON public.notifications FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" 
ON public.notifications FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Users update own notifications" 
ON public.notifications FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notices_audience ON public.notices(audience);
CREATE INDEX IF NOT EXISTS idx_notices_pinned ON public.notices(pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- ============================================================
-- DONE! Tables created: notices, notifications
-- ============================================================
