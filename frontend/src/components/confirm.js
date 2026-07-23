import { modals } from "@mantine/modals";

// Consistent confirmation dialog for destructive / irreversible actions
// (Nielsen: error prevention). Pass a title, message, and the action to run
// when confirmed.
export function confirmAction({ title, message, confirmLabel = "Confirm", danger = true, onConfirm }) {
  modals.openConfirmModal({
    title,
    children: message,
    labels: { confirm: confirmLabel, cancel: "Cancel" },
    confirmProps: { color: danger ? "red" : undefined },
    onConfirm,
  });
}
