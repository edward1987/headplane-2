import type { Machine } from "~/types";

import { defineApiEndpoints } from "../factory";

interface AuthEndpoints {
  authRegister(user: string, authId: string): Promise<Machine>;
  authApprove(authId: string): Promise<void>;
  authReject(authId: string): Promise<void>;
}

export default defineApiEndpoints<AuthEndpoints>((client, apiKey) => ({
  authRegister: async (user, authId) => {
    const { node } = await client.apiFetch<{ node: Machine }>("POST", "v1/auth/register", apiKey, {
      authId,
      user,
    });

    return node;
  },

  authApprove: async (authId) => {
    await client.apiFetch<void>("POST", "v1/auth/approve", apiKey, { authId });
  },

  authReject: async (authId) => {
    await client.apiFetch<void>("POST", "v1/auth/reject", apiKey, { authId });
  },
}));
