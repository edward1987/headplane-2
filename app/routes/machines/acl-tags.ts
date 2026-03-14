import { parseAclPolicy, normalizeTagName } from "~/utils/acl-parser";

export function getAclTagsFromPolicy(policy: string) {
  const parsed = parseAclPolicy(policy);
  return parsed.tagOwners
    .map((tagOwner) => normalizeTagName(tagOwner.tag))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}
