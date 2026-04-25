import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, IndianRupee, CheckCircle2, Trash2, Users } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { supabase } from "@/integrations/supabase/client";

interface SalaryRecord { id: string; teacher_id: string; teacher_name: string; month: string; year: string; basic_salary: number; leaves: number; deductions: number; net_salary: number; status: "paid" | "pending"; paid_date?: string; }
interface TeacherOption { id: string; full_name: string; employee_id: string; }

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const Salary = () => {
  const [records, setRecords] = useState<SalaryRecord[]>(() => JSON.parse(localStorage.getItem("school_salaries") || "[]"));
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ teacher_id: "", month: MONTHS[new Date().getMonth()], year: new Date().getFullYear().toString(), basic_salary: "", leaves: "0", deductions: "0" });

  useEffect(() => { loadData(); }, []);
  useEffect(() => { localStorage.setItem("school_salaries", JSON.stringify(records)); }, [records]);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from("teachers").select("id, employee_id, profiles(full_name)").order("created_at", { ascending: false });
    setTeachers((data as any[] ?? []).map(t => ({ id: t.id, full_name: t.profiles?.full_name || "Unknown", employee_id: t.employee_id })));
    setLoading(false);
  };

  const onSubmit = () => {
    if (!form.teacher_id || !form.basic_salary) { toast.error("Fill required fields"); return; }
    const t = teachers.find(x => x.id === form.teacher_id);
    const basic = Number(form.basic_salary);
    const leaves = Number(form.leaves) || 0;
    const deductions = Number(form.deductions) || 0;
    const perDay = basic / 30;
    const net = basic - (leaves * perDay) - deductions;
    setRecords(prev => [...prev, { id: `s${Date.now()}`, teacher_id: form.teacher_id, teacher_name: t?.full_name || "", month: form.month, year: form.year, basic_salary: basic, leaves, deductions, net_salary: Math.max(0, Math.round(net)), status: "pending" }]);
    toast.success("Salary record added"); setOpen(false); setForm({ teacher_id: "", month: MONTHS[new Date().getMonth()], year: new Date().getFullYear().toString(), basic_salary: "", leaves: "0", deductions: "0" });
  };

  const markPaid = (id: string) => { setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "paid" as const, paid_date: new Date().toISOString().split("T")[0] } : r)); toast.success("Marked paid"); };
  const del = (id: string) => { if (!confirm("Delete?")) return; setRecords(prev => prev.filter(r => r.id !== id)); toast.success("Deleted"); };

  const filtered = records.filter(r => !search || r.teacher_name.toLowerCase().includes(search.toLowerCase()));
  const totalPending = records.filter(r => r.status === "pending").reduce((s, r) => s + r.net_salary, 0);
  const totalPaid = records.filter(r => r.status === "paid").reduce((s, r) => s + r.net_salary, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Staff Salary" description="Manage teacher salaries and payments." actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add Salary</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Salary Record</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-2"><Label>Teacher *</Label><Select value={form.teacher_id} onValueChange={v => setForm({ ...form, teacher_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name} ({t.employee_id})</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Month</Label><Select value={form.month} onValueChange={v => setForm({ ...form, month: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Year</Label><Input value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} /></div></div>
              <div className="grid grid-cols-3 gap-3"><div className="space-y-2"><Label>Basic Salary *</Label><Input type="number" value={form.basic_salary} onChange={e => setForm({ ...form, basic_salary: e.target.value })} /></div><div className="space-y-2"><Label>Leaves</Label><Input type="number" value={form.leaves} onChange={e => setForm({ ...form, leaves: e.target.value })} /></div><div className="space-y-2"><Label>Deductions</Label><Input type="number" value={form.deductions} onChange={e => setForm({ ...form, deductions: e.target.value })} /></div></div>
              <DialogFooter><Button onClick={onSubmit}>Save Record</Button></DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      } />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600"><IndianRupee className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Total Pending</p><p className="text-xl font-bold">Rs. {totalPending.toLocaleString()}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600"><CheckCircle2 className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Total Paid</p><p className="text-xl font-bold">Rs. {totalPaid.toLocaleString()}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600"><Users className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Teachers</p><p className="text-xl font-bold">{new Set(records.map(r => r.teacher_id)).size}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600"><IndianRupee className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Records</p><p className="text-xl font-bold">{records.length}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          {loading ? <div>Loading...</div> : records.length === 0 ? <EmptyState icon={IndianRupee} title="No records" description="Add first salary record." /> : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="text-left p-3">Teacher</th><th className="text-left p-3">Month/Year</th><th className="text-right p-3">Basic</th><th className="text-right p-3">Leaves</th><th className="text-right p-3">Deductions</th><th className="text-right p-3">Net</th><th className="text-center p-3">Status</th><th className="text-right p-3">Actions</th></tr></thead>
              <tbody>{filtered.map(r => (<tr key={r.id} className="border-b hover:bg-muted/30"><td className="p-3 font-medium">{r.teacher_name}</td><td className="p-3"><Badge variant="outline">{r.month} {r.year}</Badge></td><td className="p-3 text-right">Rs. {r.basic_salary.toLocaleString()}</td><td className="p-3 text-right">{r.leaves}</td><td className="p-3 text-right">Rs. {r.deductions.toLocaleString()}</td><td className="p-3 text-right font-bold">Rs. {r.net_salary.toLocaleString()}</td><td className="p-3 text-center">{r.status === "paid" ? <Badge className="bg-emerald-500/10 text-emerald-600">Paid</Badge> : <Badge className="bg-amber-500/10 text-amber-600">Pending</Badge>}</td><td className="p-3 text-right"><div className="flex justify-end gap-1">{r.status !== "paid" && <Button variant="ghost" size="sm" onClick={() => markPaid(r.id)} className="text-emerald-600"><CheckCircle2 className="h-4 w-4 mr-1" />Pay</Button>}<Button variant="ghost" size="icon" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></td></tr>))}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Salary;
