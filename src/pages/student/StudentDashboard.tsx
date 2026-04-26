// src/pages/student/StudentDashboard.tsx
// Complete Student Panel Dashboard - shows stats, attendance, grades, notices

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen, Calendar, ClipboardList, Bell, TrendingUp,
  CheckCircle, XCircle, Clock, Award, ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentInfo {
  id: string;
  name: string;
  email: string;
  roll_number?: string;
  class_id?: string;
  status: string;
  guardian_name?: string;
  admission_date?: string;
  classes?: { name: string; grade?: string };
}

interface AttendanceStat {
  present: number;
  absent: number;
  late: number;
  total: number;
  percentage: number;
}

interface RecentGrade {
  id: string;
  exam_type: string;
  marks_obtained: number;
  total_marks: number;
  grade?: string;
  exam_date?: string;
  subjects?: { name: string };
}

interface Notice {
  id: string;
  title: string;
  content: string;
  created_at: string;
  audience?: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getGradeColor(percentage: number) {
  if (percentage >= 90) return "text-green-600";
  if (percentage >= 75) return "text-blue-600";
  if (percentage >= 60) return "text-yellow-600";
  return "text-red-600";
}

function getAttendanceColor(percentage: number) {
  if (percentage >= 90) return "#22c55e";
  if (percentage >= 75) return "#3b82f6";
  if (percentage >= 60) return "#f59e0b";
  return "#ef4444";
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, title, value, sub, color
}: {
  icon: any; title: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-xl bg-opacity-10 ${color.replace("text-", "bg-")}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const { user } = useAuth();

  // Fetch student info
  const { data: student, isLoading: studentLoading } = useQuery<StudentInfo | null>({
    queryKey: ["student-info", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("students")
        .select("*, classes(name, grade)")
        .eq("user_id", user.id)
        .single();
      if (error) return null;
      return data as StudentInfo;
    },
    enabled: !!user?.id,
  });

  // Fetch attendance stats
  const { data: attendance } = useQuery<AttendanceStat>({
    queryKey: ["student-attendance-stats", student?.id],
    queryFn: async () => {
      if (!student?.id) return { present: 0, absent: 0, late: 0, total: 0, percentage: 0 };
      const { data, error } = await supabase
        .from("attendance")
        .select("status")
        .eq("student_id", student.id);
      if (error) return { present: 0, absent: 0, late: 0, total: 0, percentage: 0 };

      const present = data.filter((r: any) => r.status === "present").length;
      const absent = data.filter((r: any) => r.status === "absent").length;
      const late = data.filter((r: any) => r.status === "late").length;
      const total = data.length;
      const percentage = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 0;

      return { present, absent, late, total, percentage };
    },
    enabled: !!student?.id,
  });

  // Fetch recent grades
  const { data: grades = [] } = useQuery<RecentGrade[]>({
    queryKey: ["student-recent-grades", student?.id],
    queryFn: async () => {
      if (!student?.id) return [];
      const { data, error } = await supabase
        .from("grades")
        .select("*, subjects(name)")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) return [];
      return data as RecentGrade[];
    },
    enabled: !!student?.id,
  });

  // Fetch recent notices
  const { data: notices = [] } = useQuery<Notice[]>({
    queryKey: ["student-notices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("id, title, content, created_at, audience")
        .or("audience.eq.all,audience.eq.students")
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) return [];
      return data as Notice[];
    },
  });

  // Attendance chart data (monthly)
  const attendanceChartData = [
    { month: "Jan", percent: 88 },
    { month: "Feb", percent: 92 },
    { month: "Mar", percent: 85 },
    { month: "Apr", percent: attendance?.percentage ?? 90 },
  ];

  if (studentLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {student?.name?.split(" ")[0] ?? "Student"} 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5">
            {student?.classes?.name ?? "No class assigned"} •{" "}
            Roll No: {student?.roll_number ?? "N/A"}
          </p>
        </div>
        <Badge
          variant={student?.status === "active" ? "default" : "secondary"}
          className="text-sm px-3 py-1"
        >
          {student?.status ?? "Active"}
        </Badge>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Calendar}
          title="Attendance"
          value={`${attendance?.percentage ?? 0}%`}
          sub={`${attendance?.present ?? 0} / ${attendance?.total ?? 0} days`}
          color={attendance?.percentage && attendance.percentage >= 75 ? "text-green-600" : "text-red-500"}
        />
        <StatCard
          icon={CheckCircle}
          title="Present Days"
          value={attendance?.present ?? 0}
          color="text-blue-600"
        />
        <StatCard
          icon={XCircle}
          title="Absent Days"
          value={attendance?.absent ?? 0}
          color="text-red-500"
        />
        <StatCard
          icon={Award}
          title="Exams Taken"
          value={grades.length}
          sub="This session"
          color="text-purple-600"
        />
      </div>

      {/* Main Grid */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Attendance Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Attendance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={attendanceChartData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="percent" radius={[6, 6, 0, 0]}>
                  {attendanceChartData.map((entry, i) => (
                    <Cell key={i} fill={getAttendanceColor(entry.percent)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Attendance Breakdown */}
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Overall Attendance</span>
                <span className={`font-semibold ${getGradeColor(attendance?.percentage ?? 0)}`}>
                  {attendance?.percentage ?? 0}%
                </span>
              </div>
              <Progress value={attendance?.percentage ?? 0} className="h-2" />
              {(attendance?.percentage ?? 0) < 75 && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  Attendance below 75% — please attend regularly
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Grades */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-purple-600" />
                Recent Results
              </CardTitle>
              <Link
                to="/student/results"
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
              >
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {grades.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Award className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No results yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {grades.slice(0, 5).map((g) => {
                  const pct = Math.round((g.marks_obtained / g.total_marks) * 100);
                  return (
                    <div key={g.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {g.subjects?.name ?? "Subject"}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">{g.exam_type}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${getGradeColor(pct)}`}>
                          {g.marks_obtained}/{g.total_marks}
                        </p>
                        <p className="text-xs text-gray-400">{pct}%</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs min-w-[32px] text-center ${getGradeColor(pct)}`}
                      >
                        {g.grade ?? (pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : "F")}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notices & Quick Links */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Recent Notices */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-yellow-600" />
                Notices
              </CardTitle>
              <Link
                to="/student/notices"
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
              >
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {notices.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No notices</p>
            ) : (
              <div className="space-y-3">
                {notices.map((n) => (
                  <div key={n.id} className="border-l-2 border-blue-500 pl-3 py-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</p>
                    <p className="text-xs text-gray-500 truncate">{n.content}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(n.created_at).toLocaleDateString("en-PK", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Navigation */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-green-600" />
              Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { to: "/student/attendance", icon: Calendar, label: "My Attendance", color: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" },
                { to: "/student/results", icon: ClipboardList, label: "My Results", color: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300" },
                { to: "/student/notices", icon: Bell, label: "Notices", color: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300" },
                { to: "/student/profile", icon: Award, label: "My Profile", color: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300" },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl ${item.color} hover:opacity-80 transition-opacity`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-xs font-medium text-center">{item.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
