import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ClipboardList } from "lucide-react";
import { format } from "date-fns";

const MyResults = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: parent } = await supabase.from("parents").select("id").eq("profile_id", user.id).maybeSingle();
      if (!parent) return;
      const { data: links } = await supabase
        .from("parent_students")
        .select("students(id, roll_number, profiles(full_name), classes(name, section))")
        .eq("parent_id", parent.id);
      const list = (links ?? []).map((l: any) => l.students).filter(Boolean);
      const enriched = await Promise.all(list.map(async (c: any) => {
        const { data: results } = await supabase
          .from("exam_results")
          .select("marks_obtained, exams(name, exam_date, total_marks, subjects(name))")
          .eq("student_id", c.id);
        return { ...c, results: results ?? [] };
      }));
      setChildren(enriched);
    };
    load();
  }, [user]);

  if (children.length === 0) {
    return <div className="space-y-6"><PageHeader title="Exam Results" /><EmptyState icon={ClipboardList} title="No results" description="Once exams are graded, results will show here." /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Exam Results" description="Performance of your children." />
      <Tabs defaultValue={children[0]?.id}>
        <TabsList className="flex-wrap h-auto">
          {children.map((c) => <TabsTrigger key={c.id} value={c.id}>{c.profiles?.full_name}</TabsTrigger>)}
        </TabsList>
        {children.map((c) => {
          const totalObtained = c.results.reduce((a: number, r: any) => a + Number(r.marks_obtained), 0);
          const totalMax = c.results.reduce((a: number, r: any) => a + Number(r.exams?.total_marks ?? 0), 0);
          const overall = totalMax ? Math.round((totalObtained / totalMax) * 100) : 0;
          return (
            <TabsContent key={c.id} value={c.id} className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div><CardTitle>{c.profiles?.full_name}</CardTitle><CardDescription>{c.classes?.name}-{c.classes?.section}</CardDescription></div>
                    <div className="text-right"><div className="text-2xl font-bold text-primary">{overall}%</div><div className="text-xs text-muted-foreground">Overall</div></div>
                  </div>
                </CardHeader>
              </Card>
              {c.results.length === 0 ? (
                <p className="text-sm text-muted-foreground">No results yet.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {c.results.map((r: any, i: number) => {
                    const pct = r.exams?.total_marks ? Math.round((Number(r.marks_obtained) / Number(r.exams.total_marks)) * 100) : 0;
                    return (
                      <Card key={i}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{r.exams?.name}</CardTitle>
                          <CardDescription>{r.exams?.subjects?.name} · {r.exams?.exam_date && format(new Date(r.exams.exam_date), "MMM d, yyyy")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-end justify-between">
                            <div className="text-xl font-semibold">{Number(r.marks_obtained)}<span className="text-sm text-muted-foreground"> / {r.exams?.total_marks}</span></div>
                            <Badge variant={pct >= 50 ? "default" : "destructive"}>{pct}%</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};
export default MyResults;
