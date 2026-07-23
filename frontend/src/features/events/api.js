import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";

export function useEventSearch(filters) {
  return useQuery({
    queryKey: ["events", "search", filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== "" && v !== null && v !== undefined)
      );
      const response = await api.get("/events", { params });
      return response.data;
    },
    keepPreviousData: true,
  });
}

export function useEvent(eventId) {
  return useQuery({
    queryKey: ["events", eventId],
    queryFn: async () => {
      const response = await api.get(`/events/${eventId}`);
      return response.data;
    },
    enabled: !!eventId,
  });
}

export function useMyEvents() {
  return useQuery({
    queryKey: ["events", "mine"],
    queryFn: async () => {
      const response = await api.get("/events/mine");
      return response.data;
    },
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const response = await api.post("/events", payload);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events", "mine"] }),
  });
}

export function usePublishEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId) => {
      const response = await api.post(`/events/${eventId}/publish`);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events", "mine"] }),
  });
}

export function useCancelEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId) => {
      const response = await api.post(`/events/${eventId}/cancel`);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events", "mine"] }),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId) => {
      await api.delete(`/events/${eventId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events", "mine"] }),
  });
}

export function useEventBookings(eventId) {
  return useQuery({
    queryKey: ["events", eventId, "bookings"],
    queryFn: async () => {
      const response = await api.get(`/events/${eventId}/bookings`);
      return response.data;
    },
    enabled: !!eventId,
  });
}

export function useRecommendations(topN = 10) {
  return useQuery({
    queryKey: ["recommendations", topN],
    queryFn: async () => {
      const response = await api.get("/recommendations", { params: { top_n: topN } });
      return response.data;
    },
  });
}
