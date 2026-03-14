import { eq } from "drizzle-orm";
import { Link } from "react-router";

import { AdminSection, FeatureNotice, StatCard } from "~/components/admin-shell";
import Button from "~/components/Button";
import { users as usersTable } from "~/server/db/schema";
import { Capabilities } from "~/server/web/roles";
import { getOidcSubject } from "~/server/web/headscale-identity";
import type { PreAuthKey } from "~/types";
import { getUserDisplayName } from "~/utils/user";

import type { Route } from "./+types/user";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const principal = await context.auth.require(request);
  if (!context.auth.can(principal, Capabilities.read_users)) {
    throw new Error("You do not have permission to view users.");
  }

  if (!params.id) {
    throw new Error("Missing user identifier.");
  }

  const api = context.hsApi.getRuntimeClient(
    context.auth.getHeadscaleApiKey(principal, context.oidc?.apiKey),
  );
  const [user, nodes] = await Promise.all([api.getUser(params.id), api.getNodes()]);

  if (!user) {
    throw new Error("User not found.");
  }

  const subject = getOidcSubject(user);
  const [linkedHeadplaneUser] = subject
    ? await context.db.select().from(usersTable).where(eq(usersTable.sub, subject)).limit(1)
    : [];

  let preAuthKeys: PreAuthKey[] = [];
  try {
    preAuthKeys = await api.getPreAuthKeys(user.id);
  } catch {
    preAuthKeys = [];
  }

  return {
    headplaneUser: linkedHeadplaneUser,
    nodes: nodes.filter((node) => node.user?.id === user.id),
    preAuthKeys,
    role: subject ? await context.auth.roleForSubject(subject) : undefined,
    subject,
    user,
    writable: context.auth.can(principal, Capabilities.write_users),
  };
}

export { userAction as action } from "./user-actions";

export default function Page({ loaderData }: Route.ComponentProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-mist-500 dark:text-mist-400">Users</p>
          <h1 className="mt-2 text-3xl font-semibold text-mist-950 dark:text-mist-25">
            {getUserDisplayName(loaderData.user)}
          </h1>
          <p className="mt-2 text-sm text-mist-600 dark:text-mist-300">
            Detailed view of the user’s Headscale identity, linked Headplane role, machines, and
            pre-authentication keys.
          </p>
        </div>
        <Link to="/users">
          <Button>Back to users</Button>
        </Link>
      </div>

      {!loaderData.subject ? (
        <FeatureNotice title="No OIDC subject found" tone="warning">
          This user is not currently mapped to an OIDC subject, so Headplane role and link controls
          are limited.
        </FeatureNotice>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Machines" value={loaderData.nodes.length} />
        <StatCard label="Pre-auth keys" value={loaderData.preAuthKeys.length} />
        <StatCard label="Headplane role" value={loaderData.role ?? "unassigned"} />
        <StatCard
          label="Link status"
          value={loaderData.headplaneUser?.headscale_user_id ? "Linked" : "Unlinked"}
          tone={loaderData.headplaneUser?.headscale_user_id ? "good" : "warn"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <AdminSection title="Identity" description="Source-of-truth details for this Headscale user.">
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="font-semibold text-mist-950 dark:text-mist-25">User ID</dt>
              <dd className="text-mist-600 dark:text-mist-300">{loaderData.user.id}</dd>
            </div>
            <div>
              <dt className="font-semibold text-mist-950 dark:text-mist-25">Email</dt>
              <dd className="text-mist-600 dark:text-mist-300">{loaderData.user.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-mist-950 dark:text-mist-25">Provider</dt>
              <dd className="text-mist-600 dark:text-mist-300">{loaderData.user.provider ?? "local"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-mist-950 dark:text-mist-25">OIDC subject</dt>
              <dd className="break-all text-mist-600 dark:text-mist-300">{loaderData.subject ?? "—"}</dd>
            </div>
          </dl>
        </AdminSection>

        <AdminSection title="Machines" description="Nodes currently owned by this user in Headscale.">
          <div className="grid gap-3">
            {loaderData.nodes.map((node) => (
              <Link
                key={node.id}
                className="rounded-2xl border border-mist-200 bg-mist-50/70 p-4 transition hover:bg-mist-100 dark:border-mist-800 dark:bg-mist-900/50 dark:hover:bg-mist-900"
                to={`/machines/${node.id}`}
              >
                <p className="font-semibold">{node.givenName}</p>
                <p className="mt-1 text-sm text-mist-600 dark:text-mist-300">
                  {node.ipAddresses.join(", ")} • {node.online ? "online" : "offline"}
                </p>
              </Link>
            ))}
            {loaderData.nodes.length === 0 ? (
              <FeatureNotice title="No machines assigned">
                This user does not currently own any machines.
              </FeatureNotice>
            ) : null}
          </div>
        </AdminSection>
      </div>
    </div>
  );
}
