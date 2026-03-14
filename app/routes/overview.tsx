import { Link } from "react-router";

import { AdminSection, FeatureNotice, StatCard } from "~/components/admin-shell";
import Button from "~/components/Button";
import { Capabilities } from "~/server/web/roles";

import type { Route } from "./+types/overview";

export async function loader({ request, context }: Route.LoaderArgs) {
  const principal = await context.auth.require(request);
  if (!context.auth.can(principal, Capabilities.ui_access)) {
    throw new Error("You do not have permission to view the admin overview.");
  }

  const api = context.hsApi.getRuntimeClient(
    context.auth.getHeadscaleApiKey(principal, context.oidc?.apiKey),
  );

  const [nodes, users, apiKeys] = await Promise.all([api.getNodes(), api.getUsers(), api.getApiKeys()]);

  let preAuthKeyCount = 0;
  if (context.hsApi.featureFlags.canReadAllPreAuthKeys) {
    try {
      preAuthKeyCount = (await api.getAllPreAuthKeys()).length;
    } catch {
      preAuthKeyCount = 0;
    }
  }

  return {
    apiVersion: context.hsApi.apiVersion,
    config: {
      hasHeadscaleConfig: context.hs.readable(),
      writable: context.hs.writable(),
    },
    featureFlags: context.hsApi.featureFlags,
    healthy: await api.isHealthy(),
    integrationName: context.integration?.name,
    stats: {
      apiKeys: apiKeys.length,
      connected: nodes.filter((node) => node.online).length,
      nodes: nodes.length,
      preAuthKeys: preAuthKeyCount,
      users: users.length,
    },
  };
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const { featureFlags, stats } = loaderData;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-mist-500 dark:text-mist-400">
            Overview
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-mist-950 dark:text-mist-25">
            Tailnet control center
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-mist-600 dark:text-mist-300">
            Headplane is now acting as the main operator console for Headscale, with live status,
            compatibility-aware controls, and direct access to machines, users, keys, and advanced
            administration workflows.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/machines">
            <Button variant="heavy">Review machines</Button>
          </Link>
          <Link to="/advanced/system">
            <Button>System status</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Machines" value={stats.nodes} detail={`${stats.connected} online`} />
        <StatCard label="Users" value={stats.users} />
        <StatCard label="API keys" value={stats.apiKeys} />
        <StatCard
          label="Pre-auth keys"
          value={stats.preAuthKeys}
          detail={
            featureFlags.canReadAllPreAuthKeys
              ? "Live count from Headscale"
              : "Count unavailable on this API version"
          }
          tone={featureFlags.canReadAllPreAuthKeys ? "default" : "warn"}
        />
        <StatCard
          label="Config"
          value={loaderData.config.writable ? "Writable" : "Read only"}
          detail={loaderData.integrationName ?? "No live integration"}
          tone={loaderData.config.writable ? "good" : "warn"}
        />
      </div>

      {!loaderData.healthy ? (
        <FeatureNotice title="Headscale is currently degraded" tone="warning">
          The admin console is still available, but data may be stale or actions may fail until the
          server recovers.
        </FeatureNotice>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <AdminSection
          title="Quick actions"
          description="Jump directly into the most common operator workflows."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Link className="rounded-2xl border border-mist-200 bg-mist-50/70 p-4 transition hover:bg-mist-100 dark:border-mist-800 dark:bg-mist-900/50 dark:hover:bg-mist-900" to="/users">
              <p className="font-semibold">Manage users</p>
              <p className="mt-1 text-sm text-mist-600 dark:text-mist-300">
                Review user ownership, role assignments, and linked identities.
              </p>
            </Link>
            <Link className="rounded-2xl border border-mist-200 bg-mist-50/70 p-4 transition hover:bg-mist-100 dark:border-mist-800 dark:bg-mist-900/50 dark:hover:bg-mist-900" to="/keys/api">
              <p className="font-semibold">Rotate keys</p>
              <p className="mt-1 text-sm text-mist-600 dark:text-mist-300">
                Create API keys, inspect auth key inventory, and expire stale credentials.
              </p>
            </Link>
            <Link className="rounded-2xl border border-mist-200 bg-mist-50/70 p-4 transition hover:bg-mist-100 dark:border-mist-800 dark:bg-mist-900/50 dark:hover:bg-mist-900" to="/acls">
              <p className="font-semibold">Edit access policy</p>
              <p className="mt-1 text-sm text-mist-600 dark:text-mist-300">
                Update ACL policy with diffing, validation, and the visual editor.
              </p>
            </Link>
            <Link className="rounded-2xl border border-mist-200 bg-mist-50/70 p-4 transition hover:bg-mist-100 dark:border-mist-800 dark:bg-mist-900/50 dark:hover:bg-mist-900" to="/advanced/debug">
              <p className="font-semibold">Open debug tools</p>
              <p className="mt-1 text-sm text-mist-600 dark:text-mist-300">
                Use advanced controls for testing registration flows and integration diagnostics.
              </p>
            </Link>
          </div>
        </AdminSection>

        <AdminSection
          title="Compatibility"
          description="Feature exposure is automatically adjusted to the detected Headscale API."
        >
          <div className="grid gap-3">
            <StatCard label="Detected API version" value={loaderData.apiVersion} />
            <FeatureNotice title="Available across this instance">
              Debug machines: {featureFlags.canManageDebugNodes ? "enabled" : "unavailable"}, tag-only
              pre-auth keys: {featureFlags.canManageTagOnlyPreAuthKeys ? "enabled" : "unavailable"},
              machine owner reassignment: {featureFlags.canReassignNodeOwner ? "enabled" : "unavailable"}.
            </FeatureNotice>
          </div>
        </AdminSection>
      </div>
    </div>
  );
}
