import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import Button from "~/components/Button";
import Input from "~/components/Input";
import type { Group } from "~/utils/acl-parser";

interface GroupsManagerProps {
  groups: Group[];
  onChange: (groups: Group[]) => void;
  availableUsers: { id: string; name: string; email: string }[];
  isDisabled?: boolean;
}

export function GroupsManager({
  groups,
  onChange,
  availableUsers,
  isDisabled,
}: GroupsManagerProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addGroup = () => {
    if (!newGroupName.trim()) return;
    const formattedName = newGroupName.startsWith("group:")
      ? newGroupName
      : `group:${newGroupName}`;

    onChange([...groups, { name: formattedName, users: [] }]);
    setNewGroupName("");
  };

  const removeGroup = (index: number) => {
    const newGroups = [...groups];
    newGroups.splice(index, 1);
    onChange(newGroups);
  };

  const updateGroup = (index: number, updates: Partial<Group>) => {
    const newGroups = [...groups];
    newGroups[index] = { ...newGroups[index], ...updates };
    onChange(newGroups);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Groups</h3>
        <p className="text-sm text-mist-500 dark:text-mist-400 mb-4">
          Define groups of users who share common permissions. Groups are referenced as{" "}
          <code className="text-sm">group:name</code> in ACL rules.
        </p>
      </div>

      {/* Existing Groups */}
      {groups.length > 0 && (
        <div className="border border-mist-200 dark:border-mist-700 rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-mist-50 dark:bg-mist-800/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Group Name</th>
                <th className="text-left px-4 py-2 font-medium">Users</th>
                <th className="text-right px-4 py-2 font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist-100 dark:divide-mist-800">
              {groups.map((group, index) => (
                <tr key={index}>
                  <td className="px-4 py-3">
                    {editingIndex === index ? (
                      <Input
                        isRequired
                        label="Group name"
                        value={group.name.replace(/^group:/, "")}
                        onChange={(value) => {
                          const val = typeof value === 'string' ? value : "";
                          updateGroup(index, {
                            name: val.startsWith("group:") ? val : `group:${val}`,
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setEditingIndex(null);
                        }}
                        onBlur={() => setEditingIndex(null)}
                        className="w-40"
                      />
                    ) : (
                      <code className="text-sm">{group.name}</code>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {group.users.map((user, userIndex) => (
                        <span
                          key={userIndex}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-mist-100 dark:bg-mist-800 text-xs"
                        >
                          {user}
                          <button
                            type="button"
                            onClick={() => {
                              const newUsers = [...group.users];
                              newUsers.splice(userIndex, 1);
                              updateGroup(index, { users: newUsers });
                            }}
                            className="hover:text-red-500"
                            disabled={isDisabled}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {!isDisabled && (
                        <input
                          type="text"
                          placeholder="Add user..."
                          className="text-xs px-2 py-0.5 rounded border border-mist-200 dark:border-mist-700 bg-transparent"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && e.currentTarget.value) {
                              const newUsers = [...group.users, e.currentTarget.value];
                              updateGroup(index, { users: newUsers });
                              e.currentTarget.value = "";
                            }
                          }}
                          onBlur={(e) => {
                            if (e.currentTarget.value) {
                              const newUsers = [...group.users, e.currentTarget.value];
                              updateGroup(index, { users: newUsers });
                              e.currentTarget.value = "";
                            }
                          }}
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      {!isDisabled && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditingIndex(editingIndex === index ? null : index)
                          }
                          className="text-mist-500 hover:text-mist-700 dark:hover:text-mist-300 text-sm"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeGroup(index)}
                        disabled={isDisabled}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add New Group */}
      {!isDisabled && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              label="New group name"
              placeholder="e.g., engineering, hr, admins"
              value={newGroupName}
              onChange={(value) => setNewGroupName(typeof value === 'string' ? value : "")}
              onKeyDown={(e) => {
                if (e.key === "Enter") addGroup();
              }}
            />
          </div>
          <Button onPress={addGroup} isDisabled={!newGroupName.trim()}>
            <Plus className="w-4 h-4 mr-1" />
            Add Group
          </Button>
        </div>
      )}
    </div>
  );
}
