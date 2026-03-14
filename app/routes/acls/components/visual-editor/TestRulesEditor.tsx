import Button from "~/components/Button";
import type { Group, Host, TestRule } from "~/utils/acl-parser";

interface TestRulesEditorProps {
  tests: TestRule[];
  onChange: (tests: TestRule[]) => void;
  groups: Group[];
  hosts: Host[];
  isDisabled?: boolean;
}

export function TestRulesEditor({
  tests,
  onChange,
  groups,
  hosts,
  isDisabled,
}: TestRulesEditorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-lg font-medium">ACL Tests</h3>
        <p className="text-sm text-mist-500 dark:text-mist-400">
          Legacy fallback editor for raw ACL test entries.
        </p>
        <p className="mt-2 text-xs text-mist-500 dark:text-mist-400">
          Known groups:{" "}
          {groups
            .map((group) => group.name)
            .filter(Boolean)
            .join(", ") || "none"}
        </p>
        <p className="mt-1 text-xs text-mist-500 dark:text-mist-400">
          Known hosts:{" "}
          {hosts
            .map((host) => host.name)
            .filter(Boolean)
            .join(", ") || "none"}
        </p>
      </div>

      <textarea
        className="min-h-56 w-full rounded-xl border border-mist-200 bg-white p-3 font-mono text-sm outline-hidden focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/15 dark:border-mist-700 dark:bg-mist-900"
        disabled={isDisabled}
        onChange={(event) => {
          try {
            onChange(JSON.parse(event.target.value) as TestRule[]);
          } catch {
            // Keep the last valid state until the JSON is valid again.
          }
        }}
        value={JSON.stringify(tests, null, 2)}
      />

      <Button
        isDisabled={isDisabled}
        onPress={() => onChange([...tests, { accept: [], deny: [], src: "" }])}
      >
        Add Test
      </Button>
    </div>
  );
}
