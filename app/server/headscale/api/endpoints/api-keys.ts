import type { Key } from "~/types";

import { defineApiEndpoints } from "../factory";

export interface ApiKeyEndpoints {
  /**
   * Retrieves all API keys from the Headscale instance.
   *
   * @returns An array of `Key` objects representing the API keys.
   */
  getApiKeys(): Promise<Key[]>;

  createApiKey(expiration: Date | null): Promise<Key>;

  expireApiKey(prefix: string): Promise<void>;

  deleteApiKey(identifier: { id?: string; prefix?: string }): Promise<void>;
}

export default defineApiEndpoints<ApiKeyEndpoints>((client, apiKey) => ({
  getApiKeys: async () => {
    const { apiKeys } = await client.apiFetch<{ apiKeys: Key[] }>("GET", "v1/apikey", apiKey);

    return apiKeys;
  },

  createApiKey: async (expiration) => {
    const { apiKey: created } = await client.apiFetch<{ apiKey: string }>(
      "POST",
      "v1/apikey",
      apiKey,
      {
        expiration: expiration ? expiration.toISOString() : null,
      },
    );

    return {
      id: created.split(".")[0] ?? created,
      prefix: created.split(".")[0] ?? created,
      expiration: expiration ? expiration.toISOString() : null,
      createdAt: new Date().toISOString(),
      lastSeen: null,
      expired: false,
      value: created,
    };
  },

  expireApiKey: async (prefix) => {
    await client.apiFetch<void>("POST", "v1/apikey/expire", apiKey, { prefix });
  },

  deleteApiKey: async ({ id, prefix }) => {
    if (!id && !prefix) {
      throw new Error("deleteApiKey requires either an id or a prefix");
    }

    if (id && prefix) {
      throw new Error("deleteApiKey accepts either id or prefix, not both");
    }

    if (id) {
      await client.apiFetch<void>("DELETE", "v1/apikey", apiKey, { id });
      return;
    }

    await client.apiFetch<void>("DELETE", `v1/apikey/${prefix}`, apiKey);
  },
}));
