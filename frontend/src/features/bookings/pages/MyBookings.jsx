import { Table, Title, Badge, Button, Stack } from "@mantine/core";
import { IconTicket } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { confirmAction } from "../../../components/confirm";
import EmptyState from "../../../components/EmptyState";
import TableSkeleton from "../../../components/TableSkeleton";
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

  return (
    <Stack>
      <Title order={2}>My bookings</Title>
      {isLoading ? (
        <TableSkeleton />
      ) : !bookings?.length ? (
        <EmptyState icon={IconTicket} message="You haven't booked any events yet." />
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
                      onClick={() =>
                        confirmAction({
                          title: "Cancel booking",
                          message: `Cancel booking #${b.booking_id} (${b.number_of_tickets} ticket(s))? The seats will be released.`,
                          confirmLabel: "Cancel booking",
                          onConfirm: () => handleCancel(b.booking_id),
                        })
                      }
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
