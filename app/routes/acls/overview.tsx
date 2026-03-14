import { AlertCircle, Eye, Pencil, Shapes } from "lucide-react";
import { useEffect, useState } from "react";
import { isRouteErrorResponse, useFetcher, useRevalidator } from "react-router";

import { AdminSection, FeatureNotice, StatCard } from "~/components/admin-shell";
import Button from "~/components/Button";
import Card from "~/components/Card";
import Code from "~/components/Code";
import Link from "~/components/link";
import Tabs from "~/components/Tabs";
import { isApiError } from "~/server/headscale/api/error-client";
import toast from "~/utils/toast";

import type { Route } from "./+types/overview";
import { aclAction } from "./acl-action";
import { aclLoader } from "./acl-loader";
import { Differ, Editor } from "./components/cm.client";
import { VisualEditor } from "./components/visual-editor";

export const loader = aclLoader;
export const action = aclAction;

export default function Page({
  loaderData: { access, writable, policy, users, nodes },
}: Route.ComponentProps) {
  const [codePolicy, setCodePolicy] = useState(policy);
  const fetcher = useFetcher<typeof action>();
  const { revalidate } = useRevalidator();
  const disabled = !access || !writable; // Disable if no permission or not writable

  useEffect(() => {
    // Update the codePolicy when the loader data changes
    if (policy !== codePolicy) {
      setCodePolicy(policy);
    }
  }, [policy]);

  useEffect(() => {
    if (!fetcher.data) {
      // No data yet, return
      return;
    }

    if (fetcher.data.success === true) {
      toast("Updated policy");
      revalidate();
    }
  }, [fetcher.data]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs tracking-[0.24em] text-mist-500 uppercase dark:text-mist-400">
          Access
        </p>
        <h1 className="dark:text-mist-25 mt-2 text-3xl font-semibold text-mist-950">ACL policy</h1>
        <p className="mt-2 max-w-3xl text-sm text-mist-600 dark:text-mist-300">
          Define access rules, SSH policy, tags, and auto-approvers for the tailnet. Learn more in
          the{" "}
          <Link external styled to="https://tailscale.com/kb/1018/acls">
            Tailscale ACL guide
          </Link>{" "}
          and{" "}
          <Link external styled to="https://headscale.net/stable/ref/acls/">
            Headscale docs
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Policy length" value={policy.length.toLocaleString()} />
        <StatCard label="Users referenced" value={users.length} />
        <StatCard
          label="Writable"
          tone={!disabled ? "good" : "warn"}
          value={!disabled ? "Yes" : "No"}
        />
      </div>

      {!access ? (
        <FeatureNotice title="ACL policy is restricted" tone="warning">
          You do not have permission to update the Access Control List policy.
        </FeatureNotice>
      ) : !writable ? (
        <FeatureNotice title="ACL policy is read-only" tone="warning">
          Headscale is likely using <Code>policy.mode</Code> set to <Code>file</Code>. Switch to{" "}
          <Code>database</Code> mode to make the policy editable in Headplane.
        </FeatureNotice>
      ) : null}
      {fetcher.data?.error !== undefined ? (
        <FeatureNotice title={fetcher.data.error.split(":")[0] ?? "Error"} tone="danger">
          {fetcher.data.error.split(":").slice(1).join(": ") ??
            "An unknown error occurred while trying to update the ACL policy."}
        </FeatureNotice>
      ) : null}

      <AdminSection
        title="Policy editor"
        description="Switch between raw policy editing, change previews, and the visual editor."
        actions={
          <>
            <Button
              className="mr-2"
              isDisabled={
                disabled ||
                fetcher.state !== "idle" ||
                codePolicy.length === 0 ||
                codePolicy === policy
              }
              onPress={() => {
                const formData = new FormData();
                formData.append("policy", codePolicy);
                fetcher.submit(formData, { method: "PATCH" });
              }}
              variant="heavy"
            >
              Save
            </Button>
            <Button
              isDisabled={disabled || fetcher.state !== "idle" || codePolicy === policy}
              onPress={() => {
                setCodePolicy(policy);
              }}
            >
              Discard changes
            </Button>
          </>
        }
      >
        <Tabs className="mb-2" label="ACL Editor">
          <Tabs.Item
            key="edit"
            title={
              <div className="flex items-center gap-2">
                <Pencil className="p-1" />
                <span>Edit file</span>
              </div>
            }
          >
            <Editor isDisabled={disabled} onChange={setCodePolicy} value={codePolicy} />
          </Tabs.Item>
          <Tabs.Item
            key="diff"
            title={
              <div className="flex items-center gap-2">
                <Eye className="p-1" />
                <span>Preview changes</span>
              </div>
            }
          >
            <Differ left={policy} right={codePolicy} />
          </Tabs.Item>
          <Tabs.Item
            key="visual"
            title={
              <div className="flex items-center gap-2">
                <Shapes className="p-1" />
                <span>Visual editor</span>
              </div>
            }
          >
            <VisualEditor
              policy={codePolicy}
              onChange={setCodePolicy}
              nodes={nodes}
              users={users}
              isDisabled={disabled}
            />
          </Tabs.Item>
        </Tabs>
      </AdminSection>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (
    isRouteErrorResponse(error) &&
    isApiError(error.data) &&
    error.data.rawData.includes("reading policy from path") &&
    error.data.rawData.includes("no such file or directory")
  ) {
    return (
      <div className="flex flex-col gap-4">
        <Card className="max-w-2xl" variant="flat">
          <div className="flex items-center justify-between gap-4">
            <Card.Title>ACL Policy Unavailable</Card.Title>
            <AlertCircle className="mb-2 h-6 w-6 text-red-500" />
          </div>
          <Card.Text>
            The ACL policy is currently unavailable because the policy file does not exist on the
            server. This usually indicates that Headscale is running in <Code>file</Code> mode for
            ACLs, and the specified policy file is missing.
          </Card.Text>
        </Card>
        <Card className="max-w-2xl" variant="flat">
          <Card.Text>
            In order to resolve this issue, there are two possible actions you can take:
          </Card.Text>
          <ul className="mt-2 ml-4 list-outside list-disc space-y-1 text-sm">
            <li>
              Create the ACL policy file at the specified path in your Headscale configuration.
            </li>
            <li>
              Alternatively, you can switch Headscale to use <Code>database</Code> mode for ACLs by
              updating your Headscale configuration. This will allow Headplane to manage the ACL
              policy directly through the web interface.
            </li>
          </ul>
        </Card>
      </div>
    );
  }

  throw error;
}
