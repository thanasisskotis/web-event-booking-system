import { Modal, Table, Badge, Text, Group } from "@mantine/core";
import EmptyState from "../../../components/EmptyState";
import TableSkeleton from "../../../components/TableSkeleton";
import { IconTicket } from "@tabler/icons-react";
import { useEventBookings } from "../api";

const statusColor = { CONFIRMED: "green", PENDING: "yellow", CANCELLED: "gray" };

export default function EventBookingsModal({ event, onClose }) {
  const { data: bookings, isLoading } = useEventBookings(event?.event_id);

  if (!event) return null;

  const totalTickets = (bookings ?? []).reduce((sum, b) => sum + b.number_of_tickets, 0);

  return (
    <Modal opened={!!event} onClose={onClose} title={`Bookings — ${event.title}`} size="lg">
      {isLoading ? (
        <TableSkeleton />
      ) : !bookings?.length ? (
        <EmptyState icon={IconTicket} message="No bookings for this event yet." />
      ) : (
        <>
          <Group justify="space-between" mb="sm">
            <Text size="sm" c="dimmed">
              {bookings.length} booking(s)
            </Text>
            <Text size="sm" c="dimmed">
              {totalTickets} ticket(s) total
            </Text>
          </Group>
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Attendee</Table.Th>
                <Table.Th>Ticket type</Table.Th>
                <Table.Th>Tickets</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {bookings.map((b) => (
                <Table.Tr key={b.booking_id}>
                  <Table.Td>
                    <Text size="sm">{b.attendee_username}</Text>
                    <Text size="xs" c="dimmed">
                      {b.attendee_email}
                    </Text>
                  </Table.Td>
                  <Table.Td>{b.ticket_type_name}</Table.Td>
                  <Table.Td>{b.number_of_tickets}</Table.Td>
                  <Table.Td>{Number(b.total_cost).toFixed(2)} EUR</Table.Td>
                  <Table.Td>
                    <Badge color={statusColor[b.booking_status] ?? "gray"}>{b.booking_status}</Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </>
      )}
    </Modal>
  );
}
