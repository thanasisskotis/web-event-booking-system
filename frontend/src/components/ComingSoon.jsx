import { Stack, Title, Text } from "@mantine/core";

export default function ComingSoon({ title }) {
  return (
    <Stack align="center" py="xl">
      <Title order={2}>{title}</Title>
      <Text c="dimmed">This page isn&apos;t built yet, but the backend API is ready for it.</Text>
    </Stack>
  );
}
