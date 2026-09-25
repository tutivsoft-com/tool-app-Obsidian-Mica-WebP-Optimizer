# Changelog

## 3.4.19 (2026-09-25)

- Added an opt-in vault scan at startup, disabled by default, and wait until Obsidian finishes loading before registering automatic image watchers.
- Stop a batch when billing denies conversion and show each billing notice at most once per batch.

## 3.4.18 (2026-09-25)

- Synchronized the release version across release metadata and current product documentation; plugin behavior is unchanged.

## 3.4.16 (2026-09-24)

- Mica starts conversion directly by default. Review before conversion and the larger-output prompt are optional Settings options and are off by default.


## 3.4.15

- Made conversion review and larger-output prompts optional settings.


## 3.4.12 - 2026-09-24

- Added current feature, architecture, requirements, and marketing documentation.
- Clarified benefit claims and synchronized release metadata; runtime behavior is unchanged from 3.4.11.

## 3.4.11 - 2026-09-23

- Process eligible images that arrive while another conversion batch is running.
- Clear queued images when a batch is cancelled.
- Ask users to open a note before scanning the current folder, avoiding an accidental whole-vault scan.
- Keep a verified WebP and its updated links when a paid credit spend has an uncertain response, so later reconciliation cannot charge for a removed conversion. Keep the original in place until that spend is verified.
- Retry pending credit spends after sign-in or balance refresh as well as on startup.

## 3.4.10 - 2026-09-21

- Migrated signed-in checkout to Constance's authenticated `plan_code` and
  `Idempotency-Key` contract, retaining `/buy` as a compatibility fallback.
- Persisted free-usage claim event IDs so uncertain responses are retried
  idempotently instead of creating a second claim.
- Added rotating refresh-token session handling for the central service's
  short-lived access tokens and revoked sessions on sign-out.

## 3.4.9 - 2026-09-21

- Incremented release metadata without rebuilding the plugin.

## 3.4.8 - 2026-09-21

- Incremented the release version and synchronized the source-inclusive public artifact.
- Verified build, tests, syntax, and release metadata before publication.

## 3.4.5 - 2026-09-20

- Prepared the next patch version across source, publish, and public metadata.
- No runtime behavior changed in this documentation and version bump.

## 3.4.4 - 2026-09-20

- Synchronized the Mica source and publish version surfaces and prepared the
  next source-inclusive TutivSoft release.

## 3.4.3 - 2026-09-12

- Incremented and synchronized the canonical, package, manifest, and publish version surfaces after the billing rollout. No runtime behavior changed in this metadata release.
- Persisted credit-spend attempts before remote work and reused the same event
  ID when a response is lost or a request is retried.

## 3.4.2 — 2026-09-11

- Final Mica release with live Paddle catalog billing for `$1/100` and `$10/1,000` conversion packs; source and publish artifacts are synchronized for the public release.

## 3.4.1 — 2026-09-11

- Live Mica Paddle catalog provisioned: `$1/100` uses `pri_01m28hmw9t7tz51xvqatwe2dp6`; `$10/1,000` uses `pri_01m28hmx9n6g7kgdxvxagwd13k`.

## 3.4.0

- Finalized optional TutivSoft unsigned browser-relay billing for purchased conversion packs.
- Added three free successful conversions per local calendar day, one-credit charging at the verified-write boundary, synchronized purchased balance, serialized billing operations, CSPRNG event IDs, and placeholder-price guards.
- Documented the optional billing network dependency without changing local-only media conversion or vault privacy.

## 3.3.1

- Clarified the directory manifest description for Obsidian Community review; functionality is unchanged.

## 3.3.0

- Initial Mica WebP Optimizer MVP.
- Added local PNG/JPEG conversion, safe link rewrites, background queue, previews, progress controls, conversion log, backups, and rollback.
