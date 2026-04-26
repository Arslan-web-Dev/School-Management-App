import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { loginSchema, signupSchema } from "@/lib/validation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { School, Loader2, ShieldCheck, GraduationCap, Users2, Sparkles, UserPlus, Eye, EyeOff, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type LoginVals = z.infer<typeof loginSchema>;
type SignupVals = z.infer<typeof signupSchema>;
type SelectableRole = "admin" | "teacher" | "parent" | "student";

const ROLE_CARDS: {
  value: SelectableRole;
  label: string;
  hint: string;
  icon: typeof ShieldCheck;
  ring: string;
}[] = [
  { value: "admin",   label: "Admin",   hint: "Full school control",    icon: ShieldCheck,    ring: "ring-primary/40" },
  { value: "teacher", label: "Staff",   hint: "Classroom & attendance", icon: GraduationCap,  ring: "ring-success/40" },
  { value: "parent",  label: "Parent",  hint: "Track your child",       icon: Users2,         ring: "ring-warning/40" },
  { value: "student", label: "Student", hint: "Register as student",    icon: GraduationCap,   ring: "ring-purple/40" },
];

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading, getRoleRedirect } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"login" | "signup" | "register">("login");
  const [selectedRole, setSelectedRole] = useState<SelectableRole>("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usersExist, setUsersExist] = useState<boolean | null>(null);

  // Check if any users exist (for first-user admin signup)
  useEffect(() => {
    const checkUsers = async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      if (!error) {
        setUsersExist(!!count && count > 0);
      }
    };
    checkUsers();
  }, []);

  useEffect(() => {
    if (!loading && user) navigate(getRoleRedirect(), { replace: true });
  }, [user, loading, navigate, getRoleRedirect]);

  const loginForm = useForm<LoginVals>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const signupForm = useForm<SignupVals>({ resolver: zodResolver(signupSchema), defaultValues: { email: "", password: "", fullName: "" } });

  // Student registration schema
  const studentRegisterSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Valid email required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    class_id: z.string().min(1, "Please select a class"),
    roll_number: z.string().optional(),
    date_of_birth: z.string().optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    guardian_name: z.string().min(2, "Guardian name required"),
    guardian_phone: z.string().min(10, "Valid phone number required"),
    address: z.string().optional(),
  }).refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
  type StudentRegisterForm = z.infer<typeof studentRegisterSchema>;
  const studentRegForm = useForm<StudentRegisterForm>({ resolver: zodResolver(studentRegisterSchema), defaultValues: { name: "", email: "", password: "", confirmPassword: "", class_id: "", roll_number: "", guardian_name: "", guardian_phone: "" } });

  // Fetch classes for registration dropdown
  const { data: classes = [] } = useQuery({
    queryKey: ["classes-public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name, grade").order("name");
      if (error) return [];
      return data;
    },
  });

  const onLogin = async (vals: LoginVals) => {
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(vals);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    navigate(getRoleRedirect());
  };

  const onSignup = async (vals: SignupVals) => {
    // Check if users exist - only allow first user to be admin
    const { count, error: countError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (countError) {
      toast.error("Unable to verify signup eligibility");
      return;
    }

    // If users exist, disable public signup for admin/teacher/parent
    if (count && count > 0 && selectedRole !== "student") {
      toast.error("Self-registration is disabled. Please contact an administrator to create your account.");
      return;
    }

    setSubmitting(true);
    const redirectUrl = `${window.location.origin}/dashboard`;
    const { error } = await supabase.auth.signUp({
      email: vals.email,
      password: vals.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: vals.fullName,
          // First-ever signup is always promoted to admin by DB trigger.
          // Otherwise, requested role is used (teacher/parent self-signup is blocked).
          role: selectedRole as AppRole,
        },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created! You can sign in now.");
    setTab("login");
  };

  const onStudentRegister = async (data: StudentRegisterForm) => {
    setSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { name: data.name, role: "student" } },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Account creation failed");
      const userId = authData.user.id;

      const { error: studentError } = await supabase.from("students").insert({
        user_id: userId, name: data.name, email: data.email, class_id: data.class_id,
        roll_number: data.roll_number || null, date_of_birth: data.date_of_birth || null,
        gender: data.gender || null, guardian_name: data.guardian_name,
        guardian_phone: data.guardian_phone, address: data.address || null,
        status: "active", admission_date: new Date().toISOString().split("T")[0],
      });
      if (studentError) throw studentError;

      const { error: roleError } = await supabase.from("user_roles").insert({ user_id: userId, role: "student" });
      if (roleError) throw roleError;

      const { error: profileError } = await supabase.from("profiles").upsert({ id: userId, email: data.email, full_name: data.name });
      if (profileError) console.warn("Profile creation warning:", profileError);

      toast.success("Registration successful! Please check your email to verify.");
      setTab("login");
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-background">
      {/* Left — brand & marketing */}
      <aside className="hidden lg:flex relative overflow-hidden flex-col justify-between p-10 bg-[var(--gradient-primary)] text-primary-foreground">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
             style={{ backgroundImage: "radial-gradient(circle at 20% 20%, hsl(0 0% 100% / 0.25), transparent 40%), radial-gradient(circle at 80% 80%, hsl(0 0% 100% / 0.18), transparent 45%)" }} />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
              <School className="h-6 w-6" />
            </div>
            <div className="leading-tight">
              <p className="text-lg font-semibold">EduManage Pro</p>
              <p className="text-xs text-white/80">Smart School Management</p>
            </div>
          </div>
        </div>

        <div className="relative space-y-6 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/20 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" /> One platform · three control panels
          </div>
          <h2 className="text-4xl font-bold tracking-tight leading-[1.1]">
            Run your school with clarity, not chaos.
          </h2>
          <p className="text-white/85 text-sm leading-relaxed">
            Attendance, fees, salaries, exams, and parent communication — unified in
            a fast, role-based dashboard built for modern institutions.
          </p>

          <ul className="space-y-3 text-sm">
            {[
              "Admin · Full control over students, staff & finances",
              "Staff · Mark attendance, post diary, view salary",
              "Parent · Track your child's day, fees & results",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/90" />
                <span className="text-white/90">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/70">© {new Date().getFullYear()} EduManage Pro</p>
      </aside>

      {/* Right — auth card */}
      <div className="flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden text-center space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/20">
              <School className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">EduManage Pro</h1>
            <p className="text-xs text-muted-foreground">Smart School Management System</p>
          </div>

          <Card className="border-border/60 shadow-xl">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">
                {tab === "login" ? "Sign in to your account" : "Create your account"}
              </CardTitle>
              <CardDescription>
                {tab === "login"
                  ? "Pick your role and continue."
                  : "Choose the role you'll use day-to-day."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Role selector */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  I am a
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {ROLE_CARDS.map((r) => {
                    const active = selectedRole === r.value;
                    const Icon = r.icon;
                    return (
                      <button
                        type="button"
                        key={r.value}
                        onClick={() => setSelectedRole(r.value)}
                        className={cn(
                          "group relative flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all",
                          "hover:border-primary/40 hover:bg-accent/40",
                          active
                            ? "border-primary bg-accent shadow-sm ring-2 ring-offset-1 ring-offset-background " + r.ring
                            : "border-border bg-card"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                            active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className={cn("text-xs font-semibold", active ? "text-foreground" : "text-foreground/80")}>
                          {r.label}
                        </span>
                        <span className="text-[10px] leading-tight text-muted-foreground hidden sm:block">
                          {r.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Warning for admin/teacher/parent signup when users exist */}
                {usersExist && selectedRole !== "student" && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm">
                    <p className="text-amber-800 font-medium">⚠️ Admin approval required</p>
                    <p className="text-amber-700 text-xs mt-1">
                      Self-registration for {ROLE_CARDS.find(r => r.value === selectedRole)?.label} is disabled.
                      Please contact your school administrator to create an account.
                    </p>
                  </div>
                )}
              </div>

              <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup" | "register")}>
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="login">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                  <TabsTrigger value="register" className="flex items-center gap-1"><UserPlus className="w-3.5 h-3.5" />Student</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-0">
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input id="login-email" type="email" autoComplete="email" placeholder="you@school.edu" {...loginForm.register("email")} />
                      {loginForm.formState.errors.email && <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Password</Label>
                      </div>
                      <Input id="login-password" type="password" autoComplete="current-password" placeholder="••••••••" {...loginForm.register("password")} />
                      {loginForm.formState.errors.password && <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Continue as {ROLE_CARDS.find(r => r.value === selectedRole)?.label}
                    </Button>
                    <p className="text-[11px] text-muted-foreground text-center">
                      Your access is determined by the role assigned to your account.
                    </p>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="space-y-0">
                  <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full name</Label>
                      <Input id="signup-name" placeholder="Jane Doe" {...signupForm.register("fullName")} />
                      {signupForm.formState.errors.fullName && <p className="text-xs text-destructive">{signupForm.formState.errors.fullName.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" type="email" autoComplete="email" placeholder="you@school.edu" {...signupForm.register("email")} />
                      {signupForm.formState.errors.email && <p className="text-xs text-destructive">{signupForm.formState.errors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" type="password" autoComplete="new-password" placeholder="At least 6 characters" {...signupForm.register("password")} />
                      {signupForm.formState.errors.password && <p className="text-xs text-destructive">{signupForm.formState.errors.password.message}</p>}
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={submitting || (usersExist === true && selectedRole !== "student")}
                    >
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      {usersExist === true && selectedRole !== "student"
                        ? "Contact Admin to Create Account"
                        : `Create ${ROLE_CARDS.find(r => r.value === selectedRole)?.label} account`}
                    </Button>
                    <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                      {usersExist
                        ? "Self-registration is only available for students. Staff and parent accounts must be created by an administrator."
                        : "The very first account becomes the school administrator regardless of the role selected above."}
                    </p>
                  </form>
                </TabsContent>

                {/* Student Registration Tab */}
                <TabsContent value="register" className="space-y-0">
                  <form onSubmit={studentRegForm.handleSubmit(onStudentRegister)} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="reg-name">Full Name</Label>
                      <Input id="reg-name" placeholder="Muhammad Ali" {...studentRegForm.register("name")} />
                      {studentRegForm.formState.errors.name && <p className="text-xs text-destructive">{studentRegForm.formState.errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">Email</Label>
                      <Input id="reg-email" type="email" placeholder="student@email.com" {...studentRegForm.register("email")} />
                      {studentRegForm.formState.errors.email && <p className="text-xs text-destructive">{studentRegForm.formState.errors.email.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="reg-password">Password</Label>
                        <div className="relative">
                          <Input id="reg-password" type={showPassword ? "text" : "password"} placeholder="Min 8 chars" {...studentRegForm.register("password")} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {studentRegForm.formState.errors.password && <p className="text-xs text-destructive">{studentRegForm.formState.errors.password.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-confirm">Confirm</Label>
                        <div className="relative">
                          <Input id="reg-confirm" type={showConfirmPassword ? "text" : "password"} placeholder="Repeat" {...studentRegForm.register("confirmPassword")} />
                          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {studentRegForm.formState.errors.confirmPassword && <p className="text-xs text-destructive">{studentRegForm.formState.errors.confirmPassword.message}</p>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Class</Label>
                      <Select onValueChange={(v) => studentRegForm.setValue("class_id", v)}>
                        <SelectTrigger><SelectValue placeholder="Select your class" /></SelectTrigger>
                        <SelectContent>
                          {classes.map((cls: any) => (
                            <SelectItem key={cls.id} value={cls.id}>{cls.name}{cls.grade ? ` (Grade ${cls.grade})` : ""}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {studentRegForm.formState.errors.class_id && <p className="text-xs text-destructive">{studentRegForm.formState.errors.class_id.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="reg-roll">Roll Number</Label>
                        <Input id="reg-roll" placeholder="2025-001" {...studentRegForm.register("roll_number")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Gender</Label>
                        <Select onValueChange={(v: any) => studentRegForm.setValue("gender", v)}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-dob">Date of Birth</Label>
                      <Input id="reg-dob" type="date" {...studentRegForm.register("date_of_birth")} />
                    </div>
                    <div className="border-t pt-3 mt-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Guardian Information</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-guardian">Guardian Name</Label>
                      <Input id="reg-guardian" placeholder="Father/Mother name" {...studentRegForm.register("guardian_name")} />
                      {studentRegForm.formState.errors.guardian_name && <p className="text-xs text-destructive">{studentRegForm.formState.errors.guardian_name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-gphone">Guardian Phone</Label>
                      <Input id="reg-gphone" placeholder="03XX-XXXXXXX" {...studentRegForm.register("guardian_phone")} />
                      {studentRegForm.formState.errors.guardian_phone && <p className="text-xs text-destructive">{studentRegForm.formState.errors.guardian_phone.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-address">Address</Label>
                      <Input id="reg-address" placeholder="Street, City" {...studentRegForm.register("address")} />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Register as Student
                    </Button>
                    <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                      <BookOpen className="w-3 h-3 inline mr-1" />
                      Student accounts are linked to your class and guardian.
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Protected by row-level security · Your data stays in your school.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
