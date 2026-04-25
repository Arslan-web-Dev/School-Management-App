import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { examSchema } from "@/lib/validation";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Exam { id: string; name: string; class_id: string; subject_id: string | null; exam_date: string; total_marks: number; classes: { name: string; section: string } | null; subjects: { name: string } | null; }
interface Student { id: string; profiles: { full_name: string } | null; roll_number: string; }
interface ResultRow { id: string; student_id: string; marks_obtained: number; }
type Vals = z.infer<typeof examSchema>;

const Exams = () => {
  const { role } = useAuth();
  const canManage = role === "admin" || role === "teacher";
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState<Exam | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<Record<string, number>>({});
  const form = useForm<Vals>({ resolver: zodResolver(examSchema) as any, defaultValues: { total_marks: 100, exam_date: format(new Date(), "yyyy-MM-dd") } as any });

  const load = async () => {
    const { data } = await supabase.from("exams").select("*, classes(name, section), subjects(name)").order("exam_date", { ascending: false });
    setExams((data ?? []) as any);
  };
  useEffect(() => {
    load();
    supabase.from("classes").select("id, name, section").then(({ data }) => setClasses(data ?? []));
    supabase.from("subjects").select("id, name").then(({ data }) => setSubjects(data ?? []));
  }, []);

  const onSubmit = async (v: Vals) => {
    const { error } = await supabase.from("exams").insert({
      name: v.name, class_id: v.class_id, subject_id: v.subject_id || null,
      exam_date: v.exam_date, total_marks: v.total_marks,
    });
    if (error) return toast.error(error.message);
    toast.success("Exam created");
    form.reset({ total_marks: 100, exam_date: format(new Date(), "yyyy-MM-dd") } as any);
    setOpen(false);
    load();
  };

  const openResults = async (exam: Exam) => {
    setResultsOpen(exam);
    const { data: ss } = await supabase.from("students").select("id, roll_number, profiles(full_name)").eq("class_id", exam.class_id).order("roll_number");
    setStudents((ss ?? []) as any);
    const { data: rs } = await supabase.from("exam_results").select("student_id, marks_obtained").eq("exam_id", exam.id);
    const map: Record<string, number> = {};
    (rs ?? []).forEach((r: any) => { map[r.student_id] = Number(r.marks_obtained); });
    setResults(map);
  };

  const saveResults = async () => {
    if (!resultsOpen) return;
    const rows = Object.entries(results).map(([student_id, marks_obtained]) => ({
      exam_id: resultsOpen.id, student_id, marks_obtained,
    }));
    const { error } = await supabase.from("exam_results").upsert(rows, { onConflict: "exam_id,student_id" });
    if (error) return toast.error(error.message);
    toast.success("Results saved");
    setResultsOpen(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exams"
        description="Schedule exams and record results."
        actions={canManage ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add exam</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New exam</DialogTitle></DialogHeader>
              <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
                <div><Label>Name</Label><Input {...form.register("name")} /></div>
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
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Date</Label><Input type="date" {...form.register("exam_date")} /></div>
                  <div><Label>Total marks</Label><Input type="number" {...form.register("total_marks")} /></div>
                </div>
                <Button type="submit" className="w-full">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        ) : undefined}
      />
      {exams.length === 0 ? (
        <EmptyState title="No exams scheduled" description={canManage ? "Schedule the first exam." : "No exams scheduled yet."} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {exams.map((e) => (
            <Card key={e.id}>
              <CardHeader>
                <CardTitle className="text-base">{e.name}</CardTitle>
                <CardDescription>
                  {e.classes?.name}-{e.classes?.section} {e.subjects?.name && `· ${e.subjects.name}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm">
                <div className="space-y-1">
                  <Badge variant="secondary">{format(new Date(e.exam_date), "MMM d, yyyy")}</Badge>
                  <div className="text-muted-foreground text-xs">Total: {e.total_marks}</div>
                </div>
                {canManage && <Button size="sm" variant="outline" onClick={() => openResults(e)}><Pencil className="h-3 w-3" /> Results</Button>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!resultsOpen} onOpenChange={(o) => !o && setResultsOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{resultsOpen?.name} – Results</DialogTitle></DialogHeader>
          <Table>
            <TableHeader><TableRow><TableHead>Roll</TableHead><TableHead>Student</TableHead><TableHead>Marks (/{resultsOpen?.total_marks})</TableHead></TableRow></TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.roll_number}</TableCell>
                  <TableCell>{s.profiles?.full_name}</TableCell>
                  <TableCell><Input type="number" className="w-24" value={results[s.id] ?? ""} onChange={(ev) => setResults({ ...results, [s.id]: Number(ev.target.value) })} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button onClick={saveResults}>Save results</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default Exams;
