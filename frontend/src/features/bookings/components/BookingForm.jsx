import { useState } from "react";
import { Select, NumberInput, Button, Stack, Modal, Text, Group } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useCreateBooking } from "../api";

export default function BookingForm({ event }) {
  const [ticketTypeId, setTicketTypeId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const createBooking = useCreateBooking(event.event_id);

  const bookableTypes = event.ticket_types.filter((t) => t.available > 0);
  const selectedType = event.ticket_types.find((t) => String(t.ticket_type_id) === ticketTypeId);

  function openConfirm() {
    if (!selectedType) return;
    setConfirmOpen(true);
  }

  async function confirmBooking() {
    try {
      await createBooking.mutateAsync({ ticketTypeId: Number(ticketTypeId), numberOfTickets: quantity });
      notifications.show({ color: "green", message: "Booking confirmed!" });
      setConfirmOpen(false);
    } catch (err) {
      notifications.show({
        color: "red",
        message: err.response?.data?.detail ?? "Booking failed",
      });
    }
  }

  if (event.status !== "PUBLISHED") {
    return <Text c="dimmed">This event is not open for booking.</Text>;
  }

  if (bookableTypes.length === 0) {
    return <Text c="dimmed">Sold out.</Text>;
  }

  return (
    <Stack>
      <Select
        label="Ticket type"
        placeholder="Choose a ticket type"
        data={bookableTypes.map((t) => ({
          value: String(t.ticket_type_id),
          label: `${t.name} - ${Number(t.price).toFixed(2)} EUR (${t.available} left)`,
        }))}
        value={ticketTypeId}
        onChange={setTicketTypeId}
      />
      <NumberInput
        label="Number of tickets"
        min={1}
        max={selectedType?.available ?? 1}
        value={quantity}
        onChange={(v) => setQuantity(Number(v) || 1)}
      />
      <Button onClick={openConfirm} disabled={!selectedType}>
        Book now
      </Button>

      <Modal opened={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm booking">
        {selectedType && (
          <Stack>
            <Text>
              You are about to book <b>{quantity}</b> x <b>{selectedType.name}</b> for{" "}
              <b>{(Number(selectedType.price) * quantity).toFixed(2)} EUR</b>.
            </Text>
            <Text size="sm" c="dimmed">
              Tickets are reserved immediately. You can cancel this booking later from
              &quot;My bookings&quot; if needed.
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirmBooking} loading={createBooking.isPending}>
                Confirm booking
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
