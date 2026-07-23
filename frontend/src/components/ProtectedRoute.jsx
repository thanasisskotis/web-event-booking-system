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

  // Role-restricted route (e.g. admin-only): send authenticated-but-unauthorized
  // users home rather than showing a page the backend will 403 anyway.
  if (role && user.priviledge !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}
