import { describe, expect, test } from "vitest";

import { getApiFeatureFlags } from "~/server/headscale/features";

describe("getApiFeatureFlags", () => {
  test("keeps owner reassignment on older APIs", () => {
    const flags = getApiFeatureFlags("0.27.1");
    expect(flags.canReassignNodeOwner).toBe(true);
    expect(flags.canManageTagOnlyPreAuthKeys).toBe(false);
    expect(flags.canDeleteApiKeys).toBe(false);
    expect(flags.canDeletePreAuthKeys).toBe(false);
    expect(flags.canBackfillNodeIPs).toBe(false);
    expect(flags.canControlPendingAuth).toBe(false);
  });

  test("enables 0.28-only capabilities", () => {
    const flags = getApiFeatureFlags("0.28.0");
    expect(flags.canBackfillNodeIPs).toBe(true);
    expect(flags.canControlPendingAuth).toBe(true);
    expect(flags.canDeleteApiKeys).toBe(true);
    expect(flags.canDeletePreAuthKeys).toBe(true);
    expect(flags.canManageTagOnlyPreAuthKeys).toBe(true);
    expect(flags.canReadAllPreAuthKeys).toBe(true);
    expect(flags.canReassignNodeOwner).toBe(false);
  });
});
