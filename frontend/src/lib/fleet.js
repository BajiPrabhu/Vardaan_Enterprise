import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "./api";

export function useVehicles(params = {}) {
  return useQuery({
    queryKey: ["vehicles", params],
    queryFn: async () => {
      const res = await api.get("/api/fleet/vehicles", { params });
      return res.data;
    },
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/api/fleet/vehicles", payload);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const res = await api.patch(`/api/fleet/vehicles/${id}`, payload);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/api/fleet/vehicles/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
  });
}
