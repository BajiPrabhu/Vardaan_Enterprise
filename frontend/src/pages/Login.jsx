import { useState } from "react";
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
    <div className="flex h-screen items-center justify-center bg-canvas">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-80 space-y-4 rounded-lg border border-line bg-surface p-6 shadow-panel"
        noValidate
      >
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-copper text-sm font-bold text-white">
            V
          </div>
          <span className="text-sm font-semibold tracking-tight text-ink">
            VARDAAN
          </span>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">
            Username
          </label>
          <input
            {...register("username", { required: true })}
            autoComplete="username"
            className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-copper"
          />
          {errors.username && (
            <p className="mt-1 text-xs text-status-critical">
              Username is required.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">
            Password
          </label>
          <input
            type="password"
            {...register("password", { required: true })}
            autoComplete="current-password"
            className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-copper"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-status-critical">
              Password is required.
            </p>
          )}
        </div>

        {loginError && (
          <p className="text-xs text-status-critical">{loginError}</p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
