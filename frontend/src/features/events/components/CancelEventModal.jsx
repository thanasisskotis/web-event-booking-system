import { useState, useEffect } from "react";
import { Modal, Stack, Text, Textarea, Checkbox, Group, Button, Alert } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useCancelEvent, useNotifyCancellation } from "../api";
import { getErrorMessage } from "../../../api/errors";

export default function CancelEventModal({ event, onClose }) {
  const [notify, setNotify] = useState(true);
  const [body, setBody] = useState("This event has been cancelled. We apologize for any inconvenience.");
  // Tracks whether the cancel step has already succeeded in this modal
  // session, so a retry only re-runs the notify step, not the cancel
  // (which would 400 -- an already-CANCELLED event can't be cancelled again).
  const [cancelDone, setCancelDone] = useState(false);
  const cancelEvent = useCancelEvent();
  const notifyCancellation = useNotifyCancellation(event?.event_id);

  // Reset local state whenever a different event is opened in this modal.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset when a different event opens
    setCancelDone(false);
  }, [event?.event_id]);

  async function handleConfirm() {
    if (!cancelDone) {
      try {
        await cancelEvent.mutateAsync(event.event_id);
        setCancelDone(true);
      } catch (err) {
        notifications.show({
          color: "red",
          message: getErrorMessage(err, "Failed to cancel the event"),
        });
        return;
      }
    }

    if (notify && body.trim()) {
      try {
        await notifyCancellation.mutateAsync({
          subject: `Event cancelled: ${event.title}`,
          body: body.trim(),
        });
      } catch (err) {
        // The event IS already cancelled at this point -- only the
        // notification failed. Keep the modal open so "Retry notification"
        // (relabelled below) can be pressed again without re-cancelling.
        notifications.show({
          color: "orange",
          message:
            getErrorMessage(err, "Event was cancelled, but sending the notification failed. You can retry below."),
        });
        return;
      }
    }

    notifications.show({
      color: "green",
      message: `Event cancelled${notify ? " and attendees notified" : ""}`,
    });
    onClose();
  }

  if (!event) return null;

  return (
    <Modal opened={!!event} onClose={onClose} title="Cancel event">
      <Stack>
        {cancelDone && (
          <Alert color="orange" variant="light">
            This event is already cancelled. Sending the attendee notification failed — you can
            retry it below, or close this dialog and do it later from the same button.
          </Alert>
        )}
        <Text>
          Cancel &quot;{event.title}&quot;? Existing bookings are kept for the record, but no new bookings will be
          accepted.
        </Text>
        <Checkbox
          label="Notify all confirmed attendees with a message"
          checked={notify}
          onChange={(e) => setNotify(e.currentTarget.checked)}
          disabled={cancelDone}
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
            {cancelDone ? "Close" : "Back"}
          </Button>
          <Button
            color="red"
            onClick={handleConfirm}
            loading={cancelEvent.isPending || notifyCancellation.isPending}
          >
            {cancelDone ? "Retry notification" : "Cancel event"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
