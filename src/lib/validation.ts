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
  audience: z.enum(["all", "teachers", "students"]),
  pinned: z.boolean(),
});
