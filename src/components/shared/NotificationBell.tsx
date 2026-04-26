import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const NotificationBell = () => {
  const { user, role } = useAuth();
  const [count, setCount] = useState(0);
  const navigate = useNavigate();

  const refresh = async () => {
    if (!user) return;
    let q = supabase.from("notifications").select("*", { count: "exact", head: true }).eq("read", false);
    // RLS naturally filters; no extra filter needed
    const { count: c } = await q;
    setCount(c ?? 0);
  };

  useEffect(() => {
    refresh();
    if (!user) return;
    const channel = supabase
      .channel("notif-bell")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => refresh())
      .subscribe();
    const t = setInterval(refresh, 30000);
    return () => { supabase.removeChannel(channel); clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => navigate("/notifications")}
      className="relative"
      aria-label="Notifications"
    >
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] leading-none flex items-center justify-center rounded-full"
        >
          {count > 9 ? "9+" : count}
        </Badge>
      )}
    </Button>
  );
};
