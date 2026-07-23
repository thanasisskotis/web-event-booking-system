import { Link } from "react-router-dom";
import { Title, Text, SimpleGrid, Card, Stack, Loader, Center } from "@mantine/core";
import { useAuth } from "../../auth/AuthContext";
import { useRecommendations } from "../../events/api";
import EventCard from "../../events/components/EventCard";

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
        <Card component={Link} to="/events" withBorder radius="md" p="lg">
          <Title order={4}>Browse &amp; search events</Title>
          <Text c="dimmed" size="sm">
            Find events by category, date, price, or location.
          </Text>
        </Card>
        <Card component={Link} to="/my-events" withBorder radius="md" p="lg">
          <Title order={4}>Manage my events</Title>
          <Text c="dimmed" size="sm">
            Create, edit, publish, or cancel events you organize.
          </Text>
        </Card>
        <Card component={Link} to="/my-bookings" withBorder radius="md" p="lg">
          <Title order={4}>My bookings</Title>
          <Text c="dimmed" size="sm">
            Review tickets you&apos;ve booked.
          </Text>
        </Card>
        <Card component={Link} to="/messages" withBorder radius="md" p="lg">
          <Title order={4}>Messages</Title>
          <Text c="dimmed" size="sm">
            Inbox and sent messages with organizers and attendees.
          </Text>
        </Card>
      </SimpleGrid>

      <div>
        <Title order={3} mb="sm">
          Recommended for you
        </Title>
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
