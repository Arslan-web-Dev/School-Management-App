import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/shared/StatCard";
import { Banknote, Calendar, TrendingDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { format } from "date-fns";

const MySalary = () => {
  const { user } = useAuth();
  const [structure, setStructure] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: t } = await supabase.from("teachers").select("id").eq("profile_id", user.id).maybeSingle();
      if (!t) return;
      const [{ data: s }, { data: p }, { data: l }] = await Promise.all([
        supabase.from("salary_structures").select("*").eq("teacher_id", t.id).maybeSingle(),
        supabase.from("salary_payments").select("*").eq("teacher_id", t.id).order("created_at", { ascending: false }),
        supabase.from("leaves").select("*").eq("teacher_id", t.id).order("start_date", { ascending: false }),
      ]);
      setStructure(s);
      setPayments(p ?? []);
      setLeaves(l ?? []);
    };
    load();
  }, [user]);

  const lastPaid = payments.find((p) => p.status === "paid");
  const totalEarned = payments.filter((p) => p.status === "paid").reduce((a, b) => a + Number(b.net_amount), 0);
  const approvedLeaves = leaves.filter((l) => l.status === "approved").length;

  return (
    <div className="space-y-6">
      <PageHeader title="My Salary" description="Payslips, structure and leaves." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Base salary" value={structure ? `Rs. ${Number(structure.base_amount).toLocaleString()}` : "Not set"} icon={Banknote} accent="primary" />
        <StatCard label="Total earned" value={`Rs. ${totalEarned.toLocaleString()}`} icon={Banknote} accent="success" />
        <StatCard label="Approved leaves" value={approvedLeaves} icon={Calendar} accent="warning" />
      </div>

      {lastPaid && (
        <Card>
          <CardHeader>
            <CardTitle>Latest payslip — {lastPaid.period}</CardTitle>
            <CardDescription>Issued {lastPaid.paid_at ? format(new Date(lastPaid.paid_at), "MMM d, yyyy") : "—"}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><div className="text-muted-foreground text-xs">Base</div><div className="font-semibold">Rs. {Number(lastPaid.base_amount).toLocaleString()}</div></div>
            <div><div className="text-muted-foreground text-xs">Bonus</div><div className="font-semibold text-success">+ Rs. {Number(lastPaid.bonus).toLocaleString()}</div></div>
            <div><div className="text-muted-foreground text-xs">Deductions</div><div className="font-semibold text-destructive">- Rs. {Number(lastPaid.deductions).toLocaleString()}</div></div>
            <div><div className="text-muted-foreground text-xs">Net</div><div className="font-bold text-primary text-lg">Rs. {Number(lastPaid.net_amount).toLocaleString()}</div></div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Payment history</CardTitle></CardHeader>
        <CardContent>
          {payments.length === 0 ? <EmptyState title="No payments" description="Payslips will appear here." icon={Banknote} /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Net</TableHead><TableHead>Status</TableHead><TableHead>Paid</TableHead></TableRow></TableHeader>
              <TableBody>{payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.period}</TableCell>
                  <TableCell className="font-medium">Rs. {Number(p.net_amount).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={p.status === "paid" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                  <TableCell>{p.paid_at ? format(new Date(p.paid_at), "MMM d, yyyy") : "—"}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
export default MySalary;
