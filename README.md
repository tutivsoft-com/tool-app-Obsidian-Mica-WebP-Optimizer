# Mica WebP Optimizer

Version: `3.4.19`


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
6. Billing, when needed, is checked only after the WebP has been written and verified; a failed check removes the staged output and restores note text.

Automatic conversion of the vault at startup is disabled by default. Enable **Automatically Convert images at Start** to scan after Obsidian finishes loading. Automatic optimization of newly created or imported images remains a separate setting. Other defaults are quality 82, original files kept, metadata stripped, no resizing, and a maximum of two local encodes. A batch stops with one notice when billing denies further conversions.

## Optional billing

Mica includes three free successful conversions per local calendar day. After that, each successfully written WebP conversion uses one purchased conversion. Scans, previews, larger-file skips, already-processed files, failed conversions, review skips, and rollback are always free.

One-time packs are $1 for 100 conversions and $10 for 1,000 conversions. Signed-in installations use Constance's authenticated, idempotent checkout route with server-owned plan codes; the hosted `/buy` URL remains a compatibility fallback. After payment, return to Mica and refresh Purchased balance—the billing webhook, not the browser return, is authoritative. The optional TutivSoft billing network is used only for account linking, checkout, usage claims, and purchased-balance synchronization; it never receives vault media or conversion bytes. Image processing remains local, but allowance and paid-credit checks require billing connectivity.

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
## Workflow defaults (v3.4.19)

The startup scan is off by default. Enable **Automatically Convert images at Start** to scan the vault after it opens. If the free allowance and purchased credits are exhausted, Mica stops the batch and shows one notice instead of repeating it for each image.
<!-- one-click-workflow:end -->
