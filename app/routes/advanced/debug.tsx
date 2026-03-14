import { Form, Link, useActionData } from "react-router";
import { data } from "react-router";

import { AdminSection, FeatureNotice } from "~/components/admin-shell";
import Button from "~/components/Button";
import Input from "~/components/Input";
import { Capabilities } from "~/server/web/roles";

import type { Route } from "./+types/debug";

export async function loader({ request, context }: Route.LoaderArgs) {
  const principal = await context.auth.require(request);
  if (!context.auth.can(principal, Capabilities.read_debug)) {
    throw data("You do not have permission to view debug tools.", { status: 403 });
  }

  const api = context.hsApi.getRuntimeClient(
    context.auth.getHeadscaleApiKey(principal, context.oidc?.apiKey),
  );

  return {
    featureFlags: context.hsApi.featureFlags,
    users: await api.getUsers(),
    writable: context.auth.can(principal, Capabilities.write_debug),
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const principal = await context.auth.require(request);
  if (!context.auth.can(principal, Capabilities.write_debug)) {
    throw data("You do not have permission to use debug controls.", { status: 403 });
  }
  if (!context.hsApi.featureFlags.canManageDebugNodes) {
    throw data("This Headscale version does not support debug machine creation.", { status: 400 });
  }

  const formData = await request.formData();
  const api = context.hsApi.getRuntimeClient(
    context.auth.getHeadscaleApiKey(principal, context.oidc?.apiKey),
  );
  const node = await api.debugCreateNode({
    key: String(formData.get("key") ?? ""),
    name: String(formData.get("name") ?? ""),
    routes: String(formData.get("routes") ?? "")
      .split(",")
      .map((route) => route.trim())
      .filter(Boolean),
    user: String(formData.get("user") ?? "") || undefined,
  });

  return { createdNodeId: node.id, message: `Created debug machine ${node.givenName}.` };
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-mist-500 dark:text-mist-400">Advanced</p>
        <h1 className="mt-2 text-3xl font-semibold text-mist-950 dark:text-mist-25">Debug tools</h1>
        <p className="mt-2 max-w-3xl text-sm text-mist-600 dark:text-mist-300">
          High-power diagnostics and test tooling. These controls are intentionally separated from
          normal day-to-day administration because they can create synthetic state.
        </p>
      </div>

      <FeatureNotice title="Advanced area" tone="danger">
        Use this only when testing registration or troubleshooting API behavior. Debug-created
        machines can confuse operational views if they are left around.
      </FeatureNotice>

      {actionData?.message ? (
        <FeatureNotice title="Debug action result">
          {actionData.message}{" "}
          {actionData.createdNodeId ? <Link to={`/machines/${actionData.createdNodeId}`}>Open machine</Link> : null}
        </FeatureNotice>
      ) : null}

      <AdminSection title="Debug machine creation" description="Create a synthetic machine record through the Headscale debug API.">
        {!loaderData.featureFlags.canManageDebugNodes ? (
          <FeatureNotice title="Unavailable on this Headscale version" tone="warning">
            The connected API version does not expose debug machine creation.
          </FeatureNotice>
        ) : (
          <Form className="grid gap-4 lg:grid-cols-2" method="post">
            <Input isDisabled={!loaderData.writable} isRequired label="Machine name" name="name" />
            <Input isDisabled={!loaderData.writable} isRequired label="Machine key" name="key" />
            <div className="lg:col-span-2">
              <Input
                isDisabled={!loaderData.writable}
                label="Routes"
                name="routes"
                placeholder="10.0.0.0/24, 192.168.1.0/24"
              />
            </div>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-mist-700 dark:text-mist-200">User</span>
              <select
                className="w-full rounded-xl border border-mist-200 bg-white px-3 py-2 dark:border-mist-700 dark:bg-mist-900"
                disabled={!loaderData.writable}
                name="user"
              >
                <option value="">Choose a user</option>
                {loaderData.users.map((user) => (
                  <option key={user.id} value={user.name}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="lg:col-span-2">
              <Button isDisabled={!loaderData.writable} type="submit" variant="danger">
                Create debug machine
              </Button>
            </div>
          </Form>
        )}
      </AdminSection>
    </div>
  );
}
