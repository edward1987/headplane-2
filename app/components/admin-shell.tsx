import {
  Activity,
  Bug,
  Globe,
  KeyRound,
  Lock,
  Network,
  Server,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, useSubmit } from "react-router";

import Button from "~/components/Button";
import logoBg from "~/logo/dark-bg.svg";
import logoDark from "~/logo/dark.svg";
import logoLight from "~/logo/light.svg";
import cn from "~/utils/cn";

type Access = {
  advanced: boolean;
  apiKeys: boolean;
  dns: boolean;
  machines: boolean;
  policy: boolean;
  settings: boolean;
  system: boolean;
  ui: boolean;
  users: boolean;
};

const navItems = [
  { to: "/overview", icon: Activity, label: "Overview", key: "ui" },
  { to: "/machines", icon: Server, label: "Machines", key: "machines" },
  { to: "/users", icon: Users, label: "Users", key: "users" },
  { to: "/acls", icon: Lock, label: "Access", key: "policy" },
  { to: "/dns", icon: Globe, label: "DNS", key: "dns" },
  { to: "/keys/api", icon: KeyRound, label: "Keys", key: "apiKeys" },
  { to: "/settings", icon: Settings, label: "Settings", key: "settings" },
  { to: "/advanced/system", icon: Bug, label: "Advanced", key: "advanced" },
] as const;

export interface AdminShellProps {
  access: Access;
  apiVersion: string;
  baseUrl: string;
  children: ReactNode;
  configAvailable: boolean;
  featureFlags: {
    canManageDebugNodes: boolean;
    canManageTagOnlyPreAuthKeys: boolean;
    canReadAllPreAuthKeys: boolean;
    canReassignNodeOwner: boolean;
  };
  integrationName?: string;
  isDebug: boolean;
  isHealthy: boolean;
  user: {
    subject: string;
    name: string;
    email?: string;
    picture?: string;
  };
}

export function AdminSection({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-mist-200 bg-white/90 p-6 shadow-sm dark:border-mist-800 dark:bg-mist-950/80">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-mist-950 dark:text-mist-25">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-mist-600 dark:text-mist-300">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  tone = "default",
  detail,
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "good" | "warn";
  detail?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "good" && "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/40",
        tone === "warn" && "border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/40",
        tone === "default" && "border-mist-200 bg-mist-50/80 dark:border-mist-800 dark:bg-mist-900/60",
      )}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-mist-500 dark:text-mist-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-mist-950 dark:text-mist-25">{value}</div>
      {detail ? <div className="mt-2 text-sm text-mist-600 dark:text-mist-300">{detail}</div> : null}
    </div>
  );
}

export function FeatureNotice({
  title,
  children,
  tone = "info",
}: {
  title: string;
  children: ReactNode;
  tone?: "info" | "warning" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        tone === "info" && "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100",
        tone === "warning" &&
          "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
        tone === "danger" && "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100",
      )}
    >
      <p className="font-semibold">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default function AdminShell(props: AdminShellProps) {
  const submit = useSubmit();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(18,128,120,0.12),_transparent_28%),linear-gradient(180deg,_#f7faf9_0%,_#eef3f1_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(35,163,151,0.18),_transparent_24%),linear-gradient(180deg,_#081112_0%,_#0d171a_100%)]">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <aside className="border-b border-mist-200/80 bg-white/80 px-5 py-5 backdrop-blur lg:min-h-screen lg:w-72 lg:border-r lg:border-b-0 dark:border-mist-800 dark:bg-mist-950/70">
          <div className="flex items-center gap-3">
            <picture>
              <source srcSet={logoLight} media="(prefers-color-scheme: dark)" />
              <source srcSet={logoDark} media="(prefers-color-scheme: light)" />
              <img alt="Headplane logo" className="h-10 w-10" src={logoBg} />
            </picture>
            <div>
              <div className="text-lg font-semibold text-mist-950 dark:text-mist-25">Headplane</div>
              <div className="text-xs uppercase tracking-[0.2em] text-mist-500 dark:text-mist-400">
                Admin Console
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-mist-200 bg-mist-50/80 p-4 dark:border-mist-800 dark:bg-mist-900/60">
              <div className="flex items-center gap-3">
                {props.user.picture ? (
                  <img alt={props.user.name} className="h-10 w-10 rounded-full" src={props.user.picture} />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mist-200 text-sm font-semibold dark:bg-mist-800">
                    {props.user.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium text-mist-950 dark:text-mist-25">{props.user.name}</p>
                  <p className="truncate text-xs text-mist-500 dark:text-mist-400">
                    {props.user.email ?? props.user.subject}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className={cn("rounded-full px-2 py-1 font-medium", props.isHealthy ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200" : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200")}>
                  {props.isHealthy ? "Headscale healthy" : "Headscale degraded"}
                </span>
                <span className="rounded-full bg-mist-200 px-2 py-1 font-medium text-mist-700 dark:bg-mist-800 dark:text-mist-200">
                  API {props.apiVersion}
                </span>
                {props.integrationName ? (
                  <span className="rounded-full bg-mist-200 px-2 py-1 font-medium text-mist-700 dark:bg-mist-800 dark:text-mist-200">
                    {props.integrationName}
                  </span>
                ) : null}
              </div>
            </div>

            <nav className="grid gap-1">
              {navItems.map((item) => {
                if (!props.access[item.key]) {
                  return null;
                }
                if ((item.key === "dns" || item.key === "settings") && !props.configAvailable) {
                  return null;
                }

                return (
                  <NavLink
                    key={item.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-mist-950 text-white dark:bg-mist-100 dark:text-mist-950"
                          : "text-mist-700 hover:bg-mist-100 dark:text-mist-200 dark:hover:bg-mist-900",
                      )
                    }
                    prefetch="intent"
                    to={item.to}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            <div className="rounded-2xl border border-mist-200 bg-white/80 p-4 text-xs dark:border-mist-800 dark:bg-mist-950/50">
              <p className="font-semibold uppercase tracking-[0.2em] text-mist-500 dark:text-mist-400">Feature flags</p>
              <div className="mt-3 grid gap-2 text-mist-600 dark:text-mist-300">
                <div className="flex items-center justify-between gap-3">
                  <span>Tag-only keys</span>
                  <Shield className={cn("h-4 w-4", props.featureFlags.canManageTagOnlyPreAuthKeys ? "text-emerald-500" : "text-mist-400")} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>All pre-auth keys</span>
                  <Shield className={cn("h-4 w-4", props.featureFlags.canReadAllPreAuthKeys ? "text-emerald-500" : "text-mist-400")} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Owner reassignment</span>
                  <Shield className={cn("h-4 w-4", props.featureFlags.canReassignNodeOwner ? "text-emerald-500" : "text-mist-400")} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Debug machines</span>
                  <Shield className={cn("h-4 w-4", props.featureFlags.canManageDebugNodes ? "text-emerald-500" : "text-mist-400")} />
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-mist-200/80 bg-white/70 px-6 py-4 backdrop-blur dark:border-mist-800 dark:bg-mist-950/40">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-mist-500 dark:text-mist-400">
                  Tailnet administration
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-mist-600 dark:text-mist-300">
                  <Network className="h-4 w-4" />
                  {props.baseUrl}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {props.isDebug ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                    Debug enabled
                  </span>
                ) : null}
                <Button onPress={() => submit({}, { action: "/logout", method: "POST" })} variant="light">
                  Sign out
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">{props.children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
