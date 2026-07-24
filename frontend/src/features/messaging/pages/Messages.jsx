import { useState } from "react";
import {
  Stack,
  Title,
  Tabs,
  Table,
  Badge,
  Text,
  Modal,
  Group,
  Divider,
  Button,
} from "@mantine/core";
import { IconMail, IconMailOpened, IconTrash, IconSend } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { confirmAction } from "../../../components/confirm";
import EmptyState from "../../../components/EmptyState";
import TableSkeleton from "../../../components/TableSkeleton";
import { useInbox, useSent, useMarkRead, useDeleteMessage } from "../api";

const dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

function MessageDetailModal({ message, onClose, onDelete }) {
  if (!message) return null;
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
        </Group>
      </Stack>
    </Modal>
  );
}

function MessageTable({ messages, isLoading, emptyMessage, direction, onOpen }) {
  if (isLoading) return <TableSkeleton />;
  if (!messages?.length) return <EmptyState icon={IconMail} message={emptyMessage} />;

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{direction === "inbox" ? "From" : "To"}</Table.Th>
          <Table.Th>Subject</Table.Th>
          <Table.Th>Event</Table.Th>
          <Table.Th>Date</Table.Th>
          {direction === "inbox" && <Table.Th />}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {messages.map((m) => (
          <Table.Tr
            key={m.message_id}
            onClick={() => onOpen(m)}
            style={{ cursor: "pointer", fontWeight: direction === "inbox" && !m.is_read ? 700 : 400 }}
          >
            <Table.Td>
              {direction === "inbox"
                ? m.sender_username ?? `#${m.sender_id}`
                : m.recipient_username ?? `#${m.recipient_id}`}
            </Table.Td>
            <Table.Td>{m.subject || <Text c="dimmed">(no subject)</Text>}</Table.Td>
            <Table.Td>{m.event_title ?? (m.event_id ? `#${m.event_id}` : "—")}</Table.Td>
            <Table.Td>{dateFormatter.format(new Date(m.sent_at))}</Table.Td>
            {direction === "inbox" && (
              <Table.Td>
                {!m.is_read && (
                  <Badge size="sm" color="blue">
                    New
                  </Badge>
                )}
              </Table.Td>
            )}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

export default function Messages() {
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState("inbox");

  const { data: inbox, isLoading: loadingInbox } = useInbox();
  const { data: sent, isLoading: loadingSent } = useSent();
  const markRead = useMarkRead();
  const deleteMessage = useDeleteMessage();

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
      notifications.show({ color: "red", message: err.response?.data?.detail ?? "Delete failed" });
    }
  }

  return (
    <Stack gap="md">
      <Title order={2}>Messages</Title>

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

      <MessageDetailModal message={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
    </Stack>
  );
}
