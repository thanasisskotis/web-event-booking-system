import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";

export function useUsers(statusFilter) {
  return useQuery({
    queryKey: ["admin", "users", statusFilter ?? "ALL"],
    queryFn: async () => {
      const params = statusFilter ? { status_filter: statusFilter } : {};
      const response = await api.get("/admin/users", { params });
      return response.data;
    },
  });
}

export function useApproveUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId) => {
      const response = await api.post(`/admin/users/${userId}/approve`);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useRejectUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId) => {
      const response = await api.post(`/admin/users/${userId}/reject`);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

// Downloads the events export via an authenticated request (the token is
// attached by the axios interceptor), then triggers a browser file download.
export async function downloadEventsExport(format) {
  const response = await api.get("/admin/export/events", {
    params: { format },
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `events-export.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
