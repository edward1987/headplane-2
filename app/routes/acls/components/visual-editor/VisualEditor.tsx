import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { FeatureNotice, StatCard } from "~/components/admin-shell";
import Button from "~/components/Button";
import {
  COMMON_PORTS,
  NODE_ATTRS,
  PROTOCOLS,
  normalizeGroupName,
  normalizeIpSetName,
  normalizeTagName,
  parseAclPolicy,
  serializeAclPolicy,
  type AclRule,
  type AutoApprovers,
  type NodeAttr,
  type ParsedAclData,
  type SshRule,
  type TestRule,
} from "~/utils/acl-parser";

import { AclTokenField, SuggestionInput } from "./AclTokenField";
import { buildAclSuggestionCatalog, type CatalogNode, type CatalogUser } from "./catalog";

interface VisualEditorProps {
  policy: string;
  onChange: (policy: string) => void;
  users: CatalogUser[];
  nodes: CatalogNode[];
  isDisabled?: boolean;
}

type AutoApproverSection = "routes" | "exitNode" | "exitNodeDestinations" | "derp";

export function VisualEditor({ policy, onChange, users, nodes, isDisabled }: VisualEditorProps) {
  const [parsed, setParsed] = useState<ParsedAclData>(() => parseAclPolicy(policy));
  const lastSerializedPolicy = useRef(policy);

  useEffect(() => {
    if (policy === lastSerializedPolicy.current) {
      return;
    }

    lastSerializedPolicy.current = policy;
    setParsed(parseAclPolicy(policy));
  }, [policy]);

  useEffect(() => {
    const nextPolicy = serializeAclPolicy(parsed);
    lastSerializedPolicy.current = nextPolicy;
    if (nextPolicy !== policy) {
      onChange(nextPolicy);
    }
  }, [onChange, parsed, policy]);

  const catalog = useMemo(
    () =>
      buildAclSuggestionCatalog({
        groups: parsed.groups,
        hosts: parsed.hosts,
        ipsets: parsed.ipsets,
        nodes,
        tagOwners: parsed.tagOwners,
        users,
      }),
    [nodes, parsed.groups, parsed.hosts, parsed.ipsets, parsed.tagOwners, users],
  );

  const overviewStats = [
    {
      label: "Network rules",
      value: parsed.acls.length,
      detail: "L3/L4 policy",
    },
    {
      label: "SSH rules",
      value: parsed.ssh.length,
      detail: "Tailscale SSH",
    },
    {
      label: "Hosts + subnets",
      value: parsed.hosts.length + parsed.ipsets.length,
      detail: "Aliases and CIDRs",
    },
    {
      label: "Policy fixtures",
      value: parsed.tests.length,
      detail: "Validation coverage",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewStats.map((stat) => (
          <StatCard key={stat.label} detail={stat.detail} label={stat.label} value={stat.value} />
        ))}
      </div>

      <FeatureNotice title="Headscale-aware designer" tone="info">
        This editor uses live Headscale users, machine names, tags, advertised routes, and host
        aliases to power autocomplete across the full ACL document. You can still type custom values
        anywhere when you need something more advanced.
      </FeatureNotice>

      <div className="grid gap-6 2xl:grid-cols-[1.05fr_1.2fr]">
        <div className="space-y-6">
          <SectionCard
            action={
              <Button
                isDisabled={isDisabled}
                onPress={() => {
                  setParsed((current) => ({
                    ...current,
                    groups: [...current.groups, { name: "", users: [] }],
                  }));
                }}
              >
                <Plus className="mr-1 inline h-4 w-4" />
                Add group
              </Button>
            }
            description="Groups model reusable team identities for ACL and tag-owner rules."
            title="Groups"
          >
            {parsed.groups.length > 0 ? (
              <div className="space-y-4">
                {parsed.groups.map((group, index) => (
                  <StackRow
                    key={`group-${index}`}
                    onRemove={() =>
                      setParsed((current) => ({
                        ...current,
                        groups: current.groups.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                  >
                    <SuggestionInput
                      description="Headscale expects group names to start with group:."
                      isDisabled={isDisabled}
                      label="Group name"
                      normalizer={normalizeGroupName}
                      onChange={(value) =>
                        setParsed((current) => ({
                          ...current,
                          groups: current.groups.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, name: value } : item,
                          ),
                        }))
                      }
                      placeholder="group:engineering"
                      suggestions={catalog.groups}
                      value={group.name}
                    />
                    <AclTokenField
                      description="Users are the most common group members, but custom identities are still allowed."
                      isDisabled={isDisabled}
                      label="Members"
                      onChange={(value) =>
                        setParsed((current) => ({
                          ...current,
                          groups: current.groups.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, users: value } : item,
                          ),
                        }))
                      }
                      placeholder="alice"
                      suggestions={catalog.principals}
                      value={group.users}
                    />
                  </StackRow>
                ))}
              </div>
            ) : (
              <EmptyState message="No groups yet. Create teams and then reuse them throughout the policy." />
            )}
          </SectionCard>

          <SectionCard
            action={
              <Button
                isDisabled={isDisabled}
                onPress={() => {
                  setParsed((current) => ({
                    ...current,
                    tagOwners: [...current.tagOwners, { owners: [], tag: "" }],
                  }));
                }}
              >
                <Plus className="mr-1 inline h-4 w-4" />
                Add tag owner
              </Button>
            }
            description="Tag ownership controls which users or groups are allowed to assign device tags."
            title="Tag owners"
          >
            {parsed.tagOwners.length > 0 ? (
              <div className="space-y-4">
                {parsed.tagOwners.map((tagOwner, index) => (
                  <StackRow
                    key={`tag-owner-${index}`}
                    onRemove={() =>
                      setParsed((current) => ({
                        ...current,
                        tagOwners: current.tagOwners.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                  >
                    <SuggestionInput
                      description="Tags should use the tag: prefix."
                      isDisabled={isDisabled}
                      label="Tag"
                      normalizer={normalizeTagName}
                      onChange={(value) =>
                        setParsed((current) => ({
                          ...current,
                          tagOwners: current.tagOwners.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, tag: value } : item,
                          ),
                        }))
                      }
                      placeholder="tag:prod"
                      suggestions={catalog.tags}
                      value={tagOwner.tag}
                    />
                    <AclTokenField
                      description="Owners can be users, groups, tags, or autogroups."
                      isDisabled={isDisabled}
                      label="Allowed owners"
                      onChange={(value) =>
                        setParsed((current) => ({
                          ...current,
                          tagOwners: current.tagOwners.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, owners: value } : item,
                          ),
                        }))
                      }
                      placeholder="group:platform"
                      suggestions={catalog.principals}
                      value={tagOwner.owners}
                    />
                  </StackRow>
                ))}
              </div>
            ) : (
              <EmptyState message="No tag owners defined yet." />
            )}
          </SectionCard>

          <SectionCard
            action={
              <Button
                isDisabled={isDisabled}
                onPress={() => {
                  setParsed((current) => ({
                    ...current,
                    hosts: [...current.hosts, { ip: "", name: "" }],
                  }));
                }}
              >
                <Plus className="mr-1 inline h-4 w-4" />
                Add host alias
              </Button>
            }
            description="Hosts create stable aliases for IPs and subnets. Autocomplete includes machine IPs and advertised routes."
            title="Hosts"
          >
            {parsed.hosts.length > 0 ? (
              <div className="space-y-4">
                {parsed.hosts.map((host, index) => (
                  <StackRow
                    key={`host-${index}`}
                    onRemove={() =>
                      setParsed((current) => ({
                        ...current,
                        hosts: current.hosts.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                  >
                    <SuggestionInput
                      isDisabled={isDisabled}
                      label="Alias"
                      onChange={(value) =>
                        setParsed((current) => ({
                          ...current,
                          hosts: current.hosts.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, name: value } : item,
                          ),
                        }))
                      }
                      placeholder="db-primary"
                      suggestions={catalog.hosts}
                      value={host.name}
                    />
                    <SuggestionInput
                      description="Single IPs and CIDR subnets are both valid."
                      isDisabled={isDisabled}
                      label="Address"
                      onChange={(value) =>
                        setParsed((current) => ({
                          ...current,
                          hosts: current.hosts.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, ip: value } : item,
                          ),
                        }))
                      }
                      placeholder="100.64.0.10 or 10.0.0.0/24"
                      suggestions={[...catalog.addresses, ...catalog.routes]}
                      value={host.ip}
                    />
                  </StackRow>
                ))}
              </div>
            ) : (
              <EmptyState message="No host aliases yet." />
            )}
          </SectionCard>

          <SectionCard
            action={
              <Button
                isDisabled={isDisabled}
                onPress={() => {
                  setParsed((current) => ({
                    ...current,
                    ipsets: [...current.ipsets, { cidr: [], name: "" }],
                  }));
                }}
              >
                <Plus className="mr-1 inline h-4 w-4" />
                Add IP set
              </Button>
            }
            description="IP sets are reusable CIDR collections, referenced as #name inside ACLs."
            title="IP sets"
          >
            {parsed.ipsets.length > 0 ? (
              <div className="space-y-4">
                {parsed.ipsets.map((ipset, index) => (
                  <StackRow
                    key={`ipset-${index}`}
                    onRemove={() =>
                      setParsed((current) => ({
                        ...current,
                        ipsets: current.ipsets.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                  >
                    <SuggestionInput
                      description="Do not include # here, the designer adds it where needed."
                      isDisabled={isDisabled}
                      label="IP set name"
                      normalizer={normalizeIpSetName}
                      onChange={(value) =>
                        setParsed((current) => ({
                          ...current,
                          ipsets: current.ipsets.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, name: value } : item,
                          ),
                        }))
                      }
                      placeholder="corp-ranges"
                      suggestions={[]}
                      value={ipset.name}
                    />
                    <AclTokenField
                      description="Use machine IPs, routes, and custom CIDRs."
                      isDisabled={isDisabled}
                      label="CIDR members"
                      onChange={(value) =>
                        setParsed((current) => ({
                          ...current,
                          ipsets: current.ipsets.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, cidr: value } : item,
                          ),
                        }))
                      }
                      placeholder="10.0.0.0/24"
                      suggestions={[...catalog.addresses, ...catalog.routes]}
                      value={ipset.cidr}
                    />
                  </StackRow>
                ))}
              </div>
            ) : (
              <EmptyState message="No IP sets yet." />
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <PolicyRuleSection
            aclSuggestions={catalog.destinations}
            acls={parsed.acls}
            isDisabled={isDisabled}
            onAdd={() =>
              setParsed((current) => ({
                ...current,
                acls: [...current.acls, { action: "accept", dst: [], src: [] }],
              }))
            }
            onChange={(acls) =>
              setParsed((current) => ({
                ...current,
                acls,
              }))
            }
            principalSuggestions={catalog.principals}
          />

          <SshSection
            isDisabled={isDisabled}
            onAdd={() =>
              setParsed((current) => ({
                ...current,
                ssh: [...current.ssh, { action: "check", dst: [], src: [], users: [] }],
              }))
            }
            onChange={(ssh) =>
              setParsed((current) => ({
                ...current,
                ssh,
              }))
            }
            principalSuggestions={catalog.principals}
            ssh={parsed.ssh}
            sshUserSuggestions={catalog.sshUsers}
          />

          <TestsSection
            destinationSuggestions={catalog.destinations}
            isDisabled={isDisabled}
            onAdd={() =>
              setParsed((current) => ({
                ...current,
                tests: [...current.tests, { accept: [], deny: [], src: "" }],
              }))
            }
            onChange={(tests) =>
              setParsed((current) => ({
                ...current,
                tests,
              }))
            }
            principalSuggestions={catalog.principals}
            tests={parsed.tests}
          />

          <NodeAttrsSection
            isDisabled={isDisabled}
            nodeAttrs={parsed.nodeAttrs}
            onAdd={() =>
              setParsed((current) => ({
                ...current,
                nodeAttrs: [...current.nodeAttrs, { attr: [], target: [] }],
              }))
            }
            onChange={(nodeAttrs) =>
              setParsed((current) => ({
                ...current,
                nodeAttrs,
              }))
            }
            principalSuggestions={catalog.principals}
          />

          <AutoApproversSection
            autoApprovers={parsed.autoApprovers}
            isDisabled={isDisabled}
            onChange={(autoApprovers) =>
              setParsed((current) => ({
                ...current,
                autoApprovers,
              }))
            }
            principalSuggestions={catalog.principals}
            routeSuggestions={catalog.routes}
          />
        </div>
      </div>
    </div>
  );
}

function PolicyRuleSection({
  acls,
  onChange,
  onAdd,
  principalSuggestions,
  aclSuggestions,
  isDisabled,
}: {
  acls: AclRule[];
  onChange: (value: AclRule[]) => void;
  onAdd: () => void;
  principalSuggestions: ReturnType<typeof buildAclSuggestionCatalog>["principals"];
  aclSuggestions: ReturnType<typeof buildAclSuggestionCatalog>["destinations"];
  isDisabled?: boolean;
}) {
  return (
    <SectionCard
      action={
        <Button isDisabled={isDisabled} onPress={onAdd}>
          <Plus className="mr-1 inline h-4 w-4" />
          Add ACL rule
        </Button>
      }
      description="Compose network policy rules the same way Headscale evaluates them: source selectors, destination aliases, ports, and optional protocols."
      title="Network ACLs"
    >
      {acls.length > 0 ? (
        <div className="space-y-4">
          {acls.map((rule, index) => (
            <StackRow
              key={`acl-${index}`}
              onRemove={() => onChange(acls.filter((_, itemIndex) => itemIndex !== index))}
            >
              <div className="grid gap-4 xl:grid-cols-[0.75fr_1fr_1fr]">
                <SelectField
                  description="Leave empty for Headscale's default protocol handling."
                  isDisabled={isDisabled}
                  label="Protocol"
                  onChange={(value) =>
                    onChange(
                      acls.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, proto: value || undefined } : item,
                      ),
                    )
                  }
                  options={PROTOCOLS.map((option) => ({
                    label: option.label,
                    value: option.value,
                  }))}
                  value={rule.proto ?? ""}
                />
                <AclTokenField
                  description="Users, groups, tags, host aliases, subnets, IPs, and autogroups are all valid."
                  isDisabled={isDisabled}
                  label="Sources"
                  onChange={(value) =>
                    onChange(
                      acls.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, src: value } : item,
                      ),
                    )
                  }
                  placeholder="group:engineering"
                  suggestions={principalSuggestions}
                  value={rule.src}
                />
                <AclTokenField
                  description="Destination suggestions already include :port helpers for common services."
                  isDisabled={isDisabled}
                  label="Destinations"
                  onChange={(value) =>
                    onChange(
                      acls.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, dst: value } : item,
                      ),
                    )
                  }
                  placeholder="tag:prod:443"
                  suggestions={aclSuggestions}
                  value={rule.dst}
                />
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-mist-500 dark:text-mist-400">
                <span className="rounded-full bg-mist-100 px-2 py-1 dark:bg-mist-800">
                  Action: accept
                </span>
                {COMMON_PORTS.slice(0, 5).map((port) => (
                  <button
                    key={port.value}
                    type="button"
                    className="rounded-full border border-mist-200 px-2 py-1 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-mist-700 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/40"
                    disabled={isDisabled}
                    onClick={() => {
                      const first = rule.dst[0];
                      if (!first) return;

                      const alias = first.includes(":")
                        ? first.split(":").slice(0, -1).join(":")
                        : first;
                      const candidate = `${alias}:${port.value}`;
                      if (rule.dst.includes(candidate)) return;

                      onChange(
                        acls.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, dst: [...item.dst, candidate] } : item,
                        ),
                      );
                    }}
                  >
                    Add {port.label}
                  </button>
                ))}
              </div>
            </StackRow>
          ))}
        </div>
      ) : (
        <EmptyState message="No network ACLs yet." />
      )}
    </SectionCard>
  );
}

