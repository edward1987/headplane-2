import { defineApiEndpoints } from "../factory";

interface SystemEndpoints {
  backfillNodeIPs(confirmed: boolean): Promise<string[]>;
}

export default defineApiEndpoints<SystemEndpoints>((client, apiKey) => ({
  backfillNodeIPs: async (confirmed) => {
    const { changes } = await client.apiFetch<{ changes: string[] }>(
      "POST",
      "v1/node/backfillips",
      apiKey,
      { confirmed },
    );

    return changes;
  },
}));
