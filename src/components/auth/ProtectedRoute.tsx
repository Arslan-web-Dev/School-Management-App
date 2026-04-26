import { Navigate, Outlet } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface Props {
  roles?: AppRole[];
}

export const ProtectedRoute = ({ roles }: Props) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (roles && role && !roles.includes(role)) {
    const fallback = role === "student" ? "/student" : "/dashboard";
    return <Navigate to={fallback} replace />;
  }
  return <Outlet />;
};
