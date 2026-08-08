import { Link } from "react-router-dom";
import { Title, Text, SimpleGrid, Card, Stack, Loader, Center, Group, ThemeIcon } from "@mantine/core";
import {
  IconSearch,
  IconCalendarEvent,
  IconTicket,
  IconMail,
  IconSparkles,
} from "@tabler/icons-react";
import { useAuth } from "../../auth/AuthContext";
import { useRecommendations } from "../../events/api";
import EventCard from "../../events/components/EventCard";

const ACTIONS = [
  {
    to: "/events",
    icon: IconSearch,
    color: "violet",
    title: "Browse & search events",
    text: "Find events by category, date, price, or location.",
  },
  {
    to: "/my-events",
    icon: IconCalendarEvent,
    color: "indigo",
    title: "Manage my events",
    text: "Create, edit, publish, or cancel events you organize.",
  },
  {
    to: "/my-bookings",
    icon: IconTicket,
    color: "teal",
    title: "My bookings",
    text: "Review tickets you've booked.",
  },
  {
    to: "/messages",
    icon: IconMail,
    color: "pink",
    title: "Messages",
    text: "Inbox and sent messages with organizers and attendees.",
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { data: recommendations, isLoading } = useRecommendations(6);

  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Welcome back, {user?.first_name}</Title>
        <Text c="dimmed">What would you like to do today?</Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {ACTIONS.map(({ to, icon: Icon, color, title, text }) => (
          <Card key={to} className="event-card" component={Link} to={to} p="lg">
            <Group align="flex-start" wrap="nowrap">
              <ThemeIcon variant="light" color={color} size={44} radius="md">
                <Icon size={24} />
              </ThemeIcon>
              <div>
                <Title order={4}>{title}</Title>
                <Text c="dimmed" size="sm">
                  {text}
                </Text>
              </div>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      <div>
        <Group gap={8} mb="sm">
          <ThemeIcon variant="light" color="violet" size={26} radius="sm">
            <IconSparkles size={16} />
          </ThemeIcon>
          <Title order={3}>Recommended for you</Title>
        </Group>
        {isLoading ? (
          <Center py="md">
            <Loader size="sm" />
          </Center>
        ) : recommendations?.length ? (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {recommendations.map((event) => (
              <EventCard key={event.event_id} event={event} />
            ))}
          </SimpleGrid>
        ) : (
          <Text c="dimmed">No recommendations yet — browse some events to get started.</Text>
        )}
      </div>
    </Stack>
  );
}
