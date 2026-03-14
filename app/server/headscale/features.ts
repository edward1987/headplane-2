import type { ApiFeatureFlags } from "~/types";

import type { Version } from "./api/version";

export function getApiFeatureFlags(version: Version): ApiFeatureFlags {
  const is028 = version === "0.28.0";

  return {
    canManageApiKeys: true,
    canManageDebugNodes: true,
    canManageTagOnlyPreAuthKeys: is028,
    canReadAllPreAuthKeys: is028,
    canReassignNodeOwner: !is028,
  };
}
