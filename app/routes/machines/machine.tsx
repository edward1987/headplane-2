import { CheckCircle, CircleSlash, Info, UserCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { data } from "react-router";

import { AdminSection, FeatureNotice, StatCard } from "~/components/admin-shell";
import Attribute from "~/components/Attribute";
import Button from "~/components/Button";
import Chip from "~/components/Chip";
import Link from "~/components/link";
import StatusCircle from "~/components/StatusCircle";
import Tooltip from "~/components/Tooltip";
import { getOSInfo, getTSVersion } from "~/utils/host-info";
import { mapNodes, sortNodeTags } from "~/utils/node-info";
import { getUserDisplayName } from "~/utils/user";

import type { Route } from "./+types/machine";
import { mapTagsToComponents, uiTagsForNode } from "./components/machine-row";
import MenuOptions from "./components/menu";
import Routes from "./dialogs/routes";
import { machineAction } from "./machine-actions";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const principal = await context.auth.require(request);
  if (!params.id) {
    throw new Error("No machine ID provided");
  }

  if (params.id.endsWith(".ico")) {
    throw data(null, { status: 204 });
  }

  let magic: string | undefined;
  if (context.hs.readable() && context.hs.c?.dns.magic_dns) {
    magic = context.hs.c.dns.base_domain;
  }

  const api = context.hsApi.getRuntimeClient(
    context.auth.getHeadscaleApiKey(principal, context.oidc?.apiKey),
  );
  const [nodes, users] = await Promise.all([api.getNodes(), api.getUsers()]);
  const node = nodes.find((entry) => entry.id === params.id);
  if (!node) {
    throw data("Machine not found", { status: 404 });
  }

  const lookup = await context.agents?.lookup([node.nodeKey]);
  const [enhancedNode] = mapNodes([node], lookup);
  const tags = [...node.tags].sort();
  const supportsNodeOwnerChange = !context.hsApi.clientHelpers.isAtleast("0.28.0");

  return {
    agent: context.agents?.agentID(),
    existingTags: sortNodeTags(nodes),
    magic,
    node: enhancedNode,
    stats: lookup?.[enhancedNode.nodeKey],
    supportsNodeOwnerChange,
    tags,
    users,
  };
}

export const action = machineAction;

