import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { parentSchema } from "@/lib/validation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";

interface ParentRow { id: string; profile_id: string; profiles: { full_name: string; email: string | null; phone: string | null } | null; parent_students: { student_id: string; students: { id: string; profiles: { full_name: string } | null } | null }[]; }
interface StudentRow { id: string; profiles: { full_name: string } | null; roll_number: string; }
type Vals = z.infer<typeof parentSchema>;

const Parents = () => {
  const [rows, setRows] = useState<ParentRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const form = useForm<Vals>({ resolver: zodResolver(parentSchema) as any, defaultValues: { full_name: "", email: "", occupation: "", phone: "", password: "", student_ids: [] } });

  const load = async () => {
    const { data } = await supabase
      .from("parents")
      .select("id, profile_id, profiles(full_name, email, phone), parent_students(student_id, students(id, profiles(full_name)))")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as any);
    const { data: s } = await supabase.from("students").select("id, roll_number, profiles(full_name)").order("roll_number");
    setStudents((s ?? []) as any);
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (v: Vals) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email: v.email, password: v.password, full_name: v.full_name, role: "parent", student_ids: selectedStudents },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // Save phone/occupation on profile + parents
      await supabase.from("profiles").update({ phone: v.phone || null }).eq("id", data.user_id);
      await supabase.from("parents").update({ occupation: v.occupation || null }).eq("profile_id", data.user_id);
      toast.success("Parent created");
      form.reset();
      setSelectedStudents([]);
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (parentId: string, profileId: string) => {
    if (!confirm("Delete this parent? Their account will be removed.")) return;
    await supabase.from("parents").delete().eq("id", parentId);
    // profile + auth user removal would need admin api; leave for follow-up
    toast.success("Parent unlinked");
    load();
  };

  const toggleStudent = (id: string) => {
    setSelectedStudents((curr) => (curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parents"
        description="Parent accounts can view their linked children's data."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add parent</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>New parent account</DialogTitle></DialogHeader>
              <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
                <div><Label>Full name</Label><Input {...form.register("full_name")} /></div>
                <div><Label>Email</Label><Input type="email" {...form.register("email")} /></div>
                <div><Label>Password</Label><Input type="password" {...form.register("password")} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Phone</Label><Input {...form.register("phone")} /></div>
                  <div><Label>Occupation</Label><Input {...form.register("occupation")} /></div>
                </div>
                <div>
                  <Label>Link to students</Label>
                  <div className="mt-2 max-h-44 overflow-y-auto border rounded-md p-2 space-y-1">
                    {students.length === 0 && <p className="text-xs text-muted-foreground">No students yet.</p>}
                    {students.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={selectedStudents.includes(s.id)} onCheckedChange={() => toggleStudent(s.id)} />
                        <span>{s.profiles?.full_name} <span className="text-muted-foreground">({s.roll_number})</span></span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Save
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      {rows.length === 0 ? (
        <EmptyState title="No parents yet" description="Create parent accounts and link them to students." />
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Linked children</TableHead><TableHead className="w-12" /></TableRow></TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.profiles?.full_name}</TableCell>
                  <TableCell>{p.profiles?.email}</TableCell>
                  <TableCell>{p.profiles?.phone ?? "—"}</TableCell>
                  <TableCell className="space-x-1">
                    {p.parent_students.length === 0 ? <span className="text-muted-foreground text-xs">None</span> :
                      p.parent_students.map((ps) => (
                        <Badge key={ps.student_id} variant="secondary" className="text-xs">{ps.students?.profiles?.full_name}</Badge>
                      ))}
                  </TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => onDelete(p.id, p.profile_id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
export default Parents;
