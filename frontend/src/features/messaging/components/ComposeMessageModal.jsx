import { useState } from "react";
import { Modal, Stack, TextInput, Textarea, Button, Group } from "@mantine/core";
import { notifications } from "@mantine/notifications";

export default function ComposeMessageModal({ opened, onClose, title, onSend, sending }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  async function handleSubmit() {
    if (!body.trim()) return;
    try {
      await onSend({ subject: subject.trim() || null, body: body.trim() });
      setSubject("");
      setBody("");
      onClose();
    } catch (err) {
      notifications.show({ color: "red", message: err.response?.data?.detail ?? "Failed to send message" });
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="md" zIndex={1100}>
      <Stack>
        <TextInput
          label="Subject"
          placeholder="(optional)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <Textarea
          label="Message"
          autosize
          minRows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={sending} disabled={!body.trim()}>
            Send
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
