import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users, UserPlus, ShieldCheck, GraduationCap, Users2, Trash2, RefreshCw, Mail, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";

// Create user schema
const createUserSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Full name is required"),
  role: z.enum(["teacher", "parent", "admin"]),
  phone: z.string().optional(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string | null;
  created_at: string;
  is_active: boolean;
}

const ROLE_ICONS = {
  admin: ShieldCheck,
  teacher: GraduationCap,
  parent: Users2,
  student: Users,
};

const ROLE_COLORS = {
  admin: "bg-amber-100 text-amber-800 border-amber-200",
  teacher: "bg-green-100 text-green-800 border-green-200",
  parent: "bg-blue-100 text-blue-800 border-blue-200",
  student: "bg-purple-100 text-purple-800 border-purple-200",
};

const AdminUsers = () => {
  const { role: currentRole } = useAuth();
  const [activeTab, setActiveTab] = useState("create");
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
      role: "teacher",
      phone: "",
    },
  });

  // Fetch users with roles
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Get profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, created_at");

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Merge data
      const mergedUsers = (profiles || []).map((profile: any) => {
        const userRole = roles?.find((r: any) => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || "unknown",
          is_active: true, // Could be enhanced with actual status
        };
      });

      // Sort: admins first, then by name
      mergedUsers.sort((a: UserWithRole, b: UserWithRole) => {
        const roleOrder = { admin: 0, teacher: 1, parent: 2, student: 3, unknown: 4 };
        if (roleOrder[a.role as keyof typeof roleOrder] !== roleOrder[b.role as keyof typeof roleOrder]) {
          return roleOrder[a.role as keyof typeof roleOrder] - roleOrder[b.role as keyof typeof roleOrder];
        }
        return a.full_name.localeCompare(b.full_name);
      });

      setUsers(mergedUsers);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onCreateUser = async (values: CreateUserForm) => {
    setCreating(true);
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
            role: values.role,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed");

      const userId = authData.user.id;

      // Update profile with phone
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ phone: values.phone || null })
        .eq("id", userId);

      if (profileError) {
        console.warn("Profile update warning:", profileError);
      }

      // Assign role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: values.role });

      if (roleError) throw roleError;

      toast.success(`${values.role} account created for ${values.fullName}`);
      form.reset();
      fetchUsers(); // Refresh user list
      setActiveTab("manage"); // Switch to manage tab
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const onDeleteUser = async (user: UserWithRole) => {
    setDeleting(user.id);
    try {
      // Note: Actual user deletion requires admin/service role key
      // This is a simplified version that removes from our tables
      // In production, you'd call an Edge Function or API route

      // Remove role
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.id);

      if (roleError) throw roleError;

      // Note: We don't delete from auth.users here as that requires service role
      // Instead, we just remove their role which effectively disables their access

      toast.success(`User ${user.full_name} has been deactivated`);
      fetchUsers();
      setUserToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to deactivate user");
    } finally {
      setDeleting(null);
    }
  };

  const filteredUsers = (role: string) => users.filter((u) => u.role === role);

  if (currentRole !== "admin") {
    return (
      <div className="space-y-6">
        <PageHeader title="User Management" description="Admin-only access" />
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Only administrators can access user management.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Create and manage staff and parent accounts"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Create Account
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Manage Users ({users.length})
          </TabsTrigger>
        </TabsList>

        {/* Create User Tab */}
        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Create New Account
              </CardTitle>
              <CardDescription>
                Create accounts for teachers, parents, or additional administrators.
                An email will be sent to the user with login instructions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onCreateUser)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      placeholder="Muhammad Ahmad"
                      {...form.register("fullName")}
                    />
                    {form.formState.errors.fullName && (
                      <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="teacher@school.edu"
                      {...form.register("email")}
                    />
                    {form.formState.errors.email && (
                      <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Min 8 characters"
                      {...form.register("password")}
                    />
                    {form.formState.errors.password && (
                      <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      placeholder="+92-300-1234567"
                      {...form.register("phone")}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Account Type *</Label>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { value: "teacher", label: "Teacher/Staff", icon: GraduationCap, desc: "Can mark attendance, post diary" },
                        { value: "parent", label: "Parent", icon: Users2, desc: "Can view child's data" },
                        { value: "admin", label: "Administrator", icon: ShieldCheck, desc: "Full system access" },
                      ].map((role) => {
                        const Icon = role.icon;
                        const selected = form.watch("role") === role.value;
                        return (
                          <button
                            key={role.value}
                            type="button"
                            onClick={() => form.setValue("role", role.value as any)}
                            className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all ${
                              selected
                                ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-2"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <Icon className={`h-6 w-6 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                            <div>
                              <p className={`font-medium ${selected ? "text-primary" : ""}`}>{role.label}</p>
                              <p className="text-xs text-muted-foreground">{role.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create {form.watch("role")} Account
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Type Reference</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-amber-100">
                    <ShieldCheck className="h-4 w-4 text-amber-700" />
                  </div>
                  <div>
                    <p className="font-medium">Administrator</p>
                    <p className="text-sm text-muted-foreground">
                      Full system control. Can create users, manage settings, view all data,
                      issue salaries, and generate reports.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-green-100">
                    <GraduationCap className="h-4 w-4 text-green-700" />
                  </div>
                  <div>
                    <p className="font-medium">Teacher/Staff</p>
                    <p className="text-sm text-muted-foreground">
                      Can mark student attendance for assigned classes, post class diary entries,
                      view own schedule and salary details. Cannot access other teachers' data.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-100">
                    <Users2 className="h-4 w-4 text-blue-700" />
                  </div>
                  <div>
                    <p className="font-medium">Parent</p>
                    <p className="text-sm text-muted-foreground">
                      Read-only access to their children's data including attendance, grades,
                      diary entries, and fee status. Can use fee calculator for Academy.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Users Tab */}
        <TabsContent value="manage" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            {["admin", "teacher", "parent", "student"].map((role) => {
              const count = filteredUsers(role).length;
              const Icon = ROLE_ICONS[role as keyof typeof ROLE_ICONS];
              return (
                <Card key={role} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${ROLE_COLORS[role as keyof typeof ROLE_COLORS]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground capitalize">{role}s</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>All Users</span>
                <Button variant="outline" size="sm" onClick={fetchUsers}>
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
              ) : users.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 opacity-20" />
                  <p className="mt-2">No users found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const Icon = ROLE_ICONS[user.role as keyof typeof ROLE_ICONS] || Users;
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {user.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${ROLE_COLORS[user.role as keyof typeof ROLE_COLORS]} capitalize`}>
                              <Icon className="mr-1 h-3 w-3" />
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.phone || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setUserToDelete(user)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Deactivate User</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to deactivate {user.full_name}? This will remove their role
                                    and prevent them from accessing the system. This action cannot be undone easily.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <DialogClose asChild>
                                    <Button variant="outline">Cancel</Button>
                                  </DialogClose>
                                  <Button
                                    variant="destructive"
                                    onClick={() => onDeleteUser(user)}
                                    disabled={deleting === user.id}
                                  >
                                    {deleting === user.id ? (
                                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="mr-2 h-4 w-4" />
                                    )}
                                    Deactivate
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminUsers;