function SshSection({
  ssh,
  onChange,
  onAdd,
  principalSuggestions,
  sshUserSuggestions,
  isDisabled,
}: {
  ssh: SshRule[];
  onChange: (value: SshRule[]) => void;
  onAdd: () => void;
  principalSuggestions: ReturnType<typeof buildAclSuggestionCatalog>["principals"];
  sshUserSuggestions: ReturnType<typeof buildAclSuggestionCatalog>["sshUsers"];
  isDisabled?: boolean;
}) {
  return (
    <SectionCard
      action={
        <Button isDisabled={isDisabled} onPress={onAdd}>
          <Plus className="mr-1 inline h-4 w-4" />
          Add SSH rule
        </Button>
      }
      description="Define who can connect over Tailscale SSH and whether the server should accept, check, or deny the session."
      title="SSH policy"
    >
      {ssh.length > 0 ? (
        <div className="space-y-4">
          {ssh.map((rule, index) => (
            <StackRow
              key={`ssh-${index}`}
              onRemove={() => onChange(ssh.filter((_, itemIndex) => itemIndex !== index))}
            >
              <div className="grid gap-4 xl:grid-cols-[0.6fr_1fr_1fr]">
                <SelectField
                  isDisabled={isDisabled}
                  label="Action"
                  onChange={(value) =>
                    onChange(
                      ssh.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, action: value as SshRule["action"] }
                          : item,
                      ),
                    )
                  }
                  options={[
                    { label: "Accept", value: "accept" },
                    { label: "Check", value: "check" },
                    { label: "Deny", value: "deny" },
                  ]}
                  value={rule.action}
                />
                <AclTokenField
                  isDisabled={isDisabled}
                  label="Sources"
                  onChange={(value) =>
                    onChange(
                      ssh.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, src: value } : item,
                      ),
                    )
                  }
                  placeholder="group:ops"
                  suggestions={principalSuggestions}
                  value={rule.src}
                />
                <AclTokenField
                  description="Destinations are machine or selector aliases, without ports."
                  isDisabled={isDisabled}
                  label="Destinations"
                  onChange={(value) =>
                    onChange(
                      ssh.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, dst: value } : item,
                      ),
                    )
                  }
                  placeholder="tag:prod"
                  suggestions={principalSuggestions}
                  value={rule.dst}
                />
              </div>
              <AclTokenField
                description="Login users support autogroup:nonroot plus any explicit usernames you need."
                isDisabled={isDisabled}
                label="SSH users"
                onChange={(value) =>
                  onChange(
                    ssh.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, users: value } : item,
                    ),
                  )
                }
                placeholder="autogroup:nonroot"
                suggestions={sshUserSuggestions}
                value={rule.users ?? []}
              />
            </StackRow>
          ))}
        </div>
      ) : (
        <EmptyState message="No SSH rules yet." />
      )}
    </SectionCard>
  );
}

