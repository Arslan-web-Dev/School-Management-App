import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

const MyChildren = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      // Get linked children through parent_children table (own-child boundary)
      const { data: links, error: linksError } = await supabase
        .from("parent_children")
        .select("student_id, relation")
        .eq("parent_id", user.id);

      if (linksError || !links || links.length === 0) {
        setChildren([]);
        return;
      }

      const studentIds = links.map((l: any) => l.student_id);

      // Fetch student details
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, roll_number, admission_date, classes(name, section), profiles(full_name, email)")
        .in("id", studentIds);

      if (studentsError) {
        setChildren([]);
        return;
      }

      const list = (students ?? []).filter(Boolean);

      // Enrich with attendance counts + recent diary + invoices for each child
      const enriched = await Promise.all(list.map(async (c: any) => {
        const [{ count: total }, { count: present }, { data: diary }, { data: invoices }] = await Promise.all([
          supabase.from("attendance").select("*", { count: "exact", head: true }).eq("student_id", c.id),
          supabase.from("attendance").select("*", { count: "exact", head: true }).eq("student_id", c.id).in("status", ["present", "late"]),
          supabase.from("class_diary").select("date, homework, notes, subjects(name)").eq("class_id", c.classes ? (c as any).class_id : "").order("date", { ascending: false }).limit(5),
          supabase.from("fee_invoices").select("id, period, amount, discount, status, due_date").eq("student_id", c.id).order("due_date", { ascending: false }).limit(5),
        ]);
        return { ...c, attendanceRate: total ? Math.round(((present ?? 0) / total) * 100) : 0, diary: diary ?? [], invoices: invoices ?? [] };
      }));
      setChildren(enriched);
    };
    load();
  }, [user]);

  if (children.length === 0) return (
    <div className="space-y-6">
      <PageHeader title="My Children" description="View your children's profiles and academic progress" />
      <EmptyState
        title="No children linked"
        description="You don't have access to any children's records yet. Please contact the school administrator to link your children to your account."
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="My Children" description="View profiles, attendance, diary and fees." />
      <Tabs defaultValue={children[0]?.id}>
        <TabsList className="flex-wrap h-auto">
          {children.map((c) => <TabsTrigger key={c.id} value={c.id}>{c.profiles?.full_name}</TabsTrigger>)}
        </TabsList>
        {children.map((c) => (
          <TabsContent key={c.id} value={c.id} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14"><AvatarFallback>{c.profiles?.full_name?.[0]}</AvatarFallback></Avatar>
                  <div>
                    <CardTitle>{c.profiles?.full_name}</CardTitle>
                    <CardDescription>Roll {c.roll_number} · {c.classes?.name}-{c.classes?.section}</CardDescription>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-2xl font-bold text-primary">{c.attendanceRate}%</div>
                    <div className="text-xs text-muted-foreground">Attendance</div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Recent diary</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {c.diary.length === 0 ? <p className="text-muted-foreground">No entries.</p> :
                    c.diary.map((d: any, i: number) => (
                      <div key={i} className="border-l-2 border-primary pl-3">
                        <div className="text-xs text-muted-foreground">{format(new Date(d.date), "MMM d")} {d.subjects?.name && `· ${d.subjects.name}`}</div>
                        {d.homework && <div>{d.homework}</div>}
                      </div>
                    ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Recent fees</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {c.invoices.length === 0 ? <p className="text-muted-foreground">No invoices.</p> :
                    c.invoices.map((i: any) => (
                      <div key={i.id} className="flex items-center justify-between">
                        <div>
                          <div>{i.period}</div>
                          <div className="text-xs text-muted-foreground">Due {format(new Date(i.due_date), "MMM d")}</div>
                        </div>
                        <div className="text-right">
                          <div>Rs. {(Number(i.amount) - Number(i.discount)).toLocaleString()}</div>
                          <Badge variant={i.status === "paid" ? "default" : "destructive"} className="text-[10px]">{i.status}</Badge>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
export default MyChildren;
