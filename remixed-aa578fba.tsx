import { useState } from "react";

// ============================================================
// DATA
// ============================================================

const TABS = ["Overview", "Project Structure", "RBAC Rules", "DB Schema", "API Routes", "Tech Stack"];

const ROLES = [
  {
    key: "super_admin",
    label: "Super Admin",
    emoji: "👑",
    color: "#f59e0b",
    bg: "#f59e0b18",
    border: "#f59e0b33",
    desc: "Full system control — both School & Academy branches",
    permissions: [
      "Create/delete any user (staff, parent, student)",
      "Switch between School & Academy context",
      "Define fee structures (class-wise + subject-wise)",
      "Upload & manage syllabus",
      "Issue salary, view salary reports",
      "Generate all reports (fees, attendance, performance)",
      "Send announcements & notifications to all roles",
      "Manage timetables & exam schedules",
      "Backup & data export",
      "Create/manage admin accounts",
      "Manage discount & scholarship records",
      "Generate student ID cards",
    ],
  },
  {
    key: "staff",
    label: "Staff / Teacher",
    emoji: "👨‍🏫",
    color: "#34d399",
    bg: "#34d39918",
    border: "#34d39933",
    desc: "Teaching staff — classroom operations & own HR data",
    permissions: [
      "Mark & view student attendance (own classes only)",
      "View own attendance record",
      "View own salary details (issued date, deductions, leaves)",
      "Update class diary (homework, notes, images)",
      "Update student performance marks",
      "View own teaching schedule / timetable",
      "Post to General Discussion Board (GDB)",
      "Receive notifications & announcements",
      "View syllabus for own subjects",
      "❌ Cannot edit salary or other staff data",
      "❌ Cannot access other staff's salary",
      "❌ Cannot manage fee or class structure",
    ],
  },
  {
    key: "parent",
    label: "Parent / Guardian",
    emoji: "👨‍👩‍👧",
    color: "#60a5fa",
    bg: "#60a5fa18",
    border: "#60a5fa33",
    desc: "Read-only access to child's data + school communication",
    permissions: [
      "View child's profile & ID",
      "View daily diary / homework (with images)",
      "View child's attendance record",
      "View child's performance & progress reports",
      "View fee details: due, paid, history",
      "Use fee calculator (Academy subject-wise)",
      "Receive fee reminders & notifications",
      "View school/academy announcements",
      "View activities & events updates",
      "Post to General Discussion Board (GDB)",
      "❌ Cannot edit any data",
      "❌ Cannot view other children's data",
    ],
  },
];

const RBAC_RULES = [
  {
    rule: "Institution Scoping",
    detail: "Every DB row has an institution_id (school | academy). All queries are scoped by institution. A staff member teaching in both sees both; parents are linked to one.",
    color: "#a78bfa",
  },
  {
    rule: "Row Level Security (RLS)",
    detail: "Supabase RLS policies enforce access at DB level. Even if API is bypassed, data stays protected. No SELECT/INSERT/UPDATE/DELETE allowed without matching policy.",
    color: "#f59e0b",
  },
  {
    rule: "Middleware Route Guard",
    detail: "middleware.ts reads JWT role claim → redirects to correct dashboard. /admin/* requires super_admin, /staff/* requires staff|super_admin, /parent/* requires parent|super_admin.",
    color: "#34d399",
  },
  {
    rule: "API Server-side Role Check",
    detail: "Every API route calls getServerSession() and verifies role before processing. Client-side role is never trusted. Returns 403 on mismatch.",
    color: "#60a5fa",
  },
  {
    rule: "Own-Data Boundary (Staff)",
    detail: "Staff can only query attendance/diary/marks for classes they are assigned to. class_assignments table links staff_id → class_id. RLS policy: auth.uid() = teacher_id.",
    color: "#f472b6",
  },
  {
    rule: "Own-Child Boundary (Parent)",
    detail: "Parents see only their enrolled children. parent_children table maps parent_id → student_id. RLS: EXISTS (SELECT 1 FROM parent_children WHERE parent_id = auth.uid() AND student_id = rows.student_id).",
    color: "#fb923c",
  },
  {
    rule: "Admin Account Creation Only",
    detail: "Supabase signUp disabled for public. Only super_admin can call the /api/auth/create-user endpoint which uses service_role key. Parents and staff cannot self-register.",
    color: "#e879f9",
  },
  {
    rule: "GDB Moderation",
    detail: "GDB posts are visible to all roles but only deleteable by super_admin. Staff and parents can create posts. Posts are scoped to institution_id.",
    color: "#2dd4bf",
  },
];

