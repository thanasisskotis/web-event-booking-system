import { Card, Text, Badge, Group, Stack, Image, Box, ThemeIcon } from "@mantine/core";
import { IconMapPin, IconCalendarEvent, IconTicket } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../../../api/client";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

// Cover strip: real photo when the event has one, otherwise a branded gradient
// placeholder with a ticket glyph -- a booking site should always look visual,
// never a bare text row.
function CardCover({ event }) {
  const cover = event.photos?.[0];
  if (cover) {
    return <Image src={`${API_BASE_URL}${cover.url}`} height={160} fit="cover" alt={event.title} />;
  }
  return (
    <Box
      h={160}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, var(--mantine-color-violet-6), var(--mantine-color-indigo-8))",
      }}
    >
      <ThemeIcon variant="transparent" c="white" size={56}>
        <IconTicket size={48} stroke={1.5} />
      </ThemeIcon>
    </Box>
  );
}

export default function EventCard({ event }) {
  const cheapest = event.ticket_types?.length
    ? Math.min(...event.ticket_types.map((t) => Number(t.price)))
    : null;

  return (
    <Card
      component={Link}
      to={`/events/${event.event_id}`}
      className="event-card"
      padding={0}
      style={{ overflow: "hidden" }}
    >
      <Card.Section pos="relative">
        <CardCover event={event} />
        <Badge
          color="violet"
          variant="filled"
          pos="absolute"
          top={10}
          right={10}
          style={{ boxShadow: "var(--mantine-shadow-sm)" }}
        >
          {event.event_type}
        </Badge>
      </Card.Section>

      <Stack gap={6} p="md">
        <Text fw={700} lineClamp={1} size="lg">
          {event.title}
        </Text>

        <Group gap={6} wrap="nowrap" c="dimmed">
          <IconMapPin size={15} />
          <Text size="sm" lineClamp={1}>
            {event.venue}, {event.city}
          </Text>
        </Group>
        <Group gap={6} wrap="nowrap" c="dimmed">
          <IconCalendarEvent size={15} />
          <Text size="sm">{dateFormatter.format(new Date(event.start_datetime))}</Text>
        </Group>

        {event.categories?.length > 0 && (
          <Group gap={6} mt={2}>
            {event.categories.map((c) => (
              <Badge key={c} size="sm" variant="light" color="gray">
                {c}
              </Badge>
            ))}
          </Group>
        )}

        <Group justify="space-between" align="center" mt="xs">
          {cheapest !== null ? (
            <Text size="sm" c="dimmed">
              from{" "}
              <Text span fw={700} c="violet.7" size="lg">
                {cheapest.toFixed(2)} €
              </Text>
            </Text>
          ) : (
            <span />
          )}
          <Text size="sm" fw={600} c="violet.7">
            View →
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}
