import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, GraduationCap, BookOpen, CalendarCheck, Megaphone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { format, subDays } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Stats {
  students: number;
  teachers: number;
  classes: number;
  attendanceRate: number;
}

interface AttendancePoint { day: string; rate: number; }
interface NoticeItem { id: string; title: string; created_at: string; audience: string; }

const Dashboard = () => {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ students: 0, teachers: 0, classes: 0, attendanceRate: 0 });
  const [chart, setChart] = useState<AttendancePoint[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [profileName, setProfileName] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      // Profile
      if (user) {
        const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
        if (prof) setProfileName(prof.full_name || user.email || "");
      }

      // Counts
      const [{ count: sCount }, { count: tCount }, { count: cCount }] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase.from("teachers").select("*", { count: "exact", head: true }),
        supabase.from("classes").select("*", { count: "exact", head: true }),
      ]);

      // Attendance — last 7 days
      const since = format(subDays(new Date(), 7), "yyyy-MM-dd");
      const { data: att } = await supabase
        .from("attendance")
        .select("date, status")
        .gte("date", since);

      const byDay = new Map<string, { p: number; t: number }>();
      for (let i = 6; i >= 0; i--) {
        const d = format(subDays(new Date(), i), "yyyy-MM-dd");
        byDay.set(d, { p: 0, t: 0 });
      }
      (att ?? []).forEach((row) => {
        const k = row.date as string;
        const v = byDay.get(k);
        if (v) { v.t += 1; if (row.status === "present" || row.status === "late") v.p += 1; }
      });
      const chartData: AttendancePoint[] = Array.from(byDay.entries()).map(([d, v]) => ({
        day: format(new Date(d), "EEE"),
        rate: v.t ? Math.round((v.p / v.t) * 100) : 0,
      }));
      setChart(chartData);

      const totalAtt = (att ?? []).length;
      const presentAtt = (att ?? []).filter((r) => r.status === "present" || r.status === "late").length;
      const rate = totalAtt ? Math.round((presentAtt / totalAtt) * 100) : 0;

      setStats({ students: sCount ?? 0, teachers: tCount ?? 0, classes: cCount ?? 0, attendanceRate: rate });

      // Notices
      const { data: nots } = await supabase
        .from("notices")
        .select("id, title, created_at, audience")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);
      setNotices((nots ?? []) as NoticeItem[]);

      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome${profileName ? `, ${profileName.split(" ")[0]}` : ""}`}
        description={`Here's what's happening at your school today.`}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={stats.students} icon={GraduationCap} accent="primary" />
        <StatCard label="Teachers" value={stats.teachers} icon={Users} accent="success" />
        <StatCard label="Classes" value={stats.classes} icon={BookOpen} accent="warning" />
        <StatCard label="Attendance (7d)" value={`${stats.attendanceRate}%`} icon={CalendarCheck} accent="primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Attendance trend</CardTitle>
            <CardDescription>Daily presence rate over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} unit="%" domain={[0, 100]} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--accent))" }}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Latest notices</CardTitle>
                <CardDescription>Top 5 announcements</CardDescription>
              </div>
              <Megaphone className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {notices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No notices yet.</p>
            ) : (
              <ul className="space-y-3">
                {notices.map((n) => (
                  <li key={n.id} className="flex items-start gap-2 pb-3 border-b last:border-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(n.created_at), "MMM d, yyyy")}</p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize shrink-0">{n.audience}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick tips</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm text-muted-foreground">
          {role === "admin" && <p>• Create classes first, then add students and teachers.</p>}
          {(role === "admin" || role === "teacher") && <p>• Mark attendance daily — the chart above updates automatically.</p>}
          <p>• Pin important notices so they always appear at the top.</p>
          <p>• Toggle the theme from the top right for dark mode.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
