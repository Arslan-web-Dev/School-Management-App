import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { noticeSchema } from "@/lib/validation";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Megaphone, Trash2, Pin, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { format } from "date-fns";

type Vals = z.infer<typeof noticeSchema>;

interface NoticeRow {
  id: string;
  title: string;
  body: string;
  audience: "all" | "teachers" | "students";
  pinned: boolean;
  created_at: string;
  author_id: string | null;
  profiles: { full_name: string } | null;
}

const Notices = () => {
  const { user, role } = useAuth();
  const canPost = role === "admin" || role === "teacher";
  const [rows, setRows] = useState<NoticeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<Vals>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(noticeSchema) as any,
    defaultValues: { title: "", body: "", audience: "all", pinned: false },
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("notices")
      .select("id, title, body, audience, pinned, created_at, author_id, profiles:profiles!notices_author_id_fkey(full_name)")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    setRows((data as unknown as NoticeRow[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (vals: Vals) => {
    setSubmitting(true);
    const { error } = await supabase.from("notices").insert({
      title: vals.title,
      body: vals.body,
      audience: vals.audience,
      pinned: vals.pinned,
      author_id: user?.id,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Notice posted");
    setOpen(false);
    form.reset();
    load();
  };

  const onDelete = async (n: NoticeRow) => {
    if (!confirm(`Delete "${n.title}"?`)) return;
    const { error } = await supabase.from("notices").delete().eq("id", n.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Notice deleted");
    load();
  };

  const togglePin = async (n: NoticeRow) => {
    const { error } = await supabase.from("notices").update({ pinned: !n.pinned }).eq("id", n.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notices"
        description="Stay up to date with school announcements."
        actions={canPost && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Post notice</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Post notice</DialogTitle></DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit as never)} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Title</Label>
                  <Input {...form.register("title")} />
                  {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Body</Label>
                  <Textarea rows={5} {...form.register("body")} />
                  {form.formState.errors.body && <p className="text-xs text-destructive">{form.formState.errors.body.message}</p>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Audience</Label>
                    <Select defaultValue="all" onValueChange={(v) => form.setValue("audience", v as Vals["audience"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Everyone</SelectItem>
                        <SelectItem value="teachers">Teachers</SelectItem>
                        <SelectItem value="students">Students</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <Label className="text-xs cursor-pointer" htmlFor="pinned">Pin to top</Label>
                    <Switch id="pinned" onCheckedChange={(c) => form.setValue("pinned", c)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Publish
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Megaphone} title="No notices yet" description="Important announcements will appear here." />
      ) : (
        <div className="space-y-3">
          {rows.map((n) => (
            <Card key={n.id} className={n.pinned ? "border-primary/30 bg-accent/30" : ""}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {n.pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                      <h3 className="font-semibold">{n.title}</h3>
                      <Badge variant="outline" className="capitalize text-xs">{n.audience}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.body}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {n.profiles?.full_name && <>By {n.profiles.full_name} • </>}
                      {format(new Date(n.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  {(role === "admin" || n.author_id === user?.id) && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => togglePin(n)} aria-label="Toggle pin">
                        <Pin className={`h-4 w-4 ${n.pinned ? "text-primary" : ""}`} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(n)} aria-label="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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

export default Notices;
