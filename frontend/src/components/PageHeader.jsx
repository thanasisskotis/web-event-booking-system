import { Group, Title, Text, ThemeIcon } from "@mantine/core";

// Consistent page header across the management screens: a branded icon tile,
// the title, an optional subtitle, and an optional action slot on the right.
export default function PageHeader({ icon: Icon, title, subtitle, action, color = "violet" }) {
  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap">
      <Group gap="sm" wrap="nowrap" align="center">
        {Icon && (
          <ThemeIcon variant="light" color={color} size={42} radius="md">
            <Icon size={24} />
          </ThemeIcon>
        )}
        <div>
          <Title order={2}>{title}</Title>
          {subtitle && (
            <Text c="dimmed" size="sm">
              {subtitle}
            </Text>
          )}
        </div>
      </Group>
      {action}
    </Group>
  );
}
