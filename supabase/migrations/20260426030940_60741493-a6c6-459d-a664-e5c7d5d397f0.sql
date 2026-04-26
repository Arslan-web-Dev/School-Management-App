
-- 1. fee_invoices: track when paid
ALTER TABLE public.fee_invoices ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- 2. Notification helper: insert one row per linked user
CREATE OR REPLACE FUNCTION public.notify_users(
  _user_ids uuid[], _title text, _body text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE uid uuid;
BEGIN
  FOREACH uid IN ARRAY _user_ids LOOP
    INSERT INTO public.notifications (user_id, title, body) VALUES (uid, _title, _body);
  END LOOP;
END;
$$;

-- 3. Trigger: new notice -> broadcast to audience role
CREATE OR REPLACE FUNCTION public.notify_on_notice()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.audience = 'all' THEN
    INSERT INTO public.notifications (audience_role, title, body) VALUES
      ('teacher', '📢 ' || NEW.title, NEW.body),
      ('student', '📢 ' || NEW.title, NEW.body),
      ('parent',  '📢 ' || NEW.title, NEW.body);
  ELSIF NEW.audience = 'teachers' THEN
    INSERT INTO public.notifications (audience_role, title, body) VALUES ('teacher', '📢 ' || NEW.title, NEW.body);
  ELSIF NEW.audience = 'students' THEN
    INSERT INTO public.notifications (audience_role, title, body) VALUES ('student', '📢 ' || NEW.title, NEW.body);
  ELSIF NEW.audience = 'parents' THEN
    INSERT INTO public.notifications (audience_role, title, body) VALUES ('parent', '📢 ' || NEW.title, NEW.body);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_on_notice ON public.notices;
CREATE TRIGGER trg_notify_on_notice AFTER INSERT ON public.notices
FOR EACH ROW EXECUTE FUNCTION public.notify_on_notice();

-- 4. Trigger: new diary -> notify students of that class + their parents
CREATE OR REPLACE FUNCTION public.notify_on_diary()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE u uuid; class_label text;
BEGIN
  SELECT name || '-' || section INTO class_label FROM public.classes WHERE id = NEW.class_id;
  -- Students
  FOR u IN SELECT s.profile_id FROM public.students s WHERE s.class_id = NEW.class_id LOOP
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (u, '📝 New diary for ' || coalesce(class_label, 'your class'), coalesce(NEW.homework, NEW.notes, 'New entry posted'));
  END LOOP;
  -- Parents
  FOR u IN SELECT p.profile_id FROM public.parents p
           JOIN public.parent_students ps ON ps.parent_id = p.id
           JOIN public.students s ON s.id = ps.student_id
           WHERE s.class_id = NEW.class_id LOOP
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (u, '📝 New diary for ' || coalesce(class_label, 'your child''s class'), coalesce(NEW.homework, NEW.notes, 'New entry posted'));
  END LOOP;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_on_diary ON public.class_diary;
CREATE TRIGGER trg_notify_on_diary AFTER INSERT ON public.class_diary
FOR EACH ROW EXECUTE FUNCTION public.notify_on_diary();

-- 5. Trigger: attendance absent -> notify student + parents
CREATE OR REPLACE FUNCTION public.notify_on_absence()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE student_name text; student_profile uuid;
BEGIN
  IF NEW.status <> 'absent' THEN RETURN NEW; END IF;
  SELECT pr.full_name, s.profile_id INTO student_name, student_profile
  FROM public.students s JOIN public.profiles pr ON pr.id = s.profile_id
  WHERE s.id = NEW.student_id;
  -- Notify student
  IF student_profile IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (student_profile, '⚠️ Marked absent', 'You were marked absent on ' || NEW.date);
  END IF;
  -- Notify parents
  INSERT INTO public.notifications (user_id, title, body)
  SELECT p.profile_id, '⚠️ Absence alert', coalesce(student_name, 'Your child') || ' was marked absent on ' || NEW.date
  FROM public.parents p
  JOIN public.parent_students ps ON ps.parent_id = p.id
  WHERE ps.student_id = NEW.student_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_on_absence ON public.attendance;
CREATE TRIGGER trg_notify_on_absence AFTER INSERT ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.notify_on_absence();

-- 6. Trigger: new fee invoice -> notify student + parents
CREATE OR REPLACE FUNCTION public.notify_on_invoice()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE student_name text; student_profile uuid; total numeric;
BEGIN
  SELECT pr.full_name, s.profile_id INTO student_name, student_profile
  FROM public.students s JOIN public.profiles pr ON pr.id = s.profile_id
  WHERE s.id = NEW.student_id;
  total := NEW.amount - coalesce(NEW.discount, 0);
  IF student_profile IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (student_profile, '💰 New fee invoice', NEW.period || ': Rs. ' || total || ' due ' || NEW.due_date);
  END IF;
  INSERT INTO public.notifications (user_id, title, body)
  SELECT p.profile_id, '💰 New fee invoice', coalesce(student_name, 'Your child') || ' — ' || NEW.period || ': Rs. ' || total || ' due ' || NEW.due_date
  FROM public.parents p
  JOIN public.parent_students ps ON ps.parent_id = p.id
  WHERE ps.student_id = NEW.student_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_on_invoice ON public.fee_invoices;
CREATE TRIGGER trg_notify_on_invoice AFTER INSERT ON public.fee_invoices
FOR EACH ROW EXECUTE FUNCTION public.notify_on_invoice();

-- 7. Bulk invoice generator
CREATE OR REPLACE FUNCTION public.generate_monthly_invoices(
  _class_id uuid, _period text, _due_date date, _amount numeric
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE inserted_count integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can generate invoices';
  END IF;
  INSERT INTO public.fee_invoices (student_id, period, amount, due_date)
  SELECT s.id, _period, _amount, _due_date
  FROM public.students s
  WHERE s.class_id = _class_id
  AND NOT EXISTS (
    SELECT 1 FROM public.fee_invoices i WHERE i.student_id = s.id AND i.period = _period
  );
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;
