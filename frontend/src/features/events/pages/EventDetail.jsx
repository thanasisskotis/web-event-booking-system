import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Title,
  Text,
  Badge,
  Group,
  Stack,
  Loader,
  Center,
  Divider,
  Paper,
  Anchor,
  Button,
  SimpleGrid,
  Image,
  Box,
} from "@mantine/core";
import { IconArrowLeft, IconMail, IconMapPin, IconCalendarEvent, IconTicket } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useEvent } from "../api";
import { useAuth } from "../../auth/AuthContext";
import { useMyBookings } from "../../bookings/api";
import EventMap from "../components/EventMap";
import BookingForm from "../../bookings/components/BookingForm";
import { useSendMessage } from "../../messaging/api";
import ComposeMessageModal from "../../messaging/components/ComposeMessageModal";
import { API_BASE_URL } from "../../../api/client";

const dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short" });

// Full-width hero: the event's first photo (or a branded gradient) with a dark
// scrim so the overlaid title/type stay legible over any image.
function EventHero({ event }) {
  const cover = event.photos?.[0];
  const background = cover
    ? `linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.75) 100%), url(${API_BASE_URL}${cover.url})`
    : "linear-gradient(135deg, var(--mantine-color-violet-6) 0%, var(--mantine-color-indigo-8) 100%)";

  return (
    <Box
      style={{
        position: "relative",
        minHeight: 300,
        borderRadius: "var(--mantine-radius-lg)",
        overflow: "hidden",
        background,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "flex-end",
        color: "white",
      }}
    >
      {!cover && (
        <IconTicket
          size={120}
          stroke={1}
          style={{ position: "absolute", top: 24, right: 24, opacity: 0.25 }}
        />
      )}
      <Stack gap={6} p={{ base: "md", sm: "xl" }} style={{ zIndex: 1 }}>
        <Badge color="violet" variant="filled" w="fit-content">
          {event.event_type}
        </Badge>
        <Title order={1} fz={{ base: 26, sm: 36 }} style={{ lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          {event.title}
        </Title>
        <Group gap="lg" style={{ opacity: 0.95 }}>
          <Group gap={6} wrap="nowrap">
            <IconMapPin size={16} />
            <Text size="sm">
              {event.venue}, {event.city}
            </Text>
          </Group>
          <Group gap={6} wrap="nowrap">
            <IconCalendarEvent size={16} />
            <Text size="sm">{dateFormatter.format(new Date(event.start_datetime))}</Text>
          </Group>
        </Group>
      </Stack>
    </Box>
  );
}

export default function EventDetail() {
  const { eventId } = useParams();
  const { data: event, isLoading, isError } = useEvent(eventId);
  const { user, isAuthenticated, hasRole } = useAuth();
  const { data: myBookings } = useMyBookings();
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

  // Real check, not just a comment: the backend only allows a non-organizer
  // to message the organizer if they have a CONFIRMED booking for THIS
  // event specifically (Booking has no direct event_id -- it's reachable
  // only via ticket_type_id, so we match against this event's ticket types).
  const eventTicketTypeIds = new Set((event.ticket_types ?? []).map((t) => t.ticket_type_id));
  const hasBookingForThisEvent = (myBookings ?? []).some(
    (b) => b.booking_status === "CONFIRMED" && eventTicketTypeIds.has(b.ticket_type_id)
  );

  const canMessageOrganizer =
    isAuthenticated && user.user_id !== event.organizer_id && hasBookingForThisEvent;

  // The hero already shows the first photo; the gallery shows the rest.
  const galleryPhotos = (event.photos ?? []).slice(1);

  return (
    <Stack gap="lg" maw={900} mx="auto">
      <Anchor component={Link} to="/events" size="sm">
        <Group gap={4}>
          <IconArrowLeft size={14} />
          Back to events
        </Group>
      </Anchor>

      <EventHero event={event} />

      <Group gap={6}>
        {event.categories.map((c) => (
          <Badge key={c} variant="light" color="gray">
            {c}
          </Badge>
        ))}
      </Group>

      {canMessageOrganizer && (
        <Button
          variant="light"
          w="fit-content"
          leftSection={<IconMail size={16} />}
          onClick={() => setMessageOpen(true)}
        >
          Message organizer
        </Button>
      )}

      <Text c="dimmed" size="sm">
        {event.venue}, {event.address}, {event.city}, {event.country}
      </Text>

      {event.description && <Text>{event.description}</Text>}

      {galleryPhotos.length > 0 && (
        <SimpleGrid cols={{ base: 2, sm: 3 }}>
          {galleryPhotos.map((photo) => (
            <Image key={photo.photo_id} src={`${API_BASE_URL}${photo.url}`} radius="md" h={140} fit="cover" />
          ))}
        </SimpleGrid>
      )}

      {event.latitude != null && event.longitude != null && (
        <EventMap latitude={event.latitude} longitude={event.longitude} title={event.title} />
      )}

      <Divider />

      <Paper withBorder p="lg" radius="md" shadow="sm">
        <Group gap={8} mb="sm">
          <IconTicket size={20} color="var(--mantine-color-violet-6)" />
          <Title order={4}>Tickets</Title>
        </Group>
        {isAuthenticated && hasRole("ADMIN") ? (
          <Text c="dimmed">
            The administrator account is for management only and cannot book tickets.
          </Text>
        ) : isAuthenticated ? (
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
