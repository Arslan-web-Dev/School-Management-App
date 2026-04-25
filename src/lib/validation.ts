import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(72),
});

export const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, "Required").max(100),
});

export const studentSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  roll_number: z.string().trim().min(1).max(20),
  class_id: z.string().uuid().nullable().optional(),
  parent_name: z.string().trim().max(100).optional().or(z.literal("")),
  parent_phone: z.string().trim().max(20).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  password: z.string().min(6).max(72),
});

export const teacherSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  employee_id: z.string().trim().min(1).max(20),
  qualification: z.string().trim().max(100).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  password: z.string().min(6).max(72),
});

export const classSchema = z.object({
  name: z.string().trim().min(1).max(50),
  section: z.string().trim().min(1).max(10),
  grade_level: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().min(1).max(20).optional()
  ),
  class_teacher_id: z.string().uuid().nullable().optional(),
  academic_year: z.string().trim().min(4).max(20),
});

export const noticeSchema = z.object({
  title: z.string().trim().min(2).max(200),
  body: z.string().trim().min(2).max(5000),
  audience: z.enum(["all", "teachers", "students", "parents"]),
  pinned: z.boolean(),
});

export const parentSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  occupation: z.string().trim().max(100).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  password: z.string().min(6).max(72),
  student_ids: z.array(z.string().uuid()).default([]),
});

export const subjectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().max(20).optional().or(z.literal("")),
  class_id: z.string().uuid().nullable().optional(),
  fee_amount: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().min(0).default(0)),
});

export const feeStructureSchema = z.object({
  name: z.string().trim().min(1).max(100),
  branch_id: z.string().uuid().nullable().optional(),
  class_id: z.string().uuid().nullable().optional(),
  amount: z.preprocess((v) => Number(v), z.number().min(0)),
  frequency: z.enum(["monthly", "quarterly", "yearly", "one-time"]),
});

export const invoiceSchema = z.object({
  student_id: z.string().uuid(),
  period: z.string().trim().min(1).max(40),
  amount: z.preprocess((v) => Number(v), z.number().min(0)),
  discount: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().min(0).default(0)),
  due_date: z.string().min(1),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const salaryStructureSchema = z.object({
  teacher_id: z.string().uuid(),
  base_amount: z.preprocess((v) => Number(v), z.number().min(0)),
  per_leave_deduction: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().min(0).default(0)),
});

export const salaryPaymentSchema = z.object({
  teacher_id: z.string().uuid(),
  period: z.string().trim().min(1).max(40),
  base_amount: z.preprocess((v) => Number(v), z.number().min(0)),
  deductions: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().min(0).default(0)),
  bonus: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().min(0).default(0)),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const leaveSchema = z.object({
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export const diarySchema = z.object({
  class_id: z.string().uuid(),
  subject_id: z.string().uuid().nullable().optional(),
  date: z.string().min(1),
  homework: z.string().trim().max(2000).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const timetableSchema = z.object({
  class_id: z.string().uuid(),
  subject_id: z.string().uuid().nullable().optional(),
  teacher_id: z.string().uuid().nullable().optional(),
  day_of_week: z.preprocess((v) => Number(v), z.number().int().min(0).max(6)),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
});

export const examSchema = z.object({
  name: z.string().trim().min(1).max(100),
  class_id: z.string().uuid(),
  subject_id: z.string().uuid().nullable().optional(),
  exam_date: z.string().min(1),
  total_marks: z.preprocess((v) => Number(v), z.number().min(1)),
});
