import { Plus, Trash2 } from "lucide-react";

import Button from "~/components/Button";
import Input from "~/components/Input";
import {
  AUTOGROUPS,
  PROTOCOLS,
  type AclRule,
  type Group,
  type Host,
  type TagOwner,
  type IpSet,
} from "~/utils/acl-parser";

interface AclRuleBuilderProps {
  acls: AclRule[];
  onChange: (acls: AclRule[]) => void;
  groups: Group[];
  hosts: Host[];
  tagOwners: TagOwner[];
  ipsets: IpSet[];
  isDisabled?: boolean;
}

export function AclRuleBuilder({
  acls,
  onChange,
  groups,
  hosts,
  tagOwners,
  ipsets,
  isDisabled,
}: AclRuleBuilderProps) {
  // Source options: groups, autogroups, tags, hosts
  const groupOptions = groups.map((g) => g.name);
  const autogroupOptions = AUTOGROUPS.map((a) => a.id);
  const hostOptions = hosts.map((h) => h.name);
  const tagOptions = tagOwners.map((t) => t.tag);
  const ipsetOptions = ipsets.map((i) => `#${i.name}`);

  const removeRule = (index: number) => {
    const newAcls = [...acls];
    newAcls.splice(index, 1);
    onChange(newAcls);
  };

  const updateRule = (index: number, updates: Partial<AclRule>) => {
    const newAcls = [...acls];
    newAcls[index] = { ...newAcls[index], ...updates };
    onChange(newAcls);
  };

  const addRule = () => {
    onChange([
      ...acls,
      {
        action: "accept",
        src: [],
        dst: [],
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Access Rules</h3>
        <p className="text-sm text-mist-500 dark:text-mist-400 mb-4">
          Define which sources can access which destinations on which ports. Access is
          deny-by-default - you must explicitly allow traffic.
        </p>
      </div>

      {/* Existing Rules */}
      {acls.length > 0 && (
        <div className="space-y-3 overflow-x-auto">
          {acls.map((rule, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border border-mist-200 dark:border-mist-700 bg-mist-50 dark:bg-mist-900/30 min-w-[600px]"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-sm font-medium">Rule {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeRule(index)}
                  disabled={isDisabled}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Source */}
                <div>
                  <label className="text-xs font-medium block mb-1">Source</label>
                  <select
                    className="w-full text-sm px-2 py-1.5 rounded border border-mist-200 dark:border-mist-700 bg-white dark:bg-mist-900"
                    multiple
                    value={rule.src}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, (o) => o.value);
                      updateRule(index, { src: values });
                    }}
                    disabled={isDisabled}
                    style={{ height: "100px" }}
                  >
                    <optgroup label="Groups">
                      {groupOptions.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Autogroups">
                      {autogroupOptions.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Tags">
                      {tagOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Hosts">
                      {hostOptions.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="IP Sets">
                      {ipsetOptions.map((ipset) => (
                        <option key={ipset} value={ipset}>
                          {ipset}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <Input
                    className="mt-2"
                    label=""
                    placeholder="Or enter IP/CIDR (e.g., 10.0.0.1, 192.168.1.0/24)"
                    value={rule.src.find(s => s.match(/^\d+\.\d+\.\d+\.\d+(\/\d+)?$/)) || ""}
                    onChange={(value) => {
                      const ipValue = typeof value === 'string' ? value.trim() : "";
                      if (ipValue) {
                        const otherSrc = rule.src.filter(s => !s.match(/^\d+\.\d+\.\d+\.\d+(\/\d+)?$/));
                        updateRule(index, { src: [...otherSrc, ipValue] });
                      }
                    }}
                    isDisabled={isDisabled}
                  />
                </div>

                {/* Destination */}
                <div>
                  <label className="text-xs font-medium block mb-1">Destination</label>
                  <select
                    className="w-full text-sm px-2 py-1.5 rounded border border-mist-200 dark:border-mist-700 bg-white dark:bg-mist-900"
                    multiple
                    value={rule.dst.map(d => d.split(":")[0]).filter(d => d !== "*")}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, (o) => o.value);
                      // Get current port from first destination with port
                      const currentPort = rule.dst.find(d => d.includes(":"))?.split(":").slice(1).join(":") || "*";
                      // Always append port to each destination (* becomes *:*)
                      const newDst = values.map((v) => v === "*" ? `*:${currentPort}` : `${v}:${currentPort}`);
                      updateRule(index, { dst: newDst });
                    }}
                    disabled={isDisabled}
                    style={{ height: "100px" }}
                  >
                    <optgroup label="Groups">
                      {groupOptions.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Autogroups">
                      {autogroupOptions.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Tags">
                      {tagOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Hosts">
                      {hostOptions.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="IP Sets">
                      {ipsetOptions.map((ipset) => (
                        <option key={ipset} value={ipset}>
                          {ipset}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <Input
                    className="mt-2"
                    label=""
                    placeholder="Or enter IP/CIDR"
                    value={rule.dst.find(d => d.match(/^\d+\.\d+\.\d+\.\d+(\/\d+)?$/))?.split(":")[0] || ""}
                    onChange={(value) => {
                      const ipValue = typeof value === 'string' ? value.trim() : "";
                      if (ipValue) {
                        const currentPort = rule.dst.find(d => d.includes(":"))?.split(":").slice(1).join(":") || "*";
                        // Remove any existing IP entries
                        const otherDst = rule.dst.filter(d => !d.match(/^\d+\.\d+\.\d+\.\d+(\/\d+)?$/));
                        updateRule(index, { dst: [...otherDst, `${ipValue}:${currentPort}`] });
                      }
                    }}
                    isDisabled={isDisabled}
                  />
                </div>

                {/* Port */}
                <div>
                  <label className="text-xs font-medium block mb-1">Port</label>
                  <Input
                    label=""
                    placeholder="e.g., 443, 80-443, *"
                    value={rule.dst.find(d => d.includes(":"))?.split(":").slice(1).join(":") || "*"}
                    onChange={(value) => {
                      const port = typeof value === 'string' ? value.trim() : "*";
                      if (rule.dst.length === 0) {
                        updateRule(index, { dst: [`*:${port}`] });
                      } else {
                        const newDst = rule.dst.map((d) => {
                          // Handle wildcard - use *:port format
                          if (d === "*" || d === "*:*") {
                            return port === "*" ? "*:*" : `*:${port}`;
                          }
                          // Split by : to get base, but handle tags with colons (tag:name:port)
                          const lastColon = d.lastIndexOf(":");
                          if (lastColon === -1) {
                            // No port specified, add one
                            return port === "*" ? `${d}:*` : `${d}:${port}`;
                          }
                          const base = d.substring(0, lastColon);
                          return port === "*" ? `${base}:*` : `${base}:${port}`;
                        });
                        updateRule(index, { dst: newDst });
                      }
                    }}
                    isDisabled={isDisabled}
                  />
                </div>

                {/* Protocol */}
                <div>
                  <label className="text-xs font-medium block mb-1">Protocol</label>
                  <select
                    className="w-full text-sm px-2 py-1.5 rounded border border-mist-200 dark:border-mist-700 bg-white dark:bg-mist-900"
                    value={rule.proto || ""}
                    onChange={(e) => {
                      updateRule(index, { proto: e.target.value || undefined });
                    }}
                    disabled={isDisabled}
                  >
                    {PROTOCOLS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-3 p-2 rounded bg-white dark:bg-mist-800 text-xs font-mono">
                {rule.src.length > 0 ? rule.src.join(", ") : "<source>"} →{" "}
                {rule.dst.length > 0 ? rule.dst.join(", ") : "<destination>"}
                {rule.proto && ` (${rule.proto})`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Rule */}
      {!isDisabled && (
        <Button onPress={addRule}>
          <Plus className="w-4 h-4 mr-1" />
          Add Rule
        </Button>
      )}

      {acls.length === 0 && (
        <div className="text-center py-8 text-mist-500 dark:text-mist-400">
          <p>No access rules defined.</p>
          <p className="text-sm">Click "Add Rule" to create your first rule.</p>
        </div>
      )}
    </div>
  );
}
