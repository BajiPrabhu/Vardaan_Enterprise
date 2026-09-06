import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Radio, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/ui/Button";

export default function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async ({ username, password }) => {
    setLoginError("");

    try {
      await login(username, password);
      navigate(location.state?.from ?? "/", { replace: true });
    } catch {
      setLoginError("Invalid username or password.");
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
        {/* Brand / system panel */}
        <section className="relative hidden overflow-hidden border-r border-line bg-surface lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(216,138,61,0.10),transparent_32%),radial-gradient(circle_at_80%_82%,rgba(79,166,106,0.07),transparent_28%)]" />

          <div className="relative flex w-full flex-col justify-between p-10 xl:p-14">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-copper/30 bg-copper-soft text-copper">
                  <Radio className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-lg font-semibold tracking-tight text-ink">
                    VARDAAN
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">
                    Enterprise
                  </p>
                </div>
              </div>

              <div className="mt-20 max-w-xl">
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-status-ok" />
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-status-ok">
                    Fleet safety platform
                  </span>
                </div>

                <h1 className="text-4xl font-semibold leading-tight tracking-tight text-ink xl:text-5xl">
                  One command center for safer fleet operations.
                </h1>

                <p className="mt-5 max-w-lg text-sm leading-7 text-ink-muted">
                  Monitor vehicles, connected equipment, driver safety signals,
                  and operational alerts from one centralized platform.
                </p>
              </div>
            </div>

            <div className="max-w-xl">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-status-ok/20 bg-status-ok-soft p-4">
                  <div className="flex items-center gap-2 text-status-ok">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Safety
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-ink">
                    Driver monitoring
                  </p>
                  <p className="mt-1 text-xs leading-5 text-ink-muted">
                    Safety conditions surfaced clearly.
                  </p>
                </div>

                <div className="rounded-xl border border-copper/20 bg-copper-soft p-4">
                  <div className="flex items-center gap-2 text-copper">
                    <Radio className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Connected
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-ink">
                    Live operations
                  </p>
                  <p className="mt-1 text-xs leading-5 text-ink-muted">
                    Fleet and device visibility in real time.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 text-xs text-ink-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-status-ok" />
                System services available
                <span className="mx-1 text-ink-subtle">•</span>
                Secure enterprise access
              </div>
            </div>
          </div>
        </section>

        {/* Login panel */}
        <main className="flex min-h-screen items-center justify-center bg-surface p-5 sm:p-8">
          <div className="w-full max-w-md">
            {/* Mobile brand */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-copper/30 bg-copper-soft text-copper">
                <Radio className="h-5 w-5" />
              </div>

              <div>
                <p className="text-lg font-semibold tracking-tight text-ink">
                  VARDAAN
                </p>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">
                  Enterprise
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-surface-raised p-6 shadow-panel sm:p-8">
              <div className="mb-7">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-active text-copper">
                  <LockKeyhole className="h-5 w-5" />
                </div>

                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-copper">
                  Secure access
                </p>

                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  Welcome back
                </h2>

                <p className="mt-1.5 text-sm text-ink-muted">
                  Sign in to access the VARDAAN operations console.
                </p>
              </div>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5"
                noValidate
              >
                <div>
                  <label
                    htmlFor="username"
                    className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-ink-secondary"
                  >
                    Username
                  </label>

                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    {...register("username", { required: true })}
                    className={`h-11 w-full rounded-lg border bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:ring-2 ${
                      errors.username
                        ? "border-status-critical/60 focus:border-status-critical focus:ring-status-critical/15"
                        : "border-line focus:border-copper focus:ring-copper/15"
                    }`}
                    placeholder="Enter your username"
                  />

                  {errors.username && (
                    <p className="mt-1.5 text-xs text-status-critical">
                      Username is required.
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-ink-secondary"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      {...register("password", { required: true })}
                      className={`h-11 w-full rounded-lg border bg-surface px-3 pr-11 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:ring-2 ${
                        errors.password
                          ? "border-status-critical/60 focus:border-status-critical focus:ring-status-critical/15"
                          : "border-line focus:border-copper focus:ring-copper/15"
                      }`}
                      placeholder="Enter your password"
                    />

                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-muted transition-colors hover:text-ink focus:outline-none focus-visible:text-copper"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {errors.password && (
                    <p className="mt-1.5 text-xs text-status-critical">
                      Password is required.
                    </p>
                  )}
                </div>

                {loginError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-status-critical/25 bg-status-critical-soft px-3 py-2.5 text-xs text-status-critical"
                  >
                    {loginError}
                  </div>
                )}

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Signing in…" : "Sign in"}
                </Button>
              </form>

              <div className="mt-7 flex items-center justify-between border-t border-line pt-4 text-[11px] text-ink-subtle">
                <span>VARDAAN Enterprise</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-status-ok" />
                  Secure access
                </span>
              </div>
            </div>

            <p className="mt-5 text-center text-[11px] leading-5 text-ink-subtle">
              Authorized personnel only. Access is protected by enterprise
              authentication.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