function TestsSection({
  tests,
  onChange,
  onAdd,
  principalSuggestions,
  destinationSuggestions,
  isDisabled,
}: {
  tests: TestRule[];
  onChange: (value: TestRule[]) => void;
  onAdd: () => void;
  principalSuggestions: ReturnType<typeof buildAclSuggestionCatalog>["principals"];
  destinationSuggestions: ReturnType<typeof buildAclSuggestionCatalog>["destinations"];
  isDisabled?: boolean;
}) {
  return (
    <SectionCard
      action={
        <Button isDisabled={isDisabled} onPress={onAdd}>
          <Plus className="mr-1 inline h-4 w-4" />
          Add test
        </Button>
      }
      description="Policy tests help validate expected reachability before you ship ACL changes."
      title="Tests"
    >
      {tests.length > 0 ? (
        <div className="space-y-4">
          {tests.map((test, index) => (
            <StackRow
              key={`test-${index}`}
              onRemove={() => onChange(tests.filter((_, itemIndex) => itemIndex !== index))}
            >
              <SuggestionInput
                description="The source selector under test."
                isDisabled={isDisabled}
                label="Source"
                onChange={(value) =>
                  onChange(
                    tests.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, src: value } : item,
                    ),
                  )
                }
                placeholder="alice"
                suggestions={principalSuggestions}
                value={test.src}
              />
              <div className="grid gap-4 xl:grid-cols-2">
                <AclTokenField
                  isDisabled={isDisabled}
                  label="Expected allow"
                  onChange={(value) =>
                    onChange(
                      tests.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, accept: value } : item,
                      ),
                    )
                  }
                  placeholder="db-primary:5432"
                  suggestions={destinationSuggestions}
                  value={test.accept}
                />
                <AclTokenField
                  isDisabled={isDisabled}
                  label="Expected deny"
                  onChange={(value) =>
                    onChange(
                      tests.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, deny: value } : item,
                      ),
                    )
                  }
                  placeholder="tag:prod:443"
                  suggestions={destinationSuggestions}
                  value={test.deny}
                />
              </div>
            </StackRow>
          ))}
        </div>
      ) : (
        <EmptyState message="No ACL tests yet." />
      )}
    </SectionCard>
  );
}

