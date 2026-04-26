import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { GraduationCap, BookOpen, Users, Trash2, Plus, RefreshCw, UserCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";

// Assignment schema
const assignmentSchema = z.object({
  teacher_id: z.string().uuid("Select a teacher"),
  class_id: z.string().uuid("Select a class"),
  subject_id: z.string().uuid("Select a subject").optional(),
});

type AssignmentForm = z.infer<typeof assignmentSchema>;

interface Teacher {
  id: string;
  full_name: string;
  email: string;
}

interface Class {
  id: string;
  name: string;
  section: string;
}

interface Subject {
  id: string;
  name: string;
  code: string | null;
}

interface ClassAssignment {
  id: string;
  teacher_id: string;
  teacher_name: string;
  teacher_email: string;
  class_id: string;
  class_name: string;
  subject_id: string | null;
  subject_name: string | null;
  created_at: string;
}

const ClassAssignments = () => {
  const { role: currentRole } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<ClassAssignment | null>(null);

  const form = useForm<AssignmentForm>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      teacher_id: "",
      class_id: "",
      subject_id: undefined,
    },
  });

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch teachers (profiles with teacher role)
      const { data: teacherRoles, error: teacherRolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");

      if (teacherRolesError) throw teacherRolesError;

      const teacherIds = teacherRoles?.map((tr: any) => tr.user_id) || [];

      let teachersData: Teacher[] = [];
      if (teacherIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", teacherIds)
          .order("full_name");

        if (profilesError) throw profilesError;
        teachersData = profiles || [];
      }
      setTeachers(teachersData);

      // Fetch classes
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("id, name, section")
        .order("name");

      if (classesError) throw classesError;
      setClasses(classesData || []);

      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select("id, name, code")
        .order("name");

      if (subjectsError) throw subjectsError;
      setSubjects(subjectsData || []);

      // Fetch existing assignments with details
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("class_assignments")
        .select("*")
        .order("created_at", { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Enrich assignments with names
      const enrichedAssignments = (assignmentsData || []).map((a: any) => {
        const teacher = teachersData.find((t) => t.id === a.teacher_id);
        const cls = (classesData || []).find((c: any) => c.id === a.class_id);
        const subject = (subjectsData || []).find((s: any) => s.id === a.subject_id);

        return {
          ...a,
          teacher_name: teacher?.full_name || "Unknown",
          teacher_email: teacher?.email || "",
          class_name: cls ? `${cls.name} ${cls.section}` : "Unknown",
          subject_name: subject?.name || null,
        };
      });

      setAssignments(enrichedAssignments);
    } catch (error: any) {
      toast.error(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onCreateAssignment = async (values: AssignmentForm) => {
    setSaving(true);
    try {
      // Check for duplicate assignment
      const { data: existing } = await supabase
        .from("class_assignments")
        .select("id")
        .eq("teacher_id", values.teacher_id)
        .eq("class_id", values.class_id)
        .eq("subject_id", values.subject_id || null)
        .single();

      if (existing) {
        toast.error("This teacher is already assigned to this class/subject");
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("class_assignments").insert({
        teacher_id: values.teacher_id,
        class_id: values.class_id,
        subject_id: values.subject_id || null,
      });

      if (error) throw error;

      toast.success("Teacher assigned to class successfully");
      form.reset();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create assignment");
    } finally {
      setSaving(false);
    }
  };

  const onDeleteAssignment = async (assignment: ClassAssignment) => {
    setDeleting(assignment.id);
    try {
      const { error } = await supabase
        .from("class_assignments")
        .delete()
        .eq("id", assignment.id);

      if (error) throw error;

      toast.success("Assignment removed");
      fetchData();
      setAssignmentToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to remove assignment");
    } finally {
      setDeleting(null);
    }
  };

  const getAssignmentsByTeacher = () => {
    const grouped: Record<string, ClassAssignment[]> = {};
    assignments.forEach((a) => {
      if (!grouped[a.teacher_id]) grouped[a.teacher_id] = [];
      grouped[a.teacher_id].push(a);
    });
    return grouped;
  };

  if (currentRole !== "admin") {
    return (
      <div className="space-y-6">
        <PageHeader title="Class Assignments" description="Admin-only access" />
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Only administrators can manage class assignments.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const assignmentsByTeacher = getAssignmentsByTeacher();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Assignments"
        description="Assign teachers to specific classes and subjects. This controls which classes teachers can access."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr,1.5fr]">
        {/* Create Assignment Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Assign Teacher to Class
            </CardTitle>
            <CardDescription>
              Teachers will only be able to access and mark attendance for classes they are assigned to.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onCreateAssignment)} className="space-y-4">
              <div className="space-y-2">
                <Label>Teacher *</Label>
                <Select
                  value={form.watch("teacher_id")}
                  onValueChange={(v) => form.setValue("teacher_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex flex-col">
                          <span>{t.full_name}</span>
                          <span className="text-xs text-muted-foreground">{t.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.teacher_id && (
                  <p className="text-xs text-destructive">{form.formState.errors.teacher_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Class *</Label>
                <Select
                  value={form.watch("class_id")}
                  onValueChange={(v) => form.setValue("class_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.class_id && (
                  <p className="text-xs text-destructive">{form.formState.errors.class_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Subject (Optional)</Label>
                <Select
                  value={form.watch("subject_id") || "no-subject"}
                  onValueChange={(v) => form.setValue("subject_id", v === "no-subject" ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All subjects for this class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-subject">All subjects (class teacher)</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.code && `(${s.code})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Assign Teacher
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
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{teachers.length}</p>
                  <p className="text-xs text-muted-foreground">Teachers</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{classes.length}</p>
                  <p className="text-xs text-muted-foreground">Classes</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{assignments.length}</p>
                  <p className="text-xs text-muted-foreground">Assignments</p>
                </div>
              </div>
            </Card>
          </div>

          {/* By Teacher View */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Assignments by Teacher</span>
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
              ) : Object.keys(assignmentsByTeacher).length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 opacity-20" />
                  <p className="mt-2">No assignments yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(assignmentsByTeacher).map(([teacherId, teacherAssignments]) => {
                    const teacher = teachers.find((t) => t.id === teacherId);
                    return (
                      <div key={teacherId} className="rounded-lg border p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium">{teacher?.full_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{teacher?.email}</p>
                          </div>
                          <Badge variant="outline">{teacherAssignments.length} classes</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {teacherAssignments.map((a) => (
                            <div
                              key={a.id}
                              className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm"
                            >
                              <BookOpen className="h-3 w-3" />
                              <span>{a.class_name}</span>
                              {a.subject_name && (
                                <span className="text-muted-foreground">• {a.subject_name}</span>
                              )}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <button
                                    className="ml-1 text-destructive hover:text-destructive/80"
                                    onClick={() => setAssignmentToDelete(a)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Remove Assignment</DialogTitle>
                                    <DialogDescription>
                                      Remove {teacher?.full_name} from {a.class_name}?
                                      They will no longer be able to access this class.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <DialogClose asChild>
                                      <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <Button
                                      variant="destructive"
                                      onClick={() => onDeleteAssignment(a)}
                                      disabled={deleting === a.id}
                                    >
                                      {deleting === a.id ? (
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

      {/* All Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No assignments created yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{a.teacher_name}</p>
                        <p className="text-xs text-muted-foreground">{a.teacher_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{a.class_name}</TableCell>
                    <TableCell>{a.subject_name || <span className="text-muted-foreground">All subjects</span>}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setAssignmentToDelete(a)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Remove Assignment</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to remove {a.teacher_name} from {a.class_name}?
                              They will no longer be able to mark attendance or post diary for this class.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button
                              variant="destructive"
                              onClick={() => onDeleteAssignment(a)}
                              disabled={deleting === a.id}
                            >
                              {deleting === a.id ? (
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

export default ClassAssignments;
