
-- ============================================================
-- 1. Add 'parent' to app_role enum
-- ============================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'parent';

-- ============================================================
-- 2. Branches (School / Academy)
-- ============================================================
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view branches" ON public.branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage branches" ON public.branches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.branches (name, description) VALUES
  ('School', 'Main school with class-wise fees'),
  ('Academy', 'Coaching academy with subject-wise fees');

-- Add branch_id to classes & students
ALTER TABLE public.classes ADD COLUMN branch_id uuid REFERENCES public.branches(id);
ALTER TABLE public.students ADD COLUMN branch_id uuid REFERENCES public.branches(id);

-- ============================================================
-- 3. Extend subjects with fee_amount (for Academy)
-- ============================================================
ALTER TABLE public.subjects ADD COLUMN fee_amount numeric(10,2) DEFAULT 0;

-- Student-subject enrollments (for Academy subject-wise billing)
CREATE TABLE public.student_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  enrolled_at date NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (student_id, subject_id)
);
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view enrollments" ON public.student_subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage enrollments" ON public.student_subjects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 4. Parents
-- ============================================================
CREATE TABLE public.parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  occupation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view parents" ON public.parents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage parents" ON public.parents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_parents_updated BEFORE UPDATE ON public.parents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link table parent <-> student (many to many)
CREATE TABLE public.parent_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship text DEFAULT 'guardian',
  UNIQUE (parent_id, student_id)
);
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents view own links" ON public.parent_students FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.parents p WHERE p.id = parent_students.parent_id AND p.profile_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'teacher')
  );
CREATE POLICY "Admins manage parent links" ON public.parent_students FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Helper: is the given student linked to the current authenticated parent?
CREATE OR REPLACE FUNCTION public.is_parent_of(_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_students ps
    JOIN public.parents p ON p.id = ps.parent_id
    WHERE ps.student_id = _student_id AND p.profile_id = auth.uid()
  )
$$;

-- ============================================================
-- 5. Allow parents to view their child's attendance/students
-- ============================================================
CREATE POLICY "Parents view linked children" ON public.students FOR SELECT TO authenticated
  USING (public.is_parent_of(id));

CREATE POLICY "Parents view child attendance" ON public.attendance FOR SELECT TO authenticated
  USING (public.is_parent_of(student_id));

-- ============================================================
-- 6. Fee management
-- ============================================================
CREATE TABLE public.fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id),
  class_id uuid REFERENCES public.classes(id),
  name text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  frequency text NOT NULL DEFAULT 'monthly',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view fee structures" ON public.fee_structures FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage fee structures" ON public.fee_structures FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.fee_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  period text NOT NULL,
  amount numeric(10,2) NOT NULL,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'unpaid',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fee_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invoices" ON public.fee_invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Student views own invoices" ON public.fee_invoices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = fee_invoices.student_id AND s.profile_id = auth.uid()));
CREATE POLICY "Parent views child invoices" ON public.fee_invoices FOR SELECT TO authenticated
  USING (public.is_parent_of(student_id));

CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.fee_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.fee_invoices(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  method text DEFAULT 'cash',
  paid_at date NOT NULL DEFAULT CURRENT_DATE,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage payments" ON public.fee_payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Student/parent view payments" ON public.fee_payments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.fee_invoices i
    JOIN public.students s ON s.id = i.student_id
    WHERE i.id = fee_payments.invoice_id
      AND (s.profile_id = auth.uid() OR public.is_parent_of(s.id))
  ));

-- ============================================================
-- 7. Salary management
-- ============================================================
CREATE TABLE public.salary_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL UNIQUE REFERENCES public.teachers(id) ON DELETE CASCADE,
  base_amount numeric(10,2) NOT NULL DEFAULT 0,
  per_leave_deduction numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.salary_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage salary structures" ON public.salary_structures FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teacher views own salary structure" ON public.salary_structures FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = salary_structures.teacher_id AND t.profile_id = auth.uid()));

CREATE TRIGGER trg_salary_structures_updated BEFORE UPDATE ON public.salary_structures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  period text NOT NULL,
  base_amount numeric(10,2) NOT NULL DEFAULT 0,
  deductions numeric(10,2) NOT NULL DEFAULT 0,
  bonus numeric(10,2) NOT NULL DEFAULT 0,
  net_amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  paid_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage salary payments" ON public.salary_payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teacher views own salary" ON public.salary_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = salary_payments.teacher_id AND t.profile_id = auth.uid()));

CREATE TABLE public.leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage leaves" ON public.leaves FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teacher manages own leaves" ON public.leaves FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = leaves.teacher_id AND t.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = leaves.teacher_id AND t.profile_id = auth.uid()));

-- ============================================================
-- 8. Class diary
-- ============================================================
CREATE TABLE public.class_diary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  homework text,
  notes text,
  posted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.class_diary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/teacher manage diary" ON public.class_diary FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Student views own class diary" ON public.class_diary FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.class_id = class_diary.class_id AND s.profile_id = auth.uid()));
CREATE POLICY "Parent views child class diary" ON public.class_diary FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.class_id = class_diary.class_id AND public.is_parent_of(s.id)));

-- ============================================================
-- 9. Timetable
-- ============================================================
CREATE TABLE public.timetable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view timetable" ON public.timetable FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage timetable" ON public.timetable FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 10. Exams & results
-- ============================================================
CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  exam_date date NOT NULL,
  total_marks numeric(6,2) NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view exams" ON public.exams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/teacher manage exams" ON public.exams FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE TABLE public.exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  marks_obtained numeric(6,2) NOT NULL DEFAULT 0,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id)
);
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/teacher manage results" ON public.exam_results FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Student views own results" ON public.exam_results FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = exam_results.student_id AND s.profile_id = auth.uid()));
CREATE POLICY "Parent views child results" ON public.exam_results FOR SELECT TO authenticated
  USING (public.is_parent_of(student_id));

-- ============================================================
-- 11. Notifications
-- ============================================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  audience_role app_role,
  title text NOT NULL,
  body text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage notifications" ON public.notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "User views own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (audience_role IS NOT NULL AND public.has_role(auth.uid(), audience_role))
  );
CREATE POLICY "User updates own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 12. Update notice_audience to include 'parents'
-- ============================================================
ALTER TYPE public.notice_audience ADD VALUE IF NOT EXISTS 'parents';
