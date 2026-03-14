import { Plus, Trash2 } from "lucide-react";

import Button from "~/components/Button";
import Input from "~/components/Input";
import type { TestRule, Group, Host } from "~/utils/acl-parser";
import { AUTOGROUPS } from "~/utils/acl-parser";

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
  const groupOptions = groups.map((g) => g.name);
  const autogroupOptions = AUTOGROUPS.map((a) => a.id);
  const hostOptions = hosts.map((h) => h.name);

  const removeTest = (index: number) => {
    const newTests = [...tests];
    newTests.splice(index, 1);
    onChange(newTests);
  };

  const updateTest = (index: number, updates: Partial<TestRule>) => {
    const newTests = [...tests];
    newTests[index] = { ...newTests[index], ...updates };
    onChange(newTests);
  };

  const addTest = () => {
    onChange([
      ...tests,
      {
        name: `test-${tests.length + 1}`,
        sources: [],
        destination: [],
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">ACL Tests</h3>
        <p className="text-sm text-mist-500 dark:text-mist-400 mb-4">
          Define test cases to validate your ACL policy. Tests check if traffic is allowed between sources and destinations.
        </p>
      </div>

      {tests.length > 0 && (
        <div className="space-y-3 overflow-x-auto">
          {tests.map((test, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border border-mist-200 dark:border-mist-700 bg-mist-50 dark:bg-mist-900/30 min-w-[600px]"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <Input
                    label="Test name"
                    value={test.name}
                    onChange={(value) => {
                      const val = typeof value === 'string' ? value : test.name;
                      updateTest(index, { name: val });
                    }}
                    className="w-40"
                    isDisabled={isDisabled}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeTest(index)}
                  disabled={isDisabled}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sources */}
                <div>
                  <label className="text-xs font-medium block mb-1">Expected Sources</label>
                  <select
                    className="w-full text-sm px-2 py-1.5 rounded border border-mist-200 dark:border-mist-700 bg-white dark:bg-mist-900"
                    multiple
                    value={test.sources}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, (o) => o.value);
                      updateTest(index, { sources: values });
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
                  <label className="text-xs font-medium block mb-1">Expected Destination</label>
                  <select
                    className="w-full text-sm px-2 py-1.5 rounded border border-mist-200 dark:border-mist-700 bg-white dark:bg-mist-900"
                    multiple
                    value={test.destination}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, (o) => o.value);
                      updateTest(index, { destination: values });
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
              </div>
            </div>
          ))}
        </div>
      )}

      {!isDisabled && (
        <Button onPress={addTest}>
          <Plus className="w-4 h-4 mr-1" />
          Add Test
        </Button>
      )}

      {tests.length === 0 && (
        <div className="text-center py-8 text-mist-500 dark:text-mist-400">
          <p>No tests defined.</p>
          <p className="text-sm">Click "Add Test" to create your first test.</p>
        </div>
      )}
    </div>
  );
}
