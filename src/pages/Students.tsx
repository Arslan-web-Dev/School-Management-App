import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { studentSchema } from "@/lib/validation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Search, Trash2, GraduationCap, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

type Vals = z.infer<typeof studentSchema>;

interface StudentRow {
  id: string;
  roll_number: string;
  class_id: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  profile_id: string;
  profiles: { full_name: string; email: string | null; phone: string | null } | null;
  classes: { name: string; section: string } | null;
}

interface ClassOption { id: string; name: string; section: string; }

const Students = () => {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  const form = useForm<Vals>({
    resolver: zodResolver(studentSchema),
    defaultValues: { full_name: "", email: "", roll_number: "", parent_name: "", parent_phone: "", phone: "", password: "", class_id: undefined },
  });

  const load = async () => {
    setLoading(true);
    const [{ data: studentsData }, { data: classesData }] = await Promise.all([
      supabase.from("students").select("id, roll_number, class_id, parent_name, parent_phone, profile_id, profiles(full_name, email, phone), classes(name, section)").order("created_at", { ascending: false }),
      supabase.from("classes").select("id, name, section").order("name"),
    ]);
    setRows((studentsData as unknown as StudentRow[]) ?? []);
    setClasses((classesData as ClassOption[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (vals: Vals) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email: vals.email, password: vals.password, full_name: vals.full_name, role: "student" },
      });
      if (error || (data as { error?: string })?.error) {
        throw new Error((data as { error?: string })?.error || error?.message || "Failed");
      }
      const newUserId = (data as { user_id: string }).user_id;

      // Update profile phone
      if (vals.phone) {
        await supabase.from("profiles").update({ phone: vals.phone }).eq("id", newUserId);
      }

      // Create student row
      const { error: insErr } = await supabase.from("students").insert({
        profile_id: newUserId,
        roll_number: vals.roll_number,
        class_id: vals.class_id || null,
        parent_name: vals.parent_name || null,
        parent_phone: vals.parent_phone || null,
      });
      if (insErr) throw insErr;

      toast.success("Student added");
      setOpen(false);
      form.reset();
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (s: StudentRow) => {
    if (!confirm(`Delete ${s.profiles?.full_name}?`)) return;
    // Deleting the profile cascades; we delete the student row first since RLS on auth.users requires service role.
    const { error } = await supabase.from("students").delete().eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Student removed");
    load();
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return !q
      || r.profiles?.full_name?.toLowerCase().includes(q)
      || r.roll_number?.toLowerCase().includes(q)
      || r.profiles?.email?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Manage student records and class assignments."
        actions={isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> Add student</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add student</DialogTitle>
                <DialogDescription>Creates a sign-in account and a student record.</DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Full name" error={form.formState.errors.full_name?.message}>
                    <Input {...form.register("full_name")} />
                  </Field>
                  <Field label="Roll number" error={form.formState.errors.roll_number?.message}>
                    <Input {...form.register("roll_number")} />
                  </Field>
                  <Field label="Email" error={form.formState.errors.email?.message}>
                    <Input type="email" {...form.register("email")} />
                  </Field>
                  <Field label="Password" error={form.formState.errors.password?.message}>
                    <Input type="password" {...form.register("password")} />
                  </Field>
                  <Field label="Class">
                    <Select onValueChange={(v) => form.setValue("class_id", v)} value={form.watch("class_id") ?? undefined}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name} - {c.section}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Phone"><Input {...form.register("phone")} /></Field>
                  <Field label="Parent name"><Input {...form.register("parent_name")} /></Field>
                  <Field label="Parent phone"><Input {...form.register("parent_phone")} /></Field>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Save
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      <Card>
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No students yet" description="Add your first student to get started." />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Roll</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    {isAdmin && <TableHead className="w-12"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.profiles?.full_name || "—"}</TableCell>
                      <TableCell>{s.roll_number}</TableCell>
                      <TableCell>
                        {s.classes ? <Badge variant="secondary">{s.classes.name} - {s.classes.section}</Badge> : <span className="text-muted-foreground">Unassigned</span>}
                      </TableCell>
                      <TableCell>
                        {s.parent_name ? (
                          <div className="text-sm">
                            <div>{s.parent_name}</div>
                            {s.parent_phone && <div className="text-xs text-muted-foreground">{s.parent_phone}</div>}
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{s.profiles?.email}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => onDelete(s)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
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

export default Students;
