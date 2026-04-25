import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { timetableSchema } from "@/lib/validation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Row { id: string; class_id: string; subject_id: string | null; teacher_id: string | null; day_of_week: number; start_time: string; end_time: string; classes: { name: string; section: string } | null; subjects: { name: string } | null; teachers: { profiles: { full_name: string } | null } | null; }
type Vals = z.infer<typeof timetableSchema>;

const Timetable = () => {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [rows, setRows] = useState<Row[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const form = useForm<Vals>({ resolver: zodResolver(timetableSchema) as any, defaultValues: { day_of_week: 1, start_time: "09:00", end_time: "10:00" } as any });

  const load = async () => {
    const { data } = await supabase.from("timetable").select("*, classes(name, section), subjects(name), teachers(profiles(full_name))").order("day_of_week").order("start_time");
    setRows((data ?? []) as any);
  };
  useEffect(() => {
    load();
    supabase.from("classes").select("id, name, section").then(({ data }) => setClasses(data ?? []));
    supabase.from("subjects").select("id, name").then(({ data }) => setSubjects(data ?? []));
    supabase.from("teachers").select("id, profiles(full_name)").then(({ data }) => setTeachers(data ?? []));
  }, []);

  const onSubmit = async (v: Vals) => {
    const { error } = await supabase.from("timetable").insert({
      class_id: v.class_id, subject_id: v.subject_id || null, teacher_id: v.teacher_id || null,
      day_of_week: v.day_of_week, start_time: v.start_time, end_time: v.end_time,
    });
    if (error) return toast.error(error.message);
    toast.success("Slot added");
    form.reset();
    setOpen(false);
    load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this slot?")) return;
    await supabase.from("timetable").delete().eq("id", id);
    load();
  };

  const grouped = DAYS.map((d, i) => ({ day: d, items: rows.filter((r) => r.day_of_week === i) }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable"
        description="Class schedule by day."
        actions={isAdmin ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add slot</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New time slot</DialogTitle></DialogHeader>
              <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
                <div><Label>Class</Label>
                  <Select onValueChange={(v) => form.setValue("class_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} – {c.section}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Subject</Label>
                  <Select onValueChange={(v) => form.setValue("subject_id", v === "none" ? null : v)}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">None</SelectItem>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Teacher</Label>
                  <Select onValueChange={(v) => form.setValue("teacher_id", v === "none" ? null : v)}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">None</SelectItem>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.profiles?.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Day</Label>
                  <Select defaultValue="1" onValueChange={(v) => form.setValue("day_of_week", Number(v) as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Start</Label><Input type="time" {...form.register("start_time")} /></div>
                  <div><Label>End</Label><Input type="time" {...form.register("end_time")} /></div>
                </div>
                <Button type="submit" className="w-full">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        ) : undefined}
      />
      {rows.length === 0 ? (
        <EmptyState title="No timetable yet" description={isAdmin ? "Add time slots." : "Ask admin to set up the timetable."} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {grouped.filter((g) => g.items.length > 0).map((g) => (
            <Card key={g.day}>
              <CardHeader><CardTitle className="text-base">{g.day}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {g.items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between text-sm border-l-2 border-primary pl-3 py-1">
                    <div>
                      <div className="font-medium">{it.subjects?.name ?? "Class"}</div>
                      <div className="text-xs text-muted-foreground">
                        {it.start_time?.slice(0, 5)}–{it.end_time?.slice(0, 5)} · {it.classes?.name}-{it.classes?.section}
                        {it.teachers?.profiles?.full_name && ` · ${it.teachers.profiles.full_name}`}
                      </div>
                    </div>
                    {isAdmin && <Button variant="ghost" size="icon" onClick={() => onDelete(it.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
export default Timetable;
