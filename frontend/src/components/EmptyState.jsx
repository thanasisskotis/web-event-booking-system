import { Stack, Text, ThemeIcon } from "@mantine/core";
import { IconInbox } from "@tabler/icons-react";

// Consistent empty state across list/table pages (Nielsen: visibility of
// system status — an intentional "nothing here" rather than a blank area).
export default function EmptyState({ message, icon: Icon = IconInbox, children }) {
  return (
    <Stack align="center" py="xl" gap="sm">
      <ThemeIcon variant="light" size={56} radius="xl" color="gray">
        <Icon size={28} />
      </ThemeIcon>
      <Text c="dimmed">{message}</Text>
      {children}
    </Stack>
  );
}
