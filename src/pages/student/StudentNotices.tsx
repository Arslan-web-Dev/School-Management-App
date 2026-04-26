// src/pages/student/StudentNotices.tsx

import { useState } from "react";
import { Bell, Search, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

interface Notice {
  id: string;
  title: string;
  content: string;
  audience?: string;
  created_at: string;
  created_by?: string;
  profiles?: { full_name?: string };
}

export default function StudentNotices() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: notices = [], isLoading } = useQuery<Notice[]>({
    queryKey: ["student-notices-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("*, profiles(full_name)")
        .or("audience.eq.all,audience.eq.students")
        .order("created_at", { ascending: false });
      if (error) return [];
      return data as Notice[];
    },
  });

  const filtered = notices.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notices</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">School announcements and updates</p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          {notices.length} Total
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search notices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Notices */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No notices found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => (
            <Card key={n.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent
                className="p-4"
                onClick={() => setExpanded(expanded === n.id ? null : n.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg shrink-0">
                      <Bell className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{n.title}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(n.created_at).toLocaleDateString("en-PK", {
                          weekday: "short", day: "numeric", month: "short", year: "numeric"
                        })}
                        {n.profiles?.full_name ? ` • By ${n.profiles.full_name}` : ""}
                      </p>
                      {expanded !== n.id && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {n.content}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs capitalize hidden sm:flex">
                      {n.audience ?? "all"}
                    </Badge>
                    {expanded === n.id
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {expanded === n.id && (
                  <div className="mt-3 pt-3 border-t dark:border-gray-700">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {n.content}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
