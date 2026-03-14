import { Link } from "react-router";

import { AdminSection, FeatureNotice, StatCard } from "~/components/admin-shell";
import Button from "~/components/Button";

import type { Route } from "./+types/overview";

export async function loader({ context }: Route.LoaderArgs) {
  const oidcConnector = await context.oidc?.connector.get();
  return {
    configReadable: context.hs.readable(),
    configWritable: context.hs.writable(),
    integrationName: context.integration?.name,
    isOidcEnabled: oidcConnector?.isValid ?? false,
  };
}

export default function Page({
  loaderData: { configReadable, configWritable, integrationName, isOidcEnabled },
}: Route.ComponentProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-mist-500 dark:text-mist-400">
          Settings
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-mist-950 dark:text-mist-25">
          Tailnet settings and integrations
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-mist-600 dark:text-mist-300">
          Centralized access to writable Headscale configuration, authentication restrictions,
          pre-auth key management, and integration-aware administration.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Config file" value={configReadable ? "Readable" : "Unavailable"} />
        <StatCard
          label="Config writes"
          value={configWritable ? "Enabled" : "Read only"}
          tone={configWritable ? "good" : "warn"}
        />
        <StatCard
          label="OIDC restrictions"
          value={isOidcEnabled ? "Available" : "Unavailable"}
          tone={isOidcEnabled ? "good" : "warn"}
        />
        <StatCard label="Integration" value={integrationName ?? "None"} />
      </div>

      {!configReadable ? (
        <FeatureNotice title="Headscale config is not readable" tone="warning">
          Some configuration-driven admin features stay visible for navigation consistency, but they
          will be read-only or unavailable until Headplane can read the Headscale config file.
        </FeatureNotice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminSection
          title="Credential workflows"
          description="Generate pre-auth keys for devices and API keys for automation."
        >
          <div className="flex flex-wrap gap-3">
            <Link to="/keys/preauth">
              <Button variant="heavy">Pre-auth keys</Button>
            </Link>
            <Link to="/keys/api">
              <Button>API keys</Button>
            </Link>
          </div>
        </AdminSection>

        <AdminSection
          title="Identity controls"
          description="Manage OIDC restrictions and linked account behavior."
        >
          <div className="flex flex-wrap gap-3">
            <Link to="/settings/restrictions">
              <Button isDisabled={!isOidcEnabled}>Authentication restrictions</Button>
            </Link>
            <Link to="/users">
              <Button>User administration</Button>
            </Link>
          </div>
        </AdminSection>

        <AdminSection
          title="Network configuration"
          description="Review DNS, policy, and live system integration state."
        >
          <div className="flex flex-wrap gap-3">
            <Link to="/dns">
              <Button>DNS</Button>
            </Link>
            <Link to="/acls">
              <Button>Access policy</Button>
            </Link>
            <Link to="/advanced/system">
              <Button>System administration</Button>
            </Link>
          </div>
        </AdminSection>
      </div>
    </div>
  );
}
