import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Title, Text, Badge, Group, Stack, Loader, Center, Divider, Paper, Anchor, Button } from "@mantine/core";
import { IconArrowLeft, IconMail } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useEvent } from "../api";
import { useAuth } from "../../auth/AuthContext";
import EventMap from "../components/EventMap";
import BookingForm from "../../bookings/components/BookingForm";
import { useSendMessage } from "../../messaging/api";
import ComposeMessageModal from "../../messaging/components/ComposeMessageModal";

const dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short" });

export default function EventDetail() {
  const { eventId } = useParams();
  const { data: event, isLoading, isError } = useEvent(eventId);
  const { user, isAuthenticated } = useAuth();
  const [messageOpen, setMessageOpen] = useState(false);
  const sendMessage = useSendMessage();

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (isError || !event) {
    return <Text c="red">Event not found.</Text>;
  }

  // Backend also enforces this (sender must have a booking for this event
  // to message the organizer) — this just avoids showing a button that
  // would always fail for someone who hasn't booked yet.
  const canMessageOrganizer = isAuthenticated && user.user_id !== event.organizer_id;

  return (
    <Stack gap="lg" maw={800} mx="auto">
      <Anchor component={Link} to="/events" size="sm">
        <Group gap={4}>
          <IconArrowLeft size={14} />
          Back to events
        </Group>
      </Anchor>
      <div>
        <Group justify="space-between">
          <Title order={2}>{event.title}</Title>
          <Badge color="blue">{event.event_type}</Badge>
        </Group>
        <Text c="dimmed">
          {event.venue}, {event.address}, {event.city}, {event.country}
        </Text>
        <Text>{dateFormatter.format(new Date(event.start_datetime))}</Text>
        <Group gap={6} mt={4}>
          {event.categories.map((c) => (
            <Badge key={c} variant="outline">
              {c}
            </Badge>
          ))}
        </Group>

        {canMessageOrganizer && (
          <Button
            mt="sm"
            variant="light"
            leftSection={<IconMail size={16} />}
            onClick={() => setMessageOpen(true)}
          >
            Message organizer
          </Button>
        )}
      </div>

      {event.description && <Text>{event.description}</Text>}

      {event.latitude != null && event.longitude != null && (
        <EventMap latitude={event.latitude} longitude={event.longitude} title={event.title} />
      )}

      <Divider />

      <Paper withBorder p="md" radius="md">
        <Title order={4} mb="sm">
          Tickets
        </Title>
        {isAuthenticated ? (
          <BookingForm event={event} />
        ) : (
          <Text>
            <Link to="/login" state={{ from: { pathname: `/events/${event.event_id}` } }}>
              Log in
            </Link>{" "}
            to book tickets for this event.
          </Text>
        )}
      </Paper>

      <ComposeMessageModal
        opened={messageOpen}
        onClose={() => setMessageOpen(false)}
        title="Message the organizer"
        sending={sendMessage.isPending}
        onSend={async ({ subject, body }) => {
          await sendMessage.mutateAsync({
            recipientId: event.organizer_id,
            eventId: event.event_id,
            subject,
            body,
          });
          notifications.show({ color: "green", message: "Message sent" });
        }}
      />
    </Stack>
  );
}
