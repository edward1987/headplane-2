import { data } from "react-router";

import { getOidcSubject } from "~/server/web/headscale-identity";
import { Capabilities } from "~/server/web/roles";
import type { Role } from "~/server/web/roles";
import { parseAclPolicy, serializeAclPolicy } from "~/utils/acl-parser";

import type { Route } from "./+types/overview";

function rewriteAclReference(value: string, oldName: string, newName: string) {
  const trimmed = value.trim();
  if (trimmed === oldName) {
    return newName;
  }

  if (trimmed.startsWith(`${oldName}:`)) {
    return `${newName}${trimmed.slice(oldName.length)}`;
  }

  return value;
}

function rewriteAclPolicyUserReferences(policy: string, oldName: string, newName: string) {
  const parsed = parseAclPolicy(policy);

  parsed.groups = parsed.groups.map((group) => ({
    ...group,
    users: group.users.map((value) => rewriteAclReference(value, oldName, newName)),
  }));

  parsed.tagOwners = parsed.tagOwners.map((tagOwner) => ({
    ...tagOwner,
    owners: tagOwner.owners.map((value) => rewriteAclReference(value, oldName, newName)),
  }));

  parsed.acls = parsed.acls.map((rule) => ({
    ...rule,
    dst: rule.dst.map((value) => rewriteAclReference(value, oldName, newName)),
    src: rule.src.map((value) => rewriteAclReference(value, oldName, newName)),
  }));

  parsed.ssh = parsed.ssh.map((rule) => ({
    ...rule,
    dst: rule.dst.map((value) => rewriteAclReference(value, oldName, newName)),
    src: rule.src.map((value) => rewriteAclReference(value, oldName, newName)),
    users: rule.users?.map((value) => rewriteAclReference(value, oldName, newName)),
  }));

  parsed.tests = parsed.tests.map((test) => ({
    ...test,
    accept: test.accept.map((value) => rewriteAclReference(value, oldName, newName)),
    deny: test.deny.map((value) => rewriteAclReference(value, oldName, newName)),
    src: rewriteAclReference(test.src, oldName, newName),
  }));

  parsed.nodeAttrs = parsed.nodeAttrs.map((entry) => ({
    ...entry,
    target: entry.target.map((value) => rewriteAclReference(value, oldName, newName)),
  }));

  parsed.autoApprovers = Object.fromEntries(
    Object.entries(parsed.autoApprovers).map(([section, value]) => {
      if (!value || typeof value !== "object") {
        return [section, value];
      }

      return [
        section,
        Object.fromEntries(
          Object.entries(value).map(([key, items]) => {
            const nextKey = rewriteAclReference(key, oldName, newName);
            const nextItems = Array.isArray(items)
              ? items.map((item) => rewriteAclReference(item, oldName, newName))
              : items;
            return [nextKey, nextItems];
          }),
        ),
      ];
    }),
  );

  return serializeAclPolicy(parsed);
}

export async function userAction({ request, context }: Route.ActionArgs) {
  const principal = await context.auth.require(request);
  const check = await context.auth.can(principal, Capabilities.write_users);
  if (!check) {
    throw data("You do not have permission to update users", {
      status: 403,
    });
  }

  const formData = await request.formData();
  const action = formData.get("action_id")?.toString();
  if (!action) {
    throw data("Missing `action_id` in the form data.", {
      status: 404,
    });
  }

  const apiKey = context.auth.getHeadscaleApiKey(principal, context.oidc?.apiKey);
  const api = context.hsApi.getRuntimeClient(apiKey);
  switch (action) {
    case "create_user": {
      const name = formData.get("username")?.toString();
      const displayName = formData.get("display_name")?.toString();
      const email = formData.get("email")?.toString();

      if (!name) {
        throw data("Missing `username` in the form data.", {
          status: 400,
        });
      }

      await api.createUser(name, email, displayName);
      return { message: "User created successfully" };
    }
    case "delete_user": {
      const userId = formData.get("user_id")?.toString();
      if (!userId) {
        throw data("Missing `user_id` in the form data.", {
          status: 400,
        });
      }

      await api.deleteUser(userId);
      return { message: "User deleted successfully" };
    }
    case "rename_user": {
      const userId = formData.get("user_id")?.toString();
      const newName = formData.get("new_name")?.toString();
      if (!userId || !newName) {
        return data({ success: false }, 400);
      }

      const users = await api.getUsers(userId);
      const user = users.find((user) => user.id === userId);
      if (!user) {
        throw data(`No user found with id: ${userId}`, { status: 400 });
      }

      if (user.provider === "oidc") {
        // OIDC users cannot be renamed via this endpoint, return an error
        throw data("Users managed by OIDC cannot be renamed", {
          status: 403,
        });
      }

      if (context.auth.can(principal, Capabilities.write_policy)) {
        const policyResult = await api.getPolicy().catch(() => null);
        if (policyResult) {
          const nextPolicy = rewriteAclPolicyUserReferences(
            policyResult.policy,
            user.name,
            newName,
          );
          if (nextPolicy !== policyResult.policy) {
            await api.setPolicy(nextPolicy);
          }
        }
      }

      await api.renameUser(userId, newName);
      return { message: "User renamed successfully" };
    }
    case "reassign_user": {
      const userId = formData.get("user_id")?.toString();
      const newRole = formData.get("new_role")?.toString();
      if (!userId || !newRole) {
        throw data("Missing `user_id` or `new_role` in the form data.", {
          status: 400,
        });
      }

      const users = await api.getUsers(userId);
      const user = users.find((user) => user.id === userId);
      if (!user) {
        throw data("Specified user not found", {
          status: 400,
        });
      }

      const subject = getOidcSubject(user);
      if (!subject) {
        throw data("Specified user is not an OIDC user or has no subject.", { status: 400 });
      }

      const result = await context.auth.reassignSubject(subject, newRole as Role);

      if (!result) {
        throw data("Failed to reassign user role.", { status: 500 });
      }

      return { message: "User reassigned successfully" };
    }
    case "link_user": {
      const userId = formData.get("user_id")?.toString();
      const headscaleUserId = formData.get("headscale_user_id")?.toString();
      if (!userId || !headscaleUserId) {
        throw data("Missing `user_id` or `headscale_user_id` in the form data.", {
          status: 400,
        });
      }

      const users = await api.getUsers(userId);
      const user = users.find((user) => user.id === userId);
      if (!user) {
        throw data("Specified user not found", { status: 400 });
      }

      const subject = getOidcSubject(user);
      if (!subject) {
        throw data("Specified user is not an OIDC user or has no subject.", { status: 400 });
      }

      const linked = await context.auth.linkHeadscaleUserBySubject(subject, headscaleUserId);
      if (!linked) {
        throw data("That Headscale user is already linked to another account.", { status: 409 });
      }

      return { message: "Headscale user linked successfully" };
    }
    default:
      throw data("Invalid `action_id` provided.", {
        status: 400,
      });
  }
}
