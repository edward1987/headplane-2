import { data, redirect } from "react-router";

import { isDataWithApiError } from "~/server/headscale/api/error-client";
import { Capabilities } from "~/server/web/roles";
import { normalizeTagName, parseAclPolicy, serializeAclPolicy } from "~/utils/acl-parser";

import type { Route } from "./+types/machine";

function extractAuthId(input: string): string | null {
  const trimmed = input.trim();
  const fullAuthId = trimmed.match(/(hskey-authreq-[A-Za-z0-9_-]{24})$/)?.[1];
  if (fullAuthId) {
    return fullAuthId;
  }

  const shortAuthId = trimmed.match(/([A-Za-z0-9_-]{24})$/)?.[1];
  if (shortAuthId) {
    return `hskey-authreq-${shortAuthId}`;
  }

  return null;
}

export async function machineAction({ request, context }: Route.ActionArgs) {
  const principal = await context.auth.require(request);

  const formData = await request.formData();
  const api = context.hsApi.getRuntimeClient(
    context.auth.getHeadscaleApiKey(principal, context.oidc?.apiKey),
  );

  const action = formData.get("action_id")?.toString();
  if (!action) {
    throw data("Missing `action_id` in the form data.", {
      status: 400,
    });
  }

  // Fast track register since it doesn't require an existing machine
  if (action === "register") {
    if (!context.auth.can(principal, Capabilities.write_machines)) {
      throw data("You do not have permission to manage machines", {
        status: 403,
      });
    }

    const registrationKey = formData.get("register_key")?.toString();
    if (!registrationKey) {
      throw data("Missing `register_key` in the form data.", {
        status: 400,
      });
    }

    const authId = extractAuthId(registrationKey);
    if (!authId) {
      throw data("Invalid auth request ID.", {
        status: 400,
      });
    }

    const user = formData.get("user")?.toString();
    if (!user) {
      throw data("Missing `user` in the form data.", {
        status: 400,
      });
    }

    const node = await api.authRegister(user, authId);
    return redirect(`/machines/${node.id}`);
  }

  // Check if the user has permission to manage this machine
  const nodeId = formData.get("node_id")?.toString();
  if (!nodeId) {
    throw data("Missing `node_id` in the form data.", {
      status: 400,
    });
  }

  const node = await api.getNode(nodeId);
  if (!node) {
    throw data(`Machine with ID ${nodeId} not found`, {
      status: 404,
    });
  }

  if (!context.auth.canManageNode(principal, node)) {
    throw data("You do not have permission to act on this machine", {
      status: 403,
    });
  }

  switch (action) {
    case "rename": {
      const newName = formData.get("name")?.toString();
      if (!newName) {
        throw data("Missing `name` in the form data.", {
          status: 400,
        });
      }

      const name = String(formData.get("name"));
      await api.renameNode(nodeId, name);
      return { message: "Machine renamed" };
    }

    case "delete": {
      await api.deleteNode(nodeId);
      return redirect("/machines");
    }

    case "expire": {
      await api.expireNode(nodeId);
      return { message: "Machine expired" };
    }

    case "update_tags": {
      const tags = formData.get("tags")?.toString().split(",") ?? [];
      if (tags.length === 0) {
        throw data("Missing `tags` in the form data.", {
          status: 400,
        });
      }

      const normalizedTags = tags
        .map((tag) => normalizeTagName(tag.trim()))
        .filter((tag) => tag !== "");

      if (context.auth.can(principal, Capabilities.write_policy) && node.user?.name) {
        const policyResult = await api.getPolicy().catch(() => null);
        if (policyResult) {
          try {
            const parsed = parseAclPolicy(policyResult.policy);
            const knownTags = new Set(
              parsed.tagOwners.map((tagOwner) => normalizeTagName(tagOwner.tag)).filter(Boolean),
            );
            const missingTags = normalizedTags.filter((tag) => !knownTags.has(tag));

            if (missingTags.length > 0) {
              parsed.tagOwners = [
                ...parsed.tagOwners,
                ...missingTags.map((tag) => ({
                  owners: [node.user!.name],
                  tag,
                })),
              ];

              await api.setPolicy(serializeAclPolicy(parsed));
            }
          } catch (error) {
            if (isDataWithApiError(error)) {
              const message =
                typeof error.data.data?.message === "string"
                  ? error.data.data.message
                  : "Headscale rejected the ACL policy update.";
              return data(
                {
                  success: false as const,
                  error: `Could not update the ACL policy before tagging this machine: ${message}`,
                },
                { status: 400 },
              );
            }

            throw error;
          }
        }
      }

      try {
        await api.setNodeTags(nodeId, normalizedTags);

        return { success: true as const, message: "Tags updated" };
      } catch (error) {
        if (isDataWithApiError(error) && error.data.statusCode === 400) {
          return data(
            {
              success: false as const,
              error: context.auth.can(principal, Capabilities.write_policy)
                ? "One or more tags could not be added to the ACL policy for this machine owner. Check that the ACL policy is writable and that the machine has an owner."
                : "One or more tags are not defined in your ACL policy, and you do not have permission to update the policy automatically.",
            },
            { status: 400 },
          );
        }

        throw error;
      }
    }

    case "update_routes": {
      const newApproved = node.approvedRoutes;
      const routes = formData.get("routes")?.toString();
      if (!routes) {
        throw data("Missing `routes` in the form data.", {
          status: 400,
        });
      }

      const allRoutes = routes.split(",").map((route) => route.trim());
      if (allRoutes.length === 0) {
        throw data("No routes provided to update", {
          status: 400,
        });
      }

      const enabled = formData.get("enabled")?.toString();
      if (enabled === undefined) {
        throw data("Missing `enabled` in the form data.", {
          status: 400,
        });
      }

      if (enabled === "true") {
        for (const route of allRoutes) {
          // If already approved, skip, otherwise add to approved
          if (newApproved.includes(route)) {
            continue;
          }

          newApproved.push(route);
        }
      } else {
        for (const route of allRoutes) {
          // If not approved, skip, otherwise remove from approved
          if (!newApproved.includes(route)) {
            continue;
          }

          const index = newApproved.indexOf(route);
          if (index > -1) {
            newApproved.splice(index, 1);
          }
        }
      }

      await api.approveNodeRoutes(nodeId, newApproved);
      return { message: "Routes updated" };
    }

    case "reassign": {
      const user = formData.get("user_id")?.toString();
      if (!user) {
        throw data("Missing `user_id` in the form data.", {
          status: 400,
        });
      }

      await api.setNodeUser(nodeId, user);
      return { message: "Machine reassigned" };
    }

    default:
      throw data("Invalid action", {
        status: 400,
      });
  }
}
