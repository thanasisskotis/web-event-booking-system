import { AppShell, Group, Text, Button, NavLink, Burger, Badge, ThemeIcon } from "@mantine/core";
import { IconTicket } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useUnreadCount } from "../features/messaging/api";

export default function Layout() {
  const [opened, { toggle, close }] = useDisclosure();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Guests hit this Layout too (it wraps every route, including public
  // ones like /events and /login) — only poll unread count once logged in,
  // otherwise this 401s repeatedly and the axios interceptor bounces
  // guests to /login just for browsing.
  const { data: unread } = useUnreadCount(isAuthenticated);

  function handleLogout() {
    logout();
    navigate("/login");
  }

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
            <Group
              gap={8}
              component={Link}
              to="/"
              wrap="nowrap"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <ThemeIcon variant="gradient" gradient={{ from: "violet", to: "indigo", deg: 135 }} radius="md" size={30}>
                <IconTicket size={18} />
              </ThemeIcon>
              <Text fw={800} fz="lg" style={{ letterSpacing: "-0.02em" }}>
                EventHub
              </Text>
            </Group>
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
            <NavLink
              label={
                <Group gap={6} wrap="nowrap">
                  <span>Messages</span>
                  {unread?.unread_count > 0 && (
                    <Badge size="sm" circle>
                      {unread.unread_count}
                    </Badge>
                  )}
                </Group>
              }
              component={Link}
              to="/messages"
              active={isActive("/messages")}
              onClick={close}
            />
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
