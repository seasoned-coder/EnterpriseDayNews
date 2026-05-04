import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "./pages/Landing.tsx";
import StudentLogin from "./pages/StudentLogin.tsx";
import StaffLogin from "./pages/StaffLogin.tsx";
import StudentUpload from "./pages/StudentUpload.tsx";
import StaffDashboard from "./pages/StaffDashboard.tsx";
import Projector from "./pages/Projector.tsx";
import NotFound from "./pages/NotFound.tsx";
import { api } from "@/lib/api";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role: "STUDENT" | "STAFF" }) => {
  const user = api.getCurrentUser();
  if (!user || user.role !== role) {
    return <Navigate to={role === "STUDENT" ? "/student/login" : "/staff/login"} replace />;
  }
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/staff/login" element={<StaffLogin />} />
          <Route
            path="/student"
            element={
              <ProtectedRoute role="STUDENT">
                <StudentUpload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <ProtectedRoute role="STAFF">
                <StaffDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/projector" element={<Projector />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
