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
import { DateTimePicker } from "@mantine/dates";
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
  date_from: "",
  date_to: "",
  page: 1,
  page_size: 12,
};

export default function Browse() {
  const [filters, setFilters] = useState(emptyFilters);

  // Fetch one extra event to determine whether a next page exists.
  const fetchFilters = {
    ...filters,
    page_size: Math.min(filters.page_size + 1, 100),
  };

  const { data, isLoading, isError } = useEventSearch(fetchFilters);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  // DateTimePicker gives back a string already.
  // Convert it to a full ISO string with timezone before sending,
  // or clear the filter entirely on "".
  function updateDateFilter(key, value) {
    updateFilter(key, value ? new Date(value).toISOString() : "");
  }

  const fetched = data ?? [];

  // If we received more events than we display, there is another page.
  const hasNextPage = fetched.length > filters.page_size;

  // Only display the requested page size, hiding the extra event.
  const events = fetched.slice(0, filters.page_size);

  return (
    <Stack>
      <Title order={1}>Browse events</Title>

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

          <DateTimePicker
            label="From"
            placeholder="Any start date"
            clearable
            value={filters.date_from}
            onChange={(value) => updateDateFilter("date_from", value)}
          />

          <DateTimePicker
            label="To"
            placeholder="Any end date"
            clearable
            value={filters.date_to}
            onChange={(value) => updateDateFilter("date_to", value)}
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
          <Button
            variant="subtle"
            onClick={() => setFilters(emptyFilters)}
          >
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
        <EmptyState
          icon={IconCalendarSearch}
          message="No events match your filters."
        />
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {events.map((event) => (
          <EventCard key={event.event_id} event={event} />
        ))}
      </SimpleGrid>

      {(events.length > 0 || filters.page > 1) && (
        <Group justify="center">
          <Button
            variant="default"
            disabled={filters.page <= 1}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                page: prev.page - 1,
              }))
            }
          >
            Previous
          </Button>

          <Text>Page {filters.page}</Text>

          <Button
            variant="default"
            disabled={!hasNextPage}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                page: prev.page + 1,
              }))
            }
          >
            Next
          </Button>
        </Group>
      )}
    </Stack>
  );
}