const DB_TABLES = [
  {
    section: "🏛 Core / Auth",
    color: "#a78bfa",
    tables: [
      { name: "profiles", cols: ["id uuid PK → auth.users", "institution_id[]", "role ENUM(super_admin|staff|parent)", "full_name", "phone", "avatar_url", "is_active", "created_at"] },
      { name: "institutions", cols: ["id uuid PK", "name (Baseerat School | Baseerat Academy)", "type ENUM(school|academy)", "address", "logo_url", "settings jsonb"] },
    ],
  },
  {
    section: "📚 Academic",
    color: "#34d399",
    tables: [
      { name: "classes", cols: ["id", "institution_id FK", "name (Grade 5)", "section (A|B)", "academic_year"] },
      { name: "subjects", cols: ["id", "institution_id FK", "class_id FK", "name", "fee_amount (Academy)", "teacher_id FK profiles"] },
      { name: "class_assignments", cols: ["id", "staff_id FK profiles", "class_id FK", "subject_id FK", "institution_id"] },
      { name: "syllabus", cols: ["id", "subject_id FK", "title", "file_url", "month", "uploaded_by FK", "created_at"] },
      { name: "timetables", cols: ["id", "class_id FK", "subject_id FK", "day_of_week", "start_time", "end_time"] },
    ],
  },
  {
    section: "👥 Students & Parents",
    color: "#60a5fa",
    tables: [
      { name: "students", cols: ["id uuid PK", "institution_id FK", "class_id FK", "roll_no", "full_name", "dob", "gender", "address", "photo_url", "student_id_card_no", "is_active"] },
      { name: "parent_children", cols: ["id", "parent_id FK profiles", "student_id FK students", "relation (father|mother|guardian)"] },
      { name: "enrollments", cols: ["id", "student_id FK", "class_id FK", "academic_year", "enrolled_at"] },
    ],
  },
  {
    section: "✅ Attendance",
    color: "#f59e0b",
    tables: [
      { name: "student_attendance", cols: ["id", "student_id FK", "class_id FK", "institution_id", "date", "status ENUM(present|absent|late|leave)", "marked_by FK profiles"] },
      { name: "staff_attendance", cols: ["id", "staff_id FK profiles", "institution_id", "date", "status ENUM(present|absent|late|leave)", "approved_by FK"] },
    ],
  },
  {
    section: "📓 Diary & Performance",
    color: "#f472b6",
    tables: [
      { name: "diary_entries", cols: ["id", "class_id FK", "subject_id FK", "staff_id FK", "date", "title", "content", "images text[]", "institution_id"] },
      { name: "exam_results", cols: ["id", "student_id FK", "subject_id FK", "exam_type (monthly|mid|final)", "marks_obtained", "total_marks", "grade", "term", "academic_year"] },
    ],
  },
  {
    section: "💰 Fees",
    color: "#fb923c",
    tables: [
      { name: "fee_structures", cols: ["id", "institution_id FK", "class_id FK", "subject_id FK (null=tuition)", "amount", "frequency ENUM(monthly|yearly|once)", "label", "academic_year"] },
      { name: "fee_records", cols: ["id", "student_id FK", "fee_structure_id FK", "amount_due", "amount_paid", "discount", "due_date", "paid_date", "status ENUM(paid|due|overdue|partial)", "receipt_no"] },
      { name: "scholarships", cols: ["id", "student_id FK", "discount_percent", "reason", "approved_by FK", "valid_from", "valid_to"] },
    ],
  },
  {
    section: "💼 Staff HR",
    color: "#2dd4bf",
    tables: [
      { name: "staff_salary", cols: ["id", "staff_id FK profiles", "institution_id", "base_salary", "allowances jsonb", "month", "year", "leaves_taken", "deduction_amount", "net_salary", "issued_date", "slip_url", "status ENUM(issued|pending)"] },
      { name: "staff_leaves", cols: ["id", "staff_id FK", "from_date", "to_date", "reason", "status ENUM(approved|pending|rejected)", "approved_by FK"] },
    ],
  },
  {
    section: "📢 Communication",
    color: "#e879f9",
    tables: [
      { name: "announcements", cols: ["id", "institution_id FK", "title", "body", "target_roles text[]", "created_by FK", "is_pinned", "created_at"] },
      { name: "notifications", cols: ["id", "user_id FK profiles", "type (fee_due|absence|announcement|salary)", "title", "body", "is_read", "created_at"] },
      { name: "gdb_posts", cols: ["id", "institution_id FK", "author_id FK profiles", "title", "content", "images text[]", "created_at", "is_deleted"] },
      { name: "gdb_comments", cols: ["id", "post_id FK gdb_posts", "author_id FK profiles", "content", "created_at"] },
    ],
  },
];

