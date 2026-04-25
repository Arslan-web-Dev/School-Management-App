import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, BookOpen, Trash2, FileText, Clock, CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { supabase } from "@/integrations/supabase/client";

interface SyllabusItem { id: string; class_name: string; class_id: string; subject: string; topic: string; description: string; week: string; status: "planned" | "in_progress" | "completed"; }
interface TimetableSlot { id: string; class_id: string; class_name: string; day: string; period: number; subject: string; teacher: string; start_time: string; end_time: string; }
interface ClassOption { id: string; name: string; section: string; }

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const Syllabus = () => {
  const [activeTab, setActiveTab] = useState<"syllabus" | "timetable">("syllabus");
  const [syllabus, setSyllabus] = useState<SyllabusItem[]>(() => JSON.parse(localStorage.getItem("school_syllabus") || "[]"));
  const [timetable, setTimetable] = useState<TimetableSlot[]>(() => JSON.parse(localStorage.getItem("school_timetable") || "[]"));
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [search, setSearch] = useState("");
  const [openSyllabus, setOpenSyllabus] = useState(false);
  const [openTimetable, setOpenTimetable] = useState(false);

  const [syllabusForm, setSyllabusForm] = useState({ class_id: "", subject: "", topic: "", description: "", week: "1" });
  const [ttForm, setTtForm] = useState({ class_id: "", day: "Monday", period: "1", subject: "", teacher: "", start_time: "08:00", end_time: "09:00" });

  useEffect(() => {
    supabase.from("classes").select("id, name, section").order("name").then(({ data }) => setClasses((data as ClassOption[]) ?? []));
  }, []);
  useEffect(() => { localStorage.setItem("school_syllabus", JSON.stringify(syllabus)); }, [syllabus]);
  useEffect(() => { localStorage.setItem("school_timetable", JSON.stringify(timetable)); }, [timetable]);

  const addSyllabus = () => {
    if (!syllabusForm.class_id || !syllabusForm.subject || !syllabusForm.topic) { toast.error("Fill required fields"); return; }
    const cls = classes.find(c => c.id === syllabusForm.class_id);
    setSyllabus(prev => [...prev, { id: `s${Date.now()}`, class_name: `${cls?.name}-${cls?.section}`, ...syllabusForm, status: "planned" }]);
    toast.success("Topic added"); setOpenSyllabus(false); setSyllabusForm({ class_id: "", subject: "", topic: "", description: "", week: "1" });
  };

  const addTimetable = () => {
    if (!ttForm.class_id || !ttForm.subject || !ttForm.teacher) { toast.error("Fill required fields"); return; }
    const cls = classes.find(c => c.id === ttForm.class_id);
    setTimetable(prev => [...prev, { id: `tt${Date.now()}`, class_name: `${cls?.name}-${cls?.section}`, ...ttForm, period: Number(ttForm.period) }]);
    toast.success("Slot added"); setOpenTimetable(false); setTtForm({ class_id: "", day: "Monday", period: "1", subject: "", teacher: "", start_time: "08:00", end_time: "09:00" });
  };

  const delSyllabus = (id: string) => { if (!confirm("Delete?")) return; setSyllabus(prev => prev.filter(x => x.id !== id)); toast.success("Deleted"); };
  const delTimetable = (id: string) => { if (!confirm("Delete?")) return; setTimetable(prev => prev.filter(x => x.id !== id)); toast.success("Deleted"); };

  const updateStatus = (id: string, status: SyllabusItem["status"]) => { setSyllabus(prev => prev.map(x => x.id === id ? { ...x, status } : x)); };

  const filteredSyllabus = syllabus.filter(s => !search || s.subject.toLowerCase().includes(search.toLowerCase()) || s.class_name.toLowerCase().includes(search.toLowerCase()));
  const filteredTimetable = timetable.filter(t => !search || t.subject.toLowerCase().includes(search.toLowerCase()) || t.class_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader title="Syllabus & Timetable" description="Manage class syllabus and weekly schedules." actions={
        activeTab === "syllabus" ? (
          <Dialog open={openSyllabus} onOpenChange={setOpenSyllabus}><DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add Topic</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add Syllabus Topic</DialogTitle></DialogHeader><div className="space-y-3 py-2"><div className="space-y-2"><Label>Class *</Label><Select value={syllabusForm.class_id} onValueChange={v => setSyllabusForm({ ...syllabusForm, class_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.section}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Subject *</Label><Input value={syllabusForm.subject} onChange={e => setSyllabusForm({ ...syllabusForm, subject: e.target.value })} /></div><div className="space-y-2"><Label>Week #</Label><Input type="number" value={syllabusForm.week} onChange={e => setSyllabusForm({ ...syllabusForm, week: e.target.value })} /></div></div><div className="space-y-2"><Label>Topic *</Label><Input value={syllabusForm.topic} onChange={e => setSyllabusForm({ ...syllabusForm, topic: e.target.value })} /></div><div className="space-y-2"><Label>Description</Label><Textarea value={syllabusForm.description} onChange={e => setSyllabusForm({ ...syllabusForm, description: e.target.value })} /></div><DialogFooter><Button onClick={addSyllabus}>Save</Button></DialogFooter></div></DialogContent></Dialog>
        ) : (
          <Dialog open={openTimetable} onOpenChange={setOpenTimetable}><DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add Slot</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add Timetable Slot</DialogTitle></DialogHeader><div className="space-y-3 py-2"><div className="space-y-2"><Label>Class *</Label><Select value={ttForm.class_id} onValueChange={v => setTtForm({ ...ttForm, class_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.section}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Day *</Label><Select value={ttForm.day} onValueChange={v => setTtForm({ ...ttForm, day: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Period *</Label><Select value={ttForm.period} onValueChange={v => setTtForm({ ...ttForm, period: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PERIODS.map(p => <SelectItem key={p} value={String(p)}>{p}</SelectItem>)}</SelectContent></Select></div></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Start Time</Label><Input type="time" value={ttForm.start_time} onChange={e => setTtForm({ ...ttForm, start_time: e.target.value })} /></div><div className="space-y-2"><Label>End Time</Label><Input type="time" value={ttForm.end_time} onChange={e => setTtForm({ ...ttForm, end_time: e.target.value })} /></div></div><div className="space-y-2"><Label>Subject *</Label><Input value={ttForm.subject} onChange={e => setTtForm({ ...ttForm, subject: e.target.value })} /></div><div className="space-y-2"><Label>Teacher *</Label><Input value={ttForm.teacher} onChange={e => setTtForm({ ...ttForm, teacher: e.target.value })} /></div><DialogFooter><Button onClick={addTimetable}>Save</Button></DialogFooter></div></DialogContent></Dialog>
        )
      } />

      <div className="flex gap-2">
        <Button variant={activeTab === "syllabus" ? "default" : "outline"} onClick={() => setActiveTab("syllabus")}><BookOpen className="h-4 w-4 mr-2" /> Syllabus</Button>
        <Button variant={activeTab === "timetable" ? "default" : "outline"} onClick={() => setActiveTab("timetable")}><Clock className="h-4 w-4 mr-2" /> Timetable</Button>
      </div>

      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>

      {activeTab === "syllabus" && (
        <Card><CardContent className="p-4 md:p-6">
          {syllabus.length === 0 ? <EmptyState icon={FileText} title="No syllabus items" description="Add topics to your class syllabus." /> : filteredSyllabus.length === 0 ? <EmptyState icon={Search} title="No matches" description="Adjust search." /> : (
            <div className="space-y-3">
              {filteredSyllabus.map(s => (
                <Card key={s.id} className="overflow-hidden"><CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2"><Badge variant="outline"><BookOpen className="h-3 w-3 mr-1" />{s.class_name}</Badge><Badge variant="secondary">Week {s.week}</Badge><Badge className={s.status === "completed" ? "bg-emerald-500/10 text-emerald-600" : s.status === "in_progress" ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600"}>{s.status.replace("_", " ")}</Badge></div>
                      <h4 className="font-semibold">{s.subject}: {s.topic}</h4>
                      {s.description && <p className="text-muted-foreground text-sm mt-1">{s.description}</p>}
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant={s.status === "planned" ? "default" : "outline"} onClick={() => updateStatus(s.id, "planned")}>Planned</Button>
                        <Button size="sm" variant={s.status === "in_progress" ? "default" : "outline"} onClick={() => updateStatus(s.id, "in_progress")}>In Progress</Button>
                        <Button size="sm" variant={s.status === "completed" ? "default" : "outline"} onClick={() => updateStatus(s.id, "completed")}>Done</Button>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => delSyllabus(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}
        </CardContent></Card>
      )}

      {activeTab === "timetable" && (
        <Card><CardContent className="p-4 md:p-6">
          {timetable.length === 0 ? <EmptyState icon={CalendarDays} title="No timetable slots" description="Add class timetable entries." /> : filteredTimetable.length === 0 ? <EmptyState icon={Search} title="No matches" description="Adjust search." /> : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="text-left p-3">Day</th><th className="text-left p-3">Class</th><th className="text-center p-3">Period</th><th className="text-left p-3">Time</th><th className="text-left p-3">Subject</th><th className="text-left p-3">Teacher</th><th className="text-right p-3">Actions</th></tr></thead>
              <tbody>{DAYS.map(day => filteredTimetable.filter(t => t.day === day).sort((a, b) => a.period - b.period).map(t => (<tr key={t.id} className="border-b hover:bg-muted/30"><td className="p-3 font-medium">{t.day}</td><td className="p-3 text-muted-foreground">{t.class_name}</td><td className="p-3 text-center"><Badge variant="outline">{t.period}</Badge></td><td className="p-3">{t.start_time}-{t.end_time}</td><td className="p-3">{t.subject}</td><td className="p-3">{t.teacher}</td><td className="p-3 text-right"><Button variant="ghost" size="icon" onClick={() => delTimetable(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td></tr>)))}</tbody>
              </table>
            </div>
          )}
        </CardContent></Card>
      )}
    </div>
  );
};

export default Syllabus;
