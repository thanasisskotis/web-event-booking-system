import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";

export function useMyBookings() {
  return useQuery({
    queryKey: ["bookings", "mine"],
    queryFn: async () => {
      const response = await api.get("/bookings/mine");
      return response.data;
    },
  });
}

export function useCreateBooking(eventId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketTypeId, numberOfTickets }) => {
      const response = await api.post("/bookings", {
        ticket_type_id: ticketTypeId,
        number_of_tickets: numberOfTickets,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["bookings", "mine"] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId) => {
      const response = await api.post(`/bookings/${bookingId}/cancel`);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings", "mine"] }),
  });
}
