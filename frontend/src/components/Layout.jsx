import { AppShell, Group, Text, Button, NavLink, Burger } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

export default function Layout() {
  const [opened, { toggle, close }] = useDisclosure();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  // A nav item is active on an exact match, or when the current path is nested
  // under it (e.g. /events/5 highlights "Browse events"). Root is exact-only.
  function isActive(path) {
    return path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
  }

  const navItem = (label, to) => (
    <NavLink label={label} component={Link} to={to} active={isActive(to)} onClick={close} />
  );

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 220, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={700} component={Link} to="/" style={{ textDecoration: "none", color: "inherit" }}>
              Event Booking
            </Text>
          </Group>
          <Group>
            {isAuthenticated ? (
              <>
                <Text size="sm" c="dimmed">
                  {user.username} ({user.priviledge.toLowerCase()})
                </Text>
                <Button variant="subtle" onClick={handleLogout}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button variant="subtle" component={Link} to="/login">
                  Log in
                </Button>
                <Button component={Link} to="/register">
                  Register
                </Button>
              </>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        {navItem("Browse events", "/events")}
        {isAuthenticated && (
          <>
            {navItem("Dashboard", "/")}
            {navItem("My events", "/my-events")}
            {navItem("My bookings", "/my-bookings")}
            {navItem("Messages", "/messages")}
            {user.priviledge === "ADMIN" && navItem("Admin", "/admin")}
          </>
        )}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
