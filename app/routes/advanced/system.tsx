import { Form, useActionData } from "react-router";
import { data } from "react-router";

import { AdminSection, FeatureNotice, StatCard } from "~/components/admin-shell";
import Button from "~/components/Button";
import { Capabilities } from "~/server/web/roles";

import type { Route } from "./+types/system";

export async function loader({ request, context }: Route.LoaderArgs) {
  const principal = await context.auth.require(request);
  if (!context.auth.can(principal, Capabilities.read_system)) {
    throw data("You do not have permission to view system administration.", { status: 403 });
  }

  const integrationConfig = context.config.integration;
  const enabledIntegrations = [
    integrationConfig?.docker?.enabled ? "docker" : null,
    integrationConfig?.kubernetes?.enabled ? "kubernetes" : null,
    integrationConfig?.proc?.enabled ? "proc" : null,
    integrationConfig?.agent?.enabled ? "agent" : null,
  ].filter(Boolean);

  return {
    enabledIntegrations,
    hasInfoSecret: Boolean(context.config.server.info_secret),
    integrationName: context.integration?.name,
    readable: context.hs.readable(),
    reloadSupported: Boolean(context.integration),
    writable: context.hs.writable(),
    writableAccess: context.auth.can(principal, Capabilities.control_system),
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const principal = await context.auth.require(request);
  if (!context.auth.can(principal, Capabilities.control_system)) {
    throw data("You do not have permission to control the system integration.", { status: 403 });
  }
  if (!context.integration) {
    throw data("No active integration is available for config reloads.", { status: 400 });
  }

  const formData = await request.formData();
  const actionId = String(formData.get("action_id") ?? "");
  if (actionId !== "reload_headscale") {
    throw data("Invalid action.", { status: 400 });
  }

  const api = context.hsApi.getRuntimeClient(
    context.auth.getHeadscaleApiKey(principal, context.oidc?.apiKey),
  );
  await context.integration.onConfigChange(api);
  return { message: "Requested Headscale config reload through the active integration." };
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-mist-500 dark:text-mist-400">Advanced</p>
        <h1 className="mt-2 text-3xl font-semibold text-mist-950 dark:text-mist-25">System administration</h1>
        <p className="mt-2 max-w-3xl text-sm text-mist-600 dark:text-mist-300">
          Integration-aware diagnostics for the Headplane deployment, Headscale configuration access,
          and operator controls that need a local execution context.
        </p>
      </div>

      {actionData?.message ? <FeatureNotice title="System action">{actionData.message}</FeatureNotice> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Config file" value={loaderData.readable ? "Readable" : "Unavailable"} tone={loaderData.readable ? "good" : "warn"} />
        <StatCard label="Config writes" value={loaderData.writable ? "Enabled" : "Read only"} tone={loaderData.writable ? "good" : "warn"} />
        <StatCard label="Runtime integration" value={loaderData.integrationName ?? "None"} tone={loaderData.integrationName ? "good" : "warn"} />
        <StatCard label="Debug info endpoint" value={loaderData.hasInfoSecret ? "Protected" : "Disabled"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminSection title="Integration status" description="Configured and active runtime integration details.">
          <div className="grid gap-3">
            <FeatureNotice title="Enabled integrations from config">
              {loaderData.enabledIntegrations.length > 0
                ? loaderData.enabledIntegrations.join(", ")
                : "No integrations configured."}
            </FeatureNotice>
            <FeatureNotice title="Active runtime integration">
              {loaderData.integrationName ??
                "Headplane is not currently attached to a live config-reload integration."}
            </FeatureNotice>
            {!loaderData.reloadSupported ? (
              <FeatureNotice title="Reload control unavailable" tone="warning">
                DNS/config changes can still be edited where supported, but Headplane cannot signal
                Headscale to reload them automatically in this deployment.
              </FeatureNotice>
            ) : null}
          </div>
        </AdminSection>

        <AdminSection title="Operator controls" description="Dangerous actions are kept in this advanced area.">
          <Form className="grid gap-4" method="post">
            <input name="action_id" type="hidden" value="reload_headscale" />
            <Button
              isDisabled={!loaderData.writableAccess || !loaderData.reloadSupported}
              type="submit"
              variant="danger"
            >
              Apply config / reload Headscale
            </Button>
          </Form>
        </AdminSection>
      </div>
    </div>
  );
}
