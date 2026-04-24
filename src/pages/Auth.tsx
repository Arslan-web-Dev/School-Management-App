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
import { useAuth } from "@/contexts/AuthContext";
import { loginSchema, signupSchema } from "@/lib/validation";
import { School, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

type LoginVals = z.infer<typeof loginSchema>;
type SignupVals = z.infer<typeof signupSchema>;

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"login" | "signup">("login");

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
        data: { full_name: vals.fullName },
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-aurora bg-gradient-mesh p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-40 -left-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-md space-y-8 relative z-10"
      >
        {/* Logo Section with Glassmorphism */}
        <motion.div 
          className="text-center space-y-4"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
        >
          <div className="relative inline-block">
            <motion.div 
              className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-blue-500 to-primary/80 text-primary-foreground shadow-glow-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              animate={{ boxShadow: [
                "0 0 30px -5px hsl(221, 83%, 53%, 0.3)",
                "0 0 50px -5px hsl(221, 83%, 53%, 0.5)",
                "0 0 30px -5px hsl(221, 83%, 53%, 0.3)"
              ]}}
              transition={{ boxShadow: { duration: 3, repeat: Infinity } }}
            >
              <School className="h-10 w-10" />
            </motion.div>
            <motion.div 
              className="absolute -top-1 -right-1 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-full p-1.5 shadow-lg"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Sparkles className="h-4 w-4" />
            </motion.div>
          </div>
          
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-gradient">EduManage Pro</h1>
            <p className="text-muted-foreground text-lg">Smart School Management System</p>
          </div>
        </motion.div>

        {/* Glassmorphism Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
        >
          <Card className="glass-card border-primary/10 shadow-floating overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-blue-500 to-primary" />
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
              <CardDescription className="text-center text-base">
                Sign in or create your school admin account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
                <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-muted/50 rounded-xl">
                  <TabsTrigger 
                    value="login" 
                    className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all"
                  >
                    Sign in
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup"
                    className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all"
                  >
                    Create account
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4">
                  <motion.form 
                    onSubmit={loginForm.handleSubmit(onLogin)} 
                    className="space-y-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-medium">Email Address</Label>
                      <Input 
                        id="login-email" 
                        type="email" 
                        autoComplete="email" 
                        {...loginForm.register("email")}
                        className="h-12 border-2 focus:border-primary/50 transition-all"
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                      <Input 
                        id="login-password" 
                        type="password" 
                        autoComplete="current-password" 
                        {...loginForm.register("password")}
                        className="h-12 border-2 focus:border-primary/50 transition-all"
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 btn-glow text-base font-medium" 
                      disabled={submitting}
                    >
                      {submitting && <Loader2 className="h-5 w-5 animate-spin mr-2" />} 
                      Sign in
                    </Button>
                  </motion.form>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4">
                  <motion.form 
                    onSubmit={signupForm.handleSubmit(onSignup)} 
                    className="space-y-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm font-medium">Full Name</Label>
                      <Input 
                        id="signup-name" 
                        {...signupForm.register("fullName")}
                        className="h-12 border-2 focus:border-primary/50 transition-all"
                      />
                      {signupForm.formState.errors.fullName && (
                        <p className="text-xs text-destructive">{signupForm.formState.errors.fullName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-medium">Email Address</Label>
                      <Input 
                        id="signup-email" 
                        type="email" 
                        autoComplete="email" 
                        {...signupForm.register("email")}
                        className="h-12 border-2 focus:border-primary/50 transition-all"
                      />
                      {signupForm.formState.errors.email && (
                        <p className="text-xs text-destructive">{signupForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                      <Input 
                        id="signup-password" 
                        type="password" 
                        autoComplete="new-password" 
                        {...signupForm.register("password")}
                        className="h-12 border-2 focus:border-primary/50 transition-all"
                      />
                      {signupForm.formState.errors.password && (
                        <p className="text-xs text-destructive">{signupForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 btn-glow text-base font-medium" 
                      disabled={submitting}
                    >
                      {submitting && <Loader2 className="h-5 w-5 animate-spin mr-2" />} 
                      Create account
                    </Button>
                    <p className="text-xs text-muted-foreground text-center bg-muted/50 rounded-lg py-2 px-3">
                      The first account becomes the school administrator
                    </p>
                  </motion.form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Auth;
