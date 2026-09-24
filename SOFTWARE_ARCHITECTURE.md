# Mica WebP Optimizer — Software Architecture

Version: 3.4.12

## Runtime boundaries

Mica is an Obsidian client plugin. Image reads, encoding, WebP validation, vault searches, note-reference edits, and recovery journals run in the active vault. The optional billing client is separate from media processing and receives no vault media or note content.

## Runtime flow

1. `src/main.ts` registers commands, ribbon/context entry points, settings, automatic-import handling, and the conversion workflow.
2. The scan selects eligible images and starts a batch directly unless optional scan review is enabled in Settings.
3. `src/converter.ts` decodes source image data, encodes WebP using the host-provided image APIs, handles supported metadata chunks, and validates that the output can be decoded.
4. Reference utilities find supported wikilink, Markdown, and HTML references and prepare only the matched path changes. Collision handling selects a stable free destination.
5. The batch journal is persisted before note references or original-file locations are changed. Each file is processed independently and its result is added to the local conversion log.
6. `src/modals.ts` and `src/settings-tab.ts` provide review, progress, controls, settings, and rollback feedback.

## Module responsibilities

- `src/main.ts`: plugin lifecycle, command wiring, scanning, queueing, orchestration, logs, and rollback.
- `src/converter.ts`: local image decode/encode, metadata policy, and output verification.
- `src/modals.ts`: scan review, progress, cancellation, larger-output choices, and batch feedback.
- `src/settings.ts` and `src/settings-tab.ts`: defaults, validation, watched/output folders, quality, metadata, and original-file preferences.
- `src/utils.ts` and `src/types.ts`: path/reference and data-model helpers shared by the runtime.
- `src/billing-policy.ts`, `src/billing.ts`, and `src/constance-account.ts`: free-use decisions, authenticated account/checkout requests, idempotent usage events, and purchased-balance reconciliation.
- `src/plugin-support.ts`: optional local help and support affordances.

## Persistence and failure handling

Plugin settings, the local log, pending billing events, and the latest recovery journal are stored in Obsidian plugin data. Vault files are updated only after output validation and journal persistence. Failed or ambiguous work leaves the original available and is reported for review; pending billing operations reuse their event identity during reconciliation.

## Build and release shape

`src/` is the implementation source. The production build emits `publish/main.js` and synchronizes the manifest, styles, source snapshot, and public documentation into `publish/`. The TutivSoft release repository contains the corresponding complete reviewable TypeScript source and the root release files. Release assets are `main.js`, `manifest.json`, and `styles.css`.

## Quality checks

The existing automated suite covers deterministic conversion, reference, billing-policy, and recovery logic. The release check is `npm run build`, `npm test`, `node --check publish/main.js`, version/manifest parity inspection, and `git diff --check`.
