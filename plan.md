
# EduManage Pro — v1 Plan

A single-school management system with three roles (Admin, Teacher, Student) and a clean SaaS-style dashboard. Built on **React + Vite + Tailwind + Supabase** (Postgres, Auth, Storage, RLS). Your uploaded doc's data model and module list map cleanly onto this; only the runtime/framework changes.

> Note on stack: React Router for routing, Supabase Edge Functions, Supabase Storage, Supabase Auth + RLS. Everything else from your spec carries over.

---

## 1. Roles & access

- **Admin** — full control of school data
- **Teacher** — own classes, mark attendance, post notices
- **Student** — own profile, attendance, notices

Roles stored in a dedicated `user_roles` table (never on profile) and enforced server-side via Postgres RLS policies — no client-side role checks.

## 2. Auth

- Email + password sign-in (Supabase Auth)
- Sign-up gated: only Admin can create Teacher/Student accounts; first user becomes Admin
- Protected routes by role; unauthorized → redirect
- Auto-login persistence + sign out

## 3. Data model (single school)

- **profiles** — name, phone, avatar, dob, gender (1:1 with auth user)
- **user_roles** — user_id, role (admin / teacher / student)
- **classes** — name, section, grade level, class teacher
- **subjects** — name, code, class
- **students** — profile_id, roll number, class, section, parent name, parent phone, admission date
- **teachers** — profile_id, employee id, subjects, joining date
- **attendance** — student, class, date, status (present/absent/late), marked_by
- **notices** — title, body, audience (all/teachers/students/class), author, pinned

All tables have RLS: students see only their own records; teachers see their classes; admin sees everything.

## 4. Pages & UX

**Shared shell**
- Collapsible left sidebar (shadcn) with role-filtered nav
- Top bar with search, notifications bell, dark/light toggle, user menu
- Light, modern SaaS look — blue accent, generous spacing, card-based layouts, Recharts for graphs

**Auth**
- `/login` — clean centered card
- `/setup` — first-run admin creation

**Admin**
- Dashboard: 4 stat cards (students, teachers, classes, attendance %), attendance trend bar chart, recent notices, recent admissions
- Students: searchable/filterable table, add/edit modal, view profile, assign to class
- Teachers: table + add/edit, assign subjects/classes
- Classes: list + create class, assign class teacher, view roster
- Attendance: pick class + date → grid view of all classes' records
- Notices: create / edit / pin / delete, audience selector
- Settings: school name, logo, academic year

**Teacher**
- Dashboard: my classes, today's attendance status, latest notices
- My Classes: list of assigned classes → roster view
- Attendance: pick class + date → toggle Present/Absent/Late per student, bulk save
- Notices: post to my class or all students

**Student**
- Dashboard: attendance % card, upcoming/recent notices, my class info
- My Attendance: monthly calendar with color-coded days + summary stats
- Notices: filtered to my audience
- Profile: view + edit basic info

## 5. Cross-cutting

- Form validation with **Zod** + React Hook Form (length limits, required fields, sanitization)
- Toast notifications for all mutations
- Loading skeletons + empty states everywhere
- Pagination + search on all list views
- Fully responsive (mobile sidebar drawer, stacked cards)
- Dark/light theme toggle persisted

## 6. Seed data

Demo admin + a few teachers, students, classes, sample attendance and notices so the app is browsable immediately after build.

## 7. Explicitly out of scope for v1 (easy follow-ups)

To keep v1 shippable and high-quality, these are deferred — each can be added in a follow-up build:
- Parent portal
- Exams, marks entry, report cards
- Fee management & receipts
- Assignments & submissions (file uploads)
- Timetable
- Realtime notifications (websockets)
- Multi-school SaaS + subscription billing
- Audit logs
- Bulk CSV import / Excel export

---

After approval I'll generate the database schema with RLS policies, then build the UI module by module starting with auth + the admin dashboard.
