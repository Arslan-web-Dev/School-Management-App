import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Teachers from "./pages/Teachers";
import Classes from "./pages/Classes";
import Attendance from "./pages/Attendance";
import MyAttendance from "./pages/MyAttendance";
import Notices from "./pages/Notices";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/auth" element={<Auth />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/notices" element={<Notices />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute roles={["admin", "teacher"]} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/students" element={<Students />} />
                  <Route path="/classes" element={<Classes />} />
                  <Route path="/attendance" element={<Attendance />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute roles={["admin"]} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/teachers" element={<Teachers />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute roles={["student"]} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/my-attendance" element={<MyAttendance />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
