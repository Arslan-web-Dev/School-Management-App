-- ============================================================
-- STUDENT REGISTRATION & PANEL - COMPLETE SQL MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. SCHOOL CONFIG TABLE
CREATE TABLE IF NOT EXISTS public.school_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name TEXT NOT NULL DEFAULT 'EduManage School',
  school_type TEXT NOT NULL DEFAULT 'school',
  logo_url TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  principal_name TEXT,
  established_year INT,
  academic_year TEXT NOT NULL DEFAULT '2025-2026',
  currency TEXT DEFAULT 'PKR',
  locale TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'Asia/Karachi',
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.school_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_config_select" ON public.school_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "school_config_admin_update" ON public.school_config
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "school_config_admin_insert" ON public.school_config
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default config
INSERT INTO public.school_config (school_name, city, academic_year)
VALUES ('EduManage School', 'Karachi', '2025-2026')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. EXTEND STUDENTS TABLE (add missing columns if needed)
-- ============================================================
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS roll_number TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  ADD COLUMN IF NOT EXISTS blood_group TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS guardian_name TEXT,
  ADD COLUMN IF NOT EXISTS guardian_phone TEXT,
  ADD COLUMN IF NOT EXISTS guardian_relation TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS admission_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'suspended'));

-- ============================================================
-- 3. PARENT-CHILDREN LINKING TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.parent_children (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relation TEXT DEFAULT 'parent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

ALTER TABLE public.parent_children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parent_children_select" ON public.parent_children
  FOR SELECT TO authenticated
  USING (
    parent_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "parent_children_admin_manage" ON public.parent_children
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 4. CLASS ASSIGNMENTS TABLE (teacher -> class)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.class_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, class_id, subject_id)
);

ALTER TABLE public.class_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_assignments_select" ON public.class_assignments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "class_assignments_admin_manage" ON public.class_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. GRADES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  class_id UUID NOT NULL REFERENCES public.classes(id),
  exam_type TEXT NOT NULL DEFAULT 'midterm' CHECK (exam_type IN ('quiz', 'midterm', 'final', 'assignment', 'practical')),
  marks_obtained NUMERIC(5,2),
  total_marks NUMERIC(5,2) NOT NULL DEFAULT 100,
  grade TEXT,
  remarks TEXT,
  exam_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grades_student_select" ON public.grades
  FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'teacher')
  );

CREATE POLICY "grades_teacher_insert" ON public.grades
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "grades_teacher_update" ON public.grades
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- ============================================================
-- 6. FEES TABLE (extended)
-- ============================================================
ALTER TABLE public.fees
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id),
  ADD COLUMN IF NOT EXISTS fee_type TEXT DEFAULT 'monthly' CHECK (fee_type IN ('monthly', 'admission', 'exam', 'transport', 'other')),
  ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS paid_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'waived')),
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS receipt_number TEXT,
  ADD COLUMN IF NOT EXISTS month TEXT,
  ADD COLUMN IF NOT EXISTS year INT;

ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fees_student_select" ON public.fees
  FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- ============================================================
-- 7. STUDENT RLS ON EXISTING TABLES
-- ============================================================

-- Students can see their own record
DROP POLICY IF EXISTS "students_self_select" ON public.students;
CREATE POLICY "students_self_select" ON public.students
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'teacher')
  );

-- Attendance: students see own
DROP POLICY IF EXISTS "attendance_student_select" ON public.attendance;
CREATE POLICY "attendance_student_select" ON public.attendance
  FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'teacher')
  );

-- ============================================================
-- 8. FUNCTION: Register a student with auth account
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_student_account(
  p_email TEXT,
  p_name TEXT,
  p_class_id UUID,
  p_roll_number TEXT DEFAULT NULL,
  p_guardian_name TEXT DEFAULT NULL,
  p_guardian_phone TEXT DEFAULT NULL,
  p_date_of_birth DATE DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
BEGIN
  -- Only admin can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can create student accounts';
  END IF;

  -- Insert into students table (auth account created separately via invite)
  INSERT INTO public.students (
    name, email, class_id, roll_number,
    guardian_name, guardian_phone,
    date_of_birth, gender, address, status
  ) VALUES (
    p_name, p_email, p_class_id, p_roll_number,
    p_guardian_name, p_guardian_phone,
    p_date_of_birth, p_gender, p_address, 'active'
  )
  RETURNING id INTO v_student_id;

  RETURN jsonb_build_object(
    'success', true,
    'student_id', v_student_id,
    'message', 'Student record created. Send invitation email separately.'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- DONE! Tables created:
-- school_config, parent_children, class_assignments, grades
-- Extended: students, fees
-- RLS policies: attendance, grades, fees, students
-- ============================================================
