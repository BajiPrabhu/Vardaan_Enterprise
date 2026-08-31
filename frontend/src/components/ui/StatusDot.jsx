const COLORS = {
  online: "text-status-ok",
  warning: "text-status-warn",
  critical: "text-status-critical",
  offline: "text-ink-muted",
};

// `live` controls the pulse animation — reserve it for states that are
// actually active right now (an online device, a firing alert), not every
// status everywhere. Constant motion stops meaning anything.
export default function StatusDot({ status = "offline", live, label }) {
  const isLive = live ?? (status === "online" || status === "critical");

  return (
    <span className="inline-flex items-center gap-2">
      <span className={`relative inline-flex h-2 w-2 ${COLORS[status] ?? COLORS.offline}`}>
        {isLive && <span className="pulse-ring" />}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
      </span>
      {label && <span className="text-sm text-ink-muted">{label}</span>}
    </span>
  );
}