function NodeAttrsSection({
  nodeAttrs,
  onChange,
  onAdd,
  principalSuggestions,
  isDisabled,
}: {
  nodeAttrs: NodeAttr[];
  onChange: (value: NodeAttr[]) => void;
  onAdd: () => void;
  principalSuggestions: ReturnType<typeof buildAclSuggestionCatalog>["principals"];
  isDisabled?: boolean;
}) {
  return (
    <SectionCard
      action={
        <Button isDisabled={isDisabled} onPress={onAdd}>
          <Plus className="mr-1 inline h-4 w-4" />
          Add node attr
        </Button>
      }
      description="Node attributes toggle advanced Headscale and Tailscale capabilities for matching machines."
      title="Node attributes"
    >
      {nodeAttrs.length > 0 ? (
        <div className="space-y-4">
          {nodeAttrs.map((entry, index) => (
            <StackRow
              key={`node-attr-${index}`}
              onRemove={() => onChange(nodeAttrs.filter((_, itemIndex) => itemIndex !== index))}
            >
              <AclTokenField
                isDisabled={isDisabled}
                label="Targets"
                onChange={(value) =>
                  onChange(
                    nodeAttrs.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, target: value } : item,
                    ),
                  )
                }
                placeholder="tag:shared"
                suggestions={principalSuggestions}
                value={entry.target}
              />
              <AclTokenField
                isDisabled={isDisabled}
                label="Attributes"
                onChange={(value) =>
                  onChange(
                    nodeAttrs.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, attr: value } : item,
                    ),
                  )
                }
                placeholder="funnel"
                suggestions={NODE_ATTRS.map((attr) => ({
                  category: "Node attr",
                  detail: attr.label,
                  label: attr.value,
                  value: attr.value,
                }))}
                value={entry.attr}
              />
            </StackRow>
          ))}
        </div>
      ) : (
        <EmptyState message="No node attributes yet." />
      )}
    </SectionCard>
  );
}

