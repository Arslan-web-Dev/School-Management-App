import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  accent?: "primary" | "success" | "warning" | "destructive";
}

const accentMap = {
  primary: "bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-600 dark:text-blue-400 shadow-blue-500/20",
  success: "bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/20",
  warning: "bg-gradient-to-br from-amber-500/20 to-amber-600/20 text-amber-600 dark:text-amber-400 shadow-amber-500/20",
  destructive: "bg-gradient-to-br from-rose-500/20 to-rose-600/20 text-rose-600 dark:text-rose-400 shadow-rose-500/20",
};

const accentBorderMap = {
  primary: "border-blue-500/20",
  success: "border-emerald-500/20",
  warning: "border-amber-500/20",
  destructive: "border-rose-500/20",
};

export const StatCard = ({ label, value, icon: Icon, trend, accent = "primary" }: Props) => {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Card className={cn(
        "overflow-hidden border bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg",
        "transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-primary/10",
        accentBorderMap[accent]
      )}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <p className="text-4xl font-bold tracking-tight text-gradient">{value}</p>
              {trend && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className={cn(
                    "inline-block w-1.5 h-1.5 rounded-full",
                    accent === "success" && "bg-emerald-500",
                    accent === "destructive" && "bg-rose-500",
                    accent === "warning" && "bg-amber-500",
                    accent === "primary" && "bg-blue-500"
                  )} />
                  {trend}
                </p>
              )}
            </div>
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl shadow-lg",
              accentMap[accent]
            )}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
