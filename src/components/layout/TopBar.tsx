import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Moon, Sun, LogOut, UserCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/shared/NotificationBell";

export const TopBar = () => {
  const { user, role, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const initials = user?.email?.[0]?.toUpperCase() ?? "U";

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const roleColors: Record<string, string> = {
    admin:   "bg-primary/10 text-primary border-primary/20",
    teacher: "bg-success/10 text-success border-success/20",
    student: "bg-warning/10 text-warning border-warning/20",
    parent:  "bg-accent text-accent-foreground border-accent-foreground/10",
  };

  return (
    <div className="flex flex-1 items-center justify-end gap-2">
      {role && (
        <Badge variant="outline" className={`capitalize hidden sm:inline-flex ${roleColors[role] ?? ""}`}>
          {role} panel
        </Badge>
      )}
      <NotificationBell />
      <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
        {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="text-sm font-medium truncate">{user?.email}</span>
              <span className="text-xs text-muted-foreground capitalize">{role}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/profile")}>
            <UserCircle className="mr-2 h-4 w-4" /> Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