const PROJECT_STRUCTURE = [
  { name: "baseerat-sms/", type: "root", desc: "Monorepo root", children: [
    { name: "app/", type: "folder", desc: "Next.js 15 App Router", children: [
      { name: "(auth)/", type: "folder", desc: "Public auth pages — no layout", children: [
        { name: "login/page.tsx", type: "file", desc: "Unified login → role-based redirect" },
      ]},
      { name: "(admin)/", type: "folder", desc: "Protected — super_admin only", children: [
        { name: "layout.tsx", type: "file", desc: "Admin sidebar + header" },
        { name: "dashboard/page.tsx", type: "file", desc: "KPI overview — both institutions" },
        { name: "students/", type: "folder", desc: "CRUD + ID card gen", children: [
          { name: "page.tsx", type: "file", desc: "Students list with filter" },
          { name: "[id]/page.tsx", type: "file", desc: "Student profile + edit" },
          { name: "new/page.tsx", type: "file", desc: "Add student form" },
        ]},
        { name: "staff/", type: "folder", desc: "", children: [
          { name: "page.tsx", type: "file", desc: "Staff list" },
          { name: "[id]/page.tsx", type: "file", desc: "Staff profile + salary history" },
          { name: "salary/page.tsx", type: "file", desc: "Issue salaries, slips" },
        ]},
        { name: "classes/page.tsx", type: "file", desc: "Classes + sections + timetable" },
        { name: "syllabus/page.tsx", type: "file", desc: "Upload syllabus per class/subject" },
        { name: "fees/", type: "folder", desc: "", children: [
          { name: "structure/page.tsx", type: "file", desc: "Define class/subject fees" },
          { name: "records/page.tsx", type: "file", desc: "All student fee records" },
          { name: "calculator/page.tsx", type: "file", desc: "Academy subject-wise fee calc" },
        ]},
        { name: "attendance/page.tsx", type: "file", desc: "Overview — students + staff" },
        { name: "announcements/page.tsx", type: "file", desc: "Send announcements" },
        { name: "reports/page.tsx", type: "file", desc: "All reports + export" },
        { name: "accounts/page.tsx", type: "file", desc: "Create parent/staff accounts" },
        { name: "gdb/page.tsx", type: "file", desc: "Moderate GDB posts" },
      ]},
      { name: "(staff)/", type: "folder", desc: "Protected — staff + admin", children: [
        { name: "layout.tsx", type: "file", desc: "Staff sidebar + header" },
        { name: "dashboard/page.tsx", type: "file", desc: "Staff home — schedule + alerts" },
        { name: "attendance/", type: "folder", desc: "", children: [
          { name: "mark/page.tsx", type: "file", desc: "Mark student attendance" },
          { name: "my/page.tsx", type: "file", desc: "Own attendance record" },
        ]},
        { name: "diary/", type: "folder", desc: "", children: [
          { name: "page.tsx", type: "file", desc: "Diary list" },
          { name: "new/page.tsx", type: "file", desc: "Create diary entry with images" },
        ]},
        { name: "grades/page.tsx", type: "file", desc: "Enter exam results" },
        { name: "salary/page.tsx", type: "file", desc: "Own salary + slip download" },
        { name: "leaves/page.tsx", type: "file", desc: "Apply for leave" },
        { name: "timetable/page.tsx", type: "file", desc: "Own schedule" },
        { name: "gdb/page.tsx", type: "file", desc: "GDB — post + comment" },
        { name: "announcements/page.tsx", type: "file", desc: "View school announcements" },
      ]},
      { name: "(parent)/", type: "folder", desc: "Protected — parent + admin", children: [
        { name: "layout.tsx", type: "file", desc: "Parent sidebar + header" },
        { name: "dashboard/page.tsx", type: "file", desc: "Parent home — child summary" },
        { name: "child/", type: "folder", desc: "", children: [
          { name: "[studentId]/diary/page.tsx", type: "file", desc: "Daily diary + images" },
          { name: "[studentId]/attendance/page.tsx", type: "file", desc: "Attendance calendar view" },
          { name: "[studentId]/grades/page.tsx", type: "file", desc: "Progress & results" },
          { name: "[studentId]/fees/page.tsx", type: "file", desc: "Fee history + due alerts" },
        ]},
        { name: "fee-calculator/page.tsx", type: "file", desc: "Academy subject fee calc" },
        { name: "gdb/page.tsx", type: "file", desc: "GDB — read + post" },
        { name: "announcements/page.tsx", type: "file", desc: "School announcements" },
      ]},
      { name: "api/", type: "folder", desc: "All backend — serverless on Vercel", children: [
        { name: "auth/", type: "folder", desc: "", children: [
          { name: "create-user/route.ts", type: "file", desc: "Admin-only account creation" },
          { name: "session/route.ts", type: "file", desc: "Session check + role return" },
        ]},
        { name: "students/route.ts", type: "file", desc: "GET list, POST new" },
        { name: "students/[id]/route.ts", type: "file", desc: "GET, PUT, DELETE" },
        { name: "staff/route.ts", type: "file", desc: "" },
        { name: "staff/[id]/route.ts", type: "file", desc: "" },
        { name: "attendance/student/route.ts", type: "file", desc: "Mark + fetch student attendance" },
        { name: "attendance/staff/route.ts", type: "file", desc: "Staff attendance" },
        { name: "diary/route.ts", type: "file", desc: "GET + POST diary entries" },
        { name: "diary/[id]/route.ts", type: "file", desc: "Edit / delete diary" },
        { name: "fees/structure/route.ts", type: "file", desc: "Define fee structures" },
        { name: "fees/records/route.ts", type: "file", desc: "Fee records + payment update" },
        { name: "salary/route.ts", type: "file", desc: "Get salary list" },
        { name: "salary/issue/route.ts", type: "file", desc: "Issue salary (admin only)" },
        { name: "salary/slip/[id]/route.ts", type: "file", desc: "Generate/download slip" },
        { name: "announcements/route.ts", type: "file", desc: "Send + list announcements" },
        { name: "notifications/route.ts", type: "file", desc: "Get + mark-read notifications" },
        { name: "gdb/route.ts", type: "file", desc: "GDB posts list + create" },
        { name: "gdb/[id]/route.ts", type: "file", desc: "GDB post detail + delete" },
        { name: "reports/[type]/route.ts", type: "file", desc: "Dynamic report generation" },
        { name: "upload/route.ts", type: "file", desc: "File upload → Supabase Storage" },
      ]},
      { name: "layout.tsx", type: "file", desc: "Root layout — fonts + providers" },
      { name: "page.tsx", type: "file", desc: "/ → redirect to login" },
    ]},
    { name: "components/", type: "folder", desc: "Reusable UI", children: [
      { name: "ui/", type: "folder", desc: "Base: Button, Input, Modal, Table, Badge, Select, Tabs" },
      { name: "layout/", type: "folder", desc: "Sidebar, Header, NotificationBell, RoleSwitcher" },
      { name: "admin/", type: "folder", desc: "StudentForm, StaffForm, FeeStructureForm, SalarySlip, IDCard" },
      { name: "staff/", type: "folder", desc: "AttendanceGrid, DiaryEditor (rich text + image), GradeEntry" },
      { name: "parent/", type: "folder", desc: "DiaryViewer, AttendanceCalendar, FeeCard, FeeCalculator" },
      { name: "shared/", type: "folder", desc: "GDBBoard, AnnouncementFeed, StatsCard, Charts" },
    ]},
    { name: "lib/", type: "folder", desc: "Core utilities", children: [
      { name: "supabase/", type: "folder", desc: "", children: [
        { name: "client.ts", type: "file", desc: "Browser Supabase client" },
        { name: "server.ts", type: "file", desc: "Server-side client (cookies)" },
        { name: "admin.ts", type: "file", desc: "service_role client — admin ops only" },
      ]},
      { name: "auth.ts", type: "file", desc: "getSession, requireRole, hasPermission helpers" },
      { name: "rbac.ts", type: "file", desc: "PERMISSIONS map — single source of truth" },
      { name: "validations/", type: "folder", desc: "Zod schemas per domain (student, fee, salary…)" },
      { name: "utils.ts", type: "file", desc: "Date, currency (PKR), slugify helpers" },
      { name: "notifications.ts", type: "file", desc: "Create notification records + trigger" },
      { name: "reports.ts", type: "file", desc: "Report generation logic" },
    ]},
    { name: "types/", type: "folder", desc: "TypeScript types", children: [
      { name: "index.ts", type: "file", desc: "All domain types: Student, Staff, Fee, Salary…" },
      { name: "supabase.ts", type: "file", desc: "Auto-generated from Supabase CLI" },
      { name: "rbac.ts", type: "file", desc: "Role, Permission, PolicyRule types" },
    ]},
    { name: "hooks/", type: "folder", desc: "Data hooks", children: [
      { name: "useAuth.ts", type: "file", desc: "Current user, role, institution context" },
      { name: "useStudents.ts", type: "file", desc: "" },
      { name: "useAttendance.ts", type: "file", desc: "" },
      { name: "useFees.ts", type: "file", desc: "" },
      { name: "useNotifications.ts", type: "file", desc: "Realtime via Supabase subscribe" },
    ]},
    { name: "middleware.ts", type: "file", desc: "Route protection + role-based redirect" },
    { name: ".env.local", type: "file", desc: "SUPABASE_URL, SUPABASE_ANON_KEY, SERVICE_ROLE_KEY" },
    { name: "next.config.ts", type: "file", desc: "" },
    { name: "tailwind.config.ts", type: "file", desc: "" },
  ]},
];

