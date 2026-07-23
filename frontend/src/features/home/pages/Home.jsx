import { useAuth } from "../../auth/AuthContext";
import Dashboard from "../../dashboard/pages/Dashboard";
import Welcome from "./Welcome";

// Adaptive landing: authenticated users get their dashboard, guests get a
// public browse-first welcome page (no login wall — guests may browse per spec).
export default function Home() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Dashboard /> : <Welcome />;
}
