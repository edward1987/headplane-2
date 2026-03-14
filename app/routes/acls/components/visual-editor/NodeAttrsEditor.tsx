import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import Button from "~/components/Button";
import { NODE_ATTRS, type NodeAttr, type Group } from "~/utils/acl-parser";

interface NodeAttrsEditorProps {
  nodeAttrs: NodeAttr[];
  onChange: (nodeAttrs: NodeAttr[]) => void;
  groups: Group[];
  isDisabled?: boolean;
}

export function NodeAttrsEditor({
  nodeAttrs,
  onChange,
  groups,
  isDisabled,
}: NodeAttrsEditorProps) {
  const groupOptions = groups.map((g) => g.name);

  const removeNodeAttr = (index: number) => {
    const newNodeAttrs = [...nodeAttrs];
    newNodeAttrs.splice(index, 1);
    onChange(newNodeAttrs);
  };

  const updateNodeAttr = (index: number, updates: Partial<NodeAttr>) => {
    const newNodeAttrs = [...nodeAttrs];
    newNodeAttrs[index] = { ...newNodeAttrs[index], ...updates };
    onChange(newNodeAttrs);
  };

  const addNodeAttr = () => {
    onChange([
      ...nodeAttrs,
      {
        attr: [],
        groups: [],
        users: [],
        tags: [],
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Node Attributes</h3>
        <p className="text-sm text-mist-500 dark:text-mist-400 mb-4">
          Set node-level attributes like <code className="text-sm">funnel</code> or{" "}
          <code className="text-sm">shields_up</code> for specific groups/users/tags.
        </p>
      </div>

      {nodeAttrs.length > 0 && (
        <div className="space-y-3 overflow-x-auto">
          {nodeAttrs.map((nodeAttr, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border border-mist-200 dark:border-mist-700 bg-mist-50 dark:bg-mist-900/30 min-w-[600px]"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-sm font-medium">Rule {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeNodeAttr(index)}
                  disabled={isDisabled}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Attributes */}
                <div>
                  <label className="text-xs font-medium block mb-1">Attributes</label>
                  <select
                    className="w-full text-sm px-2 py-1.5 rounded border border-mist-200 dark:border-mist-700 bg-white dark:bg-mist-900"
                    multiple
                    value={nodeAttr.attr}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, (o) => o.value);
                      updateNodeAttr(index, { attr: values });
                    }}
                    disabled={isDisabled}
                    style={{ height: "80px" }}
                  >
                    {NODE_ATTRS.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target (groups/users/tags) */}
                <div>
                  <label className="text-xs font-medium block mb-1">Apply to (Groups/Users/Tags)</label>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-mist-500">Groups:</span>
                      <select
                        className="w-full text-sm px-2 py-1 rounded border border-mist-200 dark:border-mist-700 bg-white dark:bg-mist-900 mt-1"
                        multiple
                        value={nodeAttr.groups || []}
                        onChange={(e) => {
                          const values = Array.from(e.target.selectedOptions, (o) => o.value);
                          updateNodeAttr(index, { groups: values });
                        }}
                        disabled={isDisabled}
                        style={{ height: "50px" }}
                      >
                        {groupOptions.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isDisabled && (
        <Button onPress={addNodeAttr}>
          <Plus className="w-4 h-4 mr-1" />
          Add Node Attribute
        </Button>
      )}

      {nodeAttrs.length === 0 && (
        <div className="text-center py-8 text-mist-500 dark:text-mist-400">
          <p>No node attributes defined.</p>
          <p className="text-sm">Click "Add Node Attribute" to configure node features.</p>
        </div>
      )}
    </div>
  );
}
