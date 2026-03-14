import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import Button from "~/components/Button";
import Input from "~/components/Input";
import type { IpSet } from "~/utils/acl-parser";

interface IpsetsEditorProps {
  ipsets: IpSet[];
  onChange: (ipsets: IpSet[]) => void;
  isDisabled?: boolean;
}

export function IpsetsEditor({ ipsets, onChange, isDisabled }: IpsetsEditorProps) {
  const [newName, setNewName] = useState("");
  const [newCidr, setNewCidr] = useState("");

  const addIpset = () => {
    if (!newName.trim()) return;
    onChange([
      ...ipsets,
      { name: newName, cidr: [] },
    ]);
    setNewName("");
  };

  const removeIpset = (index: number) => {
    const newIpsets = [...ipsets];
    newIpsets.splice(index, 1);
    onChange(newIpsets);
  };

  const updateIpset = (index: number, updates: Partial<IpSet>) => {
    const newIpsets = [...ipsets];
    newIpsets[index] = { ...newIpsets[index], ...updates };
    onChange(newIpsets);
  };

  const addCidr = (index: number, cidr: string) => {
    if (!cidr.trim()) return;
    const ipset = ipsets[index];
    updateIpset(index, { cidr: [...ipset.cidr, cidr] });
  };

  const removeCidr = (index: number, cidrIndex: number) => {
    const ipset = ipsets[index];
    updateIpset(index, {
      cidr: ipset.cidr.filter((_, i) => i !== cidrIndex),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">IP Sets</h3>
        <p className="text-sm text-mist-500 dark:text-mist-400 mb-4">
          Define reusable IP sets (CIDR ranges) that can be referenced in ACL rules. Use as{" "}
          <code className="text-sm">#ipsetname</code> in your ACL destinations.
        </p>
      </div>

      {ipsets.length > 0 && (
        <div className="space-y-4">
          {ipsets.map((ipset, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border border-mist-200 dark:border-mist-700 bg-mist-50 dark:bg-mist-900/30"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">#{ipset.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeIpset(index)}
                  disabled={isDisabled}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {ipset.cidr.map((cidr, cidrIndex) => (
                  <div
                    key={cidrIndex}
                    className="flex items-center justify-between p-2 rounded bg-white dark:bg-mist-800"
                  >
                    <code className="text-sm">{cidr}</code>
                    <button
                      type="button"
                      onClick={() => removeCidr(index, cidrIndex)}
                      disabled={isDisabled}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {!isDisabled && (
                  <Input
                    label=""
                    placeholder="e.g., 10.0.0.0/24"
                    className="text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addCidr(index, e.currentTarget.value);
                        e.currentTarget.value = "";
                      }
                    }}
                    onBlur={(e) => {
                      if (e.currentTarget.value) {
                        addCidr(index, e.currentTarget.value);
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isDisabled && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              label="IP Set name"
              placeholder="e.g., office-network"
              value={newName}
              onChange={(value) => setNewName(typeof value === 'string' ? value : "")}
            />
          </div>
          <Button onPress={addIpset} isDisabled={!newName.trim()}>
            <Plus className="w-4 h-4 mr-1" />
            Add IP Set
          </Button>
        </div>
      )}

      {ipsets.length === 0 && (
        <div className="text-center py-8 text-mist-500 dark:text-mist-400">
          <p>No IP sets defined.</p>
          <p className="text-sm">Click "Add IP Set" to create reusable CIDR collections.</p>
        </div>
      )}
    </div>
  );
}
