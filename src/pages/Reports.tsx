import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/shared/StatCard";
import { Wallet, Users, GraduationCap, CalendarCheck, Banknote } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))"];

const Reports = () => {
  const [stats, setStats] = useState({ collected: 0, outstanding: 0, salaries: 0, students: 0, teachers: 0, attendanceRate: 0 });
  const [feeByMonth, setFeeByMonth] = useState<any[]>([]);
  const [statusPie, setStatusPie] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [{ data: invoices }, { data: payments }, { data: salaries }, { count: stCount }, { count: tCount }, { data: att }] = await Promise.all([
        supabase.from("fee_invoices").select("amount, discount, status, period"),
        supabase.from("fee_payments").select("amount, paid_at"),
        supabase.from("salary_payments").select("net_amount, status"),
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase.from("teachers").select("*", { count: "exact", head: true }),
        supabase.from("attendance").select("status"),
      ]);

      const collected = (payments ?? []).reduce((a, b) => a + Number(b.amount), 0);
      const outstanding = (invoices ?? []).filter((i: any) => i.status !== "paid").reduce((a, b: any) => a + Number(b.amount) - Number(b.discount), 0);
      const totalSalaries = (salaries ?? []).filter((s: any) => s.status === "paid").reduce((a, b: any) => a + Number(b.net_amount), 0);

      const totalAtt = (att ?? []).length;
      const presAtt = (att ?? []).filter((r: any) => r.status === "present" || r.status === "late").length;
      const rate = totalAtt ? Math.round((presAtt / totalAtt) * 100) : 0;

      setStats({ collected, outstanding, salaries: totalSalaries, students: stCount ?? 0, teachers: tCount ?? 0, attendanceRate: rate });

      // Fee by period
      const byPeriod = new Map<string, number>();
      (invoices ?? []).forEach((i: any) => {
        const total = Number(i.amount) - Number(i.discount);
        byPeriod.set(i.period, (byPeriod.get(i.period) ?? 0) + total);
      });
      setFeeByMonth(Array.from(byPeriod.entries()).slice(-6).map(([period, total]) => ({ period, total })));

      // Invoice status pie
      const paid = (invoices ?? []).filter((i: any) => i.status === "paid").length;
      const unpaid = (invoices ?? []).filter((i: any) => i.status !== "paid").length;
      setStatusPie([{ name: "Paid", value: paid }, { name: "Unpaid", value: unpaid }]);
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" description="Financial and operational summary." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Collected" value={`Rs. ${stats.collected.toLocaleString()}`} icon={Wallet} accent="success" />
        <StatCard label="Outstanding" value={`Rs. ${stats.outstanding.toLocaleString()}`} icon={Wallet} accent="warning" />
        <StatCard label="Salaries paid" value={`Rs. ${stats.salaries.toLocaleString()}`} icon={Banknote} accent="primary" />
        <StatCard label="Students" value={stats.students} icon={GraduationCap} accent="primary" />
        <StatCard label="Teachers" value={stats.teachers} icon={Users} accent="success" />
        <StatCard label="Attendance" value={`${stats.attendanceRate}%`} icon={CalendarCheck} accent="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Fee invoiced by period</CardTitle><CardDescription>Last 6 periods</CardDescription></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feeByMonth} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Invoice status</CardTitle><CardDescription>Paid vs unpaid</CardDescription></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {statusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
export default Reports;
