import { Navigate, useLocation } from "react-router-dom";
import { Center, Loader } from "@mantine/core";
import { useAuth } from "../features/auth/AuthContext";

export default function ProtectedRoute({ children, role }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-restricted route: `role` is a single role or a list of allowed roles.
  // Send authenticated-but-unauthorized users home rather than showing a page
  // the backend will 403 anyway (e.g. admin-only console, or the organizer/
  // participant screens that the purely-administrative admin can't use).
  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(user.priviledge)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
