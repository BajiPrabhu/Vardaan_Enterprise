const VARIANTS = {
  primary: "bg-copper text-white hover:bg-copper-strong",
  secondary:
    "bg-transparent text-ink border border-line hover:bg-surface-raised",
  ghost: "bg-transparent text-ink-muted hover:text-ink hover:bg-surface-raised",
};

const SIZES = {
  sm: "h-8 px-3 text-sm",
  md: "h-9 px-4 text-sm",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium
        transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
