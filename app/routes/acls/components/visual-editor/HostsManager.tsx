import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import Button from "~/components/Button";
import Input from "~/components/Input";
import type { Host } from "~/utils/acl-parser";

interface HostsManagerProps {
  hosts: Host[];
  onChange: (hosts: Host[]) => void;
  isDisabled?: boolean;
}

export function HostsManager({ hosts, onChange, isDisabled }: HostsManagerProps) {
  const [newHostname, setNewHostname] = useState("");
  const [newIp, setNewIp] = useState("");

  const addHost = () => {
    if (!newHostname.trim() || !newIp.trim()) return;

    onChange([...hosts, { name: newHostname, ip: newIp }]);
    setNewHostname("");
    setNewIp("");
  };

  const removeHost = (index: number) => {
    const newHosts = [...hosts];
    newHosts.splice(index, 1);
    onChange(newHosts);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Host Mappings</h3>
        <p className="text-sm text-mist-500 dark:text-mist-400 mb-4">
          Define hostname to IP address mappings. These can be used as destinations in ACL
          rules instead of IP addresses.
        </p>
      </div>

      {/* Existing Hosts */}
      {hosts.length > 0 && (
        <div className="border border-mist-200 dark:border-mist-700 rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead className="bg-mist-50 dark:bg-mist-800/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Hostname</th>
                <th className="text-left px-4 py-2 font-medium">IP Address</th>
                <th className="text-right px-4 py-2 font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist-100 dark:divide-mist-800">
              {hosts.map((host, index) => (
                <tr key={index}>
                  <td className="px-4 py-3">
                    <code className="text-sm">{host.name}</code>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-sm">{host.ip}</code>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => removeHost(index)}
                      disabled={isDisabled}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add New Host */}
      {!isDisabled && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              label="Hostname"
              placeholder="e.g., postgresql.internal"
              value={newHostname}
              onChange={(value) => setNewHostname(typeof value === 'string' ? value : "")}
            />
          </div>
          <div className="flex-1">
            <Input
              label="IP Address"
              placeholder="e.g., 10.20.0.2/32"
              value={newIp}
              onChange={(value) => setNewIp(typeof value === 'string' ? value : "")}
              onKeyDown={(e) => {
                if (e.key === "Enter") addHost();
              }}
            />
          </div>
          <Button onPress={addHost} isDisabled={!newHostname.trim() || !newIp.trim()}>
            <Plus className="w-4 h-4 mr-1" />
            Add Host
          </Button>
        </div>
      )}
    </div>
  );
}
