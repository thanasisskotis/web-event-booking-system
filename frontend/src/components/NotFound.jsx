import { Link } from "react-router-dom";
import { Stack, Title, Text, Button } from "@mantine/core";

export default function NotFound() {
  return (
    <Stack align="center" py="xl" gap="sm">
      <Title order={1}>404</Title>
      <Text c="dimmed">This page doesn&apos;t exist.</Text>
      <Button component={Link} to="/">
        Back to home
      </Button>
    </Stack>
  );
}
