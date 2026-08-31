import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import StatusDot from "../components/ui/StatusDot";

// Sample data only — this page exists to prove the design system components
// compose correctly. Real KPIs arrive when the Fleet/Driver/Device modules
// are wired to the backend in a later step.
const KPIS = [
  { label: "Active vehicles", value: "128", tone: "ok" },
  { label: "Drivers on duty", value: "94", tone: "ok" },
  { label: "Open alerts", value: "3", tone: "warn" },
  { label: "Devices offline", value: "2", tone: "critical" },
];

const DEVICES = [
  { id: "PI-0231", type: "Raspberry Pi 5", status: "online" },
  { id: "ANPR-0091", type: "ANPR Camera", status: "online" },
  { id: "GPS-1147", type: "GPS Module", status: "warning" },
  { id: "ALC-0502", type: "Alcohol Sensor", status: "offline" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          Dashboard
        </h1>
        <p className="text-sm text-ink-muted">Sample data — layout preview only.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ink-muted">{kpi.label}</p>
                <p className="font-data text-2xl font-semibold text-ink">
                  {kpi.value}
                </p>
              </div>
              <Badge tone={kpi.tone}>{kpi.tone === "ok" ? "Normal" : kpi.tone === "warn" ? "Watch" : "Action"}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Device heartbeat</CardTitle>
          <Badge tone="neutral">Sample data</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {DEVICES.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between border-b border-line pb-3 last:border-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <StatusDot status={device.status} />
                <div>
                  <p className="font-data text-sm text-ink">{device.id}</p>
                  <p className="text-xs text-ink-muted">{device.type}</p>
                </div>
              </div>
              <Badge
                tone={
                  device.status === "online"
                    ? "ok"
                    : device.status === "warning"
                    ? "warn"
                    : "critical"
                }
              >
                {device.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
