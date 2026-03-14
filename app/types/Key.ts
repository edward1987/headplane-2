export type Key = {
	id: string;
	prefix: string;
	expiration: string | null;
	createdAt: string;
	lastSeen: string | null;
	expired?: boolean;
	value?: string;
};
