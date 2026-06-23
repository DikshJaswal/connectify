import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { api, apiError } from "../lib/api";
import { useAuth } from "../store/auth";

type Props = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: Props) {
  const navigate = useNavigate();
  const setSession = useAuth((state) => state.setSession);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const payload =
        mode === "register"
          ? { name: form.get("name"), email: form.get("email"), password: form.get("password") }
          : { email: form.get("email"), password: form.get("password") };
      const { data } = await api.post(`/auth/${mode}`, payload);
      setSession(data.token, data.user);
      navigate("/");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_34%),linear-gradient(180deg,_#f8fbff,_#edf4ff)] px-4 py-8 text-ink">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/70 bg-white/85 shadow-[0_24px_80px_rgba(37,99,235,0.14)] backdrop-blur md:grid-cols-[1.05fr_0.95fr] dark:border-slate-800 dark:bg-slate-950/90">
        <div className="hidden flex-col justify-between bg-gradient-to-br from-blue-700 via-sky-600 to-blue-500 p-8 text-white md:flex">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Connectify</h1>
              <p className="text-sm text-white/80">Real-time chat with a clean blue-white flow</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-white/70">Live workspace</p>
              <h2 className="mt-3 max-w-md text-4xl font-semibold leading-tight tracking-tight">Message, share, and stay in sync without the clutter.</h2>
            </div>
            <div className="space-y-3 text-sm text-white/85">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Socket connection visible in the sidebar
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Direct chats, groups, and AI companion
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Clean message bubbles and file sharing
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-200/60">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Connectify</h1>
                <p className="text-sm text-slate-500">{mode === "login" ? "Welcome back" : "Create your account"}</p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {mode === "register" && (
                <label className="block text-sm font-medium">
                  Name
                  <input name="name" required minLength={2} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-blue-700 dark:focus:ring-blue-950/50" />
                </label>
              )}
              <label className="block text-sm font-medium">
                Email
                <input name="email" required type="email" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-blue-700 dark:focus:ring-blue-950/50" />
              </label>
              <label className="block text-sm font-medium">
                Password
                <input name="password" required type="password" minLength={8} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-blue-700 dark:focus:ring-blue-950/50" />
              </label>
              {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
              <button disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-4 py-2.5 font-medium text-white shadow-sm shadow-blue-200/60 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-none">
                {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              {mode === "login" ? "New to Connectify?" : "Already have an account?"}{" "}
              <Link to={mode === "login" ? "/register" : "/login"} className="font-medium text-blue-700 hover:text-blue-800 dark:text-blue-200">
                {mode === "login" ? "Create account" : "Login"}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
