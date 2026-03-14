import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";
import { useEffect, useMemo, useState } from "react";

import { AdminSection, FeatureNotice, StatCard } from "~/components/admin-shell";
import Input from "~/components/Input";
import { users as usersTable } from "~/server/db/schema";
import { getOidcSubject } from "~/server/web/headscale-identity";
import { Capabilities } from "~/server/web/roles";
import type { Machine, User } from "~/types";
import cn from "~/utils/cn";
import { getUserDisplayName } from "~/utils/user";

import type { Route } from "./+types/overview";
import ManageBanner from "./components/manage-banner";
import UserRow from "./components/user-row";
import { userAction } from "./user-actions";

interface UserMachine extends User {
  machines: Machine[];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const principal = await context.auth.require(request);
  const check = await context.auth.can(principal, Capabilities.read_users);
  if (!check) {
    throw new Error(
      "You do not have permission to view this page. Please contact your administrator.",
    );
  }

  const writablePermission = await context.auth.can(principal, Capabilities.write_users);

  const apiKey = context.auth.getHeadscaleApiKey(principal, context.oidc?.apiKey);
  const api = context.hsApi.getRuntimeClient(apiKey);
  const [nodes, apiUsers] = await Promise.all([api.getNodes(), api.getUsers()]);

  const users = apiUsers.map((user) => ({
    ...user,
    machines: nodes.filter((node) => node.user?.id === user.id),
    profilePicUrl:
      context.config.oidc?.profile_picture_source === "gravatar"
        ? (() => {
            if (!user.email) {
              return undefined;
            }

            const emailHash = user.email.trim().toLowerCase();
            const hash = createHash("sha256").update(emailHash).digest("hex");
            return `https://www.gravatar.com/avatar/${hash}?s=200&d=identicon&r=x`;
          })()
        : user.profilePicUrl,
  }));

  const sortedUsers = [...users].sort((a, b) => a.name.localeCompare(b.name));
  const roles = await Promise.all(
    sortedUsers.map(async (user) => {
      if (user.provider !== "oidc") {
        return "no-oidc";
      }

      const subject = getOidcSubject(user);
      if (!subject) {
        return "invalid-oidc";
      }

      const role = await context.auth.roleForSubject(subject);
      return role ?? "no-role";
    }),
  );

  const claimed = await context.auth.claimedHeadscaleUserIds();
  const headscaleUsers = apiUsers.map((u) => ({
    id: u.id,
    name: getUserDisplayName(u),
    claimed: claimed.has(u.id),
  }));

  const userLinks: Record<string, string | undefined> = {};
  for (const u of apiUsers) {
    const subject = getOidcSubject(u);
    if (subject) {
      const [hp] = await context.db
        .select({ hsId: usersTable.headscale_user_id })
        .from(usersTable)
        .where(eq(usersTable.sub, subject))
        .limit(1);
      userLinks[u.id] = hp?.hsId ?? undefined;
    }
  }

  return {
    headscaleUsers,
    oidc: context.config.oidc
      ? {
          issuer: context.config.oidc.issuer,
        }
      : undefined,
    roles,
    sortedUsers,
    userLinks,
    writable: writablePermission,
  };
}

export const action = userAction;

export default function Page({ loaderData }: Route.ComponentProps) {
  const [users, setUsers] = useState<UserMachine[]>(loaderData.sortedUsers);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setUsers(loaderData.sortedUsers);
  }, [loaderData.sortedUsers]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return users;
    }

    return users.filter((user) => {
      const haystack = [user.name, user.displayName, user.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [query, users]);

  const oidcUsers = users.filter((user) => user.provider === "oidc").length;
  const managedUsers = users.filter((user) => user.machines.length > 0).length;
  const linkedUsers = users.filter((user) => loaderData.userLinks[user.id]).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs tracking-[0.24em] text-mist-500 uppercase dark:text-mist-400">
          Users
        </p>
        <h1 className="dark:text-mist-25 mt-2 text-3xl font-semibold text-mist-950">
          Identity and ownership
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-mist-600 dark:text-mist-300">
          Manage Headscale users, linked Headplane identities, and ownership of machines across the
          tailnet.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Users" value={users.length} />
        <StatCard label="OIDC managed" value={oidcUsers} />
        <StatCard label="With machines" value={managedUsers} />
        <StatCard label="Linked in Headplane" value={linkedUsers} />
      </div>

      {!loaderData.writable ? (
        <FeatureNotice title="User mutations are restricted" tone="warning">
          You can review users and links, but creating, renaming, or reassigning users is disabled
          for this session.
        </FeatureNotice>
      ) : null}

      <ManageBanner isDisabled={!loaderData.writable} oidc={loaderData.oidc} />

      <AdminSection
        title="User directory"
        description="Search and manage users, roles, linked accounts, and their machine ownership."
      >
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full max-w-md">
            <Input
              label="Search users"
              labelHidden
              onChange={(value) => setQuery(value)}
              placeholder="Search by user, display name, or email..."
              value={query}
            />
          </div>
          <span className="text-sm whitespace-nowrap text-mist-500">
            {query
              ? `Showing ${filteredUsers.length} of ${users.length} users`
              : `${users.length} users`}
          </span>
        </div>

        {filteredUsers.length === 0 ? (
          <FeatureNotice title="No matching users">
            No users matched the current filter.
          </FeatureNotice>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-mist-200 bg-white/40 dark:border-mist-800 dark:bg-mist-950/30">
            <table className="w-full min-w-[760px] table-auto rounded-lg">
              <thead className="text-mist-600 dark:text-mist-300">
                <tr className="px-0.5 text-left">
                  <th className="px-4 py-3 text-xs font-bold uppercase">User</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase">Role</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase">Created At</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase">Last Seen</th>
                  <th className="w-12 px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody
                className={cn(
                  "divide-y divide-mist-100 dark:divide-mist-800 align-top",
                  "border-t border-mist-100 dark:border-mist-800",
                )}
              >
                {filteredUsers.map((user) => (
                  <UserRow
                    key={user.id}
                    currentLink={loaderData.userLinks[user.id]}
                    headscaleUsers={loaderData.headscaleUsers}
                    role={
                      loaderData.roles[loaderData.sortedUsers.findIndex((u) => u.id === user.id)]
                    }
                    user={user}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>
    </div>
  );
}
