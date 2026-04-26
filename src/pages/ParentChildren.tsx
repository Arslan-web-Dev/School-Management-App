import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users, Baby, Link2, Trash2, Plus, RefreshCw, GraduationCap, Users2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";

// Link schema
const linkSchema = z.object({
  parent_id: z.string().uuid("Select a parent"),
  student_id: z.string().uuid("Select a student"),
  relation: z.enum(["father", "mother", "guardian"]).default("father"),
});

type LinkForm = z.infer<typeof linkSchema>;

interface Parent {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
}

interface Student {
  id: string;
  name: string;
  roll_number: string | null;
  class_name: string;
  email: string;
}

interface ParentChildLink {
  id: string;
  parent_id: string;
  parent_name: string;
  parent_email: string;
  student_id: string;
  student_name: string;
  student_class: string;
  relation: string;
  created_at: string;
}

const RELATION_LABELS = {
  father: "👨 Father",
  mother: "👩 Mother",
  guardian: "👤 Guardian",
};

const ParentChildren = () => {
  const { role: currentRole } = useAuth();
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [links, setLinks] = useState<ParentChildLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [linkToDelete, setLinkToDelete] = useState<ParentChildLink | null>(null);

  const form = useForm<LinkForm>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      parent_id: "",
      student_id: "",
      relation: "father",
    },
  });

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch parents (profiles with parent role)
      const { data: parentRoles, error: parentRolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "parent");

      if (parentRolesError) throw parentRolesError;

      const parentIds = parentRoles?.map((pr: any) => pr.user_id) || [];

      let parentsData: Parent[] = [];
      if (parentIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", parentIds)
          .order("full_name");

        if (profilesError) throw profilesError;
        parentsData = profiles || [];
      }
      setParents(parentsData);

      // Fetch students with class info
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, name, roll_number, email, classes(name, section)")
        .order("name");

      if (studentsError) throw studentsError;

      const formattedStudents = (studentsData || []).map((s: any) => ({
        ...s,
        class_name: s.classes ? `${s.classes.name} ${s.classes.section}` : "Unknown",
      }));
      setStudents(formattedStudents);

      // Fetch existing links
      const { data: linksData, error: linksError } = await supabase
        .from("parent_children")
        .select("*")
        .order("created_at", { ascending: false });

      if (linksError) throw linksError;

      // Enrich links with names
      const enrichedLinks = (linksData || []).map((l: any) => {
        const parent = parentsData.find((p) => p.id === l.parent_id);
        const student = formattedStudents.find((s: any) => s.id === l.student_id);

        return {
          ...l,
          parent_name: parent?.full_name || "Unknown",
          parent_email: parent?.email || "",
          student_name: student?.name || "Unknown",
          student_class: student?.class_name || "Unknown",
        };
      });

      setLinks(enrichedLinks);
    } catch (error: any) {
      toast.error(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onCreateLink = async (values: LinkForm) => {
    setSaving(true);
    try {
      // Check for duplicate link
      const { data: existing } = await supabase
        .from("parent_children")
        .select("id")
        .eq("parent_id", values.parent_id)
        .eq("student_id", values.student_id)
        .single();

      if (existing) {
        toast.error("This parent is already linked to this student");
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("parent_children").insert({
        parent_id: values.parent_id,
        student_id: values.student_id,
        relation: values.relation,
      });

      if (error) throw error;

      toast.success("Parent linked to student successfully");
      form.reset();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create link");
    } finally {
      setSaving(false);
    }
  };

  const onDeleteLink = async (link: ParentChildLink) => {
    setDeleting(link.id);
    try {
      const { error } = await supabase
        .from("parent_children")
        .delete()
        .eq("id", link.id);

      if (error) throw error;

      toast.success("Parent-child link removed");
      fetchData();
      setLinkToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to remove link");
    } finally {
      setDeleting(null);
    }
  };

  const getLinksByParent = () => {
    const grouped: Record<string, ParentChildLink[]> = {};
    links.forEach((l) => {
      if (!grouped[l.parent_id]) grouped[l.parent_id] = [];
      grouped[l.parent_id].push(l);
    });
    return grouped;
  };

  if (currentRole !== "admin") {
    return (
      <div className="space-y-6">
        <PageHeader title="Parent-Children Links" description="Admin-only access" />
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Only administrators can manage parent-child relationships.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const linksByParent = getLinksByParent();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parent-Children Links"
        description="Link parents to their children. This controls which student data parents can access."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr,1.5fr]">
        {/* Create Link Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Link Parent to Child
            </CardTitle>
            <CardDescription>
              Parents will only be able to view data for students they are linked to.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onCreateLink)} className="space-y-4">
              <div className="space-y-2">
                <Label>Parent *</Label>
                <Select
                  value={form.watch("parent_id")}
                  onValueChange={(v) => form.setValue("parent_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a parent" />
                  </SelectTrigger>
                  <SelectContent>
                    {parents.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex flex-col">
                          <span>{p.full_name}</span>
                          <span className="text-xs text-muted-foreground">{p.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.parent_id && (
                  <p className="text-xs text-destructive">{form.formState.errors.parent_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Student *</Label>
                <Select
                  value={form.watch("student_id")}
                  onValueChange={(v) => form.setValue("student_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex flex-col">
                          <span>{s.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {s.class_name} {s.roll_number && `• Roll ${s.roll_number}`}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.student_id && (
                  <p className="text-xs text-destructive">{form.formState.errors.student_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Relation</Label>
                <Select
                  value={form.watch("relation")}
                  onValueChange={(v: "father" | "mother" | "guardian") => form.setValue("relation", v)}
                >
                  <SelectContent>
                    {Object.entries(RELATION_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    Link Parent to Child
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <Users2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{parents.length}</p>
                  <p className="text-xs text-muted-foreground">Parents</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{students.length}</p>
                  <p className="text-xs text-muted-foreground">Students</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                  <Link2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{links.length}</p>
                  <p className="text-xs text-muted-foreground">Links</p>
                </div>
              </div>
            </Card>
          </div>

          {/* By Parent View */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Links by Parent</span>
                <Button variant="outline" size="sm" onClick={fetchData}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : Object.keys(linksByParent).length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 opacity-20" />
                  <p className="mt-2">No parent-child links yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(linksByParent).map(([parentId, parentLinks]) => {
                    const parent = parents.find((p) => p.id === parentId);
                    return (
                      <div key={parentId} className="rounded-lg border p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium">{parent?.full_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{parent?.email}</p>
                          </div>
                          <Badge variant="outline">{parentLinks.length} children</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {parentLinks.map((l) => (
                            <div
                              key={l.id}
                              className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm"
                            >
                              <Baby className="h-3 w-3" />
                              <span>{l.student_name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {RELATION_LABELS[l.relation as keyof typeof RELATION_LABELS]}
                              </Badge>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <button
                                    className="ml-1 text-destructive hover:text-destructive/80"
                                    onClick={() => setLinkToDelete(l)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Remove Link</DialogTitle>
                                    <DialogDescription>
                                      Remove {parent?.full_name}'s access to {l.student_name}?
                                      They will no longer be able to view this child's data.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <DialogClose asChild>
                                      <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <Button
                                      variant="destructive"
                                      onClick={() => onDeleteLink(l)}
                                      disabled={deleting === l.id}
                                    >
                                      {deleting === l.id ? (
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="mr-2 h-4 w-4" />
                                      )}
                                      Remove
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* All Links Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Parent-Child Links</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : links.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No parent-child links created yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parent</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Relation</TableHead>
                  <TableHead>Linked</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{l.parent_name}</p>
                        <p className="text-xs text-muted-foreground">{l.parent_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{l.student_name}</TableCell>
                    <TableCell>{l.student_class}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {RELATION_LABELS[l.relation as keyof typeof RELATION_LABELS]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(l.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setLinkToDelete(l)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Remove Link</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to remove the link between {l.parent_name} and {l.student_name}?
                              The parent will no longer be able to view this child's data.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button
                              variant="destructive"
                              onClick={() => onDeleteLink(l)}
                              disabled={deleting === l.id}
                            >
                              {deleting === l.id ? (
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                              )}
                              Remove
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentChildren;
