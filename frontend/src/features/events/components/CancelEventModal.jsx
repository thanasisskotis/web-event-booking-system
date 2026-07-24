import { useState } from "react";
import { Modal, Stack, Text, Textarea, Checkbox, Group, Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useCancelEvent, useNotifyCancellation } from "../api";

export default function CancelEventModal({ event, onClose }) {
  const [notify, setNotify] = useState(true);
  const [body, setBody] = useState("This event has been cancelled. We apologize for any inconvenience.");
  const cancelEvent = useCancelEvent();
  const notifyCancellation = useNotifyCancellation(event?.event_id);

  async function handleConfirm() {
    try {
      // Step 1: mark the event CANCELLED (required before the backend
      // accepts a cancellation broadcast).
      await cancelEvent.mutateAsync(event.event_id);

      // Step 2: notify confirmed attendees, if requested.
      if (notify && body.trim()) {
        await notifyCancellation.mutateAsync({
          subject: `Event cancelled: ${event.title}`,
          body: body.trim(),
        });
      }

      notifications.show({
        color: "green",
        message: `Event cancelled${notify ? " and attendees notified" : ""}`,
      });
      onClose();
    } catch (err) {
      notifications.show({ color: "red", message: err.response?.data?.detail ?? "Cancel failed" });
    }
  }

  if (!event) return null;

  return (
    <Modal opened={!!event} onClose={onClose} title="Cancel event">
      <Stack>
        <Text>
          Cancel &quot;{event.title}&quot;? Existing bookings are kept for the record, but no new bookings will be
          accepted.
        </Text>
        <Checkbox
          label="Notify all confirmed attendees with a message"
          checked={notify}
          onChange={(e) => setNotify(e.currentTarget.checked)}
        />
        {notify && (
          <Textarea
            label="Message to attendees"
            autosize
            minRows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Back
          </Button>
          <Button
            color="red"
            onClick={handleConfirm}
            loading={cancelEvent.isPending || notifyCancellation.isPending}
          >
            Cancel event
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
