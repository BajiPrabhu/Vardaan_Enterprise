import { useState } from "react";
import { useForm } from "react-hook-form";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Pagination from "../components/ui/Pagination";
import { useAuth } from "../auth/AuthContext";
import { describeError } from "../lib/errors";
import { useDrivers } from "../lib/drivers";
import {
  useVehicles,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
} from "../lib/fleet";

const STATUS_TONE = {
  active: "ok",
  in_trip: "ok",
  maintenance: "warn",
  inactive: "neutral",
  out_of_service: "critical",
};

const CAN_WRITE = ["owner", "administrator", "fleet_manager"];

export default function Fleet() {
  const { user } = useAuth();
  const canWrite = CAN_WRITE.includes(user?.role);

  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useVehicles({ page });
  const { data: driversData } = useDrivers({ per_page: 100 }, { enabled: canWrite });
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();

  const [modalVehicle, setModalVehicle] = useState(null); // null closed, {} create, {...} edit
  const [formError, setFormError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const openCreate = () => {
    setFormError("");
    reset({ status: "inactive", assigned_driver_id: "" });
    setModalVehicle({});
  };

  const openEdit = (vehicle) => {
    setFormError("");
    reset({
      registration_number: vehicle.registration_number,
      vin: vehicle.vin ?? "",
      model: vehicle.model ?? "",
      manufacturer: vehicle.manufacturer ?? "",
      status: vehicle.status,
      assigned_driver_id: vehicle.assigned_driver?.id ?? "",
    });
    setModalVehicle(vehicle);
  };

  const onSubmit = async (values) => {
    setFormError("");
    const payload = {
      ...values,
      assigned_driver_id: values.assigned_driver_id || null,
    };
    try {
      if (modalVehicle?.id) {
        await updateVehicle.mutateAsync({ id: modalVehicle.id, ...payload });
      } else {
        await createVehicle.mutateAsync(payload);
      }
      setModalVehicle(null);
    } catch (err) {
      setFormError(describeError(err));
    }
  };

  const onDelete = (vehicle) => {
    if (
      window.confirm(
        `Delete ${vehicle.registration_number}? This can't be undone.`
      )
    ) {
      deleteVehicle.mutate(vehicle.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            Fleet
          </h1>
          <p className="text-sm text-ink-muted">
            {data
              ? `${data.total} vehicle${data.total === 1 ? "" : "s"}`
              : "Loading…"}
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add vehicle
          </Button>
        )}
      </div>

      <Card>
        {isLoading && (
          <CardContent className="text-sm text-ink-muted">
            Loading vehicles…
          </CardContent>
        )}
        {isError && (
          <CardContent className="text-sm text-status-critical">
            {describeError(error, "Couldn't load the fleet.")}
          </CardContent>
        )}
        {data && data.items.length === 0 && (
          <CardContent className="text-sm text-ink-muted">
            No vehicles yet{canWrite ? " — add the first one." : "."}
          </CardContent>
        )}
        {data && data.items.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-muted">
                <th className="px-4 py-2 font-medium">Registration</th>
                <th className="px-4 py-2 font-medium">Vehicle</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Assigned driver</th>
                {canWrite && <th className="px-4 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.items.map((vehicle) => (
                <tr key={vehicle.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-data text-ink">
                    {vehicle.registration_number}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {[vehicle.manufacturer, vehicle.model]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[vehicle.status] ?? "neutral"}>
                      {vehicle.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {vehicle.assigned_driver?.full_name ?? "Unassigned"}
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(vehicle)}
                          aria-label={`Edit ${vehicle.registration_number}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-raised hover:text-ink"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(vehicle)}
                          aria-label={`Delete ${vehicle.registration_number}`}
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
        open={!!modalVehicle}
        onClose={() => setModalVehicle(null)}
        title={modalVehicle?.id ? "Edit vehicle" : "Add vehicle"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              Registration number
            </label>
            <input
              {...register("registration_number", { required: true })}
              className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm font-data text-ink outline-none focus:border-copper"
            />
            {errors.registration_number && (
              <p className="mt-1 text-xs text-status-critical">Required.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Manufacturer
              </label>
              <input
                {...register("manufacturer")}
                className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-copper"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Model
              </label>
              <input
                {...register("model")}
                className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-copper"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              VIN
            </label>
            <input
              {...register("vin")}
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
                <option value="inactive">Inactive</option>
                <option value="active">Active</option>
                <option value="in_trip">In trip</option>
                <option value="maintenance">Maintenance</option>
                <option value="out_of_service">Out of service</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Assigned driver
              </label>
              <select
                {...register("assigned_driver_id")}
                className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-copper"
              >
                <option value="">Unassigned</option>
                {driversData?.items.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formError && (
            <p className="text-xs text-status-critical">{formError}</p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {modalVehicle?.id ? "Save changes" : "Add vehicle"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
