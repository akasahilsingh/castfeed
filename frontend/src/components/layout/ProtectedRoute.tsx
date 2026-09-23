import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function ProtectedRoute() {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return null; // Wait for auth rehydration
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
