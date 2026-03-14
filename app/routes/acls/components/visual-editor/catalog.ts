import {
  AUTOGROUPS,
  COMMON_PORTS,
  COMMON_SSH_USERS,
  normalizeGroupName,
  normalizeIpSetName,
  normalizeTagName,
  type Group,
  type Host,
  type IpSet,
  type TagOwner,
} from "~/utils/acl-parser";

export interface CatalogNode {
  id: string;
  name: string;
  givenName: string;
  user?: string;
  tags: string[];
  ipAddresses: string[];
  availableRoutes: string[];
  approvedRoutes: string[];
  machineKey?: string;
}

export interface CatalogUser {
  id: string;
  name: string;
  email: string;
}

export interface AclSuggestion {
  value: string;
  label: string;
  detail?: string;
  category: string;
}

interface BuildCatalogInput {
  users: CatalogUser[];
  nodes: CatalogNode[];
  groups: Group[];
  hosts: Host[];
  tagOwners: TagOwner[];
  ipsets: IpSet[];
}

export interface AclSuggestionCatalog {
  principals: AclSuggestion[];
  destinations: AclSuggestion[];
  groups: AclSuggestion[];
  tags: AclSuggestion[];
  hosts: AclSuggestion[];
  addresses: AclSuggestion[];
  routes: AclSuggestion[];
  sshUsers: AclSuggestion[];
}

