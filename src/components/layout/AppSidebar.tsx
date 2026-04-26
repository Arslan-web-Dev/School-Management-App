import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  CalendarCheck, Megaphone, Settings, UserCircle, School,
  Wallet, Banknote, NotebookPen, CalendarDays, ClipboardList,
  Building2, Baby, BarChart3, Bell, Award, ShieldCheck, Link2,
} from "lucide-react";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
}

const items: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["admin", "teacher", "parent"] },
  { title: "Students", url: "/students", icon: GraduationCap, roles: ["admin", "teacher"] },
  { title: "Teachers", url: "/teachers", icon: Users, roles: ["admin"] },
  { title: "Parents", url: "/parents", icon: Baby, roles: ["admin"] },
  { title: "Classes", url: "/classes", icon: BookOpen, roles: ["admin", "teacher"] },
  { title: "Subjects", url: "/subjects", icon: BookOpen, roles: ["admin"] },
  { title: "Branches", url: "/branches", icon: Building2, roles: ["admin"] },
  { title: "Timetable", url: "/timetable", icon: CalendarDays, roles: ["admin", "teacher", "student", "parent"] },
  { title: "Class Diary", url: "/diary", icon: NotebookPen, roles: ["admin", "teacher", "student", "parent"] },
  { title: "Attendance", url: "/attendance", icon: CalendarCheck, roles: ["admin", "teacher"] },
  { title: "My Attendance (Legacy)", url: "/my-attendance", icon: CalendarCheck, roles: [] },
  { title: "Student Dashboard", url: "/student", icon: LayoutDashboard, roles: ["student"] },
  { title: "My Attendance", url: "/student/attendance", icon: CalendarCheck, roles: ["student"] },
  { title: "My Results", url: "/student/results", icon: Award, roles: ["student"] },
  { title: "Student Notices", url: "/student/notices", icon: Megaphone, roles: ["student"] },
  { title: "Student Profile", url: "/student/profile", icon: UserCircle, roles: ["student"] },
  { title: "Exams", url: "/exams", icon: ClipboardList, roles: ["admin", "teacher", "student", "parent"] },
  { title: "My Children's Results", url: "/my-results", icon: Award, roles: ["parent"] },
  { title: "Fees", url: "/fees", icon: Wallet, roles: ["admin", "student", "parent"] },
  { title: "Salaries", url: "/salaries", icon: Banknote, roles: ["admin"] },
  { title: "My Salary", url: "/my-salary", icon: Banknote, roles: ["teacher"] },
  { title: "Notices", url: "/notices", icon: Megaphone, roles: ["admin", "teacher", "student", "parent"] },
  { title: "Notifications", url: "/notifications", icon: Bell, roles: ["admin", "teacher", "student", "parent"] },
  { title: "Reports", url: "/reports", icon: BarChart3, roles: ["admin"] },
  { title: "User Management", url: "/admin/users", icon: ShieldCheck, roles: ["admin"] },
  { title: "Class Assignments", url: "/admin/class-assignments", icon: GraduationCap, roles: ["admin"] },
  { title: "Parent Links", url: "/admin/parent-children", icon: Link2, roles: ["admin"] },
  { title: "My Children", url: "/my-children", icon: Baby, roles: ["parent"] },
  { title: "Profile", url: "/profile", icon: UserCircle, roles: ["admin", "teacher", "student", "parent"] },
  { title: "Settings", url: "/settings", icon: Settings, roles: ["admin"] },
];

export const AppSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { role } = useAuth();
  const location = useLocation();
  const [schoolConfig, setSchoolConfig] = useState<{ school_name: string; logo_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch school config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("school_config")
          .select("school_name, logo_url")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error) {
          // Config might not exist yet
          console.log("School config not found, using defaults");
          return;
        }

        setSchoolConfig(data);
      } catch (error) {
        console.error("Error fetching school config:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();

    // Subscribe to changes
    const subscription = supabase
      .channel("school_config_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "school_config" }, () => {
        fetchConfig();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const visible = items.filter((i) => role && i.roles.includes(role));

  const displayName = schoolConfig?.school_name || "EduManage Pro";
  const displayTagline = schoolConfig ? "School Management" : "School Suite";

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm overflow-hidden">
            {schoolConfig?.logo_url ? (
              <img
                src={schoolConfig.logo_url}
                alt="School Logo"
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <School className="h-5 w-5" />
            )}
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight min-w-0">
              {loading ? (
                <>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20 mt-1" />
                </>
              ) : (
                <>
                  <span className="text-sm font-semibold truncate" title={displayName}>
                    {displayName}
                  </span>
                  <span className="text-xs text-muted-foreground">{displayTagline}</span>
                </>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.length === 0 ? (
                <SidebarMenuItem>
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    {!role ? "Loading permissions..." : "No access granted"}
                  </div>
                </SidebarMenuItem>
              ) : (
                visible.map((item) => {
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
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
