import { Link } from "react-router-dom";
import { Stack, Title, Text, Button, Group, SimpleGrid, Loader, Center, Paper } from "@mantine/core";
import { useEventSearch } from "../../events/api";
import EventCard from "../../events/components/EventCard";

export default function Welcome() {
  const { data: events, isLoading } = useEventSearch({ page: 1, page_size: 6 });

  return (
    <Stack gap="xl">
      <Paper radius="md" p="xl" withBorder bg="var(--mantine-color-blue-light)">
        <Stack gap="sm" align="flex-start">
          <Title order={1}>Find and book events near you</Title>
          <Text size="lg" c="dimmed" maw={600}>
            Browse concerts, conferences, workshops and more. Create an account to book tickets
            and organize your own events.
          </Text>
          <Group mt="sm">
            <Button component={Link} to="/events" size="md">
              Browse events
            </Button>
            <Button component={Link} to="/register" size="md" variant="default">
              Create an account
            </Button>
          </Group>
        </Stack>
      </Paper>

      <div>
        <Group justify="space-between" mb="sm">
          <Title order={3}>Upcoming events</Title>
          <Button component={Link} to="/events" variant="subtle" size="compact-sm">
            See all
          </Button>
        </Group>

        {isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : events?.length ? (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {events.map((event) => (
              <EventCard key={event.event_id} event={event} />
            ))}
          </SimpleGrid>
        ) : (
          <Text c="dimmed">No published events yet — check back soon.</Text>
        )}
      </div>
    </Stack>
  );
}
