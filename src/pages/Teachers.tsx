import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { teacherSchema } from "@/lib/validation";
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
import { toast } from "sonner";
import { Plus, Search, Trash2, Users, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

type Vals = z.infer<typeof teacherSchema>;

interface TeacherRow {
  id: string;
  employee_id: string;
  qualification: string | null;
  joining_date: string;
  profile_id: string;
  profiles: { full_name: string; email: string | null; phone: string | null } | null;
}

const Teachers = () => {
  const [rows, setRows] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  const form = useForm<Vals>({
    resolver: zodResolver(teacherSchema),
    defaultValues: { full_name: "", email: "", employee_id: "", qualification: "", phone: "", password: "" },
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("teachers")
      .select("id, employee_id, qualification, joining_date, profile_id, profiles(full_name, email, phone)")
      .order("created_at", { ascending: false });
    setRows((data as unknown as TeacherRow[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (vals: Vals) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email: vals.email, password: vals.password, full_name: vals.full_name, role: "teacher" },
      });
      if (error || (data as { error?: string })?.error) {
        throw new Error((data as { error?: string })?.error || error?.message || "Failed");
      }
      const userId = (data as { user_id: string }).user_id;

      if (vals.phone) await supabase.from("profiles").update({ phone: vals.phone }).eq("id", userId);

      const { error: insErr } = await supabase.from("teachers").insert({
        profile_id: userId,
        employee_id: vals.employee_id,
        qualification: vals.qualification || null,
      });
      if (insErr) throw insErr;

      toast.success("Teacher added");
      setOpen(false);
      form.reset();
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSubmitting(false); }
  };

  const onDelete = async (t: TeacherRow) => {
    if (!confirm(`Delete ${t.profiles?.full_name}?`)) return;
    const { error } = await supabase.from("teachers").delete().eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Teacher removed");
    load();
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.profiles?.full_name?.toLowerCase().includes(q) || r.employee_id?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teachers"
        description="Manage teaching staff."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add teacher</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add teacher</DialogTitle>
                <DialogDescription>Creates a sign-in account and a teacher record.</DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Full name" error={form.formState.errors.full_name?.message}><Input {...form.register("full_name")} /></Field>
                  <Field label="Employee ID" error={form.formState.errors.employee_id?.message}><Input {...form.register("employee_id")} /></Field>
                  <Field label="Email" error={form.formState.errors.email?.message}><Input type="email" {...form.register("email")} /></Field>
                  <Field label="Password" error={form.formState.errors.password?.message}><Input type="password" {...form.register("password")} /></Field>
                  <Field label="Qualification"><Input {...form.register("qualification")} /></Field>
                  <Field label="Phone"><Input {...form.register("phone")} /></Field>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Save
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Users} title="No teachers yet" description="Add your first teacher." />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Qualification</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.profiles?.full_name || "—"}</TableCell>
                      <TableCell>{t.employee_id}</TableCell>
                      <TableCell className="text-muted-foreground">{t.qualification || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{t.profiles?.email}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(t)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
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

export default Teachers;
