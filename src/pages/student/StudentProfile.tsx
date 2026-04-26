// src/pages/student/StudentProfile.tsx
// Student's complete profile + fee status

import { useState } from "react";
import {
  User, Phone, MapPin, Calendar, BookOpen,
  CreditCard, CheckCircle, AlertTriangle, Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";

interface StudentProfile {
  id: string;
  name: string;
  email: string;
  roll_number?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  address?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_relation?: string;
  admission_date?: string;
  status: string;
  profile_photo_url?: string;
  classes?: { name: string; grade?: string };
}

interface FeeRecord {
  id: string;
  fee_type: string;
  amount: number;
  due_date?: string;
  paid_date?: string;
  status: string;
  month?: string;
  year?: number;
  receipt_number?: string;
}

const FEE_STATUS_STYLE: Record<string, string> = {
  paid: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  waived: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b dark:border-gray-700 last:border-0">
      <div className="mt-0.5 p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
        <Icon className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{value ?? "—"}</p>
      </div>
    </div>
  );
}

export default function StudentProfile() {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery<StudentProfile | null>({
    queryKey: ["student-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("students")
        .select("*, classes(name, grade)")
        .eq("user_id", user.id)
        .single();
      if (error) return null;
      return data as StudentProfile;
    },
    enabled: !!user?.id,
  });

  const { data: fees = [] } = useQuery<FeeRecord[]>({
    queryKey: ["student-fees", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("fees")
        .select("*")
        .eq("student_id", profile.id)
        .order("due_date", { ascending: false });
      if (error) return [];
      return data as FeeRecord[];
    },
    enabled: !!profile?.id,
  });

  const totalPaid = fees.filter(f => f.status === "paid").reduce((sum, f) => sum + (f.amount ?? 0), 0);
  const totalPending = fees.filter(f => f.status === "pending" || f.status === "overdue").reduce((sum, f) => sum + (f.amount ?? 0), 0);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Card */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600" />
        <CardContent className="relative pb-5 px-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
            <div className="w-20 h-20 rounded-2xl bg-white dark:bg-gray-800 shadow-lg border-2 border-white dark:border-gray-700 flex items-center justify-center text-3xl font-bold text-blue-600">
              {profile?.name?.charAt(0).toUpperCase() ?? "S"}
            </div>
            <div className="pb-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{profile?.name ?? "Student"}</h1>
              <p className="text-sm text-gray-500">{profile?.email}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {profile?.classes?.name ?? "No Class"}
                </Badge>
                {profile?.roll_number && (
                  <Badge variant="outline" className="text-xs">Roll: {profile.roll_number}</Badge>
                )}
                <Badge
                  className={`text-xs ${profile?.status === "active"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-gray-100 text-gray-500"}`}
                  variant="outline"
                >
                  {profile?.status ?? "Active"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info" className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="fees" className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" /> Fee Status
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="info" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow icon={User} label="Full Name" value={profile?.name} />
                <InfoRow
                  icon={Calendar}
                  label="Date of Birth"
                  value={profile?.date_of_birth
                    ? new Date(profile.date_of_birth).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })
                    : undefined}
                />
                <InfoRow icon={User} label="Gender" value={profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : undefined} />
                <InfoRow icon={User} label="Blood Group" value={profile?.blood_group} />
                <InfoRow icon={MapPin} label="Address" value={profile?.address} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Academic & Guardian
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow icon={BookOpen} label="Class" value={profile?.classes?.name} />
                <InfoRow icon={BookOpen} label="Roll Number" value={profile?.roll_number} />
                <InfoRow
                  icon={Calendar}
                  label="Admission Date"
                  value={profile?.admission_date
                    ? new Date(profile.admission_date).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })
                    : undefined}
                />
                <InfoRow icon={User} label="Guardian Name" value={profile?.guardian_name} />
                <InfoRow icon={Phone} label="Guardian Phone" value={profile?.guardian_phone} />
                <InfoRow icon={User} label="Relation" value={profile?.guardian_relation} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fees Tab */}
        <TabsContent value="fees" className="mt-4 space-y-4">
          {/* Fee Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Total Paid</p>
                  <p className="text-lg font-bold text-green-600">PKR {totalPaid.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-yellow-500 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Pending</p>
                  <p className="text-lg font-bold text-yellow-600">PKR {totalPending.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-2 md:col-span-1">
              <CardContent className="p-4 flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-blue-500 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Total Records</p>
                  <p className="text-lg font-bold text-blue-600">{fees.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fee Records */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Fee History</CardTitle>
            </CardHeader>
            <CardContent>
              {fees.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No fee records found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {fees.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {f.status === "paid"
                          ? <CheckCircle className="w-4 h-4 text-green-500" />
                          : f.status === "overdue"
                          ? <AlertTriangle className="w-4 h-4 text-red-500" />
                          : <Clock className="w-4 h-4 text-yellow-500" />}
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {f.fee_type} Fee
                            {f.month ? ` — ${f.month} ${f.year ?? ""}` : ""}
                          </p>
                          <p className="text-xs text-gray-400">
                            {f.due_date
                              ? `Due: ${new Date(f.due_date).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}`
                              : "No due date"}
                            {f.receipt_number ? ` • Receipt: ${f.receipt_number}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          PKR {(f.amount ?? 0).toLocaleString()}
                        </p>
                        <Badge variant="outline" className={`text-xs mt-1 capitalize ${FEE_STATUS_STYLE[f.status] ?? ""}`}>
                          {f.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
