// ACL Parser and Serializer Utilities
// Parses Headscale ACL JSON into structured objects and vice versa

// ==================== Types ====================

export interface AclRule {
  action: "accept";
  src: string[];
  dst: string[];
  proto?: string;
}

export interface Group {
  name: string;
  users: string[];
}

export interface TagOwner {
  tag: string;
  owners: string[];
}

export interface Host {
  name: string;
  ip: string;
}

export interface SshRule {
  action: "accept" | "deny";
  src: string[];
  dst: string[];
  users?: string[];
  groups?: string[];
}

export interface TestRule {
  name: string;
  sources: string[];
  destination: string[];
}

export interface AutoApproverRoutes {
  advertiseRoutes: string[];
}

export interface AutoApproverExitNodes {
  acceptExitNodes: string[];
}

export interface AutoApproverDerp {
  acceptMagicIPs: boolean;
}

export interface AutoApprovers {
  routes?: AutoApproverRoutes;
  exitNodes?: AutoApproverExitNodes;
  derp?: AutoApproverDerp;
}

export interface NodeAttr {
  attr: string[];
  groups?: string[];
  users?: string[];
  tags?: string[];
}

export interface IpSet {
  name: string;
  cidr: string[];
}

export interface AclPolicy {
  groups?: Record<string, string[]>;
  tagOwners?: Record<string, string[]>;
  hosts?: Record<string, string>;
  acls?: AclRule[];
  ssh?: SshRule[];
  tests?: TestRule[];
  autoApprovers?: AutoApprovers;
  nodeAttrs?: NodeAttr[];
  ipsets?: Record<string, string[]>;
}

export interface ParsedAclData {
  groups: Group[];
  tagOwners: TagOwner[];
  hosts: Host[];
  acls: AclRule[];
  ssh: SshRule[];
  tests: TestRule[];
  autoApprovers: AutoApprovers;
  nodeAttrs: NodeAttr[];
  ipsets: IpSet[];
}

// ==================== Parser ====================

/**
 * Parse ACL JSON string into structured objects
 */
export function parseAclPolicy(policyJson: string): ParsedAclData {
  const defaultData: ParsedAclData = {
    groups: [],
    tagOwners: [],
    hosts: [],
    acls: [],
    ssh: [],
    tests: [],
    autoApprovers: {},
    nodeAttrs: [],
    ipsets: [],
  };

  if (!policyJson || policyJson.trim() === "") {
    return defaultData;
  }

  try {
    const policy: AclPolicy = JSON.parse(policyJson);

    // Parse groups
    const groups: Group[] = [];
    if (policy.groups) {
      for (const [name, users] of Object.entries(policy.groups)) {
        groups.push({ name, users });
      }
    }

    // Parse tagOwners
    const tagOwners: TagOwner[] = [];
    if (policy.tagOwners) {
      for (const [tag, owners] of Object.entries(policy.tagOwners)) {
        tagOwners.push({ tag, owners });
      }
    }

    // Parse hosts
    const hosts: Host[] = [];
    if (policy.hosts) {
      for (const [name, ip] of Object.entries(policy.hosts)) {
        hosts.push({ name, ip });
      }
    }

    // Parse ACLs
    const acls: AclRule[] = policy.acls || [];

    // Parse SSH rules
    const ssh: SshRule[] = policy.ssh || [];

    // Parse tests
    const tests: TestRule[] = policy.tests || [];

    // Parse autoApprovers
    const autoApprovers: AutoApprovers = policy.autoApprovers || {};

    // Parse nodeAttrs
    const nodeAttrs: NodeAttr[] = policy.nodeAttrs || [];

    // Parse ipsets
    const ipsets: IpSet[] = [];
    if (policy.ipsets) {
      for (const [name, cidr] of Object.entries(policy.ipsets)) {
        ipsets.push({ name, cidr });
      }
    }

    return {
      groups,
      tagOwners,
      hosts,
      acls,
      ssh,
      tests,
      autoApprovers,
      nodeAttrs,
      ipsets,
    };
  } catch {
    // If parsing fails, return empty data
    return defaultData;
  }
}

// ==================== Serializer ====================

/**
 * Serialize structured ACL data back to JSON string
 */
