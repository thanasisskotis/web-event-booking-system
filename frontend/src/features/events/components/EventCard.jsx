import { Card, Text, Badge, Group, Stack } from "@mantine/core";
import { Link } from "react-router-dom";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function EventCard({ event }) {
  const cheapest = event.ticket_types?.length
    ? Math.min(...event.ticket_types.map((t) => Number(t.price)))
    : null;

  return (
    <Card component={Link} to={`/events/${event.event_id}`} withBorder radius="md" p="md" shadow="xs">
      <Stack gap={4}>
        <Group justify="space-between" wrap="nowrap">
          <Text fw={600}>{event.title}</Text>
          <Badge color="blue" variant="light">
            {event.event_type}
          </Badge>
        </Group>
        <Text size="sm" c="dimmed">
          {event.venue}, {event.city}
        </Text>
        <Text size="sm">{dateFormatter.format(new Date(event.start_datetime))}</Text>
        <Group gap={6} mt={4}>
          {event.categories?.map((c) => (
            <Badge key={c} size="sm" variant="outline">
              {c}
            </Badge>
          ))}
        </Group>
        {cheapest !== null && (
          <Text size="sm" fw={500} mt={4}>
            From {cheapest.toFixed(2)} €
          </Text>
        )}
      </Stack>
    </Card>
  );
}
