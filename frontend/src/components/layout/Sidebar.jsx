import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Truck,
  UserRound,
  Route,
  Activity,
  Cpu,
  AlertTriangle,
  BarChart3,
  FileText,
  Bell,
  ShieldCheck,
  Settings,
} from "lucide-react";
import Badge from "../ui/Badge";
import { useAuth } from "../../auth/AuthContext";

// Only Dashboard has a route today — everything else is real navigation
// taxonomy from the spec, wired up module by module as each one is built.
// `roles`, where present, is the starting cut of who should even see the
// item — everyone else doesn't get "Soon", they don't see it at all.
const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/" },
  { label: "Fleet", icon: Truck, to: "/fleet" },
  { label: "Drivers", icon: UserRound, to: "/drivers", roles: ["owner", "administrator", "fleet_manager", "supervisor"] },
  { label: "Trips", icon: Route },
  { label: "Monitoring", icon: Activity, to: "/monitoring" },
  { label: "Devices", icon: Cpu, to: "/devices" },
  { label: "Alerts", icon: AlertTriangle, to: "/alerts" },
  { label: "Analytics", icon: BarChart3 },
  { label: "Reports", icon: FileText },
  { label: "Notifications", icon: Bell },
  {
    label: "Administration",
    icon: ShieldCheck,
    roles: ["owner", "administrator"],
  },
  {
    label: "Settings",
    icon: Settings,
    roles: ["owner", "administrator", "fleet_manager"],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();

  const items = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex h-14 items-center gap-2 border-b border-line px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-copper text-sm font-bold text-white">
          V
        </div>
        <span className="text-sm font-semibold tracking-tight text-ink">
          VARDAAN
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {items.map(({ label, icon: Icon, to }) => {
          const active = to && location.pathname === to;

          if (!to) {
            return (
              <div
                key={label}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-ink-muted/50"
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
                <Badge tone="neutral" className="text-[10px]">
                  Soon
                </Badge>
              </div>
            );
          }

          return (
            <Link
              key={label}
              to={to}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
                ${
                  active
                    ? "bg-copper/10 text-copper"
                    : "text-ink-muted hover:bg-surface-raised hover:text-ink"
                }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
