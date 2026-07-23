import { Table, Title, Badge, Button, Text, Loader, Center, Stack } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMyBookings, useCancelBooking } from "../api";

const statusColor = { CONFIRMED: "green", PENDING: "yellow", CANCELLED: "gray" };

export default function MyBookings() {
  const { data: bookings, isLoading } = useMyBookings();
  const cancelBooking = useCancelBooking();

  async function handleCancel(bookingId) {
    try {
      await cancelBooking.mutateAsync(bookingId);
      notifications.show({ color: "green", message: "Booking cancelled" });
    } catch (err) {
      notifications.show({ color: "red", message: err.response?.data?.detail ?? "Cancel failed" });
    }
  }

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  return (
    <Stack>
      <Title order={2}>My bookings</Title>
      {!bookings?.length ? (
        <Text c="dimmed">You haven&apos;t booked any events yet.</Text>
      ) : (
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Booking</Table.Th>
              <Table.Th>Tickets</Table.Th>
              <Table.Th>Total</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {bookings.map((b) => (
              <Table.Tr key={b.booking_id}>
                <Table.Td>#{b.booking_id}</Table.Td>
                <Table.Td>{b.number_of_tickets}</Table.Td>
                <Table.Td>{Number(b.total_cost).toFixed(2)} EUR</Table.Td>
                <Table.Td>
                  <Badge color={statusColor[b.booking_status] ?? "gray"}>{b.booking_status}</Badge>
                </Table.Td>
                <Table.Td>
                  {b.booking_status === "CONFIRMED" && (
                    <Button
                      size="xs"
                      color="red"
                      variant="light"
                      loading={cancelBooking.isPending}
                      onClick={() => handleCancel(b.booking_id)}
                    >
                      Cancel
                    </Button>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}
