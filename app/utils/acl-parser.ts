import YAML from "yaml";

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
  action: "accept" | "check" | "deny";
  src: string[];
  dst: string[];
  users?: string[];
}

export interface TestRule {
  src: string;
  accept: string[];
  deny: string[];
}

export interface AutoApproverRoutes {
  [route: string]: string[];
}

export interface AutoApprovers {
  routes?: AutoApproverRoutes;
  exitNode?: string[];
}

export interface NodeAttr {
  target: string[];
  attr: string[];
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
  tests?: Array<{ src: string; accept?: string[]; deny?: string[] }>;
  autoApprovers?: AutoApprovers;
  nodeAttrs?: Array<Record<string, string[]>>;
  ipsets?: Record<string, string[]>;
  [key: string]: unknown;
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
  extras: Record<string, unknown>;
}

const KNOWN_TOP_LEVEL_KEYS = new Set([
  "groups",
  "tagOwners",
  "hosts",
  "acls",
  "ssh",
  "tests",
  "autoApprovers",
  "nodeAttrs",
  "ipsets",
]);

export const AUTOGROUPS = [
  { id: "autogroup:internet", description: "Internet access through exit nodes" },
  { id: "autogroup:member", description: "All untagged personal devices" },
  { id: "autogroup:tagged", description: "All tagged devices" },
  { id: "autogroup:self", description: "Same user owns both source and destination" },
  { id: "autogroup:nonroot", description: "All non-root users (SSH only)" },
] as const;

export const COMMON_PORTS = [
  { value: "*", label: "All ports" },
  { value: "22", label: "SSH (22)" },
  { value: "53", label: "DNS (53)" },
  { value: "80", label: "HTTP (80)" },
  { value: "443", label: "HTTPS (443)" },
  { value: "5432", label: "PostgreSQL (5432)" },
  { value: "3306", label: "MySQL (3306)" },
  { value: "6379", label: "Redis (6379)" },
  { value: "3389", label: "RDP (3389)" },
] as const;

export const PROTOCOLS = [
  { value: "", label: "Default (TCP/UDP/ICMP)" },
  { value: "tcp", label: "TCP" },
  { value: "udp", label: "UDP" },
  { value: "icmp", label: "ICMP" },
  { value: "sctp", label: "SCTP" },
  { value: "gre", label: "GRE" },
  { value: "esp", label: "ESP" },
  { value: "ah", label: "AH" },
  { value: "igmp", label: "IGMP" },
  { value: "ipv4", label: "IPv4 / IP-in-IP" },
  { value: "ip-in-ip", label: "IP-in-IP" },
] as const;

export const NODE_ATTRS = [
  { value: "funnel", label: "Funnel" },
  { value: "funnel:128", label: "Funnel (Dedicated IP)" },
  { value: "shields_up", label: "Shields Up" },
  { value: "shields_up:128", label: "Shields Up (Dedicated IP)" },
  { value: "ssh_permit_root_login", label: "Permit root SSH login" },
  { value: "ssh_permit_password_auth", label: "Permit password SSH auth" },
] as const;

export const COMMON_SSH_USERS = [
  "autogroup:nonroot",
  "root",
  "ubuntu",
  "admin",
  "ec2-user",
  "debian",
  "core",
  "*",
];

export function parseAclPolicy(policyText: string): ParsedAclData {
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
    extras: {},
  };

  if (!policyText || policyText.trim() === "") {
    return defaultData;
  }

  try {
    const policy = parsePolicyObject(policyText);
    const extras: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(policy)) {
      if (!KNOWN_TOP_LEVEL_KEYS.has(key)) {
        extras[key] = value;
      }
    }

    return {
      groups: Object.entries(policy.groups ?? {}).map(([name, users]) => ({ name, users })),
      tagOwners: Object.entries(policy.tagOwners ?? {}).map(([tag, owners]) => ({ tag, owners })),
      hosts: Object.entries(policy.hosts ?? {}).map(([name, ip]) => ({ name, ip })),
      acls: (policy.acls ?? []).map((rule) => ({
        action: "accept",
        dst: rule.dst ?? [],
        proto: rule.proto,
        src: rule.src ?? [],
      })),
      ssh: (policy.ssh ?? []).map((rule) => ({
        action: rule.action ?? "accept",
        dst: rule.dst ?? [],
        src: rule.src ?? [],
        users: rule.users ?? [],
      })),
      tests: (policy.tests ?? []).map((test) => ({
        src: test.src,
        accept: test.accept ?? [],
        deny: test.deny ?? [],
      })),
      autoApprovers: normalizeAutoApprovers(policy.autoApprovers),
      nodeAttrs: normalizeNodeAttrs(policy.nodeAttrs ?? []),
      ipsets: Object.entries(policy.ipsets ?? {}).map(([name, cidr]) => ({ name, cidr })),
      extras,
    };
  } catch {
    return defaultData;
  }
}

