import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { diarySchema } from "@/lib/validation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { format } from "date-fns";

interface Entry { id: string; class_id: string; subject_id: string | null; date: string; homework: string | null; notes: string | null; classes: { name: string; section: string } | null; subjects: { name: string } | null; }
type Vals = z.infer<typeof diarySchema>;

const Diary = () => {
  const { role, user } = useAuth();
  const canPost = role === "admin" || role === "teacher";
  const [entries, setEntries] = useState<Entry[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const form = useForm<Vals>({ resolver: zodResolver(diarySchema) as any, defaultValues: { date: format(new Date(), "yyyy-MM-dd"), homework: "", notes: "" } as any });

  const load = async () => {
    const { data } = await supabase.from("class_diary").select("*, classes(name, section), subjects(name)").order("date", { ascending: false }).limit(50);
    setEntries((data ?? []) as any);
  };
  useEffect(() => {
    load();
    supabase.from("classes").select("id, name, section").then(({ data }) => setClasses(data ?? []));
    supabase.from("subjects").select("id, name").then(({ data }) => setSubjects(data ?? []));
  }, []);

  const onSubmit = async (v: Vals) => {
    const { error } = await supabase.from("class_diary").insert({
      class_id: v.class_id, subject_id: v.subject_id || null, date: v.date,
      homework: v.homework || null, notes: v.notes || null, posted_by: user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Diary posted");
    form.reset({ date: format(new Date(), "yyyy-MM-dd") } as any);
    setOpen(false);
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Diary"
        description="Daily homework and notes for each class."
        actions={canPost ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Post entry</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New diary entry</DialogTitle></DialogHeader>
              <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
                <div><Label>Class</Label>
                  <Select onValueChange={(v) => form.setValue("class_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} – {c.section}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Subject (optional)</Label>
                  <Select onValueChange={(v) => form.setValue("subject_id", v === "none" ? null : v)}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">None</SelectItem>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Date</Label><Input type="date" {...form.register("date")} /></div>
                <div><Label>Homework</Label><Textarea rows={3} {...form.register("homework")} /></div>
                <div><Label>Notes</Label><Textarea rows={3} {...form.register("notes")} /></div>
                <Button type="submit" className="w-full">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        ) : undefined}
      />
      {entries.length === 0 ? (
        <EmptyState title="No diary entries" description={canPost ? "Post the first entry." : "No entries yet."} />
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <Card key={e.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{e.classes?.name} – {e.classes?.section} {e.subjects?.name && `· ${e.subjects.name}`}</CardTitle>
                    <CardDescription>{format(new Date(e.date), "MMM d, yyyy")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {e.homework && <div><span className="font-medium">Homework: </span>{e.homework}</div>}
                {e.notes && <div className="text-muted-foreground">{e.notes}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
export default Diary;
