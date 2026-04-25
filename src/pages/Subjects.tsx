import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { subjectSchema } from "@/lib/validation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

interface Subject { id: string; name: string; code: string | null; class_id: string | null; fee_amount: number; classes?: { name: string; section: string } | null; }
interface ClassRow { id: string; name: string; section: string; }
type Vals = z.infer<typeof subjectSchema>;

const Subjects = () => {
  const [rows, setRows] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [open, setOpen] = useState(false);
  const form = useForm<Vals>({ resolver: zodResolver(subjectSchema) as any, defaultValues: { name: "", code: "", class_id: null, fee_amount: 0 } });

  const load = async () => {
    const { data } = await supabase.from("subjects").select("*, classes(name, section)").order("name");
    setRows((data ?? []) as any);
    const { data: c } = await supabase.from("classes").select("id, name, section").order("name");
    setClasses((c ?? []) as ClassRow[]);
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (v: Vals) => {
    const payload = { name: v.name, code: v.code || null, class_id: v.class_id || null, fee_amount: v.fee_amount };
    const { error } = await supabase.from("subjects").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Subject added");
    form.reset();
    setOpen(false);
    load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this subject?")) return;
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subjects"
        description="Create subjects and set Academy fees."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add subject</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New subject</DialogTitle></DialogHeader>
              <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
                <div><Label>Name</Label><Input {...form.register("name")} /></div>
                <div><Label>Code</Label><Input {...form.register("code")} /></div>
                <div>
                  <Label>Class</Label>
                  <Select onValueChange={(v) => form.setValue("class_id", v === "none" ? null : v)}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} – {c.section}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Academy fee (per month)</Label><Input type="number" step="0.01" {...form.register("fee_amount")} /></div>
                <Button type="submit" className="w-full">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      {rows.length === 0 ? (
        <EmptyState title="No subjects yet" description="Add subjects so you can build timetables and exams." />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Class</TableHead><TableHead>Fee</TableHead><TableHead className="w-12" /></TableRow></TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.code ?? "—"}</TableCell>
                  <TableCell>{s.classes ? `${s.classes.name} – ${s.classes.section}` : "—"}</TableCell>
                  <TableCell>{Number(s.fee_amount) > 0 ? `Rs. ${s.fee_amount}` : "—"}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => onDelete(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
export default Subjects;
