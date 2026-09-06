import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Cpu,
  ShieldCheck,
  Truck,
  WifiOff,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import StatusDot from "../components/ui/StatusDot";
import { useSocket } from "../realtime/SocketContext";
import { DEVICE_TYPE_LABELS, ALERT_TYPE_LABELS } from "../lib/labels";
import { useVehicles } from "../lib/fleet";
import { useDevices } from "../lib/devices";
import { useAlerts } from "../lib/alerts";

/*
 * Dashboard design:
 * - Compact operational tiles inspired by an industrial control dashboard.
 * - Colour communicates meaning, not decoration.
 * - Dark mode is intentionally black/graphite based.
 * - No fabricated trip, fatigue, alcohol, or historical values.
 * - Existing API and Socket.IO behaviour is preserved.
 */

const DEVICE_BADGE_TONE = {
  online: "ok",
  warning: "warn",
  critical: "critical",
  offline: "neutral",
};

const TILE_STYLES = {
  neutral: {
    panel: "border-line bg-surface-raised",
    icon: "bg-surface-active text-ink-secondary",
    value: "text-ink",
  },
  copper: {
    panel: "border-copper/25 bg-copper-soft",
    icon: "bg-copper-soft text-copper",
    value: "text-copper",
  },
  ok: {
    panel: "border-status-ok/25 bg-status-ok-soft",
    icon: "bg-status-ok-soft text-status-ok",
    value: "text-status-ok",
  },
  warn: {
    panel: "border-status-warn/25 bg-status-warn-soft",
    icon: "bg-status-warn-soft text-status-warn",
    value: "text-status-warn",
  },
  critical: {
    panel: "border-status-critical/25 bg-status-critical-soft",
    icon: "bg-status-critical-soft text-status-critical",
    value: "text-status-critical",
  },
};

function MetricTile({
  label,
  value,
  description,
  icon: Icon,
  tone = "neutral",
}) {
  const style = TILE_STYLES[tone] ?? TILE_STYLES.neutral;

  return (
    <div
      className={`min-w-0 rounded-xl border p-4 transition-colors ${style.panel}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            {label}
          </p>

          <p className={`mt-2 font-data text-3xl font-semibold ${style.value}`}>
            {value ?? "—"}
          </p>

          <p className="mt-1 text-xs leading-5 text-ink-muted">
            {description}
          </p>
        </div>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.icon}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, description, to, linkLabel = "View all" }) {
  return (
    <CardHeader>
      <div>
        <CardTitle>{title}</CardTitle>

        {description && (
          <p className="mt-1 text-xs text-ink-muted">{description}</p>
        )}
      </div>

      {to && (
        <Link
          to={to}
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-copper transition-colors hover:text-copper-strong"
        >
          {linkLabel}
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </CardHeader>
  );
}

function StatusTile({ label, value, caption, icon: Icon, tone }) {
  const style = TILE_STYLES[tone] ?? TILE_STYLES.neutral;


  return (
    <div className={`rounded-xl border p-4 ${style.panel}`}>
      <div className="flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${style.icon}`}
        >
          <Icon className="h-4 w-4" />
        </div>

        <span className="text-[11px] font-semibold uppercase tracking-[0.11em] text-ink-muted">
          {label}
        </span>
      </div>

      <p className={`mt-3 font-data text-2xl font-semibold ${style.value}`}>
        {value ?? "—"}
      </p>

      <p className="mt-1 text-xs text-ink-muted">{caption}</p>
    </div>
  );
}

