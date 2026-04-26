import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { invoiceSchema } from "@/lib/validation";
import { toast } from "sonner";
import { Plus, BadgeDollarSign, Sparkles, CreditCard } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Invoice {
  id: string; student_id: string; period: string; amount: number; discount: number;
  due_date: string; status: string; notes: string | null; paid_at: string | null;
  students: { id: string; roll_number: string; profiles: { full_name: string } | null } | null;
}
type IVals = z.infer<typeof invoiceSchema>;

const Fees = () => {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const isParent = role === "parent";
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [payOpen, setPayOpen] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState<string>("cash");
  const [txnRef, setTxnRef] = useState<string>("");

  // Bulk gen state
  const [bulkClass, setBulkClass] = useState<string>("");
  const [bulkPeriod, setBulkPeriod] = useState<string>(format(new Date(), "MMM yyyy"));
  const [bulkAmount, setBulkAmount] = useState<string>("");
  const [bulkDue, setBulkDue] = useState<string>(format(new Date(), "yyyy-MM-dd"));

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
    if (isAdmin) {
      supabase.from("students").select("id, roll_number, profiles(full_name)").then(({ data }) => setStudents(data ?? []));
      supabase.from("classes").select("id, name, section").then(({ data }) => setClasses(data ?? []));
    }
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

  const generateBulk = async () => {
    if (!bulkClass || !bulkPeriod || !bulkAmount || !bulkDue) return toast.error("Fill all fields");
    const { data, error } = await supabase.rpc("generate_monthly_invoices", {
      _class_id: bulkClass, _period: bulkPeriod, _due_date: bulkDue, _amount: Number(bulkAmount),
    });
    if (error) return toast.error(error.message);
    toast.success(`Generated ${data ?? 0} invoices for ${bulkPeriod}`);
    setBulkOpen(false);
    load();
  };

  const recordPayment = async () => {
    if (!payOpen) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) return toast.error("Enter amount");
    const method = payMethod + (txnRef ? ` (ref: ${txnRef})` : "");
    const { error } = await supabase.from("fee_payments").insert({
      invoice_id: payOpen.id, amount: amt, recorded_by: user?.id, method,
    });
    if (error) return toast.error(error.message);
    const total = Number(payOpen.amount) - Number(payOpen.discount);
    if (amt >= total) {
      await supabase.from("fee_invoices").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", payOpen.id);
    }
    toast.success("Payment recorded");
    setPayOpen(null);
    setPayAmount(""); setTxnRef(""); setPayMethod("cash");
    load();
  };

  const totalDue = invoices.filter((i) => i.status !== "paid").reduce((a, b) => a + Number(b.amount) - Number(b.discount), 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((a, b) => a + Number(b.amount) - Number(b.discount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fees"
        description={isAdmin ? "Manage invoices and payments." : isParent ? "Pay fees and view history." : "Your fee history."}
        actions={isAdmin ? (
          <div className="flex gap-2">
            <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
              <DialogTrigger asChild><Button variant="outline"><Sparkles className="h-4 w-4" /> Bulk generate</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Auto-generate invoices</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Class</Label>
                    <Select value={bulkClass} onValueChange={setBulkClass}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} – {c.section}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Period (e.g. Apr 2026)</Label><Input value={bulkPeriod} onChange={(e) => setBulkPeriod(e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Amount</Label><Input type="number" value={bulkAmount} onChange={(e) => setBulkAmount(e.target.value)} /></div>
                    <div><Label>Due date</Label><Input type="date" value={bulkDue} onChange={(e) => setBulkDue(e.target.value)} /></div>
                  </div>
                  <p className="text-xs text-muted-foreground">Skips students already invoiced for this period.</p>
                  <Button onClick={generateBulk} className="w-full">Generate</Button>
                </div>
              </DialogContent>
            </Dialog>
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
          </div>
        ) : undefined}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardHeader><CardDescription>Total invoices</CardDescription><CardTitle>{invoices.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Outstanding</CardDescription><CardTitle className="text-destructive">Rs. {totalDue.toLocaleString()}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Paid</CardDescription><CardTitle className="text-primary">Rs. {totalPaid.toLocaleString()}</CardTitle></CardHeader></Card>
      </div>

      {invoices.length === 0 ? (
        <EmptyState title="No invoices" description={isAdmin ? "Create or bulk-generate invoices." : "No fees recorded yet."} icon={BadgeDollarSign} />
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Period</TableHead><TableHead>Amount</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {invoices.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.students?.profiles?.full_name}<div className="text-xs text-muted-foreground">{i.students?.roll_number}</div></TableCell>
                  <TableCell>{i.period}</TableCell>
                  <TableCell>Rs. {(Number(i.amount) - Number(i.discount)).toLocaleString()}</TableCell>
                  <TableCell>{format(new Date(i.due_date), "MMM d")}</TableCell>
                  <TableCell><Badge variant={i.status === "paid" ? "default" : "destructive"}>{i.status}</Badge></TableCell>
                  <TableCell>
                    {i.status !== "paid" && (isAdmin || isParent) && (
                      <Button size="sm" variant={isParent ? "default" : "outline"} onClick={() => { setPayOpen(i); setPayAmount(String(Number(i.amount) - Number(i.discount))); }}>
                        {isParent ? <><CreditCard className="h-3 w-3" /> Pay now</> : "Mark paid"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!payOpen} onOpenChange={(o) => !o && setPayOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isParent ? "Pay fee" : "Record payment"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{payOpen?.students?.profiles?.full_name} · {payOpen?.period}</p>
            <div><Label>Amount</Label><Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} /></div>
            <div><Label>Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank transfer</SelectItem>
                  <SelectItem value="jazzcash">JazzCash</SelectItem>
                  <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {payMethod !== "cash" && (
              <div><Label>Transaction reference</Label><Input placeholder="e.g. TXN-12345" value={txnRef} onChange={(e) => setTxnRef(e.target.value)} /></div>
            )}
            <Button onClick={recordPayment} className="w-full">{isParent ? "Submit payment" : "Record"}</Button>
            {isParent && <p className="text-xs text-muted-foreground">Payment will be reviewed and confirmed by the school office.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default Fees;
