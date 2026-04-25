import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Trophy, Trash2, GraduationCap, BookOpen } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { supabase } from "@/integrations/supabase/client";

interface GradeRecord { id: string; student_id: string; student_name: string; class_name: string; subject: string; exam_name: string; total_marks: number; obtained_marks: number; percentage: number; grade: string; date: string; }
interface StudentOption { id: string; full_name: string; class_name: string; }

const getGrade = (pct: number) => { if (pct >= 90) return "A+"; if (pct >= 80) return "A"; if (pct >= 70) return "B"; if (pct >= 60) return "C"; if (pct >= 50) return "D"; return "F"; };

const Grades = () => {
  const [grades, setGrades] = useState<GradeRecord[]>(() => JSON.parse(localStorage.getItem("school_grades") || "[]"));
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ student_id: "", subject: "", exam_name: "", total_marks: "100", obtained_marks: "", date: new Date().toISOString().split("T")[0] });

  useEffect(() => {
    supabase.from("students").select("id, profiles(full_name), classes(name)").order("created_at", { ascending: false }).then(({ data }) => {
      setStudents((data as any[] ?? []).map(s => ({ id: s.id, full_name: s.profiles?.full_name || "Unknown", class_name: s.classes?.name || "Unassigned" })));
    });
  }, []);
  useEffect(() => { localStorage.setItem("school_grades", JSON.stringify(grades)); }, [grades]);

  const onSubmit = () => {
    if (!form.student_id || !form.subject || !form.exam_name || !form.obtained_marks || !form.total_marks) { toast.error("Fill required fields"); return; }
    const s = students.find(x => x.id === form.student_id);
    const total = Number(form.total_marks); const obt = Number(form.obtained_marks);
    const pct = Math.round((obt / total) * 100);
    setGrades(prev => [...prev, { id: `g${Date.now()}`, student_id: form.student_id, student_name: s?.full_name || "", class_name: s?.class_name || "", subject: form.subject, exam_name: form.exam_name, total_marks: total, obtained_marks: obt, percentage: pct, grade: getGrade(pct), date: form.date }]);
    toast.success("Grade added"); setOpen(false); setForm({ student_id: "", subject: "", exam_name: "", total_marks: "100", obtained_marks: "", date: new Date().toISOString().split("T")[0] });
  };

  const del = (id: string) => { if (!confirm("Delete?")) return; setGrades(prev => prev.filter(g => g.id !== id)); toast.success("Deleted"); };
  const filtered = grades.filter(g => !search || g.student_name.toLowerCase().includes(search.toLowerCase()) || g.subject.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader title="Student Performance / Grades" description="Manage exam results and student grades." actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add Result</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Exam Result</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-2"><Label>Student *</Label><Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.class_name})</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Subject *</Label><Input placeholder="e.g. Math" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div><div className="space-y-2"><Label>Exam Name *</Label><Input placeholder="e.g. Mid-Term" value={form.exam_name} onChange={e => setForm({ ...form, exam_name: e.target.value })} /></div></div>
              <div className="grid grid-cols-3 gap-3"><div className="space-y-2"><Label>Total Marks</Label><Input type="number" value={form.total_marks} onChange={e => setForm({ ...form, total_marks: e.target.value })} /></div><div className="space-y-2"><Label>Obtained *</Label><Input type="number" value={form.obtained_marks} onChange={e => setForm({ ...form, obtained_marks: e.target.value })} /></div><div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div></div>
              <DialogFooter><Button onClick={onSubmit}>Save Result</Button></DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      } />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600"><Trophy className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Total Results</p><p className="text-xl font-bold">{grades.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600"><GraduationCap className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Pass Rate</p><p className="text-xl font-bold">{grades.length ? Math.round((grades.filter(g => g.percentage >= 50).length / grades.length) * 100) : 0}%</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600"><BookOpen className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Avg Score</p><p className="text-xl font-bold">{grades.length ? Math.round(grades.reduce((s, g) => s + g.percentage, 0) / grades.length) : 0}%</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600"><GraduationCap className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Fail</p><p className="text-xl font-bold">{grades.filter(g => g.percentage < 50).length}</p></div></CardContent></Card>
      </div>

      <Card><CardContent className="p-4 md:p-6 space-y-4">
        <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search results..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        {grades.length === 0 ? <EmptyState icon={Trophy} title="No grades" description="Add your first exam result." /> : filtered.length === 0 ? <EmptyState icon={Search} title="No matches" description="Adjust filters." /> : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="text-left p-3">Student</th><th className="text-left p-3">Class</th><th className="text-left p-3">Exam</th><th className="text-left p-3">Subject</th><th className="text-right p-3">Obtained</th><th className="text-right p-3">%</th><th className="text-center p-3">Grade</th><th className="text-right p-3">Actions</th></tr></thead>
            <tbody>{filtered.map(g => (<tr key={g.id} className="border-b hover:bg-muted/30"><td className="p-3 font-medium">{g.student_name}</td><td className="p-3 text-muted-foreground">{g.class_name}</td><td className="p-3"><Badge variant="outline">{g.exam_name}</Badge></td><td className="p-3">{g.subject}</td><td className="p-3 text-right">{g.obtained_marks}/{g.total_marks}</td><td className="p-3 text-right font-medium">{g.percentage}%</td><td className="p-3 text-center"><Badge className={g.grade === "A+" || g.grade === "A" ? "bg-emerald-500/10 text-emerald-600" : g.grade === "F" ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"}>{g.grade}</Badge></td><td className="p-3 text-right"><Button variant="ghost" size="icon" onClick={() => del(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td></tr>))}</tbody>
            </table>
          </div>
        )}
      </CardContent></Card>
    </div>
  );
};

export default Grades;
