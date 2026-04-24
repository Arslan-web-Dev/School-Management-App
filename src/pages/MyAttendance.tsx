import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/StatCard";
import { CalendarCheck, Check, X, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";

interface Record { date: string; status: "present" | "absent" | "late"; }

const MyAttendance = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasStudent, setHasStudent] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: student } = await supabase.from("students").select("id").eq("profile_id", user.id).maybeSingle();
      if (!student) { setHasStudent(false); setLoading(false); return; }
      const { data } = await supabase
        .from("attendance")
        .select("date, status")
        .eq("student_id", student.id)
        .order("date", { ascending: false });
      setRecords((data as Record[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-64" /></div>;
  }

  if (!hasStudent) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Attendance" />
        <EmptyState icon={CalendarCheck} title="No student record" description="Your account isn't linked to a student record yet. Ask your admin." />
      </div>
    );
  }

  const total = records.length;
  const present = records.filter((r) => r.status === "present").length;
  const late = records.filter((r) => r.status === "late").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const rate = total ? Math.round(((present + late) / total) * 100) : 0;

  const monthDays = eachDayOfInterval({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) });
  const recordMap = new Map(records.map((r) => [r.date, r.status]));

  return (
    <div className="space-y-6">
      <PageHeader title="My Attendance" description="Your attendance summary and history." />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Attendance rate" value={`${rate}%`} icon={CalendarCheck} accent="primary" />
        <StatCard label="Present" value={present} icon={Check} accent="success" />
        <StatCard label="Late" value={late} icon={Clock} accent="warning" />
        <StatCard label="Absent" value={absent} icon={X} accent="destructive" />
      </div>

      <Card>
        <CardHeader><CardTitle>{format(new Date(), "MMMM yyyy")}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {["S","M","T","W","T","F","S"].map((d, i) => (
              <div key={i} className="text-center text-xs font-semibold text-muted-foreground">{d}</div>
            ))}
            {Array(monthDays[0].getDay()).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
            {monthDays.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const status = recordMap.get(key);
              return (
                <div
                  key={key}
                  className={cn(
                    "aspect-square rounded-md flex items-center justify-center text-xs font-medium border",
                    !status && "bg-muted/40 text-muted-foreground",
                    status === "present" && "bg-success/15 text-success border-success/30",
                    status === "late" && "bg-warning/15 text-warning border-warning/30",
                    status === "absent" && "bg-destructive/15 text-destructive border-destructive/30",
                    isSameDay(d, new Date()) && "ring-2 ring-primary",
                  )}
                  title={status ?? "No record"}
                >
                  {format(d, "d")}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground">
            <Legend color="success" label="Present" />
            <Legend color="warning" label="Late" />
            <Legend color="destructive" label="Absent" />
            <Legend color="muted" label="No record" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const Legend = ({ color, label }: { color: "success" | "warning" | "destructive" | "muted"; label: string }) => {
  const cls = {
    success: "bg-success/15 border-success/30",
    warning: "bg-warning/15 border-warning/30",
    destructive: "bg-destructive/15 border-destructive/30",
    muted: "bg-muted/40 border-border",
  }[color];
  return <div className="flex items-center gap-1.5"><span className={cn("h-3 w-3 rounded border", cls)} />{label}</div>;
};

export default MyAttendance;