const API_ROUTES = [
  { method: "POST", path: "/api/auth/create-user", role: "super_admin", desc: "Create parent/staff account" },
  { method: "GET", path: "/api/students", role: "super_admin, staff*", desc: "List students (*own classes only for staff)" },
  { method: "POST", path: "/api/students", role: "super_admin", desc: "Add new student" },
  { method: "PUT", path: "/api/students/[id]", role: "super_admin", desc: "Edit student" },
  { method: "DELETE", path: "/api/students/[id]", role: "super_admin", desc: "Soft delete student" },
  { method: "GET", path: "/api/staff", role: "super_admin", desc: "List all staff" },
  { method: "POST", path: "/api/staff", role: "super_admin", desc: "Add staff" },
  { method: "GET", path: "/api/attendance/student", role: "super_admin, staff*, parent†", desc: "Get attendance (*own class, †own child)" },
  { method: "POST", path: "/api/attendance/student", role: "staff, super_admin", desc: "Mark attendance" },
  { method: "GET", path: "/api/attendance/staff", role: "super_admin, staff‡", desc: "Staff attendance (‡own only)" },
  { method: "POST", path: "/api/diary", role: "staff, super_admin", desc: "Create diary entry" },
  { method: "GET", path: "/api/diary", role: "all roles", desc: "Get diary (scoped by role)" },
  { method: "GET", path: "/api/fees/structure", role: "super_admin, parent", desc: "Get fee structure" },
  { method: "POST", path: "/api/fees/structure", role: "super_admin", desc: "Create fee rule" },
  { method: "GET", path: "/api/fees/records", role: "super_admin, parent†", desc: "Fee records (†own child only)" },
  { method: "PUT", path: "/api/fees/records/[id]", role: "super_admin", desc: "Mark fee paid" },
  { method: "POST", path: "/api/salary/issue", role: "super_admin", desc: "Issue monthly salary" },
  { method: "GET", path: "/api/salary", role: "super_admin, staff‡", desc: "Salary list (‡own only)" },
  { method: "GET", path: "/api/salary/slip/[id]", role: "super_admin, staff‡", desc: "Download salary slip PDF" },
  { method: "POST", path: "/api/announcements", role: "super_admin", desc: "Send announcement" },
  { method: "GET", path: "/api/announcements", role: "all roles", desc: "Get announcements (by target role)" },
  { method: "GET", path: "/api/notifications", role: "all roles", desc: "Get own notifications" },
  { method: "GET", path: "/api/gdb", role: "all roles", desc: "List GDB posts" },
  { method: "POST", path: "/api/gdb", role: "staff, parent, super_admin", desc: "Create GDB post" },
  { method: "DELETE", path: "/api/gdb/[id]", role: "super_admin", desc: "Delete any GDB post" },
  { method: "GET", path: "/api/reports/[type]", role: "super_admin", desc: "Generate reports" },
  { method: "POST", path: "/api/upload", role: "staff, super_admin", desc: "Upload files to Supabase Storage" },
];

