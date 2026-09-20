# Mica implementation analysis

## Reviewed code map

Reviewed `src/main.ts`, optimizer/conversion and rollback workflows, `src/billing.ts`, billing policy, settings/types, account/support modules, and publish synchronization.

## Changes and safeguards

- Conversion usage is account-scoped with authenticated entitlements/spend and durable stable event IDs; unauthorized or uncertain billing blocks conversion.
- Daily free conversions and purchased balances remain server-authoritative; reinstall cannot reset account limits.
- Folder selection, preview, and rollback defaults keep the first optimization safe; media mutation remains explicit.
- Primary conversion/rollback actions lead menus, with quality, metadata, watched folders, and billing advanced settings later.

## Threat model and migration

Vault media stays local. Billing sends only account/install identifiers, and passwords/tokens/file contents are excluded from diagnostics. Invalid sessions are cleared and pending events remain until authoritative resolution.

## Documentation and logging

Help covers conversion, preview, rollback, defaults, account/billing, privacy, troubleshooting, and metadata policy. Logs cover lifecycle, batch progress/cancel, billing, rollback, and errors without media contents or secrets.

## Validation

Run `npm run check`, `npm run build` (including publish synchronization), and `git diff --check`; compare public mirror with private publish files.

## Remaining limitation

Representative media fixtures and live service behavior require maintainer-run integration tests.
