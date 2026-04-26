import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppRole } from "@/contexts/AuthContext";
import {
  GraduationCap, Users, BookOpen, CalendarCheck, Wallet, Banknote,
  NotebookPen, ClipboardList, Megaphone, Baby, Building2, CalendarDays,
  Settings, UserCircle, LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Action {
  title: string;
  to: string;
  icon: LucideIcon;
  desc: string;
  tone: "primary" | "success" | "warning" | "info";
}

const toneMap: Record<Action["tone"], string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info:    "bg-accent text-accent-foreground",
};

const ACTIONS: Record<AppRole, Action[]> = {
  admin: [
    { title: "Add Student",       to: "/students",   icon: GraduationCap, desc: "Enroll a new student",        tone: "primary" },
    { title: "Add Staff",         to: "/teachers",   icon: Users,         desc: "Onboard a teacher",           tone: "success" },
    { title: "Manage Classes",    to: "/classes",    icon: BookOpen,      desc: "Sections & teachers",         tone: "info" },
    { title: "Branches",          to: "/branches",   icon: Building2,     desc: "School & Academy",            tone: "warning" },
    { title: "Fees & Invoices",   to: "/fees",       icon: Wallet,        desc: "Bulk-generate & track",       tone: "primary" },
    { title: "Salaries",          to: "/salaries",   icon: Banknote,      desc: "Pay & deductions",            tone: "success" },
    { title: "Reports",           to: "/reports",    icon: ClipboardList, desc: "Analytics & summaries",       tone: "info" },
    { title: "Post Notice",       to: "/notices",    icon: Megaphone,     desc: "School-wide announcement",    tone: "warning" },
  ],
  teacher: [
    { title: "Mark Attendance",   to: "/attendance", icon: CalendarCheck, desc: "Today's class roll",          tone: "primary" },
    { title: "Class Diary",       to: "/diary",      icon: NotebookPen,   desc: "Homework & notes",            tone: "info" },
    { title: "Timetable",         to: "/timetable",  icon: CalendarDays,  desc: "Your weekly schedule",        tone: "success" },
    { title: "Exams & Marks",     to: "/exams",      icon: ClipboardList, desc: "Record results",              tone: "warning" },
    { title: "My Salary",         to: "/my-salary",  icon: Banknote,      desc: "Payslips & leaves",           tone: "primary" },
    { title: "Notices",           to: "/notices",    icon: Megaphone,     desc: "Latest announcements",        tone: "info" },
  ],
  student: [
    { title: "My Attendance",     to: "/my-attendance", icon: CalendarCheck, desc: "Your monthly record",       tone: "primary" },
    { title: "Class Diary",       to: "/diary",         icon: NotebookPen,   desc: "Today's homework",          tone: "info" },
    { title: "Timetable",         to: "/timetable",     icon: CalendarDays,  desc: "Periods this week",         tone: "success" },
    { title: "Exams",             to: "/exams",         icon: ClipboardList, desc: "Schedule & results",        tone: "warning" },
    { title: "Fees",              to: "/fees",          icon: Wallet,        desc: "Outstanding & paid",        tone: "primary" },
    { title: "Profile",           to: "/profile",       icon: UserCircle,    desc: "Manage your details",       tone: "info" },
  ],
  parent: [
    { title: "My Children",       to: "/my-children",   icon: Baby,          desc: "Linked students",           tone: "primary" },
    { title: "Class Diary",       to: "/diary",         icon: NotebookPen,   desc: "Daily homework",            tone: "info" },
    { title: "Timetable",         to: "/timetable",     icon: CalendarDays,  desc: "Class schedule",            tone: "success" },
    { title: "Exam Results",      to: "/my-results",    icon: ClipboardList, desc: "Performance & marks",       tone: "warning" },
    { title: "Pay Fees",          to: "/fees",          icon: Wallet,        desc: "Online payment & history",  tone: "primary" },
    { title: "Notices",           to: "/notices",       icon: Megaphone,     desc: "School updates",            tone: "info" },
  ],
};

interface Props { role: AppRole; }

export const RoleQuickActions = ({ role }: Props) => {
  const items = ACTIONS[role] ?? [];
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quick actions</CardTitle>
        <CardDescription className="capitalize">Shortcuts tailored for {role}s</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {items.map((a) => (
            <Link
              key={a.to + a.title}
              to={a.to}
              className="group rounded-lg border border-border/60 bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <div className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md mb-2", toneMap[a.tone])}>
                <a.icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold leading-none">{a.title}</p>
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{a.desc}</p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
