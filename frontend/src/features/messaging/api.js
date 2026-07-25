import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";

export function useInbox() {
  return useQuery({
    queryKey: ["messages", "inbox"],
    queryFn: async () => (await api.get("/messages/inbox")).data,
    refetchInterval: 15000,
  });
}

export function useSent() {
  return useQuery({
    queryKey: ["messages", "sent"],
    queryFn: async () => (await api.get("/messages/sent")).data,
  });
}

export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: ["messages", "unread-count"],
    queryFn: async () => (await api.get("/messages/unread-count")).data,
    refetchInterval: 20000,
    enabled,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId) => (await api.post(`/messages/${messageId}/read`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", "inbox"] });
      queryClient.invalidateQueries({ queryKey: ["messages", "unread-count"] });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId) => {
      await api.delete(`/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", "inbox"] });
      queryClient.invalidateQueries({ queryKey: ["messages", "sent"] });
      queryClient.invalidateQueries({ queryKey: ["messages", "unread-count"] });
    },
  });
}

// Used when composing from an event context (e.g. "Message organizer" on
// EventDetail, or "Message attendee" from an organizer's booking list).
// Backend enforces: organizer <-> a user who booked that specific event.
export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ recipientId, eventId, subject, body }) => {
      const response = await api.post("/messages", {
        recipient_id: recipientId,
        event_id: eventId,
        subject,
        body,
      });
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages", "sent"] }),
  });
}
