import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";

import { AdminSection, FeatureNotice, StatCard } from "~/components/admin-shell";
import Code from "~/components/Code";
import type { LoadContext } from "~/server";
import { Capabilities } from "~/server/web/roles";

import ManageDomains from "./components/manage-domains";
import ManageNS from "./components/manage-ns";
import ManageRecords from "./components/manage-records";
import RenameTailnet from "./components/rename-tailnet";
import ToggleMagic from "./components/toggle-magic";
import { dnsAction } from "./dns-actions";

// We do not want to expose every config value
export async function loader({ request, context }: LoaderFunctionArgs<LoadContext>) {
  if (!context.hs.readable()) {
    throw new Error("No configuration is available");
  }

  const principal = await context.auth.require(request);
  const check = context.auth.can(principal, Capabilities.read_network);
  if (!check) {
    // Not authorized to view this page
    throw new Error(
      "You do not have permission to view this page. Please contact your administrator.",
    );
  }

  const writablePermission = context.auth.can(principal, Capabilities.write_network);

  const config = context.hs.c!;
  const dns = {
    prefixes: config.prefixes,
    magicDns: config.dns.magic_dns,
    baseDomain: config.dns.base_domain,
    nameservers: config.dns.nameservers.global,
    splitDns: config.dns.nameservers.split,
    searchDomains: config.dns.search_domains,
    overrideDns: config.dns.override_local_dns,
    extraRecords: context.hs.d,
  };

  return {
    ...dns,
    access: writablePermission,
    writable: context.hs.writable(),
  };
}

export async function action(data: ActionFunctionArgs) {
  return dnsAction(data);
}

export default function Page() {
  const data = useLoaderData<typeof loader>();

  const allNs: Record<string, string[]> = {};
  for (const key of Object.keys(data.splitDns)) {
    allNs[key] = data.splitDns[key];
  }

  allNs.global = data.nameservers;
  const isDisabled = data.access === false || data.writable === false;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs tracking-[0.24em] text-mist-500 uppercase dark:text-mist-400">DNS</p>
        <h1 className="dark:text-mist-25 mt-2 text-3xl font-semibold text-mist-950">
          Tailnet naming and resolution
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-mist-600 dark:text-mist-300">
          Configure tailnet DNS behavior, nameservers, search domains, and extra records.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Base domain" value={data.baseDomain} />
        <StatCard
          label="Magic DNS"
          tone={data.magicDns ? "good" : "warn"}
          value={data.magicDns ? "Enabled" : "Disabled"}
        />
        <StatCard label="Global nameservers" value={data.nameservers.length} />
        <StatCard label="Extra records" value={data.extraRecords.length} />
      </div>

      {!data.writable ? (
        <FeatureNotice title="Configuration is read-only" tone="warning">
          The Headscale configuration file is not writable, so DNS changes cannot be applied from
          this session.
        </FeatureNotice>
      ) : null}
      {!data.access ? (
        <FeatureNotice title="DNS mutations are restricted" tone="warning">
          Your role does not allow you to modify DNS settings for this tailnet.
        </FeatureNotice>
      ) : null}

      <RenameTailnet isDisabled={isDisabled} name={data.baseDomain} />

      <AdminSection title="Nameservers" description="Configure global and split DNS nameservers.">
        <ManageNS isDisabled={isDisabled} nameservers={allNs} overrideLocalDns={data.overrideDns} />
      </AdminSection>

      <AdminSection
        title="Extra records"
        description="Publish static records into the tailnet DNS view."
      >
        <ManageRecords isDisabled={isDisabled} records={data.extraRecords} />
      </AdminSection>

      <AdminSection
        title="Search domains"
        description="Control search suffixes and user-facing DNS ergonomics."
      >
        <ManageDomains
          isDisabled={isDisabled}
          magic={data.magicDns ? data.baseDomain : undefined}
          searchDomains={data.searchDomains}
        />
      </AdminSection>

      <AdminSection
        title="Magic DNS"
        description="Automatically register DNS names for devices on the tailnet."
      >
        <p className="mb-4 text-sm text-mist-600 dark:text-mist-300">
          Devices will be reachable at{" "}
          <Code>
            [device].
            {data.baseDomain}
          </Code>{" "}
          when Magic DNS is enabled.
        </p>
        <ToggleMagic isDisabled={isDisabled} isEnabled={data.magicDns} />
      </AdminSection>
    </div>
  );
}
