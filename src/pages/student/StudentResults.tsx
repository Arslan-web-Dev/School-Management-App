// src/pages/student/StudentResults.tsx
// All exam results with subject-wise breakdown and grade analysis

import { useState } from "react";
import { Award, TrendingUp, BookOpen, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip
} from "recharts";

interface Grade {
  id: string;
  exam_type: string;
  marks_obtained: number;
  total_marks: number;
  grade?: string;
  exam_date?: string;
  remarks?: string;
  subjects?: { id: string; name: string };
}

const EXAM_TYPES = ["all", "quiz", "midterm", "final", "assignment", "practical"];

function gradeFromPercent(pct: number) {
  if (pct >= 90) return { grade: "A+", color: "text-green-600" };
  if (pct >= 80) return { grade: "A", color: "text-green-500" };
  if (pct >= 70) return { grade: "B", color: "text-blue-600" };
  if (pct >= 60) return { grade: "C", color: "text-yellow-600" };
  if (pct >= 50) return { grade: "D", color: "text-orange-500" };
  return { grade: "F", color: "text-red-600" };
}

export default function StudentResults() {
  const { user } = useAuth();
  const [examFilter, setExamFilter] = useState("all");

  const { data: studentId } = useQuery<string | null>({
    queryKey: ["student-id", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .single();
      return data?.id ?? null;
    },
    enabled: !!user?.id,
  });

  const { data: grades = [], isLoading } = useQuery<Grade[]>({
    queryKey: ["student-all-grades", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("grades")
        .select("*, subjects(id, name)")
        .eq("student_id", studentId)
        .order("exam_date", { ascending: false });
      if (error) return [];
      return data as Grade[];
    },
    enabled: !!studentId,
  });

  const filtered = examFilter === "all"
    ? grades
    : grades.filter((g) => g.exam_type === examFilter);

  // Subject-wise averages for radar chart
  const subjectMap: Record<string, { name: string; total: number; count: number }> = {};
  grades.forEach((g) => {
    const sid = g.subjects?.id ?? "unknown";
    const name = g.subjects?.name ?? "Unknown";
    if (!subjectMap[sid]) subjectMap[sid] = { name, total: 0, count: 0 };
    subjectMap[sid].total += (g.marks_obtained / g.total_marks) * 100;
    subjectMap[sid].count += 1;
  });
  const radarData = Object.values(subjectMap).map((s) => ({
    subject: s.name.length > 8 ? s.name.substring(0, 8) + "…" : s.name,
    value: Math.round(s.total / s.count),
  }));

  // Overall average
  const overallAvg = grades.length > 0
    ? Math.round(grades.reduce((sum, g) => sum + (g.marks_obtained / g.total_marks) * 100, 0) / grades.length)
    : 0;

  const { grade: overallGrade, color: overallColor } = gradeFromPercent(overallAvg);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Results</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">View your exam scores and grade analysis</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-gray-500">Overall Average</p>
            <p className={`text-4xl font-bold mt-1 ${overallColor}`}>{overallAvg}%</p>
            <Badge className={`mt-2 ${overallColor}`} variant="outline">{overallGrade}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm text-gray-500">Total Exams</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{grades.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm text-gray-500">Highest Score</p>
            <p className="text-3xl font-bold text-green-600 mt-1">
              {grades.length > 0
                ? `${Math.round(Math.max(...grades.map(g => (g.marks_obtained / g.total_marks) * 100)))}%`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm text-gray-500">Subjects</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{Object.keys(subjectMap).length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Radar Chart */}
        {radarData.length > 2 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Subject Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                  />
                  <Tooltip formatter={(v) => `${v}%`} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Subject Averages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-600" />
              Subject Averages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.values(subjectMap).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
            ) : (
              <div className="space-y-3">
                {Object.values(subjectMap).map((s, i) => {
                  const avg = Math.round(s.total / s.count);
                  const { grade, color } = gradeFromPercent(avg);
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{s.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${color}`}>{avg}%</span>
                          <Badge variant="outline" className={`text-xs ${color}`}>{grade}</Badge>
                        </div>
                      </div>
                      <Progress value={avg} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-600" />
              All Results
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <Select value={examFilter} onValueChange={setExamFilter}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t === "all" ? "All Exams" : t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No results found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Subject</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Type</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Date</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Marks</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">%</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((g) => {
                    const pct = Math.round((g.marks_obtained / g.total_marks) * 100);
                    const { grade, color } = gradeFromPercent(pct);
                    return (
                      <tr key={g.id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="py-2.5 px-2 font-medium text-gray-900 dark:text-white">
                          {g.subjects?.name ?? "—"}
                        </td>
                        <td className="py-2.5 px-2">
                          <Badge variant="outline" className="capitalize text-xs">{g.exam_type}</Badge>
                        </td>
                        <td className="py-2.5 px-2 text-gray-500">
                          {g.exam_date
                            ? new Date(g.exam_date).toLocaleDateString("en-PK", { day: "numeric", month: "short" })
                            : "—"}
                        </td>
                        <td className="py-2.5 px-2 text-center font-medium">
                          {g.marks_obtained}/{g.total_marks}
                        </td>
                        <td className={`py-2.5 px-2 text-center font-bold ${color}`}>{pct}%</td>
                        <td className="py-2.5 px-2 text-center">
                          <Badge variant="outline" className={`font-bold ${color}`}>{g.grade ?? grade}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
