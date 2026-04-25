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
import { invoiceSchema } from "@/lib/validation";
import { toast } from "sonner";
import { Plus, BadgeDollarSign } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Invoice { id: string; student_id: string; period: string; amount: number; discount: number; due_date: string; status: string; notes: string | null; students: { id: string; roll_number: string; profiles: { full_name: string } | null } | null; }
type IVals = z.infer<typeof invoiceSchema>;

const Fees = () => {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<string>("");
  const form = useForm<IVals>({ resolver: zodResolver(invoiceSchema) as any, defaultValues: { discount: 0, due_date: format(new Date(), "yyyy-MM-dd") } as any });

  const load = async () => {
    const { data } = await supabase
      .from("fee_invoices")
      .select("*, students(id, roll_number, profiles(full_name))")
      .order("due_date", { ascending: false });
    setInvoices((data ?? []) as any);
  };
  useEffect(() => {
    load();
    if (isAdmin) supabase.from("students").select("id, roll_number, profiles(full_name)").then(({ data }) => setStudents(data ?? []));
  }, [isAdmin]);

  const onSubmit = async (v: IVals) => {
    const { error } = await supabase.from("fee_invoices").insert({
      student_id: v.student_id, period: v.period, amount: v.amount,
      discount: v.discount, due_date: v.due_date, notes: v.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Invoice created");
    form.reset({ discount: 0, due_date: format(new Date(), "yyyy-MM-dd") } as any);
    setOpen(false);
    load();
  };

  const recordPayment = async () => {
    if (!payOpen) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) return toast.error("Enter amount");
    const { error } = await supabase.from("fee_payments").insert({ invoice_id: payOpen.id, amount: amt, recorded_by: user?.id });
    if (error) return toast.error(error.message);
    // Mark invoice paid if amount covers
    const total = Number(payOpen.amount) - Number(payOpen.discount);
    if (amt >= total) await supabase.from("fee_invoices").update({ status: "paid" }).eq("id", payOpen.id);
    toast.success("Payment recorded");
    setPayOpen(null);
    setPayAmount("");
    load();
  };

  const totalDue = invoices.filter((i) => i.status !== "paid").reduce((a, b) => a + Number(b.amount) - Number(b.discount), 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((a, b) => a + Number(b.amount) - Number(b.discount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fees"
        description={isAdmin ? "Manage invoices and payments." : "Your fee history."}
        actions={isAdmin ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> New invoice</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create invoice</DialogTitle></DialogHeader>
              <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
                <div><Label>Student</Label>
                  <Select onValueChange={(v) => form.setValue("student_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.profiles?.full_name} ({s.roll_number})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Period</Label><Input placeholder="e.g. Apr 2026" {...form.register("period")} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Amount</Label><Input type="number" step="0.01" {...form.register("amount")} /></div>
                  <div><Label>Discount</Label><Input type="number" step="0.01" {...form.register("discount")} /></div>
                </div>
                <div><Label>Due date</Label><Input type="date" {...form.register("due_date")} /></div>
                <div><Label>Notes</Label><Textarea rows={2} {...form.register("notes")} /></div>
                <Button type="submit" className="w-full">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        ) : undefined}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardHeader><CardDescription>Total invoices</CardDescription><CardTitle>{invoices.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Outstanding</CardDescription><CardTitle className="text-destructive">Rs. {totalDue.toLocaleString()}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Paid</CardDescription><CardTitle className="text-primary">Rs. {totalPaid.toLocaleString()}</CardTitle></CardHeader></Card>
      </div>

      {invoices.length === 0 ? (
        <EmptyState title="No invoices" description={isAdmin ? "Create the first invoice." : "No fees recorded yet."} icon={BadgeDollarSign} />
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Period</TableHead><TableHead>Amount</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead>{isAdmin && <TableHead />}</TableRow></TableHeader>
            <TableBody>
              {invoices.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.students?.profiles?.full_name}<div className="text-xs text-muted-foreground">{i.students?.roll_number}</div></TableCell>
                  <TableCell>{i.period}</TableCell>
                  <TableCell>Rs. {(Number(i.amount) - Number(i.discount)).toLocaleString()}</TableCell>
                  <TableCell>{format(new Date(i.due_date), "MMM d")}</TableCell>
                  <TableCell><Badge variant={i.status === "paid" ? "default" : "destructive"}>{i.status}</Badge></TableCell>
                  {isAdmin && <TableCell>{i.status !== "paid" && <Button size="sm" variant="outline" onClick={() => { setPayOpen(i); setPayAmount(String(Number(i.amount) - Number(i.discount))); }}>Mark paid</Button>}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!payOpen} onOpenChange={(o) => !o && setPayOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{payOpen?.students?.profiles?.full_name} · {payOpen?.period}</p>
            <div><Label>Amount paid</Label><Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} /></div>
            <Button onClick={recordPayment} className="w-full">Record</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default Fees;
