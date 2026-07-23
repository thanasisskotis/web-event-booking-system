import { AppShell, Group, Text, Button, NavLink, Burger } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

export default function Layout() {
  const [opened, { toggle }] = useDisclosure();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate("/login");
  }

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
        <NavLink label="Browse events" component={Link} to="/events" active={location.pathname === "/events"} />
        {isAuthenticated && (
          <>
            <NavLink label="Dashboard" component={Link} to="/" active={location.pathname === "/"} />
            <NavLink label="My events" component={Link} to="/my-events" />
            <NavLink label="My bookings" component={Link} to="/my-bookings" />
            <NavLink label="Messages" component={Link} to="/messages" />
            {user.priviledge === "ADMIN" && <NavLink label="Admin" component={Link} to="/admin" />}
          </>
        )}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
