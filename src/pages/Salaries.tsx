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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { salaryStructureSchema, salaryPaymentSchema, leaveSchema } from "@/lib/validation";
import { toast } from "sonner";
import { Plus, Banknote } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const Salaries = () => {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const isTeacher = role === "teacher";
  const [structures, setStructures] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [myTeacher, setMyTeacher] = useState<any>(null);

  const [structOpen, setStructOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const sForm = useForm<z.infer<typeof salaryStructureSchema>>({ resolver: zodResolver(salaryStructureSchema) as any });
  const pForm = useForm<z.infer<typeof salaryPaymentSchema>>({ resolver: zodResolver(salaryPaymentSchema) as any, defaultValues: { deductions: 0, bonus: 0 } as any });
  const lForm = useForm<z.infer<typeof leaveSchema>>({ resolver: zodResolver(leaveSchema) as any });

  const load = async () => {
    if (isAdmin) {
      const { data: ts } = await supabase.from("teachers").select("id, employee_id, profiles(full_name)");
      setTeachers(ts ?? []);
      const { data: st } = await supabase.from("salary_structures").select("*, teachers(profiles(full_name))");
      setStructures(st ?? []);
      const { data: ps } = await supabase.from("salary_payments").select("*, teachers(profiles(full_name))").order("created_at", { ascending: false });
      setPayments(ps ?? []);
      const { data: ls } = await supabase.from("leaves").select("*, teachers(profiles(full_name))").order("start_date", { ascending: false });
      setLeaves(ls ?? []);
    } else if (isTeacher && user) {
      const { data: t } = await supabase.from("teachers").select("id, profiles(full_name)").eq("profile_id", user.id).maybeSingle();
      setMyTeacher(t);
      if (t) {
        const { data: st } = await supabase.from("salary_structures").select("*").eq("teacher_id", t.id).maybeSingle();
        setStructures(st ? [st] : []);
        const { data: ps } = await supabase.from("salary_payments").select("*").eq("teacher_id", t.id).order("created_at", { ascending: false });
        setPayments(ps ?? []);
        const { data: ls } = await supabase.from("leaves").select("*").eq("teacher_id", t.id).order("start_date", { ascending: false });
        setLeaves(ls ?? []);
      }
    }
  };
  useEffect(() => { load(); }, [isAdmin, isTeacher, user]);

  const submitStructure = async (v: z.infer<typeof salaryStructureSchema>) => {
    const { error } = await supabase.from("salary_structures").upsert(v, { onConflict: "teacher_id" });
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setStructOpen(false);
    sForm.reset();
    load();
  };
  const submitPayment = async (v: z.infer<typeof salaryPaymentSchema>) => {
    const net = v.base_amount - v.deductions + v.bonus;
    const { error } = await supabase.from("salary_payments").insert({ ...v, net_amount: net, status: "paid", paid_at: format(new Date(), "yyyy-MM-dd") });
    if (error) return toast.error(error.message);
    toast.success("Salary issued");
    setPayOpen(false);
    pForm.reset({ deductions: 0, bonus: 0 } as any);
    load();
  };
  const submitLeave = async (v: z.infer<typeof leaveSchema>) => {
    if (!myTeacher) return;
    const { error } = await supabase.from("leaves").insert({ ...v, teacher_id: myTeacher.id });
    if (error) return toast.error(error.message);
    toast.success("Leave requested");
    setLeaveOpen(false);
    lForm.reset();
    load();
  };
  const setLeaveStatus = async (id: string, status: string) => {
    await supabase.from("leaves").update({ status }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Salaries" description={isAdmin ? "Manage staff salaries and leaves." : "Your salary and leaves."} />
      <Tabs defaultValue={isTeacher ? "payments" : "structures"}>
        <TabsList>
          {isAdmin && <TabsTrigger value="structures">Structures</TabsTrigger>}
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="leaves">Leaves</TabsTrigger>
        </TabsList>

        {isAdmin && (
          <TabsContent value="structures" className="space-y-3">
            <Dialog open={structOpen} onOpenChange={setStructOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Set structure</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Salary structure</DialogTitle></DialogHeader>
                <form className="space-y-3" onSubmit={sForm.handleSubmit(submitStructure)}>
                  <div><Label>Teacher</Label>
                    <Select onValueChange={(v) => sForm.setValue("teacher_id", v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.profiles?.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Base amount</Label><Input type="number" {...sForm.register("base_amount")} /></div>
                  <div><Label>Per-leave deduction</Label><Input type="number" {...sForm.register("per_leave_deduction")} /></div>
                  <Button type="submit" className="w-full">Save</Button>
                </form>
              </DialogContent>
            </Dialog>
            {structures.length === 0 ? <EmptyState title="No structures yet" description="Set base salaries." /> : (
              <div className="rounded-lg border bg-card"><Table>
                <TableHeader><TableRow><TableHead>Teacher</TableHead><TableHead>Base</TableHead><TableHead>Per leave</TableHead></TableRow></TableHeader>
                <TableBody>{structures.map((s: any) => (
                  <TableRow key={s.id}><TableCell>{s.teachers?.profiles?.full_name}</TableCell><TableCell>Rs. {Number(s.base_amount).toLocaleString()}</TableCell><TableCell>Rs. {Number(s.per_leave_deduction).toLocaleString()}</TableCell></TableRow>
                ))}</TableBody>
              </Table></div>
            )}
          </TabsContent>
        )}

        <TabsContent value="payments" className="space-y-3">
          {isAdmin && (
            <Dialog open={payOpen} onOpenChange={setPayOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Issue salary</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Issue salary</DialogTitle></DialogHeader>
                <form className="space-y-3" onSubmit={pForm.handleSubmit(submitPayment)}>
                  <div><Label>Teacher</Label>
                    <Select onValueChange={(v) => pForm.setValue("teacher_id", v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.profiles?.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Period</Label><Input placeholder="Apr 2026" {...pForm.register("period")} /></div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label>Base</Label><Input type="number" {...pForm.register("base_amount")} /></div>
                    <div><Label>Deductions</Label><Input type="number" {...pForm.register("deductions")} /></div>
                    <div><Label>Bonus</Label><Input type="number" {...pForm.register("bonus")} /></div>
                  </div>
                  <div><Label>Notes</Label><Textarea rows={2} {...pForm.register("notes")} /></div>
                  <Button type="submit" className="w-full">Issue</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
          {payments.length === 0 ? <EmptyState title="No payments" description="No salary payments yet." icon={Banknote} /> : (
            <div className="rounded-lg border bg-card overflow-x-auto"><Table>
              <TableHeader><TableRow>{isAdmin && <TableHead>Teacher</TableHead>}<TableHead>Period</TableHead><TableHead>Base</TableHead><TableHead>Net</TableHead><TableHead>Status</TableHead><TableHead>Paid</TableHead></TableRow></TableHeader>
              <TableBody>{payments.map((p: any) => (
                <TableRow key={p.id}>
                  {isAdmin && <TableCell>{p.teachers?.profiles?.full_name}</TableCell>}
                  <TableCell>{p.period}</TableCell>
                  <TableCell>Rs. {Number(p.base_amount).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">Rs. {Number(p.net_amount).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={p.status === "paid" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                  <TableCell>{p.paid_at ? format(new Date(p.paid_at), "MMM d, yyyy") : "—"}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table></div>
          )}
        </TabsContent>

        <TabsContent value="leaves" className="space-y-3">
          {isTeacher && (
            <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Request leave</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Request leave</DialogTitle></DialogHeader>
                <form className="space-y-3" onSubmit={lForm.handleSubmit(submitLeave)}>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Start</Label><Input type="date" {...lForm.register("start_date")} /></div>
                    <div><Label>End</Label><Input type="date" {...lForm.register("end_date")} /></div>
                  </div>
                  <div><Label>Reason</Label><Textarea rows={2} {...lForm.register("reason")} /></div>
                  <Button type="submit" className="w-full">Submit</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
          {leaves.length === 0 ? <EmptyState title="No leaves" description="No leave requests." /> : (
            <div className="rounded-lg border bg-card overflow-x-auto"><Table>
              <TableHeader><TableRow>{isAdmin && <TableHead>Teacher</TableHead>}<TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead>{isAdmin && <TableHead />}</TableRow></TableHeader>
              <TableBody>{leaves.map((l: any) => (
                <TableRow key={l.id}>
                  {isAdmin && <TableCell>{l.teachers?.profiles?.full_name}</TableCell>}
                  <TableCell>{format(new Date(l.start_date), "MMM d")}</TableCell>
                  <TableCell>{format(new Date(l.end_date), "MMM d")}</TableCell>
                  <TableCell className="max-w-xs truncate">{l.reason}</TableCell>
                  <TableCell><Badge variant={l.status === "approved" ? "default" : l.status === "rejected" ? "destructive" : "secondary"}>{l.status}</Badge></TableCell>
                  {isAdmin && (
                    <TableCell className="space-x-1">
                      {l.status === "pending" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setLeaveStatus(l.id, "approved")}>Approve</Button>
                          <Button size="sm" variant="ghost" onClick={() => setLeaveStatus(l.id, "rejected")}>Reject</Button>
                        </>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}</TableBody>
            </Table></div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
export default Salaries;