const TECH_STACK = [
  { cat: "Frontend", items: [
    { name: "Next.js 15 (App Router)", reason: "SSR + API routes in one — no separate backend needed" },
    { name: "TypeScript", reason: "Type-safe across frontend + API layer" },
    { name: "Tailwind CSS", reason: "Fast styling, RTL support for Urdu future" },
    { name: "shadcn/ui", reason: "Accessible components, no bloat" },
    { name: "Recharts / Chart.js", reason: "Dashboard graphs — attendance, fees, performance" },
    { name: "React Hook Form + Zod", reason: "Form validation with schema reuse on API side" },
    { name: "TipTap", reason: "Rich text editor for diary entries" },
  ]},
  { cat: "Backend (Serverless)", items: [
    { name: "Next.js API Routes", reason: "Serverless functions on Vercel — zero server management" },
    { name: "Supabase JS SDK (server)", reason: "DB queries + auth session in API routes" },
    { name: "Supabase service_role", reason: "Admin-only operations bypassing RLS safely" },
  ]},
  { cat: "Database & Auth", items: [
    { name: "Supabase PostgreSQL", reason: "Free 500MB, Row Level Security built-in" },
    { name: "Supabase Auth", reason: "JWT-based auth, role custom claim in user metadata" },
    { name: "Supabase Storage", reason: "Diary images, syllabus files, avatars — free 1GB" },
    { name: "Supabase Realtime", reason: "Notifications pushed live to parent/staff dashboard" },
  ]},
  { cat: "Hosting (All Free)", items: [
    { name: "Vercel (frontend + API)", reason: "Auto-deploy on push, 100GB bandwidth/month free" },
    { name: "Supabase (DB + Storage)", reason: "500MB DB, 1GB storage, 50k MAU free" },
    { name: "Vercel Blob / Supabase Storage", reason: "Diary images, ID card assets" },
  ]},
  { cat: "Dev Tools", items: [
    { name: "Supabase CLI", reason: "Generate TypeScript types from DB schema" },
    { name: "Zod", reason: "Shared validation — frontend forms + API routes" },
    { name: "date-fns", reason: "Date formatting, PKR timezone handling" },
    { name: "jsPDF / react-pdf", reason: "Salary slip + ID card PDF generation" },
  ]},
];

