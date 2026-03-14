import { useEffect, useState } from "react";

import type {
  Group,
  Host,
  TagOwner,
  AclRule,
  SshRule,
  TestRule,
  AutoApprovers,
  NodeAttr,
  IpSet,
} from "~/utils/acl-parser";
import {
  parseAclPolicy,
  serializeAclPolicy,
} from "~/utils/acl-parser";

import { AclRuleBuilder } from "./AclRuleBuilder";
import { AutoApproversEditor } from "./AutoApproversEditor";
import { GroupsManager } from "./GroupsManager";
import { HostsManager } from "./HostsManager";
import { IpsetsEditor } from "./IpsetsEditor";
import { NodeAttrsEditor } from "./NodeAttrsEditor";
import { SshRuleBuilder } from "./SshRuleBuilder";
import { TagOwnersEditor } from "./TagOwnersEditor";
import { TestRulesEditor } from "./TestRulesEditor";

interface VisualEditorProps {
  policy: string;
  onChange: (policy: string) => void;
  users: { id: string; name: string; email: string }[];
  isDisabled?: boolean;
}

type TabId = "groups" | "tagOwners" | "hosts" | "acls" | "ssh" | "tests" | "autoApprovers" | "nodeAttrs" | "ipsets";

export function VisualEditor({
  policy,
  onChange,
  users,
  isDisabled,
}: VisualEditorProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [tagOwners, setTagOwners] = useState<TagOwner[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [acls, setAcls] = useState<AclRule[]>([]);
  const [ssh, setSsh] = useState<SshRule[]>([]);
  const [tests, setTests] = useState<TestRule[]>([]);
  const [autoApprovers, setAutoApprovers] = useState<AutoApprovers>({});
  const [nodeAttrs, setNodeAttrs] = useState<NodeAttr[]>([]);
  const [ipsets, setIpsets] = useState<IpSet[]>([]);

  const [viewMode, setViewMode] = useState<"tabs" | "split">("split");
  const [activeTab, setActiveTab] = useState<TabId>("groups");

  // Parse initial policy
  useEffect(() => {
    const parsed = parseAclPolicy(policy);
    setGroups(parsed.groups);
    setTagOwners(parsed.tagOwners);
    setHosts(parsed.hosts);
    setAcls(parsed.acls);
    setSsh(parsed.ssh);
    setTests(parsed.tests);
    setAutoApprovers(parsed.autoApprovers);
    setNodeAttrs(parsed.nodeAttrs);
    setIpsets(parsed.ipsets);
  }, []);

  // Serialize to JSON when data changes
  useEffect(() => {
    const json = serializeAclPolicy({
      groups,
      tagOwners,
      hosts,
      acls,
      ssh,
      tests,
      autoApprovers,
      nodeAttrs,
      ipsets,
    });
    if (json !== policy) {
      onChange(json);
    }
  }, [groups, tagOwners, hosts, acls, ssh, tests, autoApprovers, nodeAttrs, ipsets]);

  const counts = {
    groups: groups.length,
    tagOwners: tagOwners.length,
    hosts: hosts.length,
    acls: acls.length,
    ssh: ssh.length,
    tests: tests.length,
    autoApprovers: Object.keys(autoApprovers).length,
    nodeAttrs: nodeAttrs.length,
    ipsets: ipsets.length,
  };

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "groups", label: "Groups", count: counts.groups },
    { id: "tagOwners", label: "Tag Owners", count: counts.tagOwners },
    { id: "hosts", label: "Hosts", count: counts.hosts },
    { id: "acls", label: "ACL Rules", count: counts.acls },
    { id: "ssh", label: "SSH Rules", count: counts.ssh },
    { id: "tests", label: "Tests", count: counts.tests },
    { id: "autoApprovers", label: "Auto Approvers", count: counts.autoApprovers },
    { id: "nodeAttrs", label: "Node Attrs", count: counts.nodeAttrs },
    { id: "ipsets", label: "IP Sets", count: counts.ipsets },
  ];

  const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-mist-500 dark:text-mist-400">
          {totalItems} total items
        </div>
        <div className="flex gap-1 bg-mist-100 dark:bg-mist-800 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setViewMode("tabs")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              viewMode === "tabs"
                ? "bg-white dark:bg-mist-700 shadow-sm"
                : "hover:bg-mist-200 dark:hover:bg-mist-700"
            }`}
          >
            Tabs
          </button>
          <button
            type="button"
            onClick={() => setViewMode("split")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              viewMode === "split"
                ? "bg-white dark:bg-mist-700 shadow-sm"
                : "hover:bg-mist-200 dark:hover:bg-mist-700"
            }`}
          >
            Grid
          </button>
        </div>
      </div>

      {/* Tab View */}
      {viewMode === "tabs" && (
        <div className="space-y-4">
          <div className="flex gap-2 border-b border-mist-200 dark:border-mist-700 pb-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                    : "text-mist-600 dark:text-mist-400 hover:bg-mist-100 dark:hover:bg-mist-800"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-mist-200 dark:bg-mist-700">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="w-full rounded-lg p-5 bg-mist-50/50 dark:bg-mist-950/50 shadow border border-mist-200 dark:border-mist-800">
            {activeTab === "groups" && (
              <GroupsManager
                groups={groups}
                onChange={setGroups}
                availableUsers={users}
                isDisabled={isDisabled}
              />
            )}
            {activeTab === "tagOwners" && (
              <TagOwnersEditor
                tagOwners={tagOwners}
                onChange={setTagOwners}
                groups={groups}
                isDisabled={isDisabled}
              />
            )}
            {activeTab === "hosts" && (
              <HostsManager hosts={hosts} onChange={setHosts} isDisabled={isDisabled} />
            )}
            {activeTab === "acls" && (
              <AclRuleBuilder
                acls={acls}
                onChange={setAcls}
                groups={groups}
                hosts={hosts}
                tagOwners={tagOwners}
                ipsets={ipsets}
                isDisabled={isDisabled}
              />
            )}
            {activeTab === "ssh" && (
              <SshRuleBuilder
                ssh={ssh}
                onChange={setSsh}
                groups={groups}
                hosts={hosts}
                isDisabled={isDisabled}
              />
            )}
            {activeTab === "tests" && (
              <TestRulesEditor
                tests={tests}
                onChange={setTests}
                groups={groups}
                hosts={hosts}
                isDisabled={isDisabled}
              />
            )}
            {activeTab === "autoApprovers" && (
              <AutoApproversEditor
                autoApprovers={autoApprovers}
                onChange={setAutoApprovers}
                groups={groups}
                isDisabled={isDisabled}
              />
            )}
            {activeTab === "nodeAttrs" && (
              <NodeAttrsEditor
                nodeAttrs={nodeAttrs}
                onChange={setNodeAttrs}
                groups={groups}
                isDisabled={isDisabled}
              />
            )}
            {activeTab === "ipsets" && (
              <IpsetsEditor ipsets={ipsets} onChange={setIpsets} isDisabled={isDisabled} />
            )}
          </div>
        </div>
      )}

      {/* Grid View - responsive layout that adapts to screen size */}
      {viewMode === "split" && (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
          {/* Groups */}
          <div className="w-full rounded-lg p-5 bg-mist-50/50 dark:bg-mist-950/50 shadow border border-mist-200 dark:border-mist-800">
            <GroupsManager
              groups={groups}
              onChange={setGroups}
              availableUsers={users}
              isDisabled={isDisabled}
            />
          </div>

          {/* Tag Owners */}
          <div className="w-full rounded-lg p-5 bg-mist-50/50 dark:bg-mist-950/50 shadow border border-mist-200 dark:border-mist-800">
            <TagOwnersEditor
              tagOwners={tagOwners}
              onChange={setTagOwners}
              groups={groups}
              isDisabled={isDisabled}
            />
          </div>

          {/* Hosts */}
          <div className="w-full rounded-lg p-5 bg-mist-50/50 dark:bg-mist-950/50 shadow border border-mist-200 dark:border-mist-800">
            <HostsManager hosts={hosts} onChange={setHosts} isDisabled={isDisabled} />
          </div>

          {/* ACL Rules - spans full width on small screens, 2 columns on larger screens */}
          <div className="md:col-span-2 2xl:col-span-3 w-full rounded-lg p-5 bg-mist-50/50 dark:bg-mist-950/50 shadow border border-mist-200 dark:border-mist-800">
            <AclRuleBuilder
              acls={acls}
              onChange={setAcls}
              groups={groups}
              hosts={hosts}
              tagOwners={tagOwners}
              ipsets={ipsets}
              isDisabled={isDisabled}
            />
          </div>

          {/* SSH Rules */}
          <div className="w-full rounded-lg p-5 bg-mist-50/50 dark:bg-mist-950/50 shadow border border-mist-200 dark:border-mist-800 max-h-[600px] overflow-y-auto">
            <SshRuleBuilder
              ssh={ssh}
              onChange={setSsh}
              groups={groups}
              hosts={hosts}
              isDisabled={isDisabled}
            />
          </div>

          {/* Auto Approvers */}
          <div className="w-full rounded-lg p-5 bg-mist-50/50 dark:bg-mist-950/50 shadow border border-mist-200 dark:border-mist-800 max-h-[600px] overflow-y-auto">
            <AutoApproversEditor
              autoApprovers={autoApprovers}
              onChange={setAutoApprovers}
              groups={groups}
              isDisabled={isDisabled}
            />
          </div>

          {/* Node Attributes */}
          <div className="w-full rounded-lg p-5 bg-mist-50/50 dark:bg-mist-950/50 shadow border border-mist-200 dark:border-mist-800 max-h-[600px] overflow-y-auto">
            <NodeAttrsEditor
              nodeAttrs={nodeAttrs}
              onChange={setNodeAttrs}
              groups={groups}
              isDisabled={isDisabled}
            />
          </div>

          {/* IP Sets */}
          <div className="w-full rounded-lg p-5 bg-mist-50/50 dark:bg-mist-950/50 shadow border border-mist-200 dark:border-mist-800 max-h-[600px] overflow-y-auto">
            <IpsetsEditor ipsets={ipsets} onChange={setIpsets} isDisabled={isDisabled} />
          </div>
        </div>
      )}
    </div>
  );
}
