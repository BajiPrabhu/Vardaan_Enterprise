import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Pagination from "../components/ui/Pagination";
import StatusDot from "../components/ui/StatusDot";
import { useAuth } from "../auth/AuthContext";
import { useSocket } from "../realtime/SocketContext";
import { describeError } from "../lib/errors";
import { DEVICE_TYPE_LABELS } from "../lib/labels";
import { useVehicles } from "../lib/fleet";
import {
  useDevices,
  useCreateDevice,
  useUpdateDevice,
  useDeleteDevice,
} from "../lib/devices";

const CAN_WRITE = ["owner", "administrator", "maintenance_engineer"];

export default function Devices() {
  const { user } = useAuth();
  const canWrite = CAN_WRITE.includes(user?.role);

  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useDevices({ page });
  const { data: vehiclesData } = useVehicles({ per_page: 100 });
  const createDevice = useCreateDevice();
  const updateDevice = useUpdateDevice();
  const deleteDevice = useDeleteDevice();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (updated) => {
      queryClient.setQueriesData({ queryKey: ["devices"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((d) =>
            d.id === updated.id ? { ...d, ...updated } : d
          ),
        };
      });
    };

    socket.on("device:update", handleUpdate);
    return () => socket.off("device:update", handleUpdate);
  }, [socket, queryClient]);

  const [modalDevice, setModalDevice] = useState(null); // null closed, {} create, {...} edit
  const [formError, setFormError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const openCreate = () => {
    setFormError("");
    reset({ status: "offline", device_type: "", vehicle_id: "" });
    setModalDevice({});
  };

  const openEdit = (device) => {
    setFormError("");
    reset({
      device_type: device.device_type,
      hardware_model: device.hardware_model ?? "",
      firmware_version: device.firmware_version ?? "",
      ip_address: device.ip_address ?? "",
      status: device.status,
      vehicle_id: device.vehicle?.id ?? "",
    });
    setModalDevice(device);
  };

  const onSubmit = async (values) => {
    setFormError("");
    const payload = { ...values, vehicle_id: values.vehicle_id || null };
    try {
      if (modalDevice?.id) {
        await updateDevice.mutateAsync({ id: modalDevice.id, ...payload });
      } else {
        await createDevice.mutateAsync(payload);
      }
      setModalDevice(null);
    } catch (err) {
      setFormError(describeError(err));
    }
  };

  const onDelete = (device) => {
    const label = DEVICE_TYPE_LABELS[device.device_type] ?? device.device_type;
    if (window.confirm(`Delete this ${label}? This can't be undone.`)) {
      deleteDevice.mutate(device.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            Devices
          </h1>
          <p className="text-sm text-ink-muted">
            {data
              ? `${data.total} device${data.total === 1 ? "" : "s"}`
              : "Loading…"}
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add device
          </Button>
        )}
      </div>

      <Card>
        {isLoading && (
          <CardContent className="text-sm text-ink-muted">
            Loading devices…
          </CardContent>
        )}
        {isError && (
          <CardContent className="text-sm text-status-critical">
            {describeError(error, "Couldn't load devices.")}
          </CardContent>
        )}
        {data && data.items.length === 0 && (
          <CardContent className="text-sm text-ink-muted">
            No devices registered yet{canWrite ? " — add the first one." : "."}
          </CardContent>
        )}
        {data && data.items.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-muted">
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Model</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Mounted on</th>
                <th className="px-4 py-2 font-medium">Last heartbeat</th>
                {canWrite && <th className="px-4 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.items.map((device) => (
                <tr key={device.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-ink">
                    {DEVICE_TYPE_LABELS[device.device_type] ?? device.device_type}
                  </td>
                  <td className="px-4 py-3 font-data text-ink-muted">
                    {device.hardware_model || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusDot status={device.status} label={device.status} />
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {device.vehicle?.registration_number ?? "Unmounted"}
                  </td>
                  <td className="px-4 py-3 font-data text-ink-muted">
                    {device.last_heartbeat
                      ? new Date(device.last_heartbeat).toLocaleString()
                      : "Never"}
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(device)}
                          aria-label="Edit device"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-raised hover:text-ink"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(device)}
                          aria-label="Delete device"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-status-critical/10 hover:text-status-critical"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && (
          <Pagination
            page={data.page}
            perPage={data.per_page}
            total={data.total}
            onPageChange={setPage}
          />
        )}
      </Card>

      <Modal
        open={!!modalDevice}
        onClose={() => setModalDevice(null)}
        title={modalDevice?.id ? "Edit device" : "Add device"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              Device type
            </label>
            <select
              {...register("device_type", { required: true })}
              className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-copper"
            >
              <option value="">Select a type…</option>
              {Object.entries(DEVICE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.device_type && (
              <p className="mt-1 text-xs text-status-critical">Required.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Hardware model
              </label>
              <input
                {...register("hardware_model")}
                className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-copper"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Firmware version
              </label>
              <input
                {...register("firmware_version")}
                className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm font-data text-ink outline-none focus:border-copper"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              IP address
            </label>
            <input
              {...register("ip_address")}
              placeholder="192.168.1.42"
              className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm font-data text-ink outline-none focus:border-copper"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Status
              </label>
              <select
                {...register("status")}
                className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-copper"
              >
                <option value="offline">Offline</option>
                <option value="online">Online</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Mount on vehicle
              </label>
              <select
                {...register("vehicle_id")}
                className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-copper"
              >
                <option value="">Unmounted</option>
                {vehiclesData?.items.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formError && (
            <p className="text-xs text-status-critical">{formError}</p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {modalDevice?.id ? "Save changes" : "Add device"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
