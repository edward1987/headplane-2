export type Capabilities = (typeof Capabilities)[keyof typeof Capabilities];
export const Capabilities = {
  ui_access: 1 << 0,
  read_policy: 1 << 1,
  write_policy: 1 << 2,
  read_network: 1 << 3,
  write_network: 1 << 4,
  read_feature: 1 << 5,
  write_feature: 1 << 6,
  configure_iam: 1 << 7,
  read_machines: 1 << 8,
  write_machines: 1 << 9,
  read_users: 1 << 10,
  write_users: 1 << 11,
  generate_authkeys: 1 << 12,
  generate_own_authkeys: 1 << 16,
  use_tags: 1 << 13,
  write_tailnet: 1 << 14,
  owner: 1 << 15,
  read_keys_api: 1 << 17,
  write_keys_api: 1 << 18,
  read_debug: 1 << 19,
  write_debug: 1 << 20,
  read_system: 1 << 21,
  control_system: 1 << 22,
} as const;

export const Roles = {
  owner:
    Capabilities.ui_access |
    Capabilities.read_policy |
    Capabilities.write_policy |
    Capabilities.read_network |
    Capabilities.write_network |
    Capabilities.read_feature |
    Capabilities.write_feature |
    Capabilities.configure_iam |
    Capabilities.read_machines |
    Capabilities.write_machines |
    Capabilities.read_users |
    Capabilities.write_users |
    Capabilities.generate_authkeys |
    Capabilities.use_tags |
    Capabilities.write_tailnet |
    Capabilities.read_keys_api |
    Capabilities.write_keys_api |
    Capabilities.read_debug |
    Capabilities.write_debug |
    Capabilities.read_system |
    Capabilities.control_system |
    Capabilities.owner,

  admin:
    Capabilities.ui_access |
    Capabilities.read_policy |
    Capabilities.write_policy |
    Capabilities.read_network |
    Capabilities.write_network |
    Capabilities.read_feature |
    Capabilities.write_feature |
    Capabilities.configure_iam |
    Capabilities.read_machines |
    Capabilities.write_machines |
    Capabilities.read_users |
    Capabilities.write_users |
    Capabilities.generate_authkeys |
    Capabilities.use_tags |
    Capabilities.write_tailnet |
    Capabilities.read_keys_api |
    Capabilities.write_keys_api |
    Capabilities.read_debug |
    Capabilities.read_system,

  network_admin:
    Capabilities.ui_access |
    Capabilities.read_policy |
    Capabilities.write_policy |
    Capabilities.read_network |
    Capabilities.write_network |
    Capabilities.read_feature |
    Capabilities.read_machines |
    Capabilities.read_users |
    Capabilities.generate_authkeys |
    Capabilities.use_tags |
    Capabilities.write_tailnet |
    Capabilities.read_system,

  it_admin:
    Capabilities.ui_access |
    Capabilities.read_policy |
    Capabilities.read_network |
    Capabilities.read_feature |
    Capabilities.write_feature |
    Capabilities.configure_iam |
    Capabilities.read_machines |
    Capabilities.write_machines |
    Capabilities.read_users |
    Capabilities.write_users |
    Capabilities.generate_authkeys |
    Capabilities.read_keys_api |
    Capabilities.write_keys_api,

  auditor:
    Capabilities.ui_access |
    Capabilities.read_policy |
    Capabilities.read_network |
    Capabilities.read_feature |
    Capabilities.read_machines |
    Capabilities.read_users |
    Capabilities.read_keys_api |
    Capabilities.read_system |
    Capabilities.generate_own_authkeys,

  viewer:
    Capabilities.ui_access |
    Capabilities.read_machines |
    Capabilities.read_users |
    Capabilities.read_keys_api |
    Capabilities.generate_own_authkeys,

  // No access — user exists but has not been granted any role
  member: 0,
} as const;

export type Role = keyof typeof Roles;
export type Capability = keyof typeof Capabilities;

export function hasCapability(role: Role, capability: Capability): boolean {
  return (Roles[role] & Capabilities[capability]) !== 0;
}

export function getRoleFromCapabilities(capabilities: Capabilities): Role {
  const iterable = Roles as Record<string, Capabilities>;
  for (const role in iterable) {
    if (iterable[role] === capabilities) {
      return role as Role;
    }
  }

  return "member";
}

export function capsForRole(role: Role): number {
  return Roles[role];
}
