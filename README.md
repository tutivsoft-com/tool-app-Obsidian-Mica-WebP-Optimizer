## Current purchase behavior

Purchase settings load the current public product catalog from Constance. Each available offer supplies its exact Paddle price ID, native-unit grant, unit name, and formatted amount. The client displays backend-provided amounts, enables only offers marked available, and submits the selected price ID through authenticated checkout with quantity one. Existing account balances and granted credits remain associated with the account.

<!-- SETTINGS-CURRENT-2026-09-30 -->

## Preview and lifetime allowance

Guests see a bounded preview held only in memory. Keep the originating window open through registration, email verification and sign-in, then retry that exact result without regeneration. Guests cannot save, apply, export or queue useful output. Closing the preview or restarting loses unrevealed guest content.

Constance authorizes metered operations using this app’s native billing unit. The plugin checks current account entitlements and live purchase availability through Constance; each operation follows its documented reserve/commit or quote/confirmation flow.

One successful image conversion is one native unit; free image <=5 MB/four megapixels. Guest thumbnail and size estimate stay in memory; after sign-in the exact converted bytes are applied. Background/startup conversion requires explicit credit-consumption opt-in. Original images and rollback stay available.

Useful local writes follow durable reserve -> write -> verify -> commit. Full reveal commits before showing complete content. Unknown writes retain their journal for status/output reconciliation; they are never blindly refunded or replayed. Billing sends account/install identity, native dimensions and source/result digests, never vault content, image bytes or encryption passwords.

## Current settings

Settings default to **Simple** and remember the selected mode. Simple contains everyday controls and account/billing. **Advanced** adds specialist preferences and diagnostics. Advanced settings provide specialist preferences and diagnostics. This plugin runs locally without a managed AI provider. Account and encryption passwords remain necessary.
<!-- SETTINGS-CURRENT-2026-09-30:END -->

<!-- BILLING-CURRENT-2026-09-30 -->
## Current local account and billing behavior

Use **Connect** with your email and password. A new account is registered; an existing account is authenticated. New users must follow the emailed verification link and Connect again. Incorrect passwords offer password recovery; passwords are never saved. Paid purchases and free allowances belong to the authenticated account, not a locally entered email or an editable cached balance. Reinstalling does not replenish the same account's allowance.

Constance is the billing authority. Credit units remain app-specific: characters, OCR pages, searches, conversions, repair/protection batches, or captures. Checkout return URLs and cached balances never grant credits. Payment fulfillment comes from the server’s verified Paddle webhook, and balances refresh from authenticated entitlements. Unknown usage or checkout results reuse the persisted operation ID; they must not create a new debit or alternative checkout.


Constance provides authenticated account entitlements, usage balances, and available purchase offers.
<!-- BILLING-CURRENT-2026-09-30:END -->

# Mica WebP Optimizer

Version: 3.4.34


Mica is an offline-first Obsidian plugin that converts PNG and JPEG/JPG images to verified WebP files while protecting note links and original media.

## MVP features

- Watches newly created or imported PNG/JPEG images in the vault, using a background queue.
- Scans the current folder or complete vault and converts directly by default; optional review is configured in Settings.
- Preserves dimensions by default, with an optional maximum longest edge.
- Supports lossy quality and a near-lossless browser encoder mode.
- Strips EXIF/device/location metadata by default; a visible setting can keep recognized metadata when the WebP container accepts it.
- Skips animated PNGs, unsupported formats, remote URLs, configured folders, and generated output folders.
- Updates Obsidian wikilink embeds, Markdown embeds/links, and HTML `src`/`href` references without changing captions, aliases, fragments, or titles.
- Detects collisions deterministically (`image.webp`, `image-2.webp`, ...).
- Verifies that every WebP decodes before writing links.
- Keeps originals by default, optionally moves them into a recoverable backup folder, and provides rollback for the latest batch.
- Shows progress, pause/resume, cancellation, per-file failures, larger-output decisions, and a local conversion log.

## Safe workflow

1. A source is read only from the current vault and converted locally.
2. The output is decoded to verify it is usable.
3. A journal is persisted before any note reference is rewritten.
4. Notes are updated only when a supported reference can be matched safely.
5. Originals remain available unless the user chooses the recoverable backup option.

Automatic conversion of the vault at startup is disabled by default. Enable **Advanced → Convert existing images at startup** to scan after Obsidian finishes loading. Automatic optimization of newly created or imported images remains a separate setting. Other defaults are quality 82, original files kept, metadata stripped, no resizing, and a maximum of two local encodes. A batch stops with one notice when billing denies further conversions.

## Account billing



If a paid spend response is lost after a WebP is verified, Mica keeps the conversion and its original image while it retries the same billing event. This avoids charging later for a conversion that was removed. Further paid conversions wait for reconciliation, which runs after sign-in, on balance refresh, and at startup.

## Commands

- `Mica WebP Optimizer: Scan current folder and optimize`
- `Mica WebP Optimizer: Scan complete vault and optimize`
- `Mica WebP Optimizer: Cancel active optimization`
- `Mica WebP Optimizer: Pause or resume optimization`
- `Mica WebP Optimizer: Rollback most recent optimization batch`
- `Mica WebP Optimizer: View conversion log`

The image ribbon button and file/folder context menus provide the same workflows.

## Development

```text
npm install
npm run build
npm test
```

The root `src/` tree is the development source of truth. `publish/` is synchronized during the build and contains the self-contained release bundle, mirrored source, manifest, README, license, and styles.

## Limitations

The WebP encoder is the browser/Electron encoder exposed by Obsidian. Near-lossless is therefore a highest-quality fallback rather than a separate lossless codec. Metadata preservation is best effort (recognized EXIF and compatible JPEG ICC/XMP chunks) and is reported in the conversion log; privacy-first stripping is deterministic. Rollback cannot restore a note that was deleted outside Mica after the batch, and generated WebP files with new external references are retained rather than deleted.

## License

MIT. See [LICENSE](LICENSE) and [PRIVACY.md](PRIVACY.md).

<!-- one-click-workflow:start -->
## Workflow defaults (v3.4.34)

The startup scan is off by default. Enable **Advanced → Convert existing images at startup** to scan the vault after it opens. If the free allowance and purchased credits are exhausted, Mica stops the batch and shows one notice instead of repeating it for each image.
<!-- one-click-workflow:end -->

## Account, billing, and credit feedback

Account and billing controls appear at the top of settings. Select Connect with your email and password; verify the emailed link if requested, then Connect again. The settings page shows the current balance and provides balance refresh, sign-out, and purchase controls. Metered actions show the available balance and report the amount used with the remaining balance when the action completes.

Private metadata version: 3.4.34 (not validated, tagged, or released).
