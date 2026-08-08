import { useEffect } from "react";
import {
  Modal,
  Stack,
  TextInput,
  MultiSelect,
  NumberInput,
  Textarea,
  Button,
  Group,
  Text,
  ActionIcon,
  Alert,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { IconPlus, IconTrash, IconLock } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useEventBookings, useUpdateEvent } from "../api";
import { getErrorMessage } from "../../../api/errors";

const CATEGORIES = ["Music", "Theatre", "Conference", "Sports", "Workshop"];

const ticketTypeSchema = z.object({
  name: z.string().min(1, "Required"),
  price: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(1),
});

const editSchema = z.object({
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
  ticket_types: z.array(ticketTypeSchema).min(1, "Add at least one ticket type").optional(),
});

export default function EditEventModal({ event, onClose }) {
  const updateEvent = useUpdateEvent(event?.event_id);
  // Need to know if bookings exist BEFORE submitting, so we know whether to
  // include ticket_types in the payload at all (backend 400s if we send it
  // for an event that already has bookings).
  const { data: bookings, isLoading: loadingBookings } = useEventBookings(event?.event_id);
  const hasBookings = (bookings?.length ?? 0) > 0;

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editSchema),
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

  // Pre-fill the form once we have the event to edit. Runs again if a
  // different event is opened while the modal component stays mounted.
  useEffect(() => {
    if (!event) return;
    reset({
      title: event.title,
      categories: event.categories,
      event_type: event.event_type,
      venue: event.venue,
      address: event.address,
      city: event.city,
      country: event.country,
      latitude: event.latitude ?? "",
      longitude: event.longitude ?? "",
      start_datetime: event.start_datetime,
      end_datetime: event.end_datetime,
      capacity: event.capacity,
      description: event.description ?? "",
      ticket_types: event.ticket_types.map((t) => ({
        name: t.name,
        price: Number(t.price),
        quantity: t.quantity,
      })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  async function onSubmit(values) {
    try {
      const payload = {
        title: values.title,
        categories: values.categories,
        event_type: values.event_type,
        venue: values.venue,
        address: values.address,
        city: values.city,
        country: values.country,
        latitude: values.latitude === "" ? null : values.latitude,
        longitude: values.longitude === "" ? null : values.longitude,
        start_datetime: new Date(values.start_datetime).toISOString(),
        end_datetime: new Date(values.end_datetime).toISOString(),
        capacity: values.capacity,
        description: values.description,
      };
      // Only send ticket_types when they're actually editable. Sending them
      // while the event has bookings would be rejected by the backend
      // (400: "Cannot change ticket types after the first booking").
      if (!hasBookings) {
        payload.ticket_types = values.ticket_types;
      }
      await updateEvent.mutateAsync(payload);
      notifications.show({ color: "green", message: "Event updated" });
      onClose();
    } catch (err) {
      notifications.show({ color: "red", message: getErrorMessage(err, "Failed to update event") });
    }
  }

  if (!event) return null;

  return (
    <Modal opened={!!event} onClose={onClose} title={`Edit — ${event.title}`} size="lg">
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
              decimalScale={6}
              min={-90}
              max={90}
              value={watch("latitude")}
              onChange={(v) => setValue("latitude", v ?? "", { shouldValidate: true })}
              error={errors.latitude?.message}
            />
            <NumberInput
              label="Longitude"
              decimalScale={6}
              min={-180}
              max={180}
              value={watch("longitude")}
              onChange={(v) => setValue("longitude", v ?? "", { shouldValidate: true })}
              error={errors.longitude?.message}
            />
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

          {hasBookings ? (
            <Alert color="yellow" icon={<IconLock size={16} />}>
              This event already has bookings, so ticket types can&apos;t be changed. Cancel the
              event instead if you need to stop new bookings.
            </Alert>
          ) : (
            <>
              {errors.ticket_types?.message && (
                <Text c="red" size="sm">
                  {errors.ticket_types.message}
                </Text>
              )}
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
                  <ActionIcon
                    color="red"
                    variant="light"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                  >
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
            </>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting || loadingBookings}>
              Save changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
