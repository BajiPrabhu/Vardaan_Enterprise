import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "./api";

export function useAlerts(params = {}) {
  return useQuery({
    queryKey: ["alerts", params],
    queryFn: async () => {
      const res = await api.get("/api/alerts", { params });
      return res.data;
    },
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/api/alerts/${id}/acknowledge`);
      return res.data;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });
}
