import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  CalendarCheck, Megaphone, Settings, UserCircle, School,
  Wallet, Banknote, NotebookPen, CalendarDays, ClipboardList,
  Building2, Baby,
} from "lucide-react";
import { useAuth, AppRole } from "@/contexts/AuthContext";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
}

const items: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["admin", "teacher", "student", "parent"] },
  { title: "Students", url: "/students", icon: GraduationCap, roles: ["admin", "teacher"] },
  { title: "Teachers", url: "/teachers", icon: Users, roles: ["admin"] },
  { title: "Parents", url: "/parents", icon: Baby, roles: ["admin"] },
  { title: "Classes", url: "/classes", icon: BookOpen, roles: ["admin", "teacher"] },
  { title: "Subjects", url: "/subjects", icon: BookOpen, roles: ["admin"] },
  { title: "Branches", url: "/branches", icon: Building2, roles: ["admin"] },
  { title: "Timetable", url: "/timetable", icon: CalendarDays, roles: ["admin", "teacher", "student", "parent"] },
  { title: "Class Diary", url: "/diary", icon: NotebookPen, roles: ["admin", "teacher", "student", "parent"] },
  { title: "Attendance", url: "/attendance", icon: CalendarCheck, roles: ["admin", "teacher"] },
  { title: "My Attendance", url: "/my-attendance", icon: CalendarCheck, roles: ["student"] },
  { title: "Exams", url: "/exams", icon: ClipboardList, roles: ["admin", "teacher", "student", "parent"] },
  { title: "Fees", url: "/fees", icon: Wallet, roles: ["admin", "student", "parent"] },
  { title: "Salaries", url: "/salaries", icon: Banknote, roles: ["admin", "teacher"] },
  { title: "Notices", url: "/notices", icon: Megaphone, roles: ["admin", "teacher", "student", "parent"] },
  { title: "My Children", url: "/my-children", icon: Baby, roles: ["parent"] },
  { title: "Profile", url: "/profile", icon: UserCircle, roles: ["admin", "teacher", "student", "parent"] },
  { title: "Settings", url: "/settings", icon: Settings, roles: ["admin"] },
];

export const AppSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { role } = useAuth();
  const location = useLocation();

  const visible = items.filter((i) => role && i.roles.includes(role));

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
            <School className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">EduManage Pro</span>
              <span className="text-xs text-muted-foreground">School Suite</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((item) => {
                const active = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink to={item.url} end>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
