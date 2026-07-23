import { useState } from "react";
import {
  Title,
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
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { IconPlus, IconTrash, IconCalendarEvent } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { confirmAction } from "../../../components/confirm";
import EmptyState from "../../../components/EmptyState";
import TableSkeleton from "../../../components/TableSkeleton";
import { useMyEvents, useCreateEvent, usePublishEvent, useCancelEvent, useDeleteEvent } from "../api";

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
  // Mantine v8 DateTimePicker emits a string, not a Date.
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
      ticket_types: [{ name: "", price: 0, quantity: 1 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "ticket_types" });

  async function onSubmit(values) {
    try {
      await createEvent.mutateAsync({
        ...values,
        start_datetime: new Date(values.start_datetime).toISOString(),
        end_datetime: new Date(values.end_datetime).toISOString(),
      });
      notifications.show({ color: "green", message: "Event created as draft" });
      onClose();
    } catch (err) {
      notifications.show({ color: "red", message: err.response?.data?.detail ?? "Failed to create event" });
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

export default function MyEvents() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: events, isLoading } = useMyEvents();
  const publishEvent = usePublishEvent();
  const cancelEvent = useCancelEvent();
  const deleteEvent = useDeleteEvent();

  async function handleAction(mutation, eventId, successMessage) {
    try {
      await mutation.mutateAsync(eventId);
      notifications.show({ color: "green", message: successMessage });
    } catch (err) {
      notifications.show({ color: "red", message: err.response?.data?.detail ?? "Action failed" });
    }
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>My events</Title>
        <Button onClick={() => setModalOpen(true)}>Create event</Button>
      </Group>

      {isLoading ? (
        <TableSkeleton />
      ) : !events?.length ? (
        <EmptyState icon={IconCalendarEvent} message="You haven't created any events yet.">
          <Button variant="light" onClick={() => setModalOpen(true)}>
            Create your first event
          </Button>
        </EmptyState>
      ) : (
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Title</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Capacity</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {events.map((event) => (
              <Table.Tr key={event.event_id}>
                <Table.Td>{event.title}</Table.Td>
                <Table.Td>
                  <Badge color={statusColor[event.status] ?? "gray"}>{event.status}</Badge>
                </Table.Td>
                <Table.Td>{event.capacity}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
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
                      <Button
                        size="xs"
                        color="red"
                        variant="light"
                        onClick={() =>
                          confirmAction({
                            title: "Cancel event",
                            message: `Cancel "${event.title}"? Existing bookings are kept for the record, but no new bookings will be accepted.`,
                            confirmLabel: "Cancel event",
                            onConfirm: () => handleAction(cancelEvent, event.event_id, "Event cancelled"),
                          })
                        }
                      >
                        Cancel
                      </Button>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <CreateEventModal opened={modalOpen} onClose={() => setModalOpen(false)} />
    </Stack>
  );
}
