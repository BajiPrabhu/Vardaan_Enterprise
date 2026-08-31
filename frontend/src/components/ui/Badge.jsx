const TONES = {
  neutral: "bg-surface-raised text-ink-muted border-line",
  ok: "bg-status-ok/10 text-status-ok border-status-ok/25",
  warn: "bg-status-warn/10 text-status-warn border-status-warn/25",
  critical: "bg-status-critical/10 text-status-critical border-status-critical/25",
  copper: "bg-copper/10 text-copper border-copper/25",
};

export default function Badge({ tone = "neutral", className = "", children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5
        text-xs font-medium ${TONES[tone] ?? TONES.neutral} ${className}`}
    >
      {children}
    </span>
  );
}
