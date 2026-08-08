import { Table, Badge, Stack, Paper } from "@mantine/core";
import { IconTicket } from "@tabler/icons-react";
import EmptyState from "../../../components/EmptyState";
import TableSkeleton from "../../../components/TableSkeleton";
import PageHeader from "../../../components/PageHeader";
import { useMyBookings } from "../api";

const statusColor = { CONFIRMED: "green", PENDING: "yellow", CANCELLED: "gray" };

export default function MyBookings() {
  const { data: bookings, isLoading } = useMyBookings();

  return (
    <Stack gap="lg">
      <PageHeader icon={IconTicket} title="My bookings" subtitle="Tickets you've booked across events." />
      {isLoading ? (
        <TableSkeleton />
      ) : !bookings?.length ? (
        <EmptyState icon={IconTicket} message="You haven't booked any events yet." />
      ) : (
        <Paper withBorder radius="md" p="xs">
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Booking</Table.Th>
                <Table.Th>Tickets</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {bookings.map((b) => (
                <Table.Tr key={b.booking_id}>
                  <Table.Td>#{b.booking_id}</Table.Td>
                  <Table.Td>{b.number_of_tickets}</Table.Td>
                  <Table.Td>{Number(b.total_cost).toFixed(2)} EUR</Table.Td>
                  <Table.Td>
                    <Badge color={statusColor[b.booking_status] ?? "gray"} variant="light">
                      {b.booking_status}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}
    </Stack>
  );
}
