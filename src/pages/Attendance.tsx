import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, X, Clock, Save, CalendarCheck, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type Status = "present" | "absent" | "late";

interface ClassOption { id: string; name: string; section: string; }
interface StudentRow { id: string; roll_number: string; profiles: { full_name: string } | null; }
interface Existing { student_id: string; status: Status; }

const Attendance = () => {
  const { user, role } = useAuth();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classId, setClassId] = useState<string>("");
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classesLoading, setClassesLoading] = useState(true);
  const [assignedClassIds, setAssignedClassIds] = useState<string[]>([]);

  // Fetch classes - filtered by assignments for teachers
  useEffect(() => {
    const fetchClasses = async () => {
      if (!user) return;

      try {
        // If teacher, get their assigned classes
        if (role === "teacher") {
          const { data: assignments, error: assignmentsError } = await supabase
            .from("class_assignments")
            .select("class_id")
            .eq("teacher_id", user.id);

          if (assignmentsError) throw assignmentsError;

          const classIds = assignments?.map((a: any) => a.class_id) || [];
          setAssignedClassIds(classIds);

          if (classIds.length === 0) {
            // No assignments - show empty state with message
            setClasses([]);
            setClassesLoading(false);
            return;
          }

          // Fetch only assigned classes
          const { data: classesData, error: classesError } = await supabase
            .from("classes")
            .select("id, name, section")
            .in("id", classIds)
            .order("name");

          if (classesError) throw classesError;
          setClasses((classesData as ClassOption[]) ?? []);
          if (classesData && classesData.length) setClassId(classesData[0].id);
        } else {
          // Admin sees all classes
          const { data, error } = await supabase
            .from("classes")
            .select("id, name, section")
            .order("name");

          if (error) throw error;
          setClasses((data as ClassOption[]) ?? []);
          if (data && data.length) setClassId(data[0].id);
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to load classes");
      } finally {
        setClassesLoading(false);
      }
    };

    fetchClasses();
  }, [user, role]);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    Promise.all([
      supabase.from("students").select("id, roll_number, profiles(full_name)").eq("class_id", classId).order("roll_number"),
      supabase.from("attendance").select("student_id, status").eq("class_id", classId).eq("date", date),
    ]).then(([{ data: stu }, { data: att }]) => {
      const studentList = (stu as unknown as StudentRow[]) ?? [];
      setStudents(studentList);
      const m: Record<string, Status> = {};
      studentList.forEach((s) => { m[s.id] = "present"; });
      ((att as Existing[]) ?? []).forEach((a) => { m[a.student_id] = a.status; });
      setMarks(m);
      setLoading(false);
    });
  }, [classId, date]);

  const setStatus = (sid: string, status: Status) => setMarks((prev) => ({ ...prev, [sid]: status }));

  const onSave = async () => {
    if (!classId || !user) return;
    setSaving(true);
    const rows = students.map((s) => ({
      student_id: s.id,
      class_id: classId,
      date,
      status: marks[s.id] || "present",
      marked_by: user.id,
    }));
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,date" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Attendance saved for ${format(new Date(date), "MMM d")}`);
  };

  const counts = {
    present: students.filter((s) => marks[s.id] === "present").length,
    absent: students.filter((s) => marks[s.id] === "absent").length,
    late: students.filter((s) => marks[s.id] === "late").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Mark daily attendance per class." />

      <Card>
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} - {c.section}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} max={format(new Date(), "yyyy-MM-dd")} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={onSave} disabled={saving || !students.length}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save attendance
              </Button>
            </div>
          </div>

          {classesLoading || loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : classes.length === 0 ? (
            role === "teacher" ? (
              <EmptyState
                icon={CalendarCheck}
                title="No class assignments"
                description="You have not been assigned to any classes yet. Please contact an administrator to assign you to your classes."
              />
            ) : (
              <EmptyState icon={CalendarCheck} title="No classes" description="Create a class first." />
            )
          ) : students.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="No students in this class" description="Add students and assign them to this class." />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <SummaryPill label="Present" count={counts.present} color="success" />
                <SummaryPill label="Late" count={counts.late} color="warning" />
                <SummaryPill label="Absent" count={counts.absent} color="destructive" />
              </div>

              <div className="rounded-md border divide-y">
                {students.map((s) => {
                  const cur = marks[s.id] || "present";
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-3 p-3 hover:bg-muted/30">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{s.profiles?.full_name}</p>
                        <p className="text-xs text-muted-foreground">Roll #{s.roll_number}</p>
                      </div>
                      <div className="flex gap-1">
                        <StatusBtn icon={Check} active={cur === "present"} onClick={() => setStatus(s.id, "present")} variant="success" label="Present" />
                        <StatusBtn icon={Clock} active={cur === "late"} onClick={() => setStatus(s.id, "late")} variant="warning" label="Late" />
                        <StatusBtn icon={X} active={cur === "absent"} onClick={() => setStatus(s.id, "absent")} variant="destructive" label="Absent" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const SummaryPill = ({ label, count, color }: { label: string; count: number; color: "success" | "warning" | "destructive" }) => {
  const cls = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  }[color];
  return (
    <div className={cn("rounded-md px-3 py-2 flex items-center justify-between", cls)}>
      <span className="text-xs font-medium">{label}</span>
      <span className="font-bold">{count}</span>
    </div>
  );
};

const StatusBtn = ({ icon: Icon, active, onClick, variant, label }: { icon: React.ComponentType<{ className?: string }>; active: boolean; onClick: () => void; variant: "success" | "warning" | "destructive"; label: string }) => {
  const colorMap = {
    success: "bg-success text-success-foreground hover:bg-success/90",
    warning: "bg-warning text-warning-foreground hover:bg-warning/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  };
  return (
    <Button
      type="button"
      size="icon"
      variant={active ? "default" : "outline"}
      className={cn("h-9 w-9", active && colorMap[variant])}
      onClick={onClick}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
};

export default Attendance;
