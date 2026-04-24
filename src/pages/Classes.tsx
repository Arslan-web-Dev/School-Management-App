import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { classSchema } from "@/lib/validation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, BookOpen, Trash2, Loader2, Users } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

type Vals = {
  name: string;
  section: string;
  grade_level?: number | string;
  class_teacher_id?: string | null;
  academic_year: string;
};

interface ClassRow {
  id: string;
  name: string;
  section: string;
  grade_level: number | null;
  academic_year: string;
  class_teacher_id: string | null;
  profiles: { full_name: string } | null;
  students: { count: number }[];
}

interface TeacherOption { profile_id: string; profiles: { full_name: string } | null; }

const Classes = () => {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<Vals>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(classSchema) as any,
    defaultValues: { name: "", section: "A", academic_year: "2025-2026" },
  });

  const load = async () => {
    setLoading(true);
    const [{ data: classData }, { data: teacherData }] = await Promise.all([
      supabase
        .from("classes")
        .select("id, name, section, grade_level, academic_year, class_teacher_id, profiles:profiles!classes_class_teacher_id_fkey(full_name), students(count)")
        .order("name"),
      supabase.from("teachers").select("profile_id, profiles(full_name)"),
    ]);
    setRows((classData as unknown as ClassRow[]) ?? []);
    setTeachers((teacherData as unknown as TeacherOption[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (vals: Vals) => {
    setSubmitting(true);
    const grade = vals.grade_level ? Number(vals.grade_level) : null;
    const { error } = await supabase.from("classes").insert([{
      name: vals.name,
      section: vals.section,
      grade_level: grade,
      academic_year: vals.academic_year,
      class_teacher_id: vals.class_teacher_id || null,
    }]);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Class created");
    setOpen(false);
    form.reset({ name: "", section: "A", academic_year: "2025-2026" });
    load();
  };

  const onDelete = async (c: ClassRow) => {
    if (!confirm(`Delete class ${c.name} - ${c.section}?`)) return;
    const { error } = await supabase.from("classes").delete().eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Class deleted");
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        description="Organize students into classes and assign teachers."
        actions={isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> New class</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create class</DialogTitle></DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit as never)} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Name" error={form.formState.errors.name?.message}><Input placeholder="e.g. Grade 5" {...form.register("name")} /></Field>
                  <Field label="Section" error={form.formState.errors.section?.message}><Input {...form.register("section")} /></Field>
                  <Field label="Grade level"><Input type="number" {...form.register("grade_level")} /></Field>
                  <Field label="Academic year" error={form.formState.errors.academic_year?.message}><Input {...form.register("academic_year")} /></Field>
                  <Field label="Class teacher">
                    <Select onValueChange={(v) => form.setValue("class_teacher_id", v === "none" ? null : v)}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {teachers.map((t) => (
                          <SelectItem key={t.profile_id} value={t.profile_id}>{t.profiles?.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Create
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={BookOpen} title="No classes yet" description="Create your first class to organize students." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <Card key={c.id} className="transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{c.name}</CardTitle>
                    <CardDescription>Section {c.section} • {c.academic_year}</CardDescription>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{c.students?.[0]?.count ?? 0} students</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Teacher: </span>
                    {c.profiles?.full_name ? <Badge variant="secondary">{c.profiles.full_name}</Badge> : <span className="text-muted-foreground">Unassigned</span>}
                  </div>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" onClick={() => onDelete(c)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs">{label}</Label>
    {children}
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

export default Classes;
