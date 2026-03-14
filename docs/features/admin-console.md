# Admin Console

Headplane now ships with an admin-first console that organizes Headscale operations into a single navigation system:

- `Overview` for health, compatibility, counts, and quick actions
- `Machines` for device lifecycle, routing, and ownership
- `Users` for identity, role, and linked-account administration
- `Access` for ACL policy editing
- `DNS` for Headscale DNS configuration
- `Keys` for API keys and pre-auth keys
- `Settings` for config-aware feature management
- `Advanced` for debug and system-level controls

## API Keys

The `Keys` section now separates API key management from pre-auth key management:

- Create Headscale API keys with explicit expiry windows
- Review currently known API keys
- Expire stale or compromised API keys
- Continue using pre-auth keys for machine enrollment

## Debug Tools

The `Advanced` area is intentionally separated from routine administration.

It contains:

- Debug machine creation for API troubleshooting
- Integration status and reload/apply controls
- Runtime visibility into whether Headplane can read and write the Headscale configuration

Use these controls carefully, especially on production systems.

## Integration-Aware System Status

When Headplane has access to a supported runtime integration, the system page shows:

- active integration mode
- config readability and writability
- whether reload/apply actions are available
- whether debug/info endpoints are enabled

If no supported integration is active, Headplane still shows diagnostics but will keep dangerous controls read-only.
