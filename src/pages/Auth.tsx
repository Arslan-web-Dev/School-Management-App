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
import { School, Loader2, ShieldCheck, GraduationCap, Users2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type LoginVals = z.infer<typeof loginSchema>;
type SignupVals = z.infer<typeof signupSchema>;
type SelectableRole = "admin" | "teacher" | "parent";

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
];

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [selectedRole, setSelectedRole] = useState<SelectableRole>("admin");

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  const loginForm = useForm<LoginVals>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const signupForm = useForm<SignupVals>({ resolver: zodResolver(signupSchema), defaultValues: { email: "", password: "", fullName: "" } });

  const onLogin = async (vals: LoginVals) => {
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(vals);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    navigate("/dashboard");
  };

  const onSignup = async (vals: SignupVals) => {
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
          // Otherwise, requested role is used (teacher/parent self-signup is allowed here).
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
              </div>

              <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="login">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
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
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Create {ROLE_CARDS.find(r => r.value === selectedRole)?.label} account
                    </Button>
                    <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                      The very first account becomes the school administrator regardless of the
                      role selected above.
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
