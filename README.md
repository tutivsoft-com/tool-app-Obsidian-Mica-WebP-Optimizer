# Mica WebP Optimizer

Version: `3.4.8`


Mica is an offline-first Obsidian plugin that converts PNG and JPEG/JPG images to verified WebP files while protecting note links and original media.

## MVP features

- Watches newly created or imported PNG/JPEG images in the vault, using a background queue.
- Scans the current folder or complete vault with a preview before bulk conversion.
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

Automatic optimization is enabled with conservative defaults: quality 82, original files kept, metadata stripped, no resizing, and a maximum of two local encodes. The first bulk run always shows a review dialog.

## Optional billing

Mica includes three free successful conversions per local calendar day. After that, each successfully written WebP conversion uses one purchased conversion. Scans, previews, larger-file skips, already-processed files, failed conversions, review skips, and rollback are always free.

One-time packs are $1 for 100 conversions and $10 for 1,000 conversions. The live Mica Paddle catalog is configured for checkout. The optional TutivSoft billing network is used only for checkout and purchased-balance synchronization; it never receives vault media or conversion bytes. Local conversion and the daily free allowance continue to work without billing connectivity.

## Commands

- `Mica: Scan current folder and optimize`
- `Mica: Scan complete vault and optimize`
- `Mica: Cancel active optimization`
- `Mica: Pause or resume optimization`
- `Mica: Rollback most recent optimization batch`
- `Mica: View conversion log`

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
