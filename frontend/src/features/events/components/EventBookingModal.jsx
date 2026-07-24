import { useState } from "react";
import { Modal, Table, Button, Badge } from "@mantine/core";
import { IconMail } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useEventBookings } from "../api";
import { useSendMessage } from "../../messaging/api";
import ComposeMessageModal from "../../messaging/components/ComposeMessageModal";
import EmptyState from "../../../components/EmptyState";
import TableSkeleton from "../../../components/TableSkeleton";

const statusColor = { CONFIRMED: "green", PENDING: "yellow", CANCELLED: "gray" };

export default function EventBookingsModal({ event, onClose }) {
  const [messageTarget, setMessageTarget] = useState(null); // { userId, username }
  const { data: bookings, isLoading } = useEventBookings(event?.event_id);
  const sendMessage = useSendMessage();

  return (
    <>
      <Modal opened={!!event} onClose={onClose} title={event ? `Bookings — ${event.title}` : ""} size="lg">
        {isLoading ? (
          <TableSkeleton />
        ) : !bookings?.length ? (
          <EmptyState message="No bookings yet for this event." />
        ) : (
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Attendee</Table.Th>
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
                    {b.attendee_username}
                    <br />
                    <span style={{ opacity: 0.6, fontSize: 12 }}>{b.attendee_email}</span>
                  </Table.Td>
                  <Table.Td>{b.ticket_type_name}</Table.Td>
                  <Table.Td>{b.number_of_tickets}</Table.Td>
                  <Table.Td>{Number(b.total_cost).toFixed(2)} €</Table.Td>
                  <Table.Td>
                    <Badge color={statusColor[b.booking_status] ?? "gray"}>{b.booking_status}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconMail size={14} />}
                      onClick={() => setMessageTarget({ userId: b.user_id, username: b.attendee_username })}
                    >
                      Message
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Modal>

      <ComposeMessageModal
        opened={!!messageTarget}
        onClose={() => setMessageTarget(null)}
        title={messageTarget ? `Message ${messageTarget.username}` : "Message attendee"}
        sending={sendMessage.isPending}
        onSend={async ({ subject, body }) => {
          await sendMessage.mutateAsync({
            recipientId: messageTarget.userId,
            eventId: event.event_id,
            subject,
            body,
          });
          notifications.show({ color: "green", message: "Message sent" });
        }}
      />
    </>
  );
}
