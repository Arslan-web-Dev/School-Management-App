import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Users, DollarSign, GraduationCap, BookOpen, CalendarCheck, TrendingUp, TrendingDown, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stats { totalStudents: number; totalTeachers: number; totalClasses: number; attendanceRate: number; totalFeesDue: number; totalFeesPaid: number; avgGrade: number; passRate: number; }

const Reports = () => {
  const [reportType, setReportType] = useState("overview");
  const [stats, setStats] = useState<Stats>({ totalStudents: 0, totalTeachers: 0, totalClasses: 0, attendanceRate: 0, totalFeesDue: 0, totalFeesPaid: 0, avgGrade: 0, passRate: 0 });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [{ count: students }, { count: teachers }, { count: classes }] = await Promise.all([
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase.from("teachers").select("*", { count: "exact", head: true }),
      supabase.from("classes").select("*", { count: "exact", head: true }),
    ]);

    const fees = JSON.parse(localStorage.getItem("school_fees") || "[]");
    const grades = JSON.parse(localStorage.getItem("school_grades") || "[]");

    const totalDue = fees.filter((f: any) => f.status === "due").reduce((s: number, f: any) => s + f.amount, 0);
    const totalPaid = fees.filter((f: any) => f.status === "paid").reduce((s: number, f: any) => s + f.amount, 0);
    const avgGrade = grades.length ? Math.round(grades.reduce((s: number, g: any) => s + g.percentage, 0) / grades.length) : 0;
    const passRate = grades.length ? Math.round((grades.filter((g: any) => g.percentage >= 50).length / grades.length) * 100) : 0;

    setStats({ totalStudents: students || 0, totalTeachers: teachers || 0, totalClasses: classes || 0, attendanceRate: 92, totalFeesDue: totalDue, totalFeesPaid: totalPaid, avgGrade, passRate });
  };

  const StatBox = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) => (
    <Card><CardContent className="p-4 flex items-center gap-3"><div className={`h-10 w-10 rounded-lg ${color} flex items-center justify-center`}><Icon className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div></CardContent></Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" description="School performance overview and insights." actions={
        <Select value={reportType} onValueChange={setReportType}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="overview">Overview</SelectItem><SelectItem value="fees">Fee Report</SelectItem><SelectItem value="academic">Academic</SelectItem><SelectItem value="attendance">Attendance</SelectItem></SelectContent></Select>
      } />

      {reportType === "overview" && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatBox icon={Users} label="Students" value={String(stats.totalStudents)} color="bg-blue-500/10 text-blue-600" />
            <StatBox icon={Users} label="Teachers" value={String(stats.totalTeachers)} color="bg-emerald-500/10 text-emerald-600" />
            <StatBox icon={BookOpen} label="Classes" value={String(stats.totalClasses)} color="bg-amber-500/10 text-amber-600" />
            <StatBox icon={CalendarCheck} label="Attendance Rate" value={`${stats.attendanceRate}%`} color="bg-purple-500/10 text-purple-600" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <StatBox icon={DollarSign} label="Fees Due" value={`Rs. ${stats.totalFeesDue.toLocaleString()}`} color="bg-rose-500/10 text-rose-600" />
            <StatBox icon={DollarSign} label="Fees Paid" value={`Rs. ${stats.totalFeesPaid.toLocaleString()}`} color="bg-emerald-500/10 text-emerald-600" />
            <StatBox icon={GraduationCap} label="Pass Rate" value={`${stats.passRate}%`} color="bg-blue-500/10 text-blue-600" />
          </div>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> School Summary</CardTitle></CardHeader><CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"><span className="text-sm">Average Grade Percentage</span><span className="font-bold">{stats.avgGrade}%</span></div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"><span className="text-sm">Fee Collection Rate</span><span className="font-bold">{stats.totalFeesDue + stats.totalFeesPaid ? Math.round((stats.totalFeesPaid / (stats.totalFeesDue + stats.totalFeesPaid)) * 100) : 0}%</span></div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"><span className="text-sm">Student-Teacher Ratio</span><span className="font-bold">{stats.totalTeachers ? (stats.totalStudents / stats.totalTeachers).toFixed(1) : "N/A"} : 1</span></div>
          </CardContent></Card>
        </>
      )}

      {reportType === "fees" && (
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Fee Collection Report</CardTitle></CardHeader><CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <StatBox icon={TrendingUp} label="Total Collected" value={`Rs. ${stats.totalFeesPaid.toLocaleString()}`} color="bg-emerald-500/10 text-emerald-600" />
            <StatBox icon={TrendingDown} label="Total Pending" value={`Rs. ${stats.totalFeesDue.toLocaleString()}`} color="bg-rose-500/10 text-rose-600" />
          </div>
          <div className="space-y-3">
            <h4 className="font-semibold">Summary</h4>
            <p className="text-sm text-muted-foreground">Fees are tracked through the Fee Management module. Use local storage records for detailed breakdown by month and student.</p>
            <div className="flex items-center gap-2 mt-4"><Badge variant="outline"><FileText className="h-3 w-3 mr-1" /> Export functionality coming soon</Badge></div>
          </div>
        </CardContent></Card>
      )}

      {reportType === "academic" && (
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Academic Performance</CardTitle></CardHeader><CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <StatBox icon={TrendingUp} label="Average Score" value={`${stats.avgGrade}%`} color="bg-blue-500/10 text-blue-600" />
            <StatBox icon={Users} label="Pass Rate" value={`${stats.passRate}%`} color="bg-emerald-500/10 text-emerald-600" />
          </div>
          <div className="space-y-3">
            <h4 className="font-semibold">Performance Distribution</h4>
            {(() => { const g = JSON.parse(localStorage.getItem("school_grades") || "[]"); const dist = { Aplus: g.filter((x: any) => x.grade === "A+").length, A: g.filter((x: any) => x.grade === "A").length, B: g.filter((x: any) => x.grade === "B").length, C: g.filter((x: any) => x.grade === "C").length, D: g.filter((x: any) => x.grade === "D").length, F: g.filter((x: any) => x.grade === "F").length }; return (
              <div className="space-y-2">
                {Object.entries(dist).map(([k, v]) => (<div key={k} className="flex items-center gap-3"><span className="w-12 text-sm font-medium">{k}</span><div className="flex-1 h-6 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${g.length ? (v as number / g.length) * 100 : 0}%` }} /></div><span className="w-8 text-sm text-right">{v as number}</span></div>))}
              </div>
            ); })()}
          </div>
        </CardContent></Card>
      )}

      {reportType === "attendance" && (
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarCheck className="h-5 w-5" /> Attendance Report</CardTitle></CardHeader><CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <StatBox icon={CalendarCheck} label="Overall Rate" value="92%" color="bg-blue-500/10 text-blue-600" />
            <StatBox icon={Users} label="Present Today" value="~185" color="bg-emerald-500/10 text-emerald-600" />
            <StatBox icon={Users} label="Absent Today" value="~15" color="bg-rose-500/10 text-rose-600" />
          </div>
          <p className="text-sm text-muted-foreground">Detailed attendance analytics will be available once attendance data is synced with the database. Currently using sample data for visualization.</p>
        </CardContent></Card>
      )}
    </div>
  );
};

export default Reports;
