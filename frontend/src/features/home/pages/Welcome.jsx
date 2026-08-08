import { Link } from "react-router-dom";
import { Stack, Title, Text, Button, Group, SimpleGrid, Loader, Center, Box } from "@mantine/core";
import { IconSearch, IconUserPlus } from "@tabler/icons-react";
import { useEventSearch } from "../../events/api";
import EventCard from "../../events/components/EventCard";

export default function Welcome() {
  const { data: events, isLoading } = useEventSearch({ page: 1, page_size: 6 });

  return (
    <Stack gap="xl">
      <Box
        p={{ base: "xl", sm: 48 }}
        style={{
          borderRadius: "var(--mantine-radius-lg)",
          background:
            "linear-gradient(135deg, var(--mantine-color-violet-6) 0%, var(--mantine-color-indigo-8) 100%)",
          color: "white",
        }}
      >
        <Stack gap="md" align="flex-start" maw={640}>
          <Title order={1} fz={{ base: 32, sm: 44 }} style={{ lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            Find and book events near you
          </Title>
          <Text size="lg" style={{ opacity: 0.9 }}>
            Concerts, conferences, workshops and more — all in one place. Create an account
            to book tickets and organize your own events.
          </Text>
          <Group mt="xs">
            <Button component={Link} to="/events" size="md" variant="white" c="violet.7" leftSection={<IconSearch size={18} />}>
              Browse events
            </Button>
            <Button
              component={Link}
              to="/register"
              size="md"
              variant="outline"
              color="white"
              leftSection={<IconUserPlus size={18} />}
            >
              Create an account
            </Button>
          </Group>
        </Stack>
      </Box>

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
