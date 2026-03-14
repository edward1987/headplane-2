import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import Button from "~/components/Button";
import Input from "~/components/Input";
import type { TagOwner, Group } from "~/utils/acl-parser";

interface TagOwnersEditorProps {
  tagOwners: TagOwner[];
  onChange: (tagOwners: TagOwner[]) => void;
  groups: Group[];
  isDisabled?: boolean;
}

export function TagOwnersEditor({
  tagOwners,
  onChange,
  groups,
  isDisabled,
}: TagOwnersEditorProps) {
  const [newTag, setNewTag] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addTagOwner = () => {
    if (!newTag.trim()) return;
    const formattedTag = newTag.startsWith("tag:") ? newTag : `tag:${newTag}`;

    onChange([...tagOwners, { tag: formattedTag, owners: [] }]);
    setNewTag("");
  };

  const removeTagOwner = (index: number) => {
    const newTagOwners = [...tagOwners];
    newTagOwners.splice(index, 1);
    onChange(newTagOwners);
  };

  const updateTagOwner = (index: number, updates: Partial<TagOwner>) => {
    const newTagOwners = [...tagOwners];
    newTagOwners[index] = { ...newTagOwners[index], ...updates };
    onChange(newTagOwners);
  };

  // Build owner options from groups
  const ownerOptions = groups.map((g) => g.name);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Tag Owners</h3>
        <p className="text-sm text-mist-500 dark:text-mist-400 mb-4">
          Define which users or groups are authorized to assign specific tags to their
          machines. Tags are referenced as <code className="text-sm">tag:name</code> in ACL
          rules.
        </p>
      </div>

      {/* Existing Tag Owners */}
      {tagOwners.length > 0 && (
        <div className="border border-mist-200 dark:border-mist-700 rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-mist-50 dark:bg-mist-800/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Tag</th>
                <th className="text-left px-4 py-2 font-medium">Owners</th>
                <th className="text-right px-4 py-2 font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist-100 dark:divide-mist-800">
              {tagOwners.map((tagOwner, index) => (
                <tr key={index}>
                  <td className="px-4 py-3">
                    {editingIndex === index ? (
                      <Input
                        isRequired
                        label="Tag name"
                        value={tagOwner.tag.replace(/^tag:/, "")}
                        onChange={(value) => {
                          const val = typeof value === 'string' ? value : "";
                          updateTagOwner(index, {
                            tag: val.startsWith("tag:") ? val : `tag:${val}`,
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setEditingIndex(null);
                        }}
                        onBlur={() => setEditingIndex(null)}
                        className="w-40"
                      />
                    ) : (
                      <code className="text-sm">{tagOwner.tag}</code>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {tagOwner.owners.map((owner, ownerIndex) => (
                        <span
                          key={ownerIndex}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-xs"
                        >
                          {owner}
                          <button
                            type="button"
                            onClick={() => {
                              const newOwners = [...tagOwner.owners];
                              newOwners.splice(ownerIndex, 1);
                              updateTagOwner(index, { owners: newOwners });
                            }}
                            className="hover:text-red-500"
                            disabled={isDisabled}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {!isDisabled && ownerOptions.length > 0 && (
                        <select
                          className="text-xs px-2 py-0.5 rounded border border-mist-200 dark:border-mist-700 bg-transparent"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              const newOwners = [...tagOwner.owners, e.target.value];
                              updateTagOwner(index, { owners: newOwners });
                            }
                          }}
                        >
                          <option value="">Add owner...</option>
                          {ownerOptions
                            .filter((o) => !tagOwner.owners.includes(o))
                            .map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                        </select>
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
                        onClick={() => removeTagOwner(index)}
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

      {/* Add New Tag Owner */}
      {!isDisabled && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              label="New tag"
              placeholder="e.g., prod-database, web-server"
              value={newTag}
              onChange={(value) => setNewTag(typeof value === 'string' ? value : "")}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTagOwner();
              }}
            />
          </div>
          <Button onPress={addTagOwner} isDisabled={!newTag.trim()}>
            <Plus className="w-4 h-4 mr-1" />
            Add Tag
          </Button>
        </div>
      )}
    </div>
  );
}
