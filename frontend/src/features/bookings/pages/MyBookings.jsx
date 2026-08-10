import { useState } from "react";
import { Table, Badge, Stack, Paper, Button, Group, Text } from "@mantine/core";
import { IconTicket, IconMail } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import EmptyState from "../../../components/EmptyState";
import TableSkeleton from "../../../components/TableSkeleton";
import PageHeader from "../../../components/PageHeader";
import { useAuth } from "../../auth/AuthContext";
import { useSendMessage } from "../../messaging/api";
import ComposeMessageModal from "../../messaging/components/ComposeMessageModal";
import { useMyBookings } from "../api";

const statusColor = { CONFIRMED: "green", PENDING: "yellow", CANCELLED: "gray" };

export default function MyBookings() {
  const { user } = useAuth();
  const { data: bookings, isLoading } = useMyBookings();
  const [messageTarget, setMessageTarget] = useState(null);
  const sendMessage = useSendMessage();

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
                <Table.Th>Event</Table.Th>
                <Table.Th>Ticket type</Table.Th>
                <Table.Th>Tickets</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {bookings.map((b) => (
                <Table.Tr key={b.booking_id}>
                  <Table.Td>
                    <Group gap={6} wrap="nowrap">
                      <Text fw={500}>{b.event_title}</Text>
                      {b.event_status === "CANCELLED" && (
                        <Badge size="xs" color="red" variant="light">
                          Event cancelled
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>{b.ticket_type_name}</Table.Td>
                  <Table.Td>{b.number_of_tickets}</Table.Td>
                  <Table.Td>{Number(b.total_cost).toFixed(2)} EUR</Table.Td>
                  <Table.Td>
                    <Badge color={statusColor[b.booking_status] ?? "gray"} variant="light">
                      {b.booking_status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {/* Post-booking messaging: contact the organizer of any event
                        you've booked, straight from here (not just the event page). */}
                    {user?.user_id !== b.organizer_id && (
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconMail size={14} />}
                        onClick={() => setMessageTarget(b)}
                      >
                        Message
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      <ComposeMessageModal
        opened={!!messageTarget}
        onClose={() => setMessageTarget(null)}
        title={messageTarget ? `Message organizer — ${messageTarget.event_title}` : ""}
        sending={sendMessage.isPending}
        onSend={async ({ subject, body }) => {
          await sendMessage.mutateAsync({
            recipientId: messageTarget.organizer_id,
            eventId: messageTarget.event_id,
            subject,
            body,
          });
          notifications.show({ color: "green", message: "Message sent" });
        }}
      />
    </Stack>
  );
}