function AutoApproversSection({
  autoApprovers,
  onChange,
  routeSuggestions,
  principalSuggestions,
  isDisabled,
}: {
  autoApprovers: AutoApprovers;
  onChange: (value: AutoApprovers) => void;
  routeSuggestions: ReturnType<typeof buildAclSuggestionCatalog>["routes"];
  principalSuggestions: ReturnType<typeof buildAclSuggestionCatalog>["principals"];
  isDisabled?: boolean;
}) {
  const sections: Array<{
    id: AutoApproverSection;
    title: string;
    description: string;
    suggestions:
      | ReturnType<typeof buildAclSuggestionCatalog>["routes"]
      | ReturnType<typeof buildAclSuggestionCatalog>["principals"];
  }> = [
    {
      id: "routes",
      title: "Route approvals",
      description: "Auto-approve subnet routes announced by matching principals.",
      suggestions: routeSuggestions,
    },
    {
      id: "exitNode",
      title: "Exit node access",
      description: "Map principals or scopes to users allowed to self-approve exit nodes.",
      suggestions: principalSuggestions,
    },
    {
      id: "exitNodeDestinations",
      title: "Exit destinations",
      description: "Granular exit-node destination scopes for specific actors.",
      suggestions: routeSuggestions,
    },
    {
      id: "derp",
      title: "DERP approvals",
      description: "Advanced DERP approvals for matching scopes.",
      suggestions: principalSuggestions,
    },
  ];

  return (
    <SectionCard
      description="Auto-approvers let Headscale accept route and exit-node changes without manual approval when a principal matches."
      title="Auto approvers"
    >
      <div className="space-y-4">
        {sections.map((section) => {
          const entries = Object.entries(autoApprovers[section.id] ?? {});

          return (
            <div
              key={section.id}
              className="rounded-3xl border border-mist-200 bg-mist-50/70 p-4 dark:border-mist-800 dark:bg-mist-950/40"
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-mist-950 dark:text-mist-50">
                    {section.title}
                  </h4>
                  <p className="mt-1 text-xs text-mist-500 dark:text-mist-400">
                    {section.description}
                  </p>
                </div>
                <Button
                  isDisabled={isDisabled}
                  onPress={() => {
                    onChange({
                      ...autoApprovers,
                      [section.id]: {
                        ...autoApprovers[section.id],
                        "": [],
                      },
                    });
                  }}
                >
                  <Plus className="mr-1 inline h-4 w-4" />
                  Add
                </Button>
              </div>

              {entries.length > 0 ? (
                <div className="space-y-3">
                  {entries.map(([key, actors], index) => (
                    <StackRow
                      key={`${section.id}-${index}`}
                      onRemove={() => {
                        const nextEntries = Object.entries(autoApprovers[section.id] ?? {}).filter(
                          ([entryKey], entryIndex) => !(entryKey === key && entryIndex === index),
                        );
                        onChange({
                          ...autoApprovers,
                          [section.id]: Object.fromEntries(nextEntries),
                        });
                      }}
                    >
                      <SuggestionInput
                        description="The left-hand key changes depending on the approver type."
                        isDisabled={isDisabled}
                        label="Scope"
                        onChange={(nextKey) => {
                          const currentEntries = Object.entries(autoApprovers[section.id] ?? {});
                          const updated = currentEntries.map(([entryKey, value], entryIndex) => {
                            if (entryKey === key && entryIndex === index) {
                              return [nextKey, value] as const;
                            }
                            return [entryKey, value] as const;
                          });

                          onChange({
                            ...autoApprovers,
                            [section.id]: Object.fromEntries(updated),
                          });
                        }}
                        placeholder={section.id === "routes" ? "10.0.0.0/24" : "tag:exit"}
                        suggestions={section.suggestions}
                        value={key}
                      />
                      <AclTokenField
                        isDisabled={isDisabled}
                        label="Allowed principals"
                        onChange={(nextActors) => {
                          const currentEntries = Object.entries(autoApprovers[section.id] ?? {});
                          const updated = currentEntries.map(([entryKey, value], entryIndex) => {
                            if (entryKey === key && entryIndex === index) {
                              return [entryKey, nextActors] as const;
                            }
                            return [entryKey, value] as const;
                          });

                          onChange({
                            ...autoApprovers,
                            [section.id]: Object.fromEntries(updated),
                          });
                        }}
                        placeholder="group:netops"
                        suggestions={principalSuggestions}
                        value={actors}
                      />
                    </StackRow>
                  ))}
                </div>
              ) : (
                <EmptyState message={`No ${section.title.toLowerCase()} configured.`} />
              )}
            </div>
          );
        })}

        <div className="rounded-3xl border border-mist-200 bg-mist-50/70 p-4 dark:border-mist-800 dark:bg-mist-950/40">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-mist-950 dark:text-mist-50">
              Legacy exit node approvals
            </h4>
            <p className="mt-1 text-xs text-mist-500 dark:text-mist-400">
              Older documents may still use the legacy exitNodes.acceptExitNodes shape.
            </p>
          </div>
          <AclTokenField
            isDisabled={isDisabled}
            label="acceptExitNodes"
            onChange={(value) =>
              onChange({
                ...autoApprovers,
                exitNodes: { acceptExitNodes: value },
              })
            }
            placeholder="group:netops"
            suggestions={principalSuggestions}
            value={autoApprovers.exitNodes?.acceptExitNodes ?? []}
          />
        </div>
      </div>
    </SectionCard>
  );
}

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-mist-200 bg-white p-5 shadow-sm dark:border-mist-800 dark:bg-mist-950">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-mist-950 dark:text-mist-50">{title}</h3>
          <p className="mt-1 max-w-2xl text-sm text-mist-600 dark:text-mist-300">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function StackRow({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <div className="rounded-3xl border border-mist-200 bg-mist-50/70 p-4 dark:border-mist-800 dark:bg-mist-950/40">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-mist-200 px-3 py-1 text-xs font-medium text-mist-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-mist-700 dark:text-mist-300 dark:hover:border-red-900/70 dark:hover:bg-red-950/40 dark:hover:text-red-300"
          onClick={onRemove}
        >
          <X className="h-3.5 w-3.5" />
          Remove
        </button>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-mist-300 bg-mist-50/70 px-4 py-6 text-sm text-mist-500 dark:border-mist-700 dark:bg-mist-950/40 dark:text-mist-400">
      {message}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  description,
  isDisabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  description?: string;
  isDisabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium tracking-[0.18em] text-mist-500 uppercase dark:text-mist-400">
        {label}
      </label>
      <select
        className="w-full rounded-2xl border border-mist-200 bg-white px-4 py-3 text-sm shadow-sm outline-hidden transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/15 dark:border-mist-800 dark:bg-mist-950"
        disabled={isDisabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value || option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {description ? (
        <p className="text-xs text-mist-500 dark:text-mist-400">{description}</p>
      ) : null}
    </div>
  );
}
