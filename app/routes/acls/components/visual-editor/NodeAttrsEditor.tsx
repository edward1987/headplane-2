import Button from "~/components/Button";
import type { Group, NodeAttr } from "~/utils/acl-parser";

interface NodeAttrsEditorProps {
  nodeAttrs: NodeAttr[];
  onChange: (nodeAttrs: NodeAttr[]) => void;
  groups: Group[];
  isDisabled?: boolean;
}

export function NodeAttrsEditor({ nodeAttrs, onChange, groups, isDisabled }: NodeAttrsEditorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-lg font-medium">Node Attributes</h3>
        <p className="text-sm text-mist-500 dark:text-mist-400">
          Legacy fallback editor for raw node attribute entries.
        </p>
        {groups.length > 0 ? (
          <p className="mt-2 text-xs text-mist-500 dark:text-mist-400">
            Suggested targets include:{" "}
            {groups
              .map((group) => group.name)
              .filter(Boolean)
              .join(", ")}
          </p>
        ) : null}
      </div>

      <textarea
        className="min-h-56 w-full rounded-xl border border-mist-200 bg-white p-3 font-mono text-sm outline-hidden focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/15 dark:border-mist-700 dark:bg-mist-900"
        disabled={isDisabled}
        onChange={(event) => {
          try {
            onChange(JSON.parse(event.target.value) as NodeAttr[]);
          } catch {
            // Keep the last valid state until the JSON is valid again.
          }
        }}
        value={JSON.stringify(nodeAttrs, null, 2)}
      />

      <Button
        isDisabled={isDisabled}
        onPress={() => onChange([...nodeAttrs, { attr: [], target: [] }])}
      >
        Add Node Attribute
      </Button>
    </div>
  );
}