// ============================================================
// COMPONENTS
// ============================================================

function TreeNode({ node, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);
  const [hov, setHov] = useState(false);
  const hasC = node.children && node.children.length > 0;
  const isFolder = node.type === "folder" || node.type === "root";
  const color = node.type === "root" ? "#a78bfa" : isFolder ? "#fbbf24" : "#64748b";

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 16 }}>
      <div
        onClick={() => hasC && setOpen(o => !o)}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: "flex", alignItems: "flex-start", gap: 6,
          padding: "2px 6px", borderRadius: 5, cursor: hasC ? "pointer" : "default",
          background: hov ? "rgba(255,255,255,0.04)" : "transparent",
        }}
      >
        <span style={{
          color, fontSize: 11, minWidth: 12, marginTop: 3,
          display: "inline-block",
          transform: hasC && open ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 0.15s",
        }}>
          {hasC ? "▸" : "·"}
        </span>
        <span>
          <span style={{
            fontFamily: "monospace", fontSize: 12,
            fontWeight: isFolder ? 600 : 400,
            color: node.type === "root" ? "#c4b5fd" : isFolder ? "#fde68a" : "#94a3b8",
          }}>{node.name}</span>
          {node.desc && <span style={{ fontSize: 10, color: "#475569", marginLeft: 8 }}>— {node.desc}</span>}
        </span>
      </div>
      {hasC && open && (
        <div style={{ borderLeft: "1px solid rgba(99,102,241,0.12)", marginLeft: 12, paddingLeft: 2 }}>
          {node.children.map((c, i) => <TreeNode key={i} node={c} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

const METHOD_COLORS = { GET: "#34d399", POST: "#60a5fa", PUT: "#f59e0b", DELETE: "#f87171" };

export default function App() {
  const [tab, setTab] = useState("Overview");

  return (
    <div style={{
      minHeight: "100vh",
      background: "#070c18",
      color: "#e2e8f0",
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid rgba(99,102,241,0.15)",
        padding: "24px 28px 0",
        background: "linear-gradient(180deg, #0d1428 0%, #070c18 100%)",
      }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, boxShadow: "0 0 24px rgba(79,70,229,0.4)",
            }}>🏫</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "#f8fafc" }}>
                Baseerat Digital School & Academy
              </h1>
              <p style={{ margin: 0, fontSize: 12, color: "#4f6796" }}>
                Full System Architecture · Next.js 15 + Supabase + Vercel
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, marginTop: 20, overflowX: "auto" }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "9px 16px", fontSize: 12, fontWeight: 600,
                color: tab === t ? "#818cf8" : "#475569",
                borderBottom: tab === t ? "2px solid #818cf8" : "2px solid transparent",
                whiteSpace: "nowrap", transition: "color 0.15s",
              }}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 20px" }}>

        {/* OVERVIEW */}
        {tab === "Overview" && (
          <div style={{ display: "grid", gap: 20 }}>
            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              {[
                { icon: "🏫", label: "School Branch", desc: "Full school management — attendance, diary, exams, fees", color: "#6366f1" },
                { icon: "📖", label: "Academy Branch", desc: "Subject-wise fee calculator, per-subject enrollment", color: "#0ea5e9" },
                { icon: "👑", label: "3 Role System", desc: "Super Admin · Staff · Parent — RLS enforced at DB level", color: "#f59e0b" },
                { icon: "🆓", label: "100% Free Hosting", desc: "Vercel + Supabase free tiers — no monthly cost", color: "#34d399" },
              ].map(c => (
                <div key={c.label} style={{
                  background: "#0d1428", border: `1px solid ${c.color}25`,
                  borderRadius: 12, padding: 18,
                }}>
                  <div style={{ fontSize: 26, marginBottom: 8 }}>{c.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.color, marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.6 }}>{c.desc}</div>
                </div>
              ))}
            </div>

            {/* Flow diagram */}
            <div style={{
              background: "#0d1428", border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: 12, padding: 24,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", marginBottom: 20 }}>
                🔄 Request Flow
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
                {[
                  { label: "Browser / Mobile", color: "#64748b" },
                  { arrow: true },
                  { label: "middleware.ts\n(role check)", color: "#f59e0b" },
                  { arrow: true },
                  { label: "Page Component\n(SSR / CSR)", color: "#6366f1" },
                  { arrow: true },
                  { label: "API Route\n(server-side verify)", color: "#0ea5e9" },
                  { arrow: true },
                  { label: "Supabase\nPostgres + RLS", color: "#34d399" },
                ].map((s, i) => s.arrow
                  ? <span key={i} style={{ color: "#334155", fontSize: 18 }}>→</span>
                  : <div key={i} style={{
                      background: s.color + "18", border: `1px solid ${s.color}33`,
                      borderRadius: 8, padding: "8px 12px",
                      color: s.color, fontWeight: 600, textAlign: "center",
                      whiteSpace: "pre-line", lineHeight: 1.4, fontSize: 11,
                    }}>{s.label}</div>
                )}
              </div>
            </div>

            {/* Institution scoping */}
            <div style={{
              background: "#0d1428", border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: 12, padding: 24,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", marginBottom: 16 }}>
                🏛 Dual Institution Design
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[
                  { name: "Baseerat School", id: "inst_school", color: "#6366f1", features: ["Student attendance", "Staff HR", "Class diary", "Exam results", "Fee per class", "GDB"] },
                  { name: "Baseerat Academy", id: "inst_academy", color: "#0ea5e9", features: ["Subject-wise enrollment", "Subject fee calculator", "Per-subject attendance", "Subject syllabus", "Batch management"] },
                ].map(inst => (
                  <div key={inst.id} style={{
                    background: inst.color + "0d", border: `1px solid ${inst.color}25`,
                    borderRadius: 10, padding: 16,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: inst.color, marginBottom: 10 }}>{inst.name}</div>
                    <div style={{ fontSize: 11, color: "#334155", fontFamily: "monospace", marginBottom: 10 }}>id: {inst.id}</div>
                    {inst.features.map(f => (
                      <div key={f} style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>✓ {f}</div>
                    ))}
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: 14, padding: 12, background: "rgba(255,255,255,0.02)",
                borderRadius: 8, fontSize: 11, color: "#475569", lineHeight: 1.7,
              }}>
                Every DB table has <code style={{ color: "#f59e0b" }}>institution_id</code> FK. Admin dashboard has an institution switcher in the header. A staff member can be assigned to both institutions simultaneously. RLS policies filter by institution_id automatically.
              </div>
            </div>
          </div>
        )}

        {/* PROJECT STRUCTURE */}
        {tab === "Project Structure" && (
          <div style={{
            background: "#0d1428", border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: 12, padding: "20px 16px",
          }}>
            <div style={{ fontSize: 11, color: "#334155", marginBottom: 14, fontFamily: "monospace" }}>
              Click folders to expand/collapse · All routes are App Router (Next.js 15)
            </div>
            {PROJECT_STRUCTURE.map((n, i) => <TreeNode key={i} node={n} depth={0} />)}
          </div>
        )}

        {/* RBAC */}
        {tab === "RBAC Rules" && (
          <div style={{ display: "grid", gap: 16 }}>
            {/* Role cards */}
            {ROLES.map(r => (
              <div key={r.key} style={{
                background: "#0d1428", border: `1px solid ${r.border}`,
                borderRadius: 12, padding: 20,
              }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
                  <span style={{ fontSize: 28 }}>{r.emoji}</span>
                  <div>
                    <div style={{
                      display: "inline-block",
                      background: r.bg, color: r.color, border: `1px solid ${r.border}`,
                      padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 4,
                    }}>{r.label}</div>
                    <div style={{ fontSize: 11, color: "#475569" }}>{r.desc}</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {r.permissions.map(p => (
                    <span key={p} style={{
                      background: p.startsWith("❌") ? "rgba(248,113,113,0.08)" : "rgba(255,255,255,0.03)",
                      border: p.startsWith("❌") ? "1px solid rgba(248,113,113,0.2)" : "1px solid rgba(255,255,255,0.07)",
                      color: p.startsWith("❌") ? "#ef4444" : "#64748b",
                      padding: "3px 10px", borderRadius: 6, fontSize: 11,
                    }}>{p}</span>
                  ))}
                </div>
              </div>
            ))}

            {/* Policy rules */}
            <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", marginTop: 8, marginBottom: 4 }}>
              🔐 Enforcement Policies
            </div>
            {RBAC_RULES.map(r => (
              <div key={r.rule} style={{
                background: "#0d1428", border: `1px solid ${r.color}22`,
                borderRadius: 10, padding: 16, display: "flex", gap: 14,
              }}>
                <div style={{
                  minWidth: 8, borderRadius: 4, background: r.color, alignSelf: "stretch",
                }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: r.color, marginBottom: 5 }}>{r.rule}</div>
                  <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.7 }}>{r.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DB SCHEMA */}
        {tab === "DB Schema" && (
          <div style={{ display: "grid", gap: 24 }}>
            {DB_TABLES.map(section => (
              <div key={section.section}>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: section.color,
                  marginBottom: 12, paddingBottom: 6,
                  borderBottom: `1px solid ${section.color}22`,
                }}>{section.section}</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {section.tables.map(t => (
                    <div key={t.name} style={{
                      background: "#0d1428", border: `1px solid ${section.color}20`,
                      borderRadius: 10, padding: "14px 16px",
                    }}>
                      <div style={{
                        fontFamily: "monospace", fontSize: 13, fontWeight: 700,
                        color: section.color, marginBottom: 10,
                      }}>🗄 {t.name}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {t.cols.map(c => (
                          <code key={c} style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            padding: "3px 9px", borderRadius: 5,
                            fontSize: 11, color: "#94a3b8",
                          }}>{c}</code>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* API ROUTES */}
        {tab === "API Routes" && (
          <div style={{
            background: "#0d1428", border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: 12, overflow: "hidden",
          }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "60px 1fr 1fr 1fr",
              gap: 0, fontSize: 10, fontWeight: 700, color: "#334155",
              padding: "10px 16px", borderBottom: "1px solid rgba(99,102,241,0.12)",
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>
              <span>Method</span><span>Path</span><span>Allowed Roles</span><span>Description</span>
            </div>
            {API_ROUTES.map((r, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "60px 1fr 1fr 1fr",
                gap: 0, padding: "9px 16px", fontSize: 11,
                borderBottom: i < API_ROUTES.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                alignItems: "start",
              }}>
                <span style={{
                  color: METHOD_COLORS[r.method] || "#94a3b8",
                  fontFamily: "monospace", fontWeight: 700, fontSize: 10,
                }}>{r.method}</span>
                <span style={{ fontFamily: "monospace", color: "#94a3b8", paddingRight: 12 }}>{r.path}</span>
                <span style={{ color: "#f59e0b", fontSize: 10, paddingRight: 12 }}>{r.role}</span>
                <span style={{ color: "#475569" }}>{r.desc}</span>
              </div>
            ))}
          </div>
        )}

        {/* TECH STACK */}
        {tab === "Tech Stack" && (
          <div style={{ display: "grid", gap: 20 }}>
            {TECH_STACK.map(cat => (
              <div key={cat.cat} style={{
                background: "#0d1428", border: "1px solid rgba(99,102,241,0.15)",
                borderRadius: 12, overflow: "hidden",
              }}>
                <div style={{
                  background: "rgba(99,102,241,0.08)", padding: "12px 18px",
                  fontSize: 13, fontWeight: 700, color: "#818cf8",
                  borderBottom: "1px solid rgba(99,102,241,0.1)",
                }}>{cat.cat}</div>
                <div style={{ padding: "12px 18px", display: "grid", gap: 10 }}>
                  {cat.items.map(item => (
                    <div key={item.name} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{
                        background: "rgba(129,140,248,0.12)", color: "#818cf8",
                        border: "1px solid rgba(129,140,248,0.2)",
                        padding: "2px 10px", borderRadius: 6,
                        fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", minWidth: "fit-content",
                      }}>{item.name}</span>
                      <span style={{ fontSize: 11, color: "#475569", paddingTop: 3 }}>{item.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Bootstrap command */}
            <div style={{
              background: "#0d1428", border: "1px solid rgba(34,211,153,0.2)",
              borderRadius: 12, padding: 20,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#34d399", marginBottom: 12 }}>
                🚀 Bootstrap Commands
              </div>
              {[
                "npx create-next-app@latest baseerat-sms --typescript --tailwind --app",
                "cd baseerat-sms",
                "npm install @supabase/supabase-js @supabase/ssr",
                "npm install zod react-hook-form @hookform/resolvers",
                "npm install date-fns recharts",
                "npm install tiptap @tiptap/react @tiptap/starter-kit",
                "npm install jspdf",
                "npx shadcn@latest init",
                "npx supabase init  # then link to your Supabase project",
              ].map((cmd, i) => (
                <div key={i} style={{
                  fontFamily: "monospace", fontSize: 11, color: "#94a3b8",
                  background: "rgba(255,255,255,0.02)", padding: "5px 12px",
                  borderRadius: 6, marginBottom: 4,
                }}>
                  <span style={{ color: "#334155" }}>$ </span>{cmd}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
