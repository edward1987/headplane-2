import { data } from "react-router";

import { Capabilities } from "~/server/web/roles";

import type { Route } from "./+types/overview";

// The logic for deciding policy factors is very complicated because
// there are so many factors that need to be accounted for:
// 1. Does the user have permission to read the policy?
// 2. Does the user have permission to write to the policy?
// 3. Is the Headscale policy in file or database mode?
//    If database, we can read/write easily via the API.
//    If in file mode, we can only write if context.config is available.
export async function aclLoader({ request, context }: Route.LoaderArgs) {
  const principal = await context.auth.require(request);
  const check = context.auth.can(principal, Capabilities.read_policy);
  if (!check) {
    throw data("You do not have permission to read the ACL policy.", {
      status: 403,
    });
  }

  const flags = {
    // Can the user write to the ACL policy
    access: context.auth.can(principal, Capabilities.write_policy),
    writable: false,
    policy: "",
    // Additional data for visual editor
    users: [] as { id: string; name: string; email: string }[],
    nodes: [] as {
      id: string;
      name: string;
      givenName: string;
      user?: string;
      tags: string[];
      ipAddresses: string[];
      availableRoutes: string[];
      approvedRoutes: string[];
      machineKey?: string;
    }[],
  };

  // Try to load the ACL policy from the API.
  const apiKey = context.auth.getHeadscaleApiKey(principal, context.oidc?.apiKey);
  const api = context.hsApi.getRuntimeClient(apiKey);

  // Fetch policy, users, and nodes in parallel
  const [policyResult, apiUsers, nodes] = await Promise.all([
    api.getPolicy().catch(() => ({ policy: "", updatedAt: null })),
    api.getUsers(),
    api.getNodes(),
  ]);

  flags.writable = policyResult.updatedAt !== null;
  flags.policy = policyResult.policy;

  // Map users for the visual editor
  flags.users = apiUsers.map((user) => ({
    id: user.id,
    name: user.name ?? "",
    email: user.email ?? "",
  }));

  // Map nodes with tags for the visual editor
  flags.nodes = nodes.map((node) => ({
    approvedRoutes: node.approvedRoutes ?? [],
    availableRoutes: node.availableRoutes ?? [],
    givenName: node.givenName ?? "",
    id: node.id,
    name: node.name ?? "",
    ipAddresses: node.ipAddresses ?? [],
    machineKey: node.machineKey ?? undefined,
    tags: node.tags ?? [],
    user: node.user?.name,
  }));

  return flags;
}
