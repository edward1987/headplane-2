import type { ApiFeatureFlags } from "~/types";

import type { Version } from "./api/version";

export function getApiFeatureFlags(version: Version): ApiFeatureFlags {
  const is028OrNewer = version === "0.28.0";

  return {
    canBackfillNodeIPs: is028OrNewer,
    canControlPendingAuth: is028OrNewer,
    canDeleteApiKeys: is028OrNewer,
    canDeletePreAuthKeys: is028OrNewer,
    canManageApiKeys: true,
    canManageDebugNodes: true,
    canManageTagOnlyPreAuthKeys: is028OrNewer,
    canReadAllPreAuthKeys: is028OrNewer,
    canReassignNodeOwner: !is028OrNewer,
  };
}
