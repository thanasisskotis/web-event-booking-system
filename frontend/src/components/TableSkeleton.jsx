import { Skeleton, Stack } from "@mantine/core";

// Placeholder rows while a table's data loads, so the layout doesn't jump
// (Nielsen: visibility of system status, consistent loading affordance).
export default function TableSkeleton({ rows = 5 }) {
  return (
    <Stack gap="xs" mt="md">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={40} radius="sm" />
      ))}
    </Stack>
  );
}
