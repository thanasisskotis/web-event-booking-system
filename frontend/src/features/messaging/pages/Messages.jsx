import { useState } from "react";
import {
  Stack,
  Tabs,
  Table,
  Badge,
  Text,
  Modal,
  Group,
  Divider,
  Button,
  Paper,
} from "@mantine/core";
import { IconMail, IconMailOpened, IconTrash, IconSend, IconEye, IconCheck, IconArrowBackUp } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { confirmAction } from "../../../components/confirm";
import EmptyState from "../../../components/EmptyState";
import TableSkeleton from "../../../components/TableSkeleton";
import PageHeader from "../../../components/PageHeader";
import { useAuth } from "../../auth/AuthContext";
import { useInbox, useSent, useMarkRead, useDeleteMessage, useSendMessage } from "../api";
import ComposeMessageModal from "../components/ComposeMessageModal";
import { getErrorMessage } from "../../../api/errors";

const dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

function MessageDetailModal({ message, currentUserId, onClose, onDelete, onReply }) {
  if (!message) return null;
  // You can reply only to a message you received, and only when it carries an
  // event context (the backend requires event_id + a booking/organizer link).
  const canReply = message.recipient_id === currentUserId && !!message.event_id;
  return (
    <Modal opened={!!message} onClose={onClose} title={message.subject || "(no subject)"} size="md">
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            From {message.sender_username ?? `user #${message.sender_id}`} to{" "}
            {message.recipient_username ?? `user #${message.recipient_id}`}
          </Text>
          <Text size="sm" c="dimmed">
            {dateFormatter.format(new Date(message.sent_at))}
          </Text>
        </Group>
        {message.event_id && (
          <Text size="sm" c="dimmed">
            Regarding {message.event_title ?? `event #${message.event_id}`}
          </Text>
        )}
        <Divider />
        <Text style={{ whiteSpace: "pre-wrap" }}>{message.body}</Text>
        <Group justify="flex-end" mt="sm">
          <Button
            color="red"
            variant="light"
            leftSection={<IconTrash size={16} />}
            onClick={() =>
              confirmAction({
                title: "Delete message",
                message: "Delete this message? This can't be undone.",
                confirmLabel: "Delete",
                onConfirm: () => onDelete(message.message_id),
              })
            }
          >
            Delete
          </Button>
          {canReply && (
            <Button leftSection={<IconArrowBackUp size={16} />} onClick={() => onReply(message)}>
              Reply
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}

// Read status, shown for both folders:
//  - Inbox:  whether *you* have opened it (New / Read)
//  - Sent:   whether the *recipient* has opened it (Seen / Sent) -- is_read on
//            the shared row reflects the recipient's read state.
function ReadStatus({ message, direction }) {
  if (direction === "inbox") {
    return message.is_read ? (
      <Badge size="sm" variant="light" color="gray">
        Read
      </Badge>
    ) : (
      <Badge size="sm" color="violet">
        New
      </Badge>
    );
  }
  return message.is_read ? (
    <Badge size="sm" variant="light" color="green" leftSection={<IconEye size={12} />}>
      Seen
    </Badge>
  ) : (
    <Badge size="sm" variant="light" color="gray" leftSection={<IconCheck size={12} />}>
      Sent
    </Badge>
  );
}

function MessageTable({ messages, isLoading, emptyMessage, direction, onOpen }) {
  if (isLoading) return <TableSkeleton />;
  if (!messages?.length) return <EmptyState icon={IconMail} message={emptyMessage} />;

  return (
    <Paper withBorder radius="md" p="xs">
      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{direction === "inbox" ? "From" : "To"}</Table.Th>
            <Table.Th>Subject</Table.Th>
            <Table.Th>Event</Table.Th>
            <Table.Th>Date</Table.Th>
            <Table.Th>Status</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {messages.map((m) => {
            const unreadInbox = direction === "inbox" && !m.is_read;
            return (
              <Table.Tr
                key={m.message_id}
                onClick={() => onOpen(m)}
                style={{ cursor: "pointer" }}
              >
                <Table.Td style={{ fontWeight: unreadInbox ? 700 : 400 }}>
                  <Group gap={8} wrap="nowrap">
                    {direction === "inbox" &&
                      (m.is_read ? (
                        <IconMailOpened size={16} color="var(--mantine-color-gray-5)" />
                      ) : (
                        <IconMail size={16} color="var(--mantine-color-violet-6)" />
                      ))}
                    <span>
                      {direction === "inbox"
                        ? m.sender_username ?? `#${m.sender_id}`
                        : m.recipient_username ?? `#${m.recipient_id}`}
                    </span>
                  </Group>
                </Table.Td>
                <Table.Td style={{ fontWeight: unreadInbox ? 700 : 400 }}>
                  {m.subject || <Text c="dimmed">(no subject)</Text>}
                </Table.Td>
                <Table.Td>{m.event_title ?? (m.event_id ? `#${m.event_id}` : "—")}</Table.Td>
                <Table.Td>{dateFormatter.format(new Date(m.sent_at))}</Table.Td>
                <Table.Td>
                  <ReadStatus message={m} direction={direction} />
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}

export default function Messages() {
  const [selected, setSelected] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [activeTab, setActiveTab] = useState("inbox");

  const { user } = useAuth();
  const { data: inbox, isLoading: loadingInbox } = useInbox();
  const { data: sent, isLoading: loadingSent } = useSent();
  const markRead = useMarkRead();
  const deleteMessage = useDeleteMessage();
  const sendMessage = useSendMessage();

  function handleReply(message) {
    setSelected(null); // close the detail modal, open the reply composer
    setReplyTo(message);
  }

  function openMessage(message) {
    setSelected(message);
    if (activeTab === "inbox" && !message.is_read) {
      markRead.mutate(message.message_id);
    }
  }

  async function handleDelete(messageId) {
    try {
      await deleteMessage.mutateAsync(messageId);
      notifications.show({ color: "green", message: "Message deleted" });
      setSelected(null);
    } catch (err) {
      notifications.show({ color: "red", message: getErrorMessage(err, "Delete failed") });
    }
  }

  return (
    <Stack gap="md">
      <PageHeader icon={IconMail} title="Messages" subtitle="Your conversations with organizers and attendees." />

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="inbox" leftSection={<IconMailOpened size={16} />}>
            Inbox
          </Tabs.Tab>
          <Tabs.Tab value="sent" leftSection={<IconSend size={16} />}>
            Sent
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="inbox" pt="md">
          <MessageTable
            messages={inbox}
            isLoading={loadingInbox}
            emptyMessage="No messages yet."
            direction="inbox"
            onOpen={openMessage}
          />
        </Tabs.Panel>
        <Tabs.Panel value="sent" pt="md">
          <MessageTable
            messages={sent}
            isLoading={loadingSent}
            emptyMessage="You haven't sent any messages."
            direction="sent"
            onOpen={openMessage}
          />
        </Tabs.Panel>
      </Tabs>

      <MessageDetailModal
        message={selected}
        currentUserId={user?.user_id}
        onClose={() => setSelected(null)}
        onDelete={handleDelete}
        onReply={handleReply}
      />

      <ComposeMessageModal
        opened={!!replyTo}
        onClose={() => setReplyTo(null)}
        title={replyTo ? `Reply to ${replyTo.sender_username ?? "user"}` : ""}
        sending={sendMessage.isPending}
        onSend={async ({ subject, body }) => {
          await sendMessage.mutateAsync({
            recipientId: replyTo.sender_id,
            eventId: replyTo.event_id,
            subject: subject || (replyTo.subject ? `Re: ${replyTo.subject}` : null),
            body,
          });
          notifications.show({ color: "green", message: "Reply sent" });
        }}
      />
    </Stack>
  );
}