export function serializeAclPolicy(data: ParsedAclData): string {
  const policy: Record<string, unknown> = {};

  // Serialize groups
  const groups: Record<string, string[]> = {};
  for (const group of data.groups) {
    if (group.name && group.users.length > 0) {
      groups[group.name] = group.users;
    }
  }
  if (Object.keys(groups).length > 0) {
    policy.groups = groups;
  }

  // Serialize tagOwners
  const tagOwners: Record<string, string[]> = {};
  for (const tagOwner of data.tagOwners) {
    if (tagOwner.tag && tagOwner.owners.length > 0) {
      tagOwners[tagOwner.tag] = tagOwner.owners;
    }
  }
  if (Object.keys(tagOwners).length > 0) {
    policy.tagOwners = tagOwners;
  }

  // Serialize hosts
  const hosts: Record<string, string> = {};
  for (const host of data.hosts) {
    if (host.name && host.ip) {
      hosts[host.name] = host.ip;
    }
  }
  if (Object.keys(hosts).length > 0) {
    policy.hosts = hosts;
  }

  // Serialize ACLs
  const acls = data.acls.filter(
    (rule) => rule.src.length > 0 && rule.dst.length > 0,
  );
  if (acls.length > 0) {
    policy.acls = acls;
  }

  // Serialize SSH rules
  const ssh = data.ssh.filter(
    (rule) => rule.src.length > 0 && rule.dst.length > 0,
  );
  if (ssh.length > 0) {
    policy.ssh = ssh;
  }

  // Serialize tests
  if (data.tests.length > 0) {
    policy.tests = data.tests;
  }

  // Serialize autoApprovers
  if (
    data.autoApprovers.routes ||
    data.autoApprovers.exitNodes ||
    data.autoApprovers.derp
  ) {
    policy.autoApprovers = data.autoApprovers;
  }

  // Serialize nodeAttrs
  if (data.nodeAttrs.length > 0) {
    policy.nodeAttrs = data.nodeAttrs;
  }

  // Serialize ipsets
  const ipsets: Record<string, string[]> = {};
  for (const ipset of data.ipsets) {
    if (ipset.name && ipset.cidr.length > 0) {
      ipsets[ipset.name] = ipset.cidr;
    }
  }
  if (Object.keys(ipsets).length > 0) {
    policy.ipsets = ipsets;
  }

  return JSON.stringify(policy, null, 2);
}

// ==================== Constants ====================

export const AUTOGROUPS = [
  { id: "autogroup:internet", description: "Internet access through exit nodes" },
  { id: "autogroup:member", description: "All untagged personal devices" },
  { id: "autogroup:tagged", description: "All devices with at least one tag" },
  { id: "autogroup:self", description: "Same user owns both src and dst (experimental)" },
  { id: "autogroup:nonroot", description: "All non-root users (SSH only)" },
] as const;

export const COMMON_PORTS = [
  { value: "*", label: "All ports" },
  { value: "22", label: "SSH (22)" },
  { value: "80", label: "HTTP (80)" },
  { value: "443", label: "HTTPS (443)" },
  { value: "3389", label: "RDP (3389)" },
  { value: "445", label: "SMB (445)" },
  { value: "5432", label: "PostgreSQL (5432)" },
  { value: "3306", label: "MySQL (3306)" },
  { value: "6379", label: "Redis (6379)" },
  { value: "27017", label: "MongoDB (27017)" },
] as const;

export const PROTOCOLS = [
  { value: "", label: "Any" },
  { value: "tcp", label: "TCP" },
  { value: "udp", label: "UDP" },
  { value: "icmp", label: "ICMP" },
] as const;

export const SSH_PROTOCOLS = [
  { value: "", label: "Any" },
  { value: "tcp", label: "TCP" },
] as const;

// Node attributes for nodeAttrs
export const NODE_ATTRS = [
  { value: "funnel", label: "Funnel (advertise service to internet)" },
  { value: "funnel:128", label: "Funnel 128 (dedicated IP)" },
  { value: "shields_up", label: "Shields Up (block unsolicited)" },
  { value: "shields_up:128", label: "Shields Up 128" },
  { value: "ssh_permit_root_login", label: "Permit Root Login" },
  { value: "ssh_permit_password_auth", label: "Permit Password Auth" },
] as const;
