import { Plus, Trash2 } from "lucide-react";

import Button from "~/components/Button";
import Input from "~/components/Input";
import {
  AUTOGROUPS,
  type SshRule,
  type Group,
  type Host,
} from "~/utils/acl-parser";

interface SshRuleBuilderProps {
  ssh: SshRule[];
  onChange: (ssh: SshRule[]) => void;
  groups: Group[];
  hosts: Host[];
  isDisabled?: boolean;
}

export function SshRuleBuilder({
  ssh,
  onChange,
  groups,
  hosts,
  isDisabled,
}: SshRuleBuilderProps) {
  const groupOptions = groups.map((g) => g.name);
  const autogroupOptions = AUTOGROUPS.map((a) => a.id);
  const hostOptions = hosts.map((h) => h.name);

  const removeRule = (index: number) => {
    const newSsh = [...ssh];
    newSsh.splice(index, 1);
    onChange(newSsh);
  };

  const updateRule = (index: number, updates: Partial<SshRule>) => {
    const newSsh = [...ssh];
    newSsh[index] = { ...newSsh[index], ...updates };
    onChange(newSsh);
  };

  const addRule = () => {
    onChange([
      ...ssh,
      {
        action: "accept",
        src: [],
        dst: [],
        users: [],
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">SSH Rules</h3>
        <p className="text-sm text-mist-500 dark:text-mist-400 mb-4">
          Define Tailscale SSH access rules. Use <code className="text-sm">autogroup:nonroot</code>{" "}
          to allow all non-root users.
        </p>
      </div>

      {ssh.length > 0 && (
        <div className="space-y-3 overflow-x-auto">
          {ssh.map((rule, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border border-mist-200 dark:border-mist-700 bg-mist-50 dark:bg-mist-900/30 min-w-[600px]"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Rule {index + 1}</span>
                  <select
                    className="text-sm px-2 py-0.5 rounded border border-mist-200 dark:border-mist-700 bg-white dark:bg-mist-900"
                    value={rule.action}
                    onChange={(e) =>
                      updateRule(index, { action: e.target.value as "accept" | "deny" })
                    }
                    disabled={isDisabled}
                  >
                    <option value="accept">Accept</option>
                    <option value="deny">Deny</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => removeRule(index)}
                  disabled={isDisabled}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    style={{ height: "80px" }}
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
                    <optgroup label="Hosts">
                      {hostOptions.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Destination */}
                <div>
                  <label className="text-xs font-medium block mb-1">Destination</label>
                  <select
                    className="w-full text-sm px-2 py-1.5 rounded border border-mist-200 dark:border-mist-700 bg-white dark:bg-mist-900"
                    multiple
                    value={rule.dst}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, (o) => o.value);
                      updateRule(index, { dst: values });
                    }}
                    disabled={isDisabled}
                    style={{ height: "80px" }}
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
                    <optgroup label="Hosts">
                      {hostOptions.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Users */}
                <div>
                  <label className="text-xs font-medium block mb-1">SSH Users (optional)</label>
                  <Input
                    label=""
                    placeholder="e.g., root, ubuntu, *"
                    value={rule.users?.join(", ") || ""}
                    onChange={(value) => {
                      const val = typeof value === 'string' ? value : "";
                      const users = val.split(",").map((u) => u.trim()).filter(Boolean);
                      updateRule(index, { users });
                    }}
                    isDisabled={isDisabled}
                  />
                  <p className="text-xs text-mist-500 mt-1">Comma-separated or * for any</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isDisabled && (
        <Button onPress={addRule}>
          <Plus className="w-4 h-4 mr-1" />
          Add SSH Rule
        </Button>
      )}

      {ssh.length === 0 && (
        <div className="text-center py-8 text-mist-500 dark:text-mist-400">
          <p>No SSH rules defined.</p>
          <p className="text-sm">Click "Add SSH Rule" to create your first rule.</p>
        </div>
      )}
    </div>
  );
}
