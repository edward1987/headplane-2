import { isDataWithApiError } from "~/server/headscale/api/error-client";
import type { Machine } from "~/types";

import { defineApiEndpoints } from "../factory";

interface AuthEndpoints {
  authRegister(user: string, authId: string): Promise<Machine>;
  authApprove(authId: string): Promise<void>;
  authReject(authId: string): Promise<void>;
}

function toLegacyRegistrationKey(authId: string): string {
  const match = authId.match(/hskey-authreq-([A-Za-z0-9_-]{24})$/);
  return match?.[1] ?? authId;
}

function buildLegacyRegisterPath(user: string, key: string): `v1/${string}` {
  const params = new URLSearchParams({ key, user });
  return `v1/node/register?${params.toString()}`;
}

export default defineApiEndpoints<AuthEndpoints>((client, apiKey) => ({
  authRegister: async (user, authId) => {
    try {
      const { node } = await client.apiFetch<{ node: Machine }>(
        "POST",
        "v1/auth/register",
        apiKey,
        {
          authId,
          user,
        },
      );

      return node;
    } catch (error) {
      if (
        isDataWithApiError(error) &&
        error.data.requestUrl === "POST v1/auth/register" &&
        error.data.statusCode === 404
      ) {
        const { node } = await client.apiFetch<{ node: Machine }>(
          "POST",
          buildLegacyRegisterPath(user, toLegacyRegistrationKey(authId)),
          apiKey,
        );

        return node;
      }

      throw error;
    }
  },

  authApprove: async (authId) => {
    await client.apiFetch<void>("POST", "v1/auth/approve", apiKey, { authId });
  },

  authReject: async (authId) => {
    await client.apiFetch<void>("POST", "v1/auth/reject", apiKey, { authId });
  },
}));
