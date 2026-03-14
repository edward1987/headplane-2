import Button from "~/components/Button";
import type { AutoApprovers, Group } from "~/utils/acl-parser";

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
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-lg font-medium">Auto Approvers</h3>
        <p className="text-sm text-mist-500 dark:text-mist-400">
          Legacy editor fallback. The new ACL designer provides a richer interface for route and
          exit-node approvals.
        </p>
        {groups.length > 0 ? (
          <p className="mt-2 text-xs text-mist-500 dark:text-mist-400">
            Existing groups:{" "}
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
            onChange(JSON.parse(event.target.value) as AutoApprovers);
          } catch {
            // Keep the last valid state until the JSON is valid again.
          }
        }}
        value={JSON.stringify(autoApprovers, null, 2)}
      />

      <Button
        isDisabled={isDisabled}
        onPress={() =>
          onChange({
            ...autoApprovers,
            routes: autoApprovers.routes ?? { "": [] },
          })
        }
      >
        Seed routes object
      </Button>
    </div>
  );
}
