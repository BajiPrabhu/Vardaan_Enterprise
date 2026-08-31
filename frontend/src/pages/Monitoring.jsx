import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import StatusDot from "../components/ui/StatusDot";
import { useSocket } from "../realtime/SocketContext";
import { useDevices } from "../lib/devices";

// Leaflet's default marker icon points at image URLs that don't resolve
// through a bundler as-is — repoint them at the actual bundled assets
// once, at module load, instead of shipping broken marker pins.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url)
    .href,
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).href,
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).href,
});

const STATUS_COLORS = {
  online: "#4a6b4a",
  warning: "#97701f",
  critical: "#93392f",
  offline: "#9c9a93",
};

const FEED_LIMIT = 50;
const MAP_CENTER = [26.9124, 75.7873]; // Jaipur — a reasonable default, not a real fleet depot

export default function Monitoring() {
  const { socket } = useSocket();
  const { data } = useDevices({ per_page: 100 });

  const [feed, setFeed] = useState([]);
  const [positions, setPositions] = useState({});

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (event) => {
      setFeed((prev) => [{ ...event, receivedAt: Date.now() }, ...prev].slice(0, FEED_LIMIT));

      if (event.reading?.type === "location") {
        setPositions((prev) => ({
          ...prev,
          [event.id]: {
            lat: event.reading.value.lat,
            lng: event.reading.value.lng,
            deviceType: event.device_type,
            status: event.status,
          },
        }));
      }
    };

    socket.on("device:update", handleUpdate);
    return () => socket.off("device:update", handleUpdate);
  }, [socket]);

  const statusCounts = { online: 0, warning: 0, critical: 0, offline: 0 };
  (data?.items ?? []).forEach((d) => {
    statusCounts[d.status] = (statusCounts[d.status] ?? 0) + 1;
  });
  const chartData = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }));
  const markers = Object.entries(positions);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          Monitoring
        </h1>
        <p className="text-sm text-ink-muted">
          Live telemetry as it arrives — this page holds nothing from before
          you opened it, just what's come in since.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(statusCounts).map(([status, count]) => (
          <Card key={status}>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm capitalize text-ink-muted">{status}</p>
                <p className="font-data text-2xl font-semibold text-ink">
                  {count}
                </p>
              </div>
              <StatusDot status={status} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fleet status</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis
                  dataKey="status"
                  tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
                  tickLine={false}
                  width={28}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>GPS-reporting devices</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 240, padding: 0 }} className="relative">
            <MapContainer
              center={MAP_CENTER}
              zoom={11}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {markers.map(([id, pos]) => (
                <Marker key={id} position={[pos.lat, pos.lng]}>
                  <Popup>
                    Device #{id} ({pos.deviceType}) — {pos.status}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            {markers.length === 0 && (
              <p className="pointer-events-none absolute inset-x-0 top-2 text-center text-xs text-ink-muted">
                No GPS readings yet — waiting for a gps_module device to
                report in
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live feed</CardTitle>
        </CardHeader>
        <CardContent className="max-h-96 space-y-2 overflow-y-auto">
          {feed.length === 0 && (
            <p className="text-sm text-ink-muted">Waiting for telemetry…</p>
          )}
          {feed.map((event, i) => (
            <div
              key={`${event.id}-${event.receivedAt}-${i}`}
              className="flex items-center justify-between border-b border-line pb-2 text-sm last:border-0"
            >
              <div className="flex items-center gap-3">
                <StatusDot status={event.status} />
                <span className="text-ink-muted">{event.device_type}</span>
                <span className="font-data text-ink">#{event.id}</span>
              </div>
              <div className="flex items-center gap-3">
                {event.reading && event.reading.type !== "location" && (
                  <span className="font-data text-ink-muted">
                    {event.reading.value} {event.reading.unit}
                  </span>
                )}
                <span className="text-xs text-ink-muted">
                  {new Date(event.receivedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