export function serializeAclPolicy(data: ParsedAclData): string {
  const policy: Record<string, unknown> = { ...data.extras };

  const groups = Object.fromEntries(
    data.groups
      .filter((group) => group.name && group.users.length > 0)
      .map((group) => [group.name, uniq(group.users)]),
  );
  if (Object.keys(groups).length > 0) {
    policy.groups = groups;
  } else {
    delete policy.groups;
  }

  const tagOwners = Object.fromEntries(
    data.tagOwners
      .filter((tagOwner) => tagOwner.tag && tagOwner.owners.length > 0)
      .map((tagOwner) => [tagOwner.tag, uniq(tagOwner.owners)]),
  );
  if (Object.keys(tagOwners).length > 0) {
    policy.tagOwners = tagOwners;
  } else {
    delete policy.tagOwners;
  }

  const hosts = Object.fromEntries(
    data.hosts.filter((host) => host.name && host.ip).map((host) => [host.name, host.ip]),
  );
  if (Object.keys(hosts).length > 0) {
    policy.hosts = hosts;
  } else {
    delete policy.hosts;
  }

  const acls = data.acls
    .map((rule) => ({
      action: "accept" as const,
      dst: uniq(rule.dst).filter(Boolean),
      ...(rule.proto ? { proto: rule.proto } : {}),
      src: uniq(rule.src).filter(Boolean),
    }))
    .filter((rule) => rule.src.length > 0 && rule.dst.length > 0);
  if (acls.length > 0) {
    policy.acls = acls;
  } else {
    delete policy.acls;
  }

  const ssh = data.ssh
    .map((rule) => ({
      action: rule.action,
      dst: uniq(rule.dst).filter(Boolean),
      src: uniq(rule.src).filter(Boolean),
      ...(rule.users && rule.users.length > 0 ? { users: uniq(rule.users).filter(Boolean) } : {}),
    }))
    .filter((rule) => rule.src.length > 0 && rule.dst.length > 0);
  if (ssh.length > 0) {
    policy.ssh = ssh;
  } else {
    delete policy.ssh;
  }

  const tests = data.tests
    .map((test) => ({
      src: test.src,
      ...(test.accept.length > 0 ? { accept: uniq(test.accept) } : {}),
      ...(test.deny.length > 0 ? { deny: uniq(test.deny) } : {}),
    }))
    .filter((test) => test.src && (test.accept?.length || test.deny?.length));
  if (tests.length > 0) {
    policy.tests = tests;
  } else {
    delete policy.tests;
  }

  const autoApprovers = normalizeAutoApprovers(data.autoApprovers);
  if (hasMeaningfulAutoApprovers(autoApprovers)) {
    policy.autoApprovers = autoApprovers;
  } else {
    delete policy.autoApprovers;
  }

  const nodeAttrs = data.nodeAttrs
    .map((entry) => {
      const targets = uniq(entry.target).filter(Boolean);
      const attrs = uniq(entry.attr).filter(Boolean);
      if (targets.length === 0 || attrs.length === 0) {
        return null;
      }
      return Object.fromEntries(targets.map((target) => [target, attrs]));
    })
    .filter(Boolean);
  if (nodeAttrs.length > 0) {
    policy.nodeAttrs = nodeAttrs;
  } else {
    delete policy.nodeAttrs;
  }

  const ipsets = Object.fromEntries(
    data.ipsets
      .filter((ipset) => ipset.name && ipset.cidr.length > 0)
      .map((ipset) => [ipset.name, uniq(ipset.cidr)]),
  );
  if (Object.keys(ipsets).length > 0) {
    policy.ipsets = ipsets;
  } else {
    delete policy.ipsets;
  }

  return JSON.stringify(policy, null, 2);
}

export function normalizeGroupName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("group:") ? trimmed : `group:${trimmed}`;
}

export function normalizeTagName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("tag:") ? trimmed : `tag:${trimmed}`;
}

export function normalizeIpSetName(value: string) {
  return value.trim().replace(/^#/, "");
}

function parsePolicyObject(policyText: string): AclPolicy {
  try {
    return JSON.parse(policyText) as AclPolicy;
  } catch {
    return YAML.parse(policyText) as AclPolicy;
  }
}

function normalizeNodeAttrs(entries: Array<Record<string, string[]>>): NodeAttr[] {
  return entries.flatMap((entry) => {
    const attrSets = Object.entries(entry).filter(([, attrs]) => Array.isArray(attrs));
    if (attrSets.length === 0) {
      return [];
    }

    return attrSets.map(([target, attr]) => ({
      attr,
      target: [target],
    }));
  });
}

function uniq(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeAutoApprovers(autoApprovers: AutoApprovers | undefined): AutoApprovers {
  if (!autoApprovers) {
    return {};
  }

  const normalized: AutoApprovers = {};

  if (autoApprovers.routes) {
    normalized.routes = Object.fromEntries(
      Object.entries(autoApprovers.routes)
        .map(([route, principals]) => [route.trim(), uniq(principals)] as const)
        .filter(([route, principals]) => route.length > 0 && principals.length > 0),
    );
  }

  const exitNode = autoApprovers.exitNode ?? [];
  const normalizedExitNode = uniq(exitNode);
  if (normalizedExitNode.length > 0) {
    normalized.exitNode = normalizedExitNode;
  }

  return normalized;
}

function hasMeaningfulAutoApprovers(autoApprovers: AutoApprovers) {
  return Boolean(
    (autoApprovers.routes && Object.keys(autoApprovers.routes).length > 0) ||
    (autoApprovers.exitNode && autoApprovers.exitNode.length > 0),
  );
}
