# Mica WebP Optimizer — Features

Version: 3.4.19

Mica optimizes PNG and JPEG images in an Obsidian vault while keeping image references and originals recoverable.

## Image optimization

- Convert supported PNG and JPEG/JPG files to WebP inside the active vault.
- Run a reviewed scan for the current folder or the complete vault, or queue eligible images as they are created or imported.
- Optionally scan and convert the vault once after startup; this is disabled by default and controlled by **Automatically Convert images at Start**.
- Choose lossy quality or the browser/Electron encoder's highest-quality near-lossless mode. Keep original dimensions by default or set a maximum longest edge.
- Strip recognized EXIF/device/location metadata by default. An optional setting keeps recognized metadata when the local WebP container supports it.
- Skip animated PNGs, unsupported files, remote references, configured exclusions, and generated-output folders.
- Decode each output before it becomes the preferred image reference. If the output is larger, Mica asks whether to keep it; it never silently replaces a smaller original with a larger result.

## Reference and file safety

- Update supported Obsidian wikilinks, Markdown embeds/links, and HTML `src`/`href` references while preserving captions, aliases, fragments, and titles.
- Choose deterministic unique names when a destination already exists.
- Keep originals by default. Optionally move them to a recoverable vault folder and journal the move.
- Persist recovery information before changing note references. Roll back the most recent batch when its source files and note state still permit safe restoration.
- Review previews, progress, pause/resume, cancellation, per-file errors, larger-output decisions, and a local conversion log.

## Optional billing

- Three successfully written and verified conversions are free per local calendar day.
- After the free allowance, one purchased conversion is authorized for each successful output. Scans, previews, skips, failures, and rollback are free.
- Billing is optional for image processing. Account linking, checkout, usage claims, and balance refresh need network access; vault paths, note text, source image bytes, and WebP bytes are not sent to the billing service.

## Supported use and limits

- Mica uses the image decoder and encoder exposed by the installed Obsidian client; codec behavior can vary by host.
- “Near-lossless” is the highest-quality mode exposed by that encoder, not a separate lossless codec.
- Metadata retention is best effort for recognized chunks; stripping is the privacy-first default.
- Rollback cannot recover a note deleted outside Mica after conversion. A generated WebP that has gained other references is retained rather than deleted.

<!-- one-click-workflow:start -->
## Workflow defaults (v3.4.19)

The automatic startup scan is disabled by default. If billing has no remaining free or purchased credits, Mica stops the current batch and shows one notice.
<!-- one-click-workflow:end -->
