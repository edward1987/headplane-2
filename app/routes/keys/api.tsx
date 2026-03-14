import { Form, useActionData } from "react-router";
import { data } from "react-router";

import { AdminSection, FeatureNotice, StatCard } from "~/components/admin-shell";
import Button from "~/components/Button";
import Input from "~/components/Input";
import { Capabilities } from "~/server/web/roles";

import type { Route } from "./+types/api";

export async function loader({ request, context }: Route.LoaderArgs) {
  const principal = await context.auth.require(request);
  if (!context.auth.can(principal, Capabilities.read_keys_api)) {
    throw data("You do not have permission to view API keys.", { status: 403 });
  }

  const api = context.hsApi.getRuntimeClient(
    context.auth.getHeadscaleApiKey(principal, context.oidc?.apiKey),
  );

  return {
    keys: await api.getApiKeys(),
    writable: context.auth.can(principal, Capabilities.write_keys_api),
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const principal = await context.auth.require(request);
  if (!context.auth.can(principal, Capabilities.write_keys_api)) {
    throw data("You do not have permission to manage API keys.", { status: 403 });
  }

  const api = context.hsApi.getRuntimeClient(
    context.auth.getHeadscaleApiKey(principal, context.oidc?.apiKey),
  );
  const formData = await request.formData();
  const actionId = String(formData.get("action_id") ?? "");

  if (actionId === "create_api_key") {
    const expiryDays = Number(formData.get("expiry_days") ?? "90");
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + expiryDays);
    const created = await api.createApiKey(expiration);
    return { createdKey: created.value, message: "API key created." };
  }

  if (actionId === "expire_api_key") {
    const prefix = String(formData.get("prefix") ?? "");
    if (!prefix) {
      throw data("Missing key prefix.", { status: 400 });
    }
    await api.expireApiKey(prefix);
    return { message: `Expired ${prefix}.` };
  }

  if (actionId === "delete_api_key") {
    const id = String(formData.get("id") ?? "");
    const prefix = String(formData.get("prefix") ?? "");
    if (!id && !prefix) {
      throw data("Missing key identifier.", { status: 400 });
    }

    await api.deleteApiKey(id ? { id } : { prefix });
    return { message: `Deleted ${prefix || id}.` };
  }

  throw data("Invalid action.", { status: 400 });
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs tracking-[0.24em] text-mist-500 uppercase dark:text-mist-400">Keys</p>
        <h1 className="dark:text-mist-25 mt-2 text-3xl font-semibold text-mist-950">API keys</h1>
        <p className="mt-2 max-w-3xl text-sm text-mist-600 dark:text-mist-300">
          Create operator keys for automation or break-glass administration, and expire credentials
          that should no longer access Headscale.
        </p>
      </div>

      {actionData?.message ? (
        <FeatureNotice title="API key update">{actionData.message}</FeatureNotice>
      ) : null}
      {actionData?.createdKey ? (
        <FeatureNotice title="Store this API key now" tone="warning">
          <code className="break-all">{actionData.createdKey}</code>
        </FeatureNotice>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <AdminSection
          title="Create API key"
          description="New keys are shown only once after creation."
        >
          <Form className="grid gap-4" method="post">
            <input name="action_id" type="hidden" value="create_api_key" />
            <Input
              defaultValue="90"
              isDisabled={!loaderData.writable}
              label="Expiration (days)"
              name="expiry_days"
              type="number"
            />
            <Button isDisabled={!loaderData.writable} type="submit" variant="heavy">
              Create key
            </Button>
          </Form>
        </AdminSection>

        <AdminSection
          title="Inventory"
          description="Current Headscale API keys visible to this admin session."
        >
          <div className="grid gap-3">
            <StatCard label="Known API keys" value={loaderData.keys.length} />
            <div className="grid gap-3">
              {loaderData.keys.map((key) => (
                <div
                  key={key.id}
                  className="flex flex-col gap-3 rounded-2xl border border-mist-200 bg-mist-50/70 p-4 md:flex-row md:items-center md:justify-between dark:border-mist-800 dark:bg-mist-900/50"
                >
                  <div>
                    <p className="dark:text-mist-25 font-semibold text-mist-950">{key.prefix}</p>
                    <p className="mt-1 text-sm text-mist-600 dark:text-mist-300">
                      Expires: {key.expiration ?? "never"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Form method="post">
                      <input name="action_id" type="hidden" value="expire_api_key" />
                      <input name="prefix" type="hidden" value={key.prefix} />
                      <Button isDisabled={!loaderData.writable} type="submit" variant="danger">
                        Expire
                      </Button>
                    </Form>
                    <Form method="post">
                      <input name="action_id" type="hidden" value="delete_api_key" />
                      <input name="id" type="hidden" value={key.id} />
                      <input name="prefix" type="hidden" value={key.prefix} />
                      <Button isDisabled={!loaderData.writable} type="submit">
                        Delete
                      </Button>
                    </Form>
                  </div>
                </div>
              ))}
              {loaderData.keys.length === 0 ? (
                <FeatureNotice title="No API keys found">
                  This Headscale instance does not currently report any API keys.
                </FeatureNotice>
              ) : null}
            </div>
          </div>
        </AdminSection>
      </div>
    </div>
  );
}
