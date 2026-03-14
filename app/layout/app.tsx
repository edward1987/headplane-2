import { Outlet, redirect } from "react-router";

import AdminShell from "~/components/admin-shell";
import { ErrorBanner } from "~/components/error-banner";
import { pruneEphemeralNodes } from "~/server/db/pruner";
import { isDataUnauthorizedError } from "~/server/headscale/api/error-client";
import { Capabilities } from "~/server/web/roles";
import log from "~/utils/log";

import type { Route } from "./+types/app";

export async function loader({ request, context, ...rest }: Route.LoaderArgs) {
  try {
    const principal = await context.auth.require(request);

    const apiKey = context.auth.getHeadscaleApiKey(principal, context.oidc?.apiKey);
    const api = context.hsApi.getRuntimeClient(apiKey);

    const user =
      principal.kind === "oidc"
        ? {
            email: principal.profile.email,
            name: principal.profile.name,
            picture: principal.profile.picture,
            subject: principal.user.subject,
            username: principal.profile.username,
          }
        : { name: principal.displayName, subject: "api_key" };

    // MARK: The session should stay valid if Headscale isn't healthy
    const isHealthy = await api.isHealthy();
    if (isHealthy) {
      try {
        await api.getApiKeys();
        await pruneEphemeralNodes({ context, request, ...rest });
      } catch (error) {
        if (isDataUnauthorizedError(error)) {
          const displayName =
            principal.kind === "oidc" ? principal.profile.name : principal.displayName;
          log.warn("auth", "Logging out %s due to expired API key", displayName);
          return redirect("/login", {
            headers: {
              "Set-Cookie": await context.auth.destroySession(request),
            },
          });
        }
      }

      // Self-heal: if the linked Headscale user was deleted, clear the
      // stale link so the user gets prompted to re-link.
      if (principal.kind === "oidc" && principal.user.headscaleUserId) {
        try {
          const hsUsers = await api.getUsers();
          if (!hsUsers.some((u) => u.id === principal.user.headscaleUserId)) {
            await context.auth.unlinkHeadscaleUser(principal.user.id);
          }
        } catch {
          // API call failed, skip validation
        }
      }
    }

    return {
      access: {
        advanced:
          context.auth.can(principal, Capabilities.read_debug) ||
          context.auth.can(principal, Capabilities.read_system),
        apiKeys: context.auth.can(principal, Capabilities.read_keys_api),
        dns: context.auth.can(principal, Capabilities.read_network),
        machines: context.auth.can(principal, Capabilities.read_machines),
        policy: context.auth.can(principal, Capabilities.read_policy),
        settings: context.auth.can(principal, Capabilities.read_feature),
        system: context.auth.can(principal, Capabilities.read_system),
        ui: context.auth.can(principal, Capabilities.ui_access),
        users: context.auth.can(principal, Capabilities.read_users),
      },
      apiVersion: context.hsApi.apiVersion,
      baseUrl: context.config.headscale.public_url ?? context.config.headscale.url,
      configAvailable: context.hs.readable(),
      featureFlags: context.hsApi.featureFlags,
      integrationName: context.integration?.name,
      isDebug: context.config.debug,
      isHealthy,
      user,
    };
  } catch {
    return redirect("/login", {
      headers: {
        "Set-Cookie": await context.auth.destroySession(request),
      },
    });
  }
}

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  return (
    <AdminShell
      access={loaderData.access}
      apiVersion={loaderData.apiVersion}
      baseUrl={loaderData.baseUrl}
      configAvailable={loaderData.configAvailable}
      featureFlags={loaderData.featureFlags}
      integrationName={loaderData.integrationName}
      isDebug={loaderData.isDebug}
      isHealthy={loaderData.isHealthy}
      user={loaderData.user}
    >
      <Outlet />
    </AdminShell>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <div className="mx-auto my-24 w-fit overscroll-contain">
      <ErrorBanner className="max-w-2xl" error={error} />
    </div>
  );
}
