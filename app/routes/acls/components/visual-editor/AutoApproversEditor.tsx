import { useState } from "react";

import Button from "~/components/Button";
import Input from "~/components/Input";
import Switch from "~/components/Switch";
import type { AutoApprovers, Group } from "~/utils/acl-parser";
import { AUTOGROUPS } from "~/utils/acl-parser";

interface AutoApproversEditorProps {
  autoApprovers: AutoApprovers;
  onChange: (autoApprovers: AutoApprovers) => void;
  groups: Group[];
  isDisabled?: boolean;
}

export function AutoApproversEditor({
  autoApprovers,
  onChange,
  groups,
  isDisabled,
}: AutoApproversEditorProps) {
  const [newRoute, setNewRoute] = useState("");
  const [newExitNode, setNewExitNode] = useState("");

  const groupOptions = groups.map((g) => g.name);
  const autogroupOptions = AUTOGROUPS.map((a) => a.id);

  const addRoute = () => {
    if (!newRoute.trim()) return;
    const routes = autoApprovers.routes?.advertiseRoutes || [];
    onChange({
      ...autoApprovers,
      routes: {
        advertiseRoutes: [...routes, newRoute],
      },
    });
    setNewRoute("");
  };

  const removeRoute = (index: number) => {
    const routes = autoApprovers.routes?.advertiseRoutes || [];
    onChange({
      ...autoApprovers,
      routes: {
        advertiseRoutes: routes.filter((_, i) => i !== index),
      },
    });
  };

  const addExitNode = () => {
    if (!newExitNode.trim()) return;
    const exitNodes = autoApprovers.exitNodes?.acceptExitNodes || [];
    onChange({
      ...autoApprovers,
      exitNodes: {
        acceptExitNodes: [...exitNodes, newExitNode],
      },
    });
    setNewExitNode("");
  };

  const removeExitNode = (index: number) => {
    const exitNodes = autoApprovers.exitNodes?.acceptExitNodes || [];
    onChange({
      ...autoApprovers,
      exitNodes: {
        acceptExitNodes: exitNodes.filter((_, i) => i !== index),
      },
    });
  };

  const toggleDerp = () => {
    onChange({
      ...autoApprovers,
      derp: {
        acceptMagicIPs: !autoApprovers.derp?.acceptMagicIPs,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Auto Approvers</h3>
        <p className="text-sm text-mist-500 dark:text-mist-400 mb-4">
          Automatically approve requests from users/groups without manual intervention.
        </p>
      </div>

      {/* Advertise Routes */}
      <div>
        <h4 className="text-sm font-medium mb-2">Advertise Routes</h4>
        <p className="text-xs text-mist-500 dark:text-mist-400 mb-2">
          Subnet routes to automatically approve when advertised by these groups/users.
        </p>
        <div className="space-y-2">
          {(autoApprovers.routes?.advertiseRoutes || []).map((route, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 rounded bg-mist-100 dark:bg-mist-800"
            >
              <code className="text-sm">{route}</code>
              <button
                type="button"
                onClick={() => removeRoute(index)}
                disabled={isDisabled}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          ))}
          {!isDisabled && (
            <div className="flex gap-2">
              <Input
                label=""
                placeholder="e.g., 10.0.0.0/24"
                value={newRoute}
                onChange={(value) => setNewRoute(typeof value === 'string' ? value : "")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addRoute();
                }}
              />
              <Button onPress={addRoute} isDisabled={!newRoute.trim()}>
                Add
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Exit Nodes */}
      <div>
        <h4 className="text-sm font-medium mb-2">Exit Nodes</h4>
        <p className="text-xs text-mist-500 dark:text-mist-400 mb-2">
          Groups/users that can use any exit node without manual approval.
        </p>
        <div className="space-y-2">
          {(autoApprovers.exitNodes?.acceptExitNodes || []).map((exitNode, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 rounded bg-mist-100 dark:bg-mist-800"
            >
              <code className="text-sm">{exitNode}</code>
              <button
                type="button"
                onClick={() => removeExitNode(index)}
                disabled={isDisabled}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          ))}
          {!isDisabled && (
            <div className="flex gap-2">
              <select
                className="flex-1 text-sm px-2 py-1.5 rounded border border-mist-200 dark:border-mist-700 bg-white dark:bg-mist-900"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    const exitNodes = autoApprovers.exitNodes?.acceptExitNodes || [];
                    onChange({
                      ...autoApprovers,
                      exitNodes: {
                        acceptExitNodes: [...exitNodes, e.target.value],
                      },
                    });
                  }
                }}
              >
                <option value="">Select group...</option>
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
              </select>
            </div>
          )}
        </div>
      </div>

      {/* DERP */}
      <div>
        <h4 className="text-sm font-medium mb-2">DERP (Magic IPs)</h4>
        <div className="flex items-center gap-3">
          <Switch
            isSelected={autoApprovers.derp?.acceptMagicIPs || false}
            label="Auto-approve DERP relay selection"
            onChange={toggleDerp}
            isDisabled={isDisabled}
          />
          <span className="text-sm">Auto-approve DERP relay selection</span>
        </div>
        <p className="text-xs text-mist-500 dark:text-mist-400 mt-1">
          Allow users/groups to use any DERP node automatically.
        </p>
      </div>
    </div>
  );
}
