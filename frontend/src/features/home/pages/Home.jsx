import { Navigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import Dashboard from "../../dashboard/pages/Dashboard";
import Welcome from "./Welcome";

// Adaptive landing: authenticated users get their dashboard, guests get a
// public browse-first welcome page (no login wall — guests may browse per spec).
// The admin's home is the console: the participant dashboard (my events/
// bookings/recommendations) doesn't apply to a purely administrative role.
export default function Home() {
  const { isAuthenticated, hasRole } = useAuth();
  if (isAuthenticated && hasRole("ADMIN")) return <Navigate to="/admin" replace />;
  return isAuthenticated ? <Dashboard /> : <Welcome />;
}