function DataPlaceholder({ icon: Icon, title, description, tone = "neutral" }) {
  const style = TILE_STYLES[tone] ?? TILE_STYLES.neutral;

  const customIconClass =
    tone === "violet"
      ? "bg-[#28243D] text-[#A79BDF]"
      : tone === "teal"
      ? "bg-[#183536] text-[#62B7B4]"
      : style.icon;

  return (
    <div className="flex min-h-[154px] items-center justify-center p-4">
      <div className="text-center">
        <div
          className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full ${customIconClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <p className="mt-3 text-sm font-medium text-ink">{title}</p>

        <p className="mx-auto mt-1 max-w-[250px] text-xs leading-5 text-ink-muted">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const { data: vehicles } = useVehicles({
    per_page: 1,
  });

  const { data: activeVehicles } = useVehicles({
    status: "active",
    per_page: 1,
  });

  const { data: onlineDevices } = useDevices({
    status: "online",
    per_page: 1,
  });

  const { data: offlineDevices } = useDevices({
    status: "offline",
    per_page: 1,
  });

  const { data: alerts } = useAlerts({
    per_page: 5,
  });

  const { data: devices } = useDevices({
    per_page: 6,
  });

  useEffect(() => {
    if (!socket) return;

    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    };

    socket.on("device:update", refresh);
    socket.on("alert:new", refresh);

    return () => {
      socket.off("device:update", refresh);
      socket.off("alert:new", refresh);
    };
  }, [socket, queryClient]);

  const totalVehicleCount = vehicles?.total;
  const activeVehicleCount = activeVehicles?.total;
  const onlineDeviceCount = onlineDevices?.total;
  const offlineDeviceCount = offlineDevices?.total;
  const openAlertCount = alerts?.unacknowledged_total;

  const requiresAttention =
    (openAlertCount ?? 0) > 0 || (offlineDeviceCount ?? 0) > 0;

  return (
    <div className="space-y-5">
      {/* Dashboard heading */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-panel sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-status-ok" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-status-ok">
              Live operations
            </span>
          </div>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            Fleet Safety Command Center
          </h1>

          <p className="mt-1 text-sm text-ink-muted">
            Operational overview of fleet activity, equipment health, and
            safety conditions.
          </p>
        </div>

        <div className="flex w-fit items-center gap-2 rounded-lg border border-line bg-surface-raised px-3 py-2 text-xs text-ink-muted">
          <Activity className="h-3.5 w-3.5 text-status-ok" />
          Live telemetry
        </div>
      </div>

      {/* Primary operational facts */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">
              Operational overview
            </h2>
            <p className="text-xs text-ink-muted">
              Key fleet figures at a glance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Total vehicles"
            value={totalVehicleCount}
            description="Registered fleet vehicles"
            icon={Truck}
            tone="neutral"
          />

          <MetricTile
            label="Active vehicles"
            value={activeVehicleCount}
            description="Currently operational"
            icon={CheckCircle2}
            tone="ok"
          />

          <MetricTile
            label="Devices online"
            value={onlineDeviceCount}
            description="Connected and reporting"
            icon={Cpu}
            tone="copper"
          />

          <MetricTile
            label="Safety alerts"
            value={openAlertCount}
            description={
              openAlertCount > 0
                ? "Unacknowledged attention required"
                : "No unacknowledged alerts"
            }
            icon={AlertTriangle}
            tone={openAlertCount > 0 ? "critical" : "ok"}
          />
        </div>
      </section>

      {/* Fleet status + attention */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <SectionHeader
            title="Fleet status"
            description="Current condition of the connected fleet."
          />

          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatusTile
                label="Operational"
                value={activeVehicleCount}
                caption="Active vehicles"
                icon={ShieldCheck}
                tone="ok"
              />

              <StatusTile
                label="Attention"
                value={offlineDeviceCount}
                caption="Offline devices"
                icon={WifiOff}
                tone="warn"
              />

              <StatusTile
                label="Critical"
                value={openAlertCount}
                caption="Open safety alerts"
                icon={AlertTriangle}
                tone="critical"
              />
            </div>

            <div
              className={`mt-3 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                requiresAttention
                  ? TILE_STYLES.warn.panel
                  : TILE_STYLES.ok.panel
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    requiresAttention
                      ? TILE_STYLES.warn.icon
                      : TILE_STYLES.ok.icon
                  }`}
                >
                  {requiresAttention ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-ink">
                    {requiresAttention
                      ? "Fleet requires attention"
                      : "Fleet operating normally"}
                  </p>

                  <p className="text-xs text-ink-muted">
                    {requiresAttention
                      ? "Review open alerts and device connectivity."
                      : "No current alert or connectivity condition requires action."}
                  </p>
                </div>
              </div>

              {requiresAttention && (
                <Link
                  to="/alerts"
                  className="flex items-center gap-1 text-xs font-medium text-copper hover:text-copper-strong"
                >
                  Review
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <SectionHeader
            title="Attention required"
            description="Quick access to issues needing review."
          />

          <CardContent className="space-y-3">
            <Link
              to="/alerts"
              className="group flex items-center justify-between rounded-xl border border-status-critical/25 bg-status-critical-soft p-3 transition-colors hover:border-status-critical/45"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-status-critical-soft text-status-critical">
                  <AlertTriangle className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-sm font-medium text-ink">
                    Safety alerts
                  </p>
                  <p className="text-xs text-ink-muted">
                    {openAlertCount ?? "—"} awaiting acknowledgement
                  </p>
                </div>
              </div>

              <ArrowRight className="h-4 w-4 text-ink-muted transition-transform group-hover:translate-x-0.5" />
            </Link>

            <Link
              to="/devices"
              className="group flex items-center justify-between rounded-xl border border-status-warn/25 bg-status-warn-soft p-3 transition-colors hover:border-status-warn/45"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-status-warn-soft text-status-warn">
                  <WifiOff className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-sm font-medium text-ink">
                    Offline devices
                  </p>
                  <p className="text-xs text-ink-muted">
                    {offlineDeviceCount ?? "—"} currently offline
                  </p>
                </div>
              </div>

              <ArrowRight className="h-4 w-4 text-ink-muted transition-transform group-hover:translate-x-0.5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Analytics area */}
      <div>
        <div className="mb-2">
          <h2 className="text-sm font-semibold text-ink">Safety analytics</h2>
          <p className="text-xs text-ink-muted">
            Fleet-level indicators. Charts will use backend data when
            available.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {/* Trip activity */}
          <Card className="overflow-hidden border-line bg-surface">
            <div className="h-1 bg-[#D88A3D]" />

            <SectionHeader
              title="Trip activity"
              description="Active and completed trip overview."
            />

            <CardContent>
              <DataPlaceholder
                icon={Activity}
                title="Trip metrics"
                description="Active trips, completed trips, and trip alerts will appear here when trip data is connected."
                tone="copper"
              />
            </CardContent>
          </Card>

          {/* Fatigue */}
          <Card className="overflow-hidden border-line bg-surface">
            <div className="h-1 bg-[#8B7CC8]" />

            <SectionHeader
              title="Driver fatigue"
              description="Fleet-level fatigue distribution."
            />

            <CardContent>
              <DataPlaceholder
                icon={CircleDot}
                title="Fatigue distribution"
                description="A donut chart will show normal, moderate, and high fatigue levels once fatigue data is available."
                tone="violet"
              />
            </CardContent>
          </Card>

          {/* Alcohol */}
          <Card className="overflow-hidden border-line bg-surface">
            <div className="h-1 bg-status-critical" />

            <SectionHeader
              title="Alcohol detection"
              description="Fleet-level alcohol detection status."
            />

            <CardContent>
              <DataPlaceholder
                icon={ShieldCheck}
                title="Alcohol status"
                description="A distribution chart will show clear and detected results once alcohol detection data is available."
                tone="critical"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Device health + alerts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="h-1 bg-[#4E9A9A]" />
          <SectionHeader
            title="Device health"
            description="Latest heartbeat status from connected equipment."
            to="/devices"
          />

          <CardContent className="space-y-2">
            {!devices && (
              <p className="py-4 text-sm text-ink-muted">Loading…</p>
            )}

            {devices && devices.items.length === 0 && (
              <div className="rounded-xl border border-line bg-surface-raised p-4 text-sm text-ink-muted">
                No devices registered yet.
              </div>
            )}

            {devices?.items.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface-raised px-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <StatusDot status={device.status} />

                  <div className="min-w-0">
                    <p className="truncate font-data text-sm text-ink">
                      {DEVICE_TYPE_LABELS[device.device_type] ??
                        device.device_type}{" "}
                      #{device.id}
                    </p>

                    <p className="truncate text-xs text-ink-muted">
                      {device.vehicle?.registration_number ?? "Unmounted"}
                    </p>
                  </div>
                </div>

                <Badge tone={DEVICE_BADGE_TONE[device.status] ?? "neutral"}>
                  {device.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <SectionHeader
            title="Alerts overview"
            description="Latest safety events requiring visibility."
            to="/alerts"
          />

          <CardContent className="space-y-2">
            {!alerts && (
              <p className="py-4 text-sm text-ink-muted">Loading…</p>
            )}

            {alerts && alerts.items.length === 0 && (
              <div className="rounded-xl border border-status-ok/25 bg-status-ok-soft p-5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-status-ok" />

                  <div>
                    <p className="text-sm font-medium text-ink">
                      No alerts found
                    </p>

                    <p className="text-xs text-ink-muted">
                      No recent safety events are currently recorded.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {alerts?.items.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between gap-4 rounded-lg border p-3 ${
                  alert.acknowledged
                    ? "border-line bg-surface-raised"
                    : alert.severity === "critical"
                    ? TILE_STYLES.critical.panel
                    : TILE_STYLES.warn.panel
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        alert.acknowledged
                          ? "bg-ink-subtle"
                          : alert.severity === "critical"
                          ? "bg-status-critical"
                          : "bg-status-warn"
                      }`}
                    />

                    <p className="truncate text-sm font-medium text-ink">
                      {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
                    </p>
                  </div>

                  <p className="mt-1 truncate text-xs text-ink-muted">
                    {alert.message}
                  </p>
                </div>

                <Badge
                  tone={
                    alert.acknowledged
                      ? "neutral"
                      : alert.severity === "critical"
                      ? "critical"
                      : "warn"
                  }
                >
                  {alert.acknowledged ? "Acknowledged" : "Open"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
