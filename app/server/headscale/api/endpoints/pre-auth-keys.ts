import type { PreAuthKey } from "~/types";

import { defineApiEndpoints } from "../factory";

export interface PreAuthKeyEndpoints {
  /**
   * List all pre-auth keys. Requires Headscale 0.28+.
   */
  getAllPreAuthKeys(): Promise<PreAuthKey[]>;

  /**
   * Retrieves all pre-authentication keys for a specific user.
   *
   * @param user The user to retrieve pre-authentication keys for.
   * @returns An array of `PreAuthKey` objects representing the pre-authentication keys.
   */
  getPreAuthKeys(user: string): Promise<PreAuthKey[]>;

  /**
   * Creates a new pre-authentication key.
   * User can be null for tag-only keys (requires Headscale 0.28+).
   */
  createPreAuthKey(
    user: string | null,
    ephemeral: boolean,
    reusable: boolean,
    expiration: Date | null,
    aclTags: string[] | null,
  ): Promise<PreAuthKey>;

  /**
   * Expires a specific pre-authentication key.
   *
   * @param key The pre-authentication key string to expire.
   */
  expirePreAuthKey(key: string): Promise<void>;

  /**
   * Deletes a pre-authentication key.
   * Requires Headscale 0.28+.
   *
   * @param key The pre-authentication key string to delete.
   */
  deletePreAuthKey(key: string): Promise<void>;
}

export default defineApiEndpoints<PreAuthKeyEndpoints>((client, apiKey) => ({
  getAllPreAuthKeys: async () => {
    const { preAuthKeys } = await client.apiFetch<{
      preAuthKeys: PreAuthKey[];
    }>("GET", "v1/preauthkey", apiKey, {});

    return preAuthKeys;
  },

  getPreAuthKeys: async (user) => {
    if (client.isAtleast("0.28.0")) {
      const { preAuthKeys } = await client.apiFetch<{
        preAuthKeys: PreAuthKey[];
      }>("GET", "v1/preauthkey", apiKey, {});

      return preAuthKeys.filter((preAuthKey) => String(preAuthKey.user?.id) === String(user));
    }

    const { preAuthKeys } = await client.apiFetch<{
      preAuthKeys: PreAuthKey[];
    }>("GET", "v1/preauthkey", apiKey, { user });

    return preAuthKeys;
  },

  createPreAuthKey: async (user, ephemeral, reusable, expiration, aclTags) => {
    const body: Record<string, unknown> = {
      ephemeral,
      reusable,
    };

    if (expiration) {
      body.expiration = expiration.toISOString();
    }

    if (user) {
      body.user = Number(user);
    }

    if (aclTags && aclTags.length > 0) {
      body.aclTags = aclTags;
    }

    const { preAuthKey } = await client.apiFetch<{
      preAuthKey: PreAuthKey;
    }>("POST", "v1/preauthkey", apiKey, body);

    return preAuthKey;
  },

  expirePreAuthKey: async (key) => {
    await client.apiFetch<void>("POST", "v1/preauthkey/expire", apiKey, {
      key,
    });
  },

  deletePreAuthKey: async (key) => {
    await client.apiFetch<void>("DELETE", "v1/preauthkey", apiKey, {
      key,
    });
  },
}));
