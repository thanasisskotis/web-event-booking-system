import { useState } from "react";
import {
  TextInput,
  Select,
  NumberInput,
  Button,
  SimpleGrid,
  Stack,
  Title,
  Loader,
  Center,
  Text,
  Group,
  Paper,
} from "@mantine/core";
import { IconCalendarSearch } from "@tabler/icons-react";
import { useEventSearch } from "../api";
import EventCard from "../components/EventCard";
import EmptyState from "../../../components/EmptyState";

const CATEGORIES = ["Music", "Theatre", "Conference", "Sports", "Workshop"];

const emptyFilters = {
  category: "",
  q: "",
  city: "",
  country: "",
  min_price: "",
  max_price: "",
  page: 1,
  page_size: 12,
};

export default function Browse() {
  const [filters, setFilters] = useState(emptyFilters);
  const { data, isLoading, isError } = useEventSearch(filters);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  const events = data ?? [];

  return (
    <Stack gap="lg">
      <Title order={2}>Browse events</Title>

      <Paper withBorder p="md" radius="md">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
          <TextInput
            label="Search"
            placeholder="Title or description"
            value={filters.q}
            onChange={(e) => updateFilter("q", e.target.value)}
          />
          <Select
            label="Category"
            placeholder="Any"
            data={CATEGORIES}
            value={filters.category || null}
            onChange={(value) => updateFilter("category", value ?? "")}
            clearable
          />
          <TextInput
            label="City"
            value={filters.city}
            onChange={(e) => updateFilter("city", e.target.value)}
          />
          <TextInput
            label="Country"
            value={filters.country}
            onChange={(e) => updateFilter("country", e.target.value)}
          />
          <NumberInput
            label="Min price"
            min={0}
            value={filters.min_price}
            onChange={(value) => updateFilter("min_price", value ?? "")}
          />
          <NumberInput
            label="Max price"
            min={0}
            value={filters.max_price}
            onChange={(value) => updateFilter("max_price", value ?? "")}
          />
        </SimpleGrid>
        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" onClick={() => setFilters(emptyFilters)}>
            Reset filters
          </Button>
        </Group>
      </Paper>

      {isLoading && (
        <Center py="xl">
          <Loader />
        </Center>
      )}

      {isError && <Text c="red">Could not load events.</Text>}

      {!isLoading && !isError && events.length === 0 && (
        <EmptyState icon={IconCalendarSearch} message="No events match your filters." />
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {events.map((event) => (
          <EventCard key={event.event_id} event={event} />
        ))}
      </SimpleGrid>

      {events.length > 0 && (
        <Group justify="center">
          <Button
            variant="default"
            disabled={filters.page <= 1}
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
          >
            Previous
          </Button>
          <Text>Page {filters.page}</Text>
          <Button
            variant="default"
            disabled={events.length < filters.page_size}
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
          </Button>
        </Group>
      )}
    </Stack>
  );
}
