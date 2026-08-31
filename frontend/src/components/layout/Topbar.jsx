import { Moon, Sun, Search, LogOut } from "lucide-react";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../auth/AuthContext";
import { useSocket } from "../../realtime/SocketContext";
import StatusDot from "../ui/StatusDot";

export default function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { connected } = useSocket();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-4">
      <div className="flex items-center gap-2 text-ink-muted">
        <Search className="h-4 w-4" />
        <span className="text-sm">Search fleet, drivers, devices…</span>
      </div>

      <div className="flex items-center gap-4">
        <StatusDot
          status={connected ? "online" : "offline"}
          label={connected ? "Live" : "Reconnecting…"}
        />

        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        <div className="flex items-center gap-2 border-l border-line pl-4">
          <div className="text-right leading-tight">
            <p className="text-xs font-medium text-ink">{user?.username}</p>
            <p className="text-[11px] capitalize text-ink-muted">
              {user?.role?.replace("_", " ")}
            </p>
          </div>
          <button
            onClick={logout}
            aria-label="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
