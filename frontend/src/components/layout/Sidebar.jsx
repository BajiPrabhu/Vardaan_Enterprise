import { useState } from "react";
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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import Badge from "../ui/Badge";
import { useAuth } from "../../auth/AuthContext";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/" },
  { label: "Fleet", icon: Truck, to: "/fleet" },
  {
    label: "Drivers",
    icon: UserRound,
    to: "/drivers",
    roles: ["owner", "administrator", "fleet_manager", "supervisor"],
  },
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
  const [collapsed, setCollapsed] = useState(false);

  const items = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 ease-out ${
        collapsed ? "w-[68px]" : "w-60"
      }`}
    >
      {/* Header */}
      <div
        className={`flex h-14 shrink-0 items-center border-b border-line ${
          collapsed ? "justify-center px-2" : "gap-2 px-3"
        }`}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-copper text-sm font-bold text-white"
          title="VARDAAN"
        >
          V
        </div>

        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-ink">
              VARDAAN
            </span>

            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </>
        )}

        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="absolute left-[52px] top-3 z-10 hidden h-8 w-8 items-center justify-center rounded-md border border-line bg-surface text-ink-muted shadow-sm transition-colors hover:bg-surface-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {items.map(({ label, icon: Icon, to }) => {
          const active = Boolean(to && location.pathname === to);

          if (!to) {
            return (
              <div
                key={label}
                title={`${label} — Coming soon`}
                className={`group flex h-10 items-center rounded-md text-ink-muted/50 ${
                  collapsed
                    ? "justify-center px-0"
                    : "justify-between px-3"
                }`}
              >
                <span
                  className={`flex min-w-0 items-center ${
                    collapsed ? "justify-center" : "gap-3"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <span className="truncate text-sm">{label}</span>
                  )}
                </span>

                {!collapsed && (
                  <Badge tone="neutral" className="text-[10px]">
                    Soon
                  </Badge>
                )}
              </div>
            );
          }

          return (
            <Link
              key={label}
              to={to}
              title={collapsed ? label : undefined}
              aria-label={collapsed ? label : undefined}
              className={`group flex h-10 items-center rounded-md text-sm font-medium transition-colors ${
                collapsed
                  ? "justify-center px-0"
                  : "gap-3 px-3"
              } ${
                active
                  ? "bg-copper/10 text-copper"
                  : "text-ink-muted hover:bg-surface-raised hover:text-ink"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  active ? "text-copper" : ""
                }`}
              />

              {!collapsed && (
                <span className="truncate">{label}</span>
              )}

              {collapsed && (
                <span
                  className={`pointer-events-none absolute left-[76px] z-20 hidden whitespace-nowrap rounded-md border border-line bg-surface-raised px-2.5 py-1.5 text-xs text-ink shadow-lg group-hover:block`}
                >
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapsed expand control */}
      {collapsed && (
        <div className="border-t border-line p-2">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="flex h-10 w-full items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  );
}