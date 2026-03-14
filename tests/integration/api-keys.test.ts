import { describe, expect, test } from 'vitest';
import { getRuntimeClient, HS_VERSIONS } from './setup/env';

describe.for(HS_VERSIONS)('Headscale %s: API Keys', (version) => {
	test('api keys can be fetched', async () => {
		const client = await getRuntimeClient(version);
		const apiKeys = await client.getApiKeys();
		expect(Array.isArray(apiKeys)).toBe(true);
		expect(apiKeys.length).toBe(1);
	});

	test('api keys can be created and expired', async () => {
		const client = await getRuntimeClient(version);
		const expiration = new Date(Date.now() + 24 * 3600 * 1000);
		const created = await client.createApiKey(expiration);
		expect(created.value).toBeDefined();

		const apiKeys = await client.getApiKeys();
		const createdKey = apiKeys.find((key) => key.prefix === created.prefix);
		expect(createdKey).toBeDefined();

		await client.expireApiKey(created.prefix);
		const refreshedKeys = await client.getApiKeys();
		const expiredKey = refreshedKeys.find((key) => key.prefix === created.prefix);
		expect(expiredKey).toBeDefined();
	});
});
