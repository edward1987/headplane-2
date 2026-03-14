export interface ApiFeatureFlags {
  canManageApiKeys: boolean;
  canDeleteApiKeys: boolean;
  canDeletePreAuthKeys: boolean;
  canBackfillNodeIPs: boolean;
  canControlPendingAuth: boolean;
  canManageDebugNodes: boolean;
  canManageTagOnlyPreAuthKeys: boolean;
  canReadAllPreAuthKeys: boolean;
  canReassignNodeOwner: boolean;
}

export interface NodeRouteDetail {
  id?: string;
  prefix: string;
  advertised: boolean;
  enabled: boolean;
  isPrimary: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface DebugCreateNodeInput {
  name: string;
  key: string;
  routes: string[];
  user?: string;
}