export function buildAclSuggestionCatalog({
  users,
  nodes,
  groups,
  hosts,
  tagOwners,
  ipsets,
}: BuildCatalogInput): AclSuggestionCatalog {
  const principalMap = new Map<string, AclSuggestion>();
  const destinationMap = new Map<string, AclSuggestion>();
  const groupMap = new Map<string, AclSuggestion>();
  const tagMap = new Map<string, AclSuggestion>();
  const hostMap = new Map<string, AclSuggestion>();
  const addressMap = new Map<string, AclSuggestion>();
  const routeMap = new Map<string, AclSuggestion>();
  const sshUserMap = new Map<string, AclSuggestion>();

  addSuggestion(principalMap, {
    category: "Alias",
    detail: "Matches everything",
    label: "*",
    value: "*",
  });

  for (const autogroup of AUTOGROUPS) {
    addSuggestion(principalMap, {
      category: "Autogroup",
      detail: autogroup.description,
      label: autogroup.id,
      value: autogroup.id,
    });
    addSuggestion(destinationMap, {
      category: "Autogroup destination",
      detail: `${autogroup.description} on all ports`,
      label: `${autogroup.id}:*`,
      value: `${autogroup.id}:*`,
    });
  }

  for (const user of users) {
    if (!user.name) continue;

    addSuggestion(principalMap, {
      category: "User",
      detail: user.email || "Tailnet user",
      label: user.name,
      value: user.name,
    });
  }

  for (const group of groups) {
    const value = normalizeGroupName(group.name);
    if (!value) continue;

    const suggestion = {
      category: "Group",
      detail: `${group.users.length} member${group.users.length === 1 ? "" : "s"}`,
      label: value,
      value,
    };

    addSuggestion(groupMap, suggestion);
    addSuggestion(principalMap, suggestion);
  }

  const tagValues = new Set<string>();
  for (const owner of tagOwners) {
    const value = normalizeTagName(owner.tag);
    if (value) tagValues.add(value);
  }
  for (const node of nodes) {
    for (const tag of node.tags) {
      const value = normalizeTagName(tag);
      if (value) tagValues.add(value);
    }
  }

  for (const value of tagValues) {
    const suggestion = {
      category: "Tag",
      detail: "Tagged device selector",
      label: value,
      value,
    };

    addSuggestion(tagMap, suggestion);
    addSuggestion(principalMap, suggestion);
  }

  for (const host of hosts) {
    if (!host.name) continue;
    addSuggestion(hostMap, {
      category: "Host alias",
      detail: host.ip,
      label: host.name,
      value: host.name,
    });
    addSuggestion(addressMap, {
      category: "Host target",
      detail: host.ip,
      label: host.ip,
      value: host.ip,
    });
  }

  for (const ipset of ipsets) {
    const value = normalizeIpSetName(ipset.name);
    if (!value) continue;

    addSuggestion(principalMap, {
      category: "IP set",
      detail: `${ipset.cidr.length} CIDR entr${ipset.cidr.length === 1 ? "y" : "ies"}`,
      label: `#${value}`,
      value: `#${value}`,
    });
  }

  for (const node of nodes) {
    const nodeAliases = [node.name, node.givenName].filter(Boolean);
    for (const alias of nodeAliases) {
      addSuggestion(principalMap, {
        category: "Machine",
        detail: node.user || "Headscale node",
        label: alias,
        value: alias,
      });
    }

    for (const ip of node.ipAddresses) {
      addSuggestion(addressMap, {
        category: "Machine IP",
        detail: node.name || node.givenName || node.user || "Node",
        label: ip,
        value: ip,
      });
      addSuggestion(principalMap, {
        category: "Machine IP",
        detail: node.name || node.givenName || node.user || "Node",
        label: ip,
        value: ip,
      });
    }

    for (const route of new Set([...node.availableRoutes, ...node.approvedRoutes])) {
      addSuggestion(routeMap, {
        category: "Subnet route",
        detail: node.name || node.givenName || node.user || "Advertised route",
        label: route,
        value: route,
      });
      addSuggestion(principalMap, {
        category: "Subnet route",
        detail: node.name || node.givenName || node.user || "Advertised route",
        label: route,
        value: route,
      });
    }
  }

  for (const port of COMMON_PORTS) {
    for (const suggestion of [
      ...principalMap.values(),
      ...hostMap.values(),
      ...addressMap.values(),
      ...routeMap.values(),
    ]) {
      if (!isDestinationCandidate(suggestion.value)) continue;

      addSuggestion(destinationMap, {
        category: suggestion.category,
        detail: suggestion.detail,
        label: `${suggestion.value}:${port.value}`,
        value: `${suggestion.value}:${port.value}`,
      });
    }
  }

  for (const route of routeMap.values()) {
    addSuggestion(destinationMap, {
      category: route.category,
      detail: route.detail,
      label: `${route.value}:*`,
      value: `${route.value}:*`,
    });
  }

  for (const host of hostMap.values()) {
    addSuggestion(destinationMap, {
      category: host.category,
      detail: host.detail,
      label: `${host.value}:*`,
      value: `${host.value}:*`,
    });
  }

  for (const item of [
    ...addressMap.values(),
    ...groupMap.values(),
    ...tagMap.values(),
    ...principalMap.values(),
  ]) {
    addSuggestion(destinationMap, {
      category: item.category,
      detail: item.detail,
      label: `${item.value}:*`,
      value: `${item.value}:*`,
    });
  }

  for (const user of COMMON_SSH_USERS) {
    addSuggestion(sshUserMap, {
      category: "SSH user",
      detail: "Suggested login target",
      label: user,
      value: user,
    });
  }

  return {
    addresses: sortSuggestions(addressMap),
    destinations: sortSuggestions(destinationMap),
    groups: sortSuggestions(groupMap),
    hosts: sortSuggestions(hostMap),
    principals: sortSuggestions(principalMap),
    routes: sortSuggestions(routeMap),
    sshUsers: sortSuggestions(sshUserMap),
    tags: sortSuggestions(tagMap),
  };
}

function addSuggestion(map: Map<string, AclSuggestion>, suggestion: AclSuggestion) {
  if (!suggestion.value || map.has(suggestion.value)) {
    return;
  }

  map.set(suggestion.value, suggestion);
}

function isDestinationCandidate(value: string) {
  return value !== "*" && !value.includes(":");
}

function sortSuggestions(map: Map<string, AclSuggestion>) {
  return Array.from(map.values()).sort((left, right) => left.value.localeCompare(right.value));
}
