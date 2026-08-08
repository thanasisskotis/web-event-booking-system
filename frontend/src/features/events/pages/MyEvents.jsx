import { useState } from "react";
import {
  Stack,
  Table,
  Badge,
  Button,
  Group,
  Text,
  Modal,
  TextInput,
  MultiSelect,
  NumberInput,
  ActionIcon,
  Textarea,
  Paper,
  Image,
  Box,
  ThemeIcon,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { IconPlus, IconTrash, IconCalendarEvent, IconTicket } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { confirmAction } from "../../../components/confirm";
import EmptyState from "../../../components/EmptyState";
import TableSkeleton from "../../../components/TableSkeleton";
import PageHeader from "../../../components/PageHeader";
import { useMyEvents, useCreateEvent, usePublishEvent, useDeleteEvent } from "../api";
import EventBookingsModal from "../components/EventBookingsModal";
import CancelEventModal from "../components/CancelEventModal";
import ManagePhotosModal from "../components/ManagePhotosModal";
import EditEventModal from "../components/EditEventModal";
import { getErrorMessage } from "../../../api/errors";
import { API_BASE_URL } from "../../../api/client";

const CATEGORIES = ["Music", "Theatre", "Conference", "Sports", "Workshop"];

const ticketTypeSchema = z.object({
  name: z.string().min(1, "Required"),
  price: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(1),
});

const eventSchema = z.object({
  title: z.string().min(1, "Required"),
  categories: z.array(z.string()).min(1, "Pick at least one category"),
  event_type: z.string().min(1, "Required"),
  venue: z.string().min(1, "Required"),
  address: z.string().min(1, "Required"),
  city: z.string().min(1, "Required"),
  country: z.string().min(1, "Required"),
  latitude: z.coerce.number().min(-90).max(90).optional().or(z.literal("")),
  longitude: z.coerce.number().min(-180).max(180).optional().or(z.literal("")),
  start_datetime: z.string().min(1, "Required"),
  end_datetime: z.string().min(1, "Required"),
  capacity: z.coerce.number().int().min(1),
  description: z.string().optional(),
  ticket_types: z.array(ticketTypeSchema).min(1, "Add at least one ticket type"),
});

const statusColor = { DRAFT: "gray", PUBLISHED: "green", CANCELLED: "red", COMPLETED: "blue" };

function CreateEventModal({ opened, onClose }) {
  const createEvent = useCreateEvent();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      categories: [],
      start_datetime: "",
      end_datetime: "",
      latitude: "",
      longitude: "",
      ticket_types: [{ name: "", price: 0, quantity: 1 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "ticket_types" });

  async function onSubmit(values) {
    try {
      await createEvent.mutateAsync({
        ...values,
        // Empty string means "not provided" -> send null, not NaN.
        latitude: values.latitude === "" ? null : values.latitude,
        longitude: values.longitude === "" ? null : values.longitude,
        start_datetime: new Date(values.start_datetime).toISOString(),
        end_datetime: new Date(values.end_datetime).toISOString(),
      });
      notifications.show({ color: "green", message: "Event created as draft" });
      onClose();
    } catch (err) {
      notifications.show({ color: "red", message: getErrorMessage(err, "Failed to create event") });
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Create event" size="lg">
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack>
          <TextInput label="Title" {...register("title")} error={errors.title?.message} />
          <MultiSelect
            label="Categories"
            placeholder="Pick one or more"
            data={CATEGORIES}
            value={watch("categories")}
            onChange={(value) => setValue("categories", value)}
            error={errors.categories?.message}
          />
          <TextInput label="Event type" {...register("event_type")} error={errors.event_type?.message} />
          <TextInput label="Venue" {...register("venue")} error={errors.venue?.message} />
          <TextInput label="Address" {...register("address")} error={errors.address?.message} />
          <Group grow>
            <TextInput label="City" {...register("city")} error={errors.city?.message} />
            <TextInput label="Country" {...register("country")} error={errors.country?.message} />
          </Group>
          <Group grow>
            <NumberInput
              label="Latitude"
              placeholder="e.g. 37.9838"
              decimalScale={6}
              min={-90}
              max={90}
              value={watch("latitude")}
              onChange={(v) => setValue("latitude", v ?? "", { shouldValidate: true })}
              error={errors.latitude?.message}
            />
            <NumberInput
              label="Longitude"
              placeholder="e.g. 23.7275"
              decimalScale={6}
              min={-180}
              max={180}
              value={watch("longitude")}
              onChange={(v) => setValue("longitude", v ?? "", { shouldValidate: true })}
              error={errors.longitude?.message}
            />
          </Group>
          <Text size="xs" c="dimmed" mt={-8}>
            Optional — adds the OpenStreetMap preview to the event page. Tip: right-click a location on{" "}
            <a href="https://www.openstreetmap.org" target="_blank" rel="noreferrer">
              openstreetmap.org
            </a>{" "}
            and copy the coordinates shown.
          </Text>
          <Group grow>
            <DateTimePicker
              label="Start"
              value={watch("start_datetime")}
              onChange={(v) => setValue("start_datetime", v, { shouldValidate: true })}
              error={errors.start_datetime?.message}
            />
            <DateTimePicker
              label="End"
              value={watch("end_datetime")}
              onChange={(v) => setValue("end_datetime", v, { shouldValidate: true })}
              error={errors.end_datetime?.message}
            />
          </Group>
          <NumberInput
            label="Capacity"
            min={1}
            value={watch("capacity")}
            onChange={(v) => setValue("capacity", v)}
            error={errors.capacity?.message}
          />
          <Textarea label="Description" {...register("description")} />

          <Text fw={500}>Ticket types</Text>
          {errors.ticket_types?.message && <Text c="red" size="sm">{errors.ticket_types.message}</Text>}
          {fields.map((field, index) => (
            <Group key={field.id} align="flex-end">
              <TextInput
                label="Name"
                {...register(`ticket_types.${index}.name`)}
                error={errors.ticket_types?.[index]?.name?.message}
              />
              <NumberInput
                label="Price"
                min={0}
                decimalScale={2}
                value={watch(`ticket_types.${index}.price`)}
                onChange={(v) => setValue(`ticket_types.${index}.price`, v)}
              />
              <NumberInput
                label="Quantity"
                min={1}
                value={watch(`ticket_types.${index}.quantity`)}
                onChange={(v) => setValue(`ticket_types.${index}.quantity`, v)}
              />
              <ActionIcon color="red" variant="light" onClick={() => remove(index)} disabled={fields.length <= 1}>
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          ))}
          <Button
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={() => append({ name: "", price: 0, quantity: 1 })}
          >
            Add ticket type
          </Button>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Create as draft
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

// Small square cover preview in the events table: first uploaded photo, or a
// branded gradient placeholder with a ticket glyph when there's none yet.
function EventThumb({ event }) {
  const cover = event.photos?.[0];
  if (cover) {
    return (
      <Image
        src={`${API_BASE_URL}${cover.url}`}
        w={48}
        h={48}
        radius="sm"
        fit="cover"
        alt={event.title}
      />
    );
  }
  return (
    <Box
      w={48}
      h={48}
      style={{
        borderRadius: "var(--mantine-radius-sm)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, var(--mantine-color-violet-5), var(--mantine-color-indigo-7))",
      }}
    >
      <ThemeIcon variant="transparent" c="white" size={24}>
        <IconTicket size={22} stroke={1.5} />
      </ThemeIcon>
    </Box>
  );
}

export default function MyEvents() {
  const [modalOpen, setModalOpen] = useState(false);
  const [bookingsEvent, setBookingsEvent] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [photosEvent, setPhotosEvent] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const { data: events, isLoading } = useMyEvents();
  const publishEvent = usePublishEvent();
  const deleteEvent = useDeleteEvent();

  async function handleAction(mutation, eventId, successMessage) {
    try {
      await mutation.mutateAsync(eventId);
      notifications.show({ color: "green", message: successMessage });
    } catch (err) {
      notifications.show({ color: "red", message: getErrorMessage(err, "Action failed") });
    }
  }

  return (
    <Stack gap="lg">
      <PageHeader
        icon={IconCalendarEvent}
        title="My events"
        subtitle="Create, publish, and manage the events you organize."
        action={
          <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)}>
            Create event
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton />
      ) : !events?.length ? (
        <EmptyState icon={IconCalendarEvent} message="You haven't created any events yet.">
          <Button variant="light" onClick={() => setModalOpen(true)}>
            Create your first event
          </Button>
        </EmptyState>
      ) : (
        <Paper withBorder radius="md" p="xs">
        <Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={64} />
              <Table.Th>Title</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Capacity</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {events.map((event) => (
              <Table.Tr key={event.event_id}>
                <Table.Td>
                  <EventThumb event={event} />
                </Table.Td>
                <Table.Td fw={500}>{event.title}</Table.Td>
                <Table.Td>
                  <Badge color={statusColor[event.status] ?? "gray"} variant="light">{event.status}</Badge>
                </Table.Td>
                <Table.Td>{event.capacity}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button size="xs" variant="default" onClick={() => setPhotosEvent(event)}>
                      Photos
                    </Button>
                    {(event.status === "DRAFT" || event.status === "PUBLISHED") && (
                      <Button size="xs" variant="default" onClick={() => setEditTarget(event)}>
                        Edit
                      </Button>
                    )}
                    {event.status === "DRAFT" && (
                      <>
                        <Button
                          size="xs"
                          onClick={() => handleAction(publishEvent, event.event_id, "Event published")}
                        >
                          Publish
                        </Button>
                        <Button
                          size="xs"
                          color="red"
                          variant="light"
                          onClick={() =>
                            confirmAction({
                              title: "Delete event",
                              message: `Permanently delete "${event.title}"? This can't be undone.`,
                              confirmLabel: "Delete",
                              onConfirm: () => handleAction(deleteEvent, event.event_id, "Event deleted"),
                            })
                          }
                        >
                          Delete
                        </Button>
                      </>
                    )}
                    {event.status === "PUBLISHED" && (
                      <>
                        <Button size="xs" variant="default" onClick={() => setBookingsEvent(event)}>
                          Bookings
                        </Button>
                        <Button size="xs" color="red" variant="light" onClick={() => setCancelTarget(event)}>
                          Cancel
                        </Button>
                      </>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        </Paper>
      )}

      <CreateEventModal opened={modalOpen} onClose={() => setModalOpen(false)} />
      <EventBookingsModal event={bookingsEvent} onClose={() => setBookingsEvent(null)} />
      <CancelEventModal event={cancelTarget} onClose={() => setCancelTarget(null)} />
      <ManagePhotosModal event={photosEvent} onClose={() => setPhotosEvent(null)} />
      <EditEventModal event={editTarget} onClose={() => setEditTarget(null)} />
    </Stack>
  );
}
