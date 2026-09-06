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
import {
  useDrivers,
  useCreateDriver,
  useUpdateDriver,
  useDeleteDriver,
} from "../lib/drivers";

const CAN_WRITE = ["owner", "administrator", "fleet_manager"];

function scoreTone(score) {
  if (score == null) return "neutral";
  if (score >= 80) return "ok";
  if (score >= 50) return "warn";
  return "critical";
}

export default function Drivers() {
  const { user } = useAuth();
  const canWrite = CAN_WRITE.includes(user?.role);

  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useDrivers({ page });
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();
  const deleteDriver = useDeleteDriver();

  const [modalDriver, setModalDriver] = useState(null); // null closed, {} create, {...} edit
  const [formError, setFormError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const openCreate = () => {
    setFormError("");
    reset({});
    setModalDriver({});
  };

  const openEdit = (driver) => {
    setFormError("");
    reset({
      full_name: driver.full_name,
      license_number: driver.license_number,
      license_expiry: driver.license_expiry ?? "",
      health_score: driver.health_score ?? "",
      safety_score: driver.safety_score ?? "",
      emergency_contact_name: driver.emergency_contact_name ?? "",
      emergency_contact_phone: driver.emergency_contact_phone ?? "",
    });
    setModalDriver(driver);
  };

  const onSubmit = async (values) => {
    setFormError("");
    try {
      if (modalDriver?.id) {
        await updateDriver.mutateAsync({ id: modalDriver.id, ...values });
      } else {
        await createDriver.mutateAsync(values);
      }
      setModalDriver(null);
    } catch (err) {
      setFormError(describeError(err));
    }
  };

  const onDelete = (driver) => {
    if (window.confirm(`Delete ${driver.full_name}? This can't be undone.`)) {
      deleteDriver.mutate(driver.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            Drivers
          </h1>
          <p className="text-sm text-ink-muted">
            {data
              ? `${data.total} driver${data.total === 1 ? "" : "s"}`
              : "Loading…"}
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add driver
          </Button>
        )}
      </div>

      <Card>
        {isLoading && (
          <CardContent className="text-sm text-ink-muted">
            Loading drivers…
          </CardContent>
        )}
        {isError && (
          <CardContent className="text-sm text-status-critical">
            {describeError(error, "Couldn't load drivers.")}
          </CardContent>
        )}
        {data && data.items.length === 0 && (
          <CardContent className="text-sm text-ink-muted">
            No drivers on file yet{canWrite ? " — add the first one." : "."}
          </CardContent>
        )}
        {data && data.items.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-muted">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">License</th>
                <th className="px-4 py-2 font-medium">Health</th>
                <th className="px-4 py-2 font-medium">Safety</th>
                <th className="px-4 py-2 font-medium">Emergency contact</th>
                {canWrite && <th className="px-4 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.items.map((driver) => (
                <tr key={driver.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-ink">{driver.full_name}</td>
                  <td className="px-4 py-3 font-data text-ink-muted">
                    {driver.license_number}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={scoreTone(driver.health_score)}>
                      {driver.health_score ?? "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={scoreTone(driver.safety_score)}>
                      {driver.safety_score ?? "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {driver.emergency_contact_name
                      ? `${driver.emergency_contact_name}${
                          driver.emergency_contact_phone
                            ? " · " + driver.emergency_contact_phone
                            : ""
                        }`
                      : "—"}
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(driver)}
                          aria-label={`Edit ${driver.full_name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-raised hover:text-ink"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(driver)}
                          aria-label={`Delete ${driver.full_name}`}
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
        open={!!modalDriver}
        onClose={() => setModalDriver(null)}
        title={modalDriver?.id ? "Edit driver" : "Add driver"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              Full name
            </label>
            <input
              {...register("full_name", { required: true })}
              className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-copper"
            />
            {errors.full_name && (
              <p className="mt-1 text-xs text-status-critical">Required.</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              License number
            </label>
            <input
              {...register("license_number", { required: true })}
              className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm font-data text-ink outline-none focus:border-copper"
            />
            {errors.license_number && (
              <p className="mt-1 text-xs text-status-critical">Required.</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              License expiry
            </label>
            <input
              type="date"
              {...register("license_expiry")}
              className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm font-data text-ink outline-none focus:border-copper"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Health score (0–100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                {...register("health_score")}
                className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm font-data text-ink outline-none focus:border-copper"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Safety score (0–100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                {...register("safety_score")}
                className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm font-data text-ink outline-none focus:border-copper"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Emergency contact
              </label>
              <input
                {...register("emergency_contact_name")}
                className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-copper"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Contact phone
              </label>
              <input
                {...register("emergency_contact_phone")}
                className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-copper"
              />
            </div>
          </div>

          {formError && (
            <p className="text-xs text-status-critical">{formError}</p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {modalDriver?.id ? "Save changes" : "Add driver"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
