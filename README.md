# 🎓 EduManage Pro - School Management System

A modern, comprehensive school management system built with **React + TypeScript + Vite + Tailwind CSS + Supabase**. Designed for administrators, teachers, and students with role-based access control.

[![React](https://img.shields.io/badge/React-18.3-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-2.10-3ECF8E?logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Live-black?logo=vercel)](https://school-management-app-57az.vercel.app/)

## 🌐 Live Demo

**🔗 [https://school-management-app-57az.vercel.app/](https://school-management-app-57az.vercel.app/)**

Experience the live application deployed on Vercel with Supabase backend.

---

## 📋 Table of Contents

- [🎯 Project Overview](#-project-overview)
- [🏗️ Architecture & Tech Stack](#️-architecture--tech-stack)
- [👥 User Roles & Features](#-user-roles--features)
- [📊 Database Schema](#-database-schema)
- [🔐 Security & RLS](#-security--rls)
- [🚀 Getting Started](#-getting-started)
- [📁 Project Structure](#-project-structure)
- [⚙️ Configuration](#️-configuration)
- [🧪 Testing](#-testing)
- [📈 Future Roadmap](#-future-roadmap)

---

## 🎯 Project Overview

**EduManage Pro** is a single-school management system that streamlines educational institution operations through a clean, modern SaaS-style dashboard. The system supports three distinct user roles with tailored functionality and secure data access.

### Key Highlights

- 🔒 **Role-Based Access Control** - Secure, server-enforced permissions
- 📱 **Fully Responsive** - Works on desktop, tablet, and mobile
- 🌙 **Dark Mode Default** - Modern dark theme with light mode toggle
- ⚡ **Real-time Data** - Live updates with React Query
- 🎨 **Modern UI** - shadcn/ui components with Tailwind CSS
- 🗄️ **Database Security** - Row Level Security (RLS) on all tables
- 🚀 **Serverless API** - 26 Supabase Edge Functions deployed
- 📊 **Data Boundaries** - Own-data (teachers) & own-child (parents) restrictions

---

## 🏗️ Architecture & Tech Stack

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   React 18  │  │   React     │  │    React Hook Form      │  │
│  │             │  │   Router    │  │    + Zod Validation     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  TanStack   │  │   shadcn/ui │  │    Lucide React Icons   │  │
│  │   Query     │  │  Components │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND LAYER (Supabase)                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Postgres   │  │   Supabase  │  │    Supabase Storage     │  │
│  │  Database   │  │    Auth     │  │    (File Uploads)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Row Level Security (RLS) Policies             │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack Details

| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | React 18.3 | UI library with hooks |
| **Language** | TypeScript 5.8 | Type-safe development |
| **Build Tool** | Vite 5.4 | Fast development & building |
| **Styling** | Tailwind CSS 3.4 | Utility-first CSS |
| **Components** | shadcn/ui | Accessible UI components |
| **State** | TanStack Query | Server state management |
| **Forms** | React Hook Form + Zod | Form handling & validation |
| **Backend** | Supabase | Database, Auth, Storage |
| **Routing** | React Router 6 | Client-side navigation |
| **Icons** | Lucide React | Modern icon library |
| **Charts** | Recharts | Data visualization |
| **Testing** | Vitest + Testing Library | Unit testing |

---

## 👥 User Roles & Features

### Role Hierarchy

```
                    ┌─────────────┐
                    │    Admin    │
                    │  (Full CRUD) │
                    └──────┬──────┘
                           │ Manages
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │   Teachers  │ │   Students  │ │   Classes   │
    │ (Mark Attd) │ │ (View Data) │ │  (Assign)   │
    └─────────────┘ └─────────────┘ └─────────────┘
```

### 1. 👨‍💼 Admin Features

| Feature | Description | Access |
|---------|-------------|--------|
| **Dashboard** | Statistics cards, attendance charts, recent notices | Full view |
| **Students** | CRUD operations, class assignment, profile view | Full CRUD |
| **Teachers** | CRUD operations, subject/class assignment | Full CRUD |
| **Classes** | Create classes, assign class teachers, view rosters | Full CRUD |
| **Attendance** | View all classes attendance records | View all |
| **Notices** | Create, edit, pin, delete notices for any audience | Full CRUD |
| **Settings** | School configuration (future: logo, academic year) | Full access |

### 2. 👩‍🏫 Teacher Features

| Feature | Description | Access |
|---------|-------------|--------|
| **Dashboard** | My classes, today's attendance status, notices | Own data |
| **My Classes** | List of assigned classes with student rosters | Own classes |
| **Attendance** | Mark present/absent/late for own class students | Own classes |
| **Notices** | Post to own class or all students | Create only |

### 3. 🎒 Student Features

| Feature | Description | Access |
|---------|-------------|--------|
| **Dashboard** | Attendance %, notices, class info | Own data |
| **My Attendance** | Monthly calendar view with color-coded days | Own records |
| **Notices** | View notices targeted to students | View only |
| **Profile** | View and edit basic profile information | Own profile |

---

## 📊 Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     auth.users  │────▶│    profiles     │◄────│   user_roles    │
│  (Supabase Auth)│ 1:1 │                 │ 1:N │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │   students  │     │   teachers  │     │   classes   │
   │             │     │             │     │             │
   │ profile_id  │     │ profile_id  │     │ class_teacher│──▶ teachers
   │ class_id    │──▶  │ subjects    │     │             │
   │ roll_number │     │ employee_id │     │ name        │
   │ parent_info │     │ joining_date│     │ section     │
   └─────────────┘     └─────────────┘     └─────────────┘
          │                                       ▲
          │                                       │
          └────────────────┬──────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  attendance │
                    │             │
                    │ student_id  │
                    │ class_id    │
                    │ date        │
                    │ status      │
                    │ marked_by   │──▶ teachers
                    └─────────────┘
                           ▲
                           │
                    ┌─────────────┐
                    │   notices   │
                    │             │
                    │ title       │
                    │ body        │
                    │ audience    │
                    │ author_id   │──▶ auth.users
                    │ pinned      │
                    └─────────────┘
```

### Table Definitions

#### 1. `profiles`
Stores user profile information linked to Supabase Auth.

```typescript
{
  id: UUID (PK, references auth.users)
  name: string
  phone: string
  avatar_url: string (nullable)
  dob: date (nullable)
  gender: enum ('male', 'female', 'other')
  created_at: timestamp
  updated_at: timestamp
}
```

#### 2. `user_roles`
Manages user roles with priority-based access (admin > teacher > student).

```typescript
{
  id: UUID (PK)
  user_id: UUID (FK to auth.users)
  role: enum ('admin', 'teacher', 'student')
  created_at: timestamp
}
```

#### 3. `students`
Student-specific information with class enrollment.

```typescript
{
  id: UUID (PK)
  profile_id: UUID (FK to profiles)
  roll_number: string
  class_id: UUID (FK to classes)
  section: string
  parent_name: string
  parent_phone: string
  admission_date: date
  created_at: timestamp
}
```

#### 4. `teachers`
Teacher-specific information with subject assignments.

```typescript
{
  id: UUID (PK)
  profile_id: UUID (FK to profiles)
  employee_id: string
  subjects: string[] (array of subject names)
  joining_date: date
  created_at: timestamp
}
```

#### 5. `classes`
Class/grade information with teacher assignment.

```typescript
{
  id: UUID (PK)
  name: string (e.g., "Class 10")
  section: string (e.g., "A", "B")
  grade_level: number
  class_teacher_id: UUID (FK to teachers, nullable)
  created_at: timestamp
}
```

#### 6. `attendance`
Daily attendance records with status tracking.

```typescript
{
  id: UUID (PK)
  student_id: UUID (FK to students)
  class_id: UUID (FK to classes)
  date: date
  status: enum ('present', 'absent', 'late')
  marked_by: UUID (FK to auth.users)
  created_at: timestamp
}
```

#### 7. `notices`
School announcements with audience targeting.

```typescript
{
  id: UUID (PK)
  title: string
  body: text
  audience: enum ('all', 'teachers', 'students', 'class')
  target_class_id: UUID (FK to classes, nullable)
  author_id: UUID (FK to auth.users)
  pinned: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

---

## 🔐 Security & RLS

### Row Level Security (RLS) Policies

All tables enforce security at the database level:

```sql
-- Students can only see their own attendance
CREATE POLICY "Students view own attendance" ON attendance
  FOR SELECT USING (
    auth.uid() IN (
      SELECT profile_id FROM students WHERE user_id = auth.uid()
    )
  );

-- Teachers can see attendance for their classes
CREATE POLICY "Teachers view class attendance" ON attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes 
      WHERE class_teacher_id = auth.uid()
      AND classes.id = attendance.class_id
    )
  );

-- Admins can see everything
CREATE POLICY "Admins full access" ON attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │────▶│   /auth     │────▶│  Supabase   │
│             │     │   (Login)   │     │    Auth     │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                 │
                         ┌───────────────────────┘
                         │
                         ▼
                  ┌─────────────┐
                  │  user_roles │
                  │  (role check)│
                  └──────┬──────┘
                         │
           ┌─────────────┼─────────────┐
           │             │             │
           ▼             ▼             ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │  Admin   │  │ Teacher  │  │ Student  │
    │Dashboard │  │Dashboard │  │Dashboard │
    └──────────┘  └──────────┘  └──────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or bun
- Supabase account (free tier works)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd My School-main
```

2. **Install dependencies**
```bash
npm install
# or
bun install
```

3. **Environment Setup**
Create `.env` file in root:
```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_PROJECT_ID="your-project-id"
```

4. **Database Setup**
Run migrations in Supabase SQL editor:
```bash
# Files located in supabase/migrations/
# Execute in order
```

5. **Start Development Server**
```bash
npm run dev
```

The app will be available at `http://localhost:8080`

### Build for Production

```bash
npm run build
```

Output will be in `dist/` directory.

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Arslan-web-Dev/School-Management-App)

Or deploy manually:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Live Site:** [https://school-management-app-57az.vercel.app/](https://school-management-app-57az.vercel.app/)

---

## 📁 Project Structure

```
My School-main/
├── 📁 public/              # Static assets
│
├── 📁 src/
│   ├── 📁 components/
│   │   ├── 📁 auth/        # Authentication components
│   │   │   └── ProtectedRoute.tsx
│   │   ├── 📁 layout/      # Layout components
│   │   │   ├── AppSidebar.tsx
│   │   │   ├── DashboardLayout.tsx
│   │   │   └── TopBar.tsx
│   │   ├── 📁 shared/      # Shared UI components
│   │   │   ├── EmptyState.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   └── StatCard.tsx
│   │   └── 📁 ui/          # shadcn/ui components (49 files)
│   │
│   ├── 📁 contexts/        # React contexts
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   │
│   ├── 📁 hooks/           # Custom hooks
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   │
│   ├── 📁 integrations/    # Third-party integrations
│   │   └── 📁 supabase/
│   │       ├── client.ts
│   │       └── types.ts
│   │
│   ├── 📁 lib/             # Utility functions
│   │   ├── utils.ts
│   │   └── validation.ts
│   │
│   ├── 📁 pages/           # Page components
│   │   ├── Auth.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Students.tsx
│   │   ├── Teachers.tsx
│   │   ├── Classes.tsx
│   │   ├── Attendance.tsx
│   │   ├── MyAttendance.tsx
│   │   ├── Notices.tsx
│   │   ├── Profile.tsx
│   │   ├── Settings.tsx
│   │   └── NotFound.tsx
│   │
│   ├── 📁 test/            # Test files
│   │
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # Entry point
│   ├── index.css           # Global styles
│   └── App.css             # App-specific styles
│
├── 📁 supabase/
│   └── 📁 migrations/      # Database migrations
│
├── .env                    # Environment variables
├── .eslintrc.js            # ESLint config
├── components.json         # shadcn/ui config
├── index.html              # HTML template
├── package.json            # Dependencies
├── plan.md                 # Project plan
├── README.md               # This file
├── tailwind.config.ts      # Tailwind CSS config
├── tsconfig.json           # TypeScript config
├── tsconfig.app.json       # App TS config
├── tsconfig.node.json      # Node TS config
├── vite.config.ts          # Vite config
└── vitest.config.ts        # Vitest config
```

---

## ⚙️ Configuration

### Tailwind Configuration

```typescript
// tailwind.config.ts
const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Custom color palette
        primary: { ... },
        sidebar: { ... },
        success: { ... },
        warning: { ... }
      }
    }
  },
  plugins: [tailwindcssAnimate]
};
```

### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false }
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
```

---

## 🧪 Testing

Run tests with Vitest:

```bash
# Run tests once
npm run test

# Run tests in watch mode
npm run test:watch
```

Test files are located in `src/test/` directory.

---

## 📈 Future Roadmap

### v2 Planned Features

- [ ] **Parent Portal** - Access for parents to view child's progress
- [ ] **Exam Management** - Marks entry and report card generation
- [ ] **Fee Management** - Fee tracking and receipt generation
- [ ] **Assignment System** - File uploads and submissions
- [ ] **Timetable** - Class schedule management
- [ ] **Real-time Notifications** - WebSocket-based alerts
- [ ] **Multi-school Support** - SaaS with subscription billing
- [ ] **Audit Logs** - Activity tracking
- [ ] **Bulk Import/Export** - CSV/Excel data operations

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is private and proprietary.

---

## 👨‍💻 Author

**Muhammad Arslan**

Built with ❤️ for modern education management.

---

## 🆘 Support

For issues or questions, please contact the development team.

---

*Last Updated: April 2026*