export default function Page({
  loaderData: { node, tags, users, magic, agent, stats, existingTags, supportsNodeOwnerChange },
}: Route.ComponentProps) {
  const [showRouting, setShowRouting] = useState(false);

  const uiTags = useMemo(() => uiTagsForNode(node, agent === node.nodeKey), [node, agent]);
  const ownerName = node.user ? getUserDisplayName(node.user) : "Tag-owned";
  const domain = magic ? `${node.givenName}.${magic}` : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-mist-500 dark:text-mist-400">
            <Link className="font-medium" to="/machines">
              Machines
            </Link>
            <span className="mx-2">/</span>
            {node.givenName}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <h1 className="dark:text-mist-25 text-3xl font-semibold text-mist-950">
              {node.givenName}
            </h1>
            <StatusCircle className="h-4 w-4" isOnline={node.online && !node.expired} />
          </div>
          <p className="mt-2 max-w-3xl text-sm text-mist-600 dark:text-mist-300">
            Detailed diagnostics and operational controls for this machine, including routing, DNS,
            keys, and connectivity metadata.
          </p>
        </div>
        <MenuOptions
          existingTags={existingTags}
          isFullButton
          magic={magic}
          node={node}
          users={users}
          supportsNodeOwnerChange={supportsNodeOwnerChange}
        />
      </div>

      {!supportsNodeOwnerChange ? (
        <FeatureNotice title="Owner reassignment unavailable">
          This Headscale version does not support changing the owner of an existing machine.
        </FeatureNotice>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Owner" value={ownerName} />
        <StatCard
          label="Status"
          value={node.online && !node.expired ? "Connected" : "Offline"}
          tone={node.online && !node.expired ? "good" : "warn"}
        />
        <StatCard label="Subnet routes" value={node.customRouting.subnetApprovedRoutes.length} />
        <StatCard
          label="Exit node"
          value={
            node.customRouting.exitApproved
              ? "Allowed"
              : node.customRouting.exitRoutes.length > 0
                ? "Pending"
                : "Disabled"
          }
          tone={
            node.customRouting.exitApproved
              ? "good"
              : node.customRouting.exitRoutes.length > 0
                ? "warn"
                : "default"
          }
        />
      </div>

      <AdminSection
        title="Machine identity"
        description="Ownership, state, and user-visible naming for this device."
        actions={
          <Button onPress={() => setShowRouting(true)} variant="light">
            Review routes
          </Button>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-mist-200 bg-mist-50/70 p-4 dark:border-mist-800 dark:bg-mist-900/40">
            <span className="flex items-center gap-x-1 text-sm text-mist-600 dark:text-mist-300">
              Managed by
              <Tooltip>
                <Info className="p-1" />
                <Tooltip.Body>
                  By default, a machine’s permissions match its creator’s.
                </Tooltip.Body>
              </Tooltip>
            </span>
            <div className="mt-2 flex items-center gap-x-2.5">
              <UserCircle />
              {ownerName}
            </div>
            <div className="mt-4">
              <p className="text-sm text-mist-600 dark:text-mist-300">Status tags</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {mapTagsToComponents(node, uiTags)}
                {tags.map((tag) => (
                  <Chip key={tag} text={tag} />
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Attribute name="Machine name" value={node.givenName} />
            <Attribute
              name="OS hostname"
              tooltip="OS hostname is published by the operating system and used as the default machine name."
              value={node.name}
            />
            <Attribute name="Created" value={new Date(node.createdAt).toLocaleString()} />
            <Attribute
              name="Last seen"
              value={
                node.online && !node.expired
                  ? "Connected"
                  : new Date(node.lastSeen).toLocaleString()
              }
            />
            <Attribute
              name="Key expiry"
              value={node.expiry !== null ? new Date(node.expiry).toLocaleString() : "Never"}
            />
            {domain ? <Attribute isCopyable name="Magic DNS" value={domain} /> : null}
          </div>
        </div>
      </AdminSection>

      <Routes isOpen={showRouting} node={node} setIsOpen={setShowRouting} />

      <AdminSection
        title="Subnets and routing"
        description="Inspect advertised routes, approvals, and exit node capability."
        actions={
          <Button onPress={() => setShowRouting(true)} variant="ghost">
            Edit routing
          </Button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <RouteSummary
            description="Traffic to these routes is being routed through this machine."
            label="Approved"
            routes={node.customRouting.subnetApprovedRoutes}
          />
          <RouteSummary
            description="These routes are advertised but still awaiting approval."
            label="Awaiting approval"
            routes={node.customRouting.subnetWaitingRoutes}
          />
          <div className="rounded-2xl border border-mist-200 bg-white/60 p-4 dark:border-mist-800 dark:bg-mist-950/40">
            <span className="flex items-center gap-x-1 text-mist-600 dark:text-mist-300">
              Exit node
              <Tooltip>
                <Info className="h-3.5 w-3.5" />
                <Tooltip.Body>
                  Whether this machine can route internet-bound traffic for other devices.
                </Tooltip.Body>
              </Tooltip>
            </span>
            <div className="mt-3">
              {node.customRouting.exitRoutes.length === 0 ? (
                <span className="opacity-50">—</span>
              ) : node.customRouting.exitApproved ? (
                <span className="flex items-center gap-x-1">
                  <CheckCircle className="h-3.5 w-3.5 text-green-700" />
                  Allowed
                </span>
              ) : (
                <span className="flex items-center gap-x-1">
                  <CircleSlash className="h-3.5 w-3.5 text-red-700" />
                  Awaiting approval
                </span>
              )}
            </div>
          </div>
        </div>
      </AdminSection>

      <AdminSection
        title="Machine diagnostics"
        description="Network, identity, and client connectivity details used for troubleshooting."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="grid gap-3">
            <Attribute name="Creator" value={ownerName} />
            {stats ? (
              <>
                <Attribute name="OS" value={getOSInfo(stats)} />
                <Attribute name="Tailscale version" value={getTSVersion(stats)} />
              </>
            ) : null}
            <Attribute
              name="ID"
              tooltip="ID for this machine, used by the Headscale API."
              value={node.id}
            />
            <Attribute
              isCopyable
              name="Node key"
              tooltip="Public key that uniquely identifies this machine."
              value={node.nodeKey}
            />
            <Attribute
              isCopyable
              name="Machine key"
              tooltip="Machine identity key as reported by Headscale."
              value={node.machineKey}
            />
          </div>

          <div className="grid gap-3">
            <p className="text-sm font-semibold uppercase opacity-75">Addresses</p>
            <Attribute
              isCopyable
              name="Tailscale IPv4"
              tooltip="This machine’s IPv4 address within the tailnet."
              value={getIpv4Address(node.ipAddresses)}
            />
            <Attribute
              isCopyable
              name="Tailscale IPv6"
              tooltip="This machine’s IPv6 address within the tailnet."
              value={getIpv6Address(node.ipAddresses)}
            />
            <Attribute isCopyable name="Short domain" value={node.givenName} />
            {domain ? <Attribute isCopyable name="Full domain" value={domain} /> : null}
            {stats ? (
              <>
                <p className="mt-4 text-sm font-semibold uppercase opacity-75">
                  Client connectivity
                </p>
                <Attribute
                  name="Preferred DERP"
                  value={
                    stats.NetInfo?.PreferredDERP !== undefined
                      ? String(stats.NetInfo.PreferredDERP)
                      : "Unknown"
                  }
                />
                <Attribute name="UDP" value={boolToStatus(stats.NetInfo?.WorkingUDP)} />
                <Attribute name="IPv6" value={boolToStatus(stats.NetInfo?.WorkingIPv6)} />
                <Attribute name="Port mapping" value={boolToStatus(stats.NetInfo?.HavePortMap)} />
                <Attribute name="Firewall mode" value={stats.NetInfo?.FirewallMode ?? "Unknown"} />
              </>
            ) : null}
          </div>
        </div>
      </AdminSection>
    </div>
  );
}

function RouteSummary({
  label,
  description,
  routes,
}: {
  label: string;
  description: string;
  routes: string[];
}) {
  return (
    <div className="rounded-2xl border border-mist-200 bg-white/60 p-4 dark:border-mist-800 dark:bg-mist-950/40">
      <span className="flex items-center gap-x-1 text-mist-600 dark:text-mist-300">
        {label}
        <Tooltip>
          <Info className="h-3.5 w-3.5" />
          <Tooltip.Body>{description}</Tooltip.Body>
        </Tooltip>
      </span>
      <div className="mt-3">
        {routes.length === 0 ? (
          <span className="opacity-50">—</span>
        ) : (
          <ul className="leading-normal">
            {routes.map((route) => (
              <li key={route}>{route}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function getIpv4Address(addresses: string[]) {
  return addresses.find((ip) => !ip.includes(":")) ?? "Unavailable";
}

function getIpv6Address(addresses: string[]) {
  return addresses.find((ip) => ip.includes(":")) ?? "Unavailable";
}

function boolToStatus(value?: boolean) {
  if (value === true) {
    return "Available";
  }
  if (value === false) {
    return "Unavailable";
  }
  return "Unknown";
}
