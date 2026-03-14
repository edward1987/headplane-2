import { describe, expect, test, vi } from "vitest";

import { Capabilities } from "~/server/web/roles";

function makeRequest(form?: Record<string, string>) {
  return {
    formData: () => {
      const data = new FormData();
      for (const [key, value] of Object.entries(form ?? {})) {
        data.set(key, value);
      }
      return Promise.resolve(data);
    },
  } as unknown as Request;
}

function createPrincipal() {
  return {
    kind: "oidc" as const,
    sessionId: "session",
    user: {
      id: "hp-user-1",
      subject: "subject-1",
      role: "owner" as const,
      headscaleUserId: "hs-user-1",
    },
    profile: {
      name: "Admin User",
      email: "admin@example.com",
    },
  };
}

async function expectRejectStatus(promise: Promise<unknown>, status: number) {
  try {
    await promise;
    throw new Error("Expected promise to reject");
  } catch (error) {
    expect(error).toMatchObject({ init: { status } });
  }
}

describe("Admin route behavior", () => {
  test("home loader redirects UI users to /overview", async () => {
    const { loader } = await import("~/routes/home");
    const principal = createPrincipal();

    const result = (await loader({
      request: makeRequest(),
      context: {
        auth: {
          require: vi.fn().mockResolvedValue(principal),
          can: vi.fn((_, cap) => cap === Capabilities.ui_access),
          getHeadscaleApiKey: vi.fn().mockReturnValue("api-key"),
        },
        oidc: { apiKey: "api-key" },
        hs: { c: {} },
      },
      params: {},
    } as any)) as Response;

    expect(result.status).toBe(302);
    expect(result.headers.get("Location")).toBe("/overview");
  });

  test("keys api action blocks users without write_keys_api", async () => {
    const { action } = await import("~/routes/keys/api");
    const principal = createPrincipal();

    await expectRejectStatus(
      action({
        request: makeRequest({ action_id: "create_api_key", expiry_days: "30" }),
        context: {
          auth: {
            require: vi.fn().mockResolvedValue(principal),
            can: vi.fn((_, cap) => cap !== Capabilities.write_keys_api),
            getHeadscaleApiKey: vi.fn().mockReturnValue("api-key"),
          },
          oidc: { apiKey: "api-key" },
          hsApi: { getRuntimeClient: vi.fn() },
        },
        params: {},
      } as any),
      403,
    );
  });

  test("keys api action creates api keys when permitted", async () => {
    const { action } = await import("~/routes/keys/api");
    const principal = createPrincipal();
    const createApiKey = vi.fn().mockResolvedValue({
      id: "prefix",
      prefix: "prefix",
      expiration: null,
      createdAt: new Date().toISOString(),
      lastSeen: null,
      value: "prefix.secret",
    });

    const result = await action({
      request: makeRequest({ action_id: "create_api_key", expiry_days: "30" }),
      context: {
        auth: {
          require: vi.fn().mockResolvedValue(principal),
          can: vi.fn(() => true),
          getHeadscaleApiKey: vi.fn().mockReturnValue("api-key"),
        },
        oidc: { apiKey: "api-key" },
        hsApi: { getRuntimeClient: vi.fn().mockReturnValue({ createApiKey }) },
      },
      params: {},
    } as any);

    expect(createApiKey).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      createdKey: "prefix.secret",
      message: "API key created.",
    });
  });

  test("keys api action deletes api keys when permitted", async () => {
    const { action } = await import("~/routes/keys/api");
    const principal = createPrincipal();
    const deleteApiKey = vi.fn().mockResolvedValue(undefined);

    const result = await action({
      request: makeRequest({ action_id: "delete_api_key", id: "42", prefix: "prefix" }),
      context: {
        auth: {
          require: vi.fn().mockResolvedValue(principal),
          can: vi.fn(() => true),
          getHeadscaleApiKey: vi.fn().mockReturnValue("api-key"),
        },
        oidc: { apiKey: "api-key" },
        hsApi: { getRuntimeClient: vi.fn().mockReturnValue({ deleteApiKey }) },
      },
      params: {},
    } as any);

    expect(deleteApiKey).toHaveBeenCalledWith({ id: "42" });
    expect(result).toMatchObject({
      message: "Deleted prefix.",
    });
  });

  test("advanced system action blocks users without control_system", async () => {
    const { action } = await import("~/routes/advanced/system");
    const principal = createPrincipal();

    await expectRejectStatus(
      action({
        request: makeRequest({ action_id: "reload_headscale" }),
        context: {
          auth: {
            require: vi.fn().mockResolvedValue(principal),
            can: vi.fn((_, cap) => cap !== Capabilities.control_system),
            getHeadscaleApiKey: vi.fn().mockReturnValue("api-key"),
          },
        },
        params: {},
      } as any),
      403,
    );
  });

  test("advanced system action triggers config reload when permitted", async () => {
    const { action } = await import("~/routes/advanced/system");
    const principal = createPrincipal();
    const onConfigChange = vi.fn().mockResolvedValue(undefined);
    const runtimeClient = { isHealthy: vi.fn() };

    const result = await action({
      request: makeRequest({ action_id: "reload_headscale" }),
      context: {
        auth: {
          require: vi.fn().mockResolvedValue(principal),
          can: vi.fn(() => true),
          getHeadscaleApiKey: vi.fn().mockReturnValue("api-key"),
        },
        integration: { onConfigChange },
        oidc: { apiKey: "api-key" },
        hsApi: { getRuntimeClient: vi.fn().mockReturnValue(runtimeClient) },
      },
      params: {},
    } as any);

    expect(onConfigChange).toHaveBeenCalledWith(runtimeClient);
    expect(result).toMatchObject({
      message: "Requested Headscale config reload through the active integration.",
    });
  });

  test("advanced system action backfills node ips when permitted", async () => {
    const { action } = await import("~/routes/advanced/system");
    const principal = createPrincipal();
    const runtimeClient = { backfillNodeIPs: vi.fn().mockResolvedValue(["node-1"]) };

    const result = await action({
      request: makeRequest({ action_id: "backfill_node_ips" }),
      context: {
        auth: {
          require: vi.fn().mockResolvedValue(principal),
          can: vi.fn(() => true),
          getHeadscaleApiKey: vi.fn().mockReturnValue("api-key"),
        },
        integration: null,
        oidc: { apiKey: "api-key" },
        hsApi: { getRuntimeClient: vi.fn().mockReturnValue(runtimeClient) },
      },
      params: {},
    } as any);

    expect(runtimeClient.backfillNodeIPs).toHaveBeenCalledWith(true);
    expect(result).toMatchObject({
      changes: ["node-1"],
      message: "Backfilled node IPs for 1 node.",
    });
  });

  test("advanced system loader reports enabled integrations and writable access", async () => {
    const { loader } = await import("~/routes/advanced/system");
    const principal = createPrincipal();

    const result = await loader({
      request: makeRequest(),
      context: {
        auth: {
          require: vi.fn().mockResolvedValue(principal),
          can: vi.fn(
            (_, cap) => cap === Capabilities.read_system || cap === Capabilities.control_system,
          ),
        },
        config: {
          integration: {
            docker: { enabled: true },
            kubernetes: { enabled: false },
            proc: { enabled: true },
            agent: { enabled: true },
          },
          server: { info_secret: "secret" },
        },
        hs: {
          readable: () => true,
          writable: () => false,
        },
        hsApi: {
          featureFlags: {
            canBackfillNodeIPs: true,
            canControlPendingAuth: true,
            canDeleteApiKeys: true,
            canDeletePreAuthKeys: true,
            canManageApiKeys: true,
            canManageDebugNodes: true,
            canManageTagOnlyPreAuthKeys: true,
            canReadAllPreAuthKeys: true,
            canReassignNodeOwner: false,
          },
        },
        integration: { name: "Docker" },
      },
      params: {},
    } as any);

    expect(result).toMatchObject({
      enabledIntegrations: ["docker", "proc", "agent"],
      featureFlags: {
        canBackfillNodeIPs: true,
      },
      hasInfoSecret: true,
      integrationName: "Docker",
      readable: true,
      writable: false,
      writableAccess: true,
    });
  });

  test("pre-auth key action expires keys by id", async () => {
    const { authKeysAction } = await import("~/routes/settings/auth-keys/actions");
    const principal = createPrincipal();
    const expirePreAuthKey = vi.fn().mockResolvedValue(undefined);
    const getUsers = vi.fn().mockResolvedValue([
      {
        id: "hs-user-1",
        name: "admin@",
        provider: "oidc",
        providerId: "https://idp.example.com/subject-1",
      },
    ]);

    const result = await authKeysAction({
      request: makeRequest({ action_id: "expire_preauthkey", id: "17", user_id: "hs-user-1" }),
      context: {
        auth: {
          require: vi.fn().mockResolvedValue(principal),
          can: vi.fn((_, cap) => cap === Capabilities.generate_own_authkeys),
          getHeadscaleApiKey: vi.fn().mockReturnValue("api-key"),
        },
        oidc: { apiKey: "api-key" },
        hsApi: { getRuntimeClient: vi.fn().mockReturnValue({ expirePreAuthKey, getUsers }) },
      },
      params: {},
    } as any);

    expect(expirePreAuthKey).toHaveBeenCalledWith("17");
    expect(result).toMatchObject({ type: "DataWithResponseInit" });
  });

  test("pre-auth key action deletes keys by id", async () => {
    const { authKeysAction } = await import("~/routes/settings/auth-keys/actions");
    const principal = createPrincipal();
    const deletePreAuthKey = vi.fn().mockResolvedValue(undefined);

    const result = await authKeysAction({
      request: makeRequest({ action_id: "delete_preauthkey", id: "21" }),
      context: {
        auth: {
          require: vi.fn().mockResolvedValue(principal),
          can: vi.fn((_, cap) => cap === Capabilities.generate_authkeys),
          getHeadscaleApiKey: vi.fn().mockReturnValue("api-key"),
        },
        oidc: { apiKey: "api-key" },
        hsApi: { getRuntimeClient: vi.fn().mockReturnValue({ deletePreAuthKey }) },
      },
      params: {},
    } as any);

    expect(deletePreAuthKey).toHaveBeenCalledWith("21");
    expect(result).toMatchObject({ type: "DataWithResponseInit" });
  });

  test("machine tag updates auto-add missing acl tags for the machine owner", async () => {
    const { machineAction } = await import("~/routes/machines/machine-actions");
    const principal = createPrincipal();
    const getNode = vi.fn().mockResolvedValue({
      id: "node-1",
      user: { id: "hs-user-1", name: "admin@" },
      approvedRoutes: [],
    });
    const getPolicy = vi.fn().mockResolvedValue({
      policy: JSON.stringify({
        tagOwners: {
          "tag:existing": ["admin@"],
        },
      }),
      updatedAt: new Date(),
    });
    const setPolicy = vi.fn().mockResolvedValue(undefined);
    const setNodeTags = vi.fn().mockResolvedValue(undefined);

    const result = await machineAction({
      request: makeRequest({
        action_id: "update_tags",
        node_id: "node-1",
        tags: "tag:existing,tag:new",
      }),
      context: {
        auth: {
          require: vi.fn().mockResolvedValue(principal),
          can: vi.fn((_, cap) => cap === Capabilities.write_policy),
          canManageNode: vi.fn().mockReturnValue(true),
          getHeadscaleApiKey: vi.fn().mockReturnValue("api-key"),
        },
        oidc: { apiKey: "api-key" },
        hsApi: {
          getRuntimeClient: vi.fn().mockReturnValue({
            getNode,
            getPolicy,
            setNodeTags,
            setPolicy,
          }),
        },
      },
      params: {},
    } as any);

    expect(setPolicy).toHaveBeenCalledOnce();
    expect(String(setPolicy.mock.calls[0][0])).toContain('"tag:new"');
    expect(String(setPolicy.mock.calls[0][0])).toContain('"admin@"');
    expect(setNodeTags).toHaveBeenCalledWith("node-1", ["tag:existing", "tag:new"]);
    expect(result).toMatchObject({ success: true, message: "Tags updated" });
  });

  test("user rename updates acl references before renaming the user", async () => {
    const { userAction } = await import("~/routes/users/user-actions");
    const principal = createPrincipal();
    const renameUser = vi.fn().mockResolvedValue(undefined);
    const setPolicy = vi.fn().mockResolvedValue(undefined);
    const getUsers = vi.fn().mockResolvedValue([
      {
        id: "user-1",
        name: "edward",
        provider: "local",
      },
    ]);
    const getPolicy = vi.fn().mockResolvedValue({
      policy: JSON.stringify({
        groups: {
          "group:admins": ["edward"],
        },
        acls: [
          {
            action: "accept",
            src: ["edward"],
            dst: ["tag:prod:*", "edward:22"],
          },
        ],
        tests: [
          {
            src: "edward",
            accept: ["edward:443"],
          },
        ],
      }),
      updatedAt: new Date(),
    });

    const result = await userAction({
      request: makeRequest({
        action_id: "rename_user",
        user_id: "user-1",
        new_name: "edward-renamed",
      }),
      context: {
        auth: {
          require: vi.fn().mockResolvedValue(principal),
          can: vi.fn(
            (_, cap) => cap === Capabilities.write_users || cap === Capabilities.write_policy,
          ),
          getHeadscaleApiKey: vi.fn().mockReturnValue("api-key"),
        },
        oidc: { apiKey: "api-key" },
        hsApi: {
          getRuntimeClient: vi.fn().mockReturnValue({
            getPolicy,
            getUsers,
            renameUser,
            setPolicy,
          }),
        },
      },
      params: {},
    } as any);

    expect(setPolicy).toHaveBeenCalledOnce();
    expect(String(setPolicy.mock.calls[0][0])).toContain('"edward-renamed"');
    expect(String(setPolicy.mock.calls[0][0])).not.toContain('"edward"');
    expect(renameUser).toHaveBeenCalledWith("user-1", "edward-renamed");
    expect(result).toMatchObject({ message: "User renamed successfully" });
  });
});
