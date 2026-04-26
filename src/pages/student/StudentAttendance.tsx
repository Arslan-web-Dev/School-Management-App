// src/pages/student/StudentAttendance.tsx
// Student's own attendance view — monthly calendar + stats

import { useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

type AttendanceStatus = "present" | "absent" | "late" | "holiday";

interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  absent: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  late: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  holiday: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
};

const STATUS_DOT: Record<AttendanceStatus, string> = {
  present: "bg-green-500",
  absent: "bg-red-500",
  late: "bg-yellow-500",
  holiday: "bg-gray-400",
};

export default function StudentAttendance() {
  const { user } = useAuth();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  // Get student ID
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

  // Fetch attendance for current month
  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];

  const { data: records = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ["student-attendance", studentId, month, year],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("attendance")
        .select("id, date, status, remarks")
        .eq("student_id", studentId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date");
      if (error) return [];
      return data as AttendanceRecord[];
    },
    enabled: !!studentId,
  });

  // Build date → record map
  const recordMap: Record<string, AttendanceRecord> = {};
  records.forEach((r) => { recordMap[r.date] = r; });

  // Calendar days
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Stats
  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const late = records.filter((r) => r.status === "late").length;
  const total = records.length;
  const percentage = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 0;

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Attendance</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Track your daily attendance record</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Present", value: present, icon: CheckCircle, color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
          { label: "Absent", value: absent, icon: XCircle, color: "text-red-500 bg-red-50 dark:bg-red-900/20" },
          { label: "Late", value: late, icon: Clock, color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20" },
          { label: "Percentage", value: `${percentage}%`, icon: Calendar, color: percentage >= 75 ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20" : "text-red-500 bg-red-50 dark:bg-red-900/20" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.color.split(" ").slice(1).join(" ")}`}>
                <s.icon className={`w-5 h-5 ${s.color.split(" ")[0]}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-xl font-bold ${s.color.split(" ")[0]}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Attendance bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-300 font-medium">Monthly Attendance Rate</span>
            <span className={`font-bold ${percentage >= 75 ? "text-green-600" : "text-red-500"}`}>{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-3" />
          {percentage < 75 && (
            <p className="text-xs text-red-500 mt-2">⚠️ Your attendance is below 75%. Please attend regularly to avoid academic penalties.</p>
          )}
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {MONTHS[month]} {year}
            </CardTitle>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-7 gap-1">
              {[...Array(35)].map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : (
            <>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for first day offset */}
                {[...Array(firstDayOfMonth)].map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {calendarDays.map((day) => {
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const record = recordMap[dateStr];
                  const isToday = dateStr === today.toISOString().split("T")[0];

                  return (
                    <div
                      key={day}
                      title={record ? `${record.status}${record.remarks ? ` - ${record.remarks}` : ""}` : "No record"}
                      className={`relative flex items-center justify-center h-10 rounded-lg text-sm font-medium transition-all
                        ${record ? STATUS_STYLES[record.status] : "text-gray-400 dark:text-gray-500"}
                        ${isToday ? "ring-2 ring-blue-500 ring-offset-1" : ""}
                        hover:scale-105 cursor-default
                      `}
                    >
                      {day}
                      {record && (
                        <span className={`absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full ${STATUS_DOT[record.status]}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t">
                {Object.entries(STATUS_STYLES).map(([status, cls]) => (
                  <div key={status} className="flex items-center gap-1.5">
                    <span className={`w-6 h-4 rounded text-xs flex items-center justify-center ${cls}`}>•</span>
                    <span className="text-xs text-gray-500 capitalize">{status}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Record list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Detailed Log — {MONTHS[month]} {year}</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No attendance records for this month</p>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${STATUS_DOT[r.status]}`} />
                    <span className="text-sm text-gray-900 dark:text-white">
                      {new Date(r.date).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.remarks && <span className="text-xs text-gray-400">{r.remarks}</span>}
                    <Badge variant="outline" className={`text-xs capitalize ${STATUS_STYLES[r.status]}`}>
                      {r.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
