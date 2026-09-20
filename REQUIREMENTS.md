# Mica WebP Optimizer — Product Requirements

Status: implemented — 3.4.5 live-catalog release

## Product promise

Mica reduces image size inside an Obsidian vault while preserving embeds, visual quality, recoverability, and user control.

## Product principles

- Optimize media without breaking notes.
- Never delete the only copy before the replacement is verified.
- Keep conversion deterministic, local, and understandable.
- Do not process files outside the selected vault scope.
- Avoid unnecessary settings; provide safe defaults first.

## MVP conversion scope

1. Convert eligible PNG and JPEG/JPG files to WebP locally.
2. Preserve transparency for PNG sources.
3. Support configurable lossy quality and a lossless or near-lossless option where the encoder supports it.
4. Preserve or intentionally strip metadata according to a visible setting; default to stripping unnecessary location/device metadata while explaining the choice.
5. Keep original dimensions by default and optionally limit maximum dimensions for oversized images.
6. Skip animated images, SVGs, GIFs, unsupported formats, remote URLs, and files excluded by configuration.
7. Detect newly pasted or imported eligible media and place conversions in a background queue.
8. Provide a manual command to scan and optimize an existing folder or the complete vault.

## Embed and link safety

9. Detect Markdown embeds, Obsidian wikilink embeds, ordinary Markdown links, and supported HTML references to a converted file.
10. Update references only after the WebP replacement has been written and verified.
11. Preserve link fragments, captions, aliases, and relative-path behavior.
12. Handle filename collisions by using a deterministic unique name and showing the choice before applying it.
13. Search the vault for references before offering deletion or archival of an original.
14. Never delete originals automatically in the MVP; allow the user to keep, move to a backup folder, or review them after conversion.
15. If a reference cannot be safely updated, keep the original and report the conversion as requiring review.

## MVP workflow and settings

16. Provide first-run defaults that require no tuning for ordinary pasted screenshots.
17. Let the user configure watched folders, output location, quality, metadata policy, maximum dimensions, and original-file handling.
18. Show an estimate of source count, likely size change, and files that will be skipped before a bulk run.
19. Provide a preview for representative files and a clear confirmation for a bulk operation.
20. Show progress, current file, completed/failed/skipped counts, and Cancel.
21. Resume safely after restart without converting the same source twice.
22. Maintain a conversion log with source, output, size before/after, quality mode, and result.
23. Create recoverable backups or an undo journal before link rewrites or original-file moves.
24. Provide rollback for the most recent batch when source files remain available.
25. Allow three free successful conversions per local calendar day, then consume one purchased conversion only for each successfully written and verified WebP.
26. Keep scans, previews, skips, failed conversions, and rollback free; never charge before the safe verified-write boundary.
27. Use the unsigned browser-relay billing pattern with a stable per-install identity, serialized local billing operations, server-enforced available balance, and synchronized purchased balance.
28. Reject placeholder or malformed Paddle price identifiers without opening checkout; ship only provisioned Mica catalog identifiers.

## Quality and performance

29. Verify that each generated WebP can be decoded before it replaces or becomes the preferred reference.
30. Preserve image orientation and alpha behavior correctly.
31. Avoid freezing the Obsidian interface during large batches.
32. Provide a configurable concurrency limit and pause/resume controls if needed for large vaults.
33. Report when a conversion makes the file larger and offer to keep the original instead.
34. Never alter note text unrelated to the changed media reference.

## AI decision

AI is not needed. Image conversion, quality checks, link discovery, and safe replacement are deterministic local operations. AI would add cost and privacy exposure without improving the core result. No AI credits are required.

## Useful post-MVP features

- Duplicate-image detection using local hashes and perceptual fingerprints.
- Before/after visual comparison and a quality recommendation.
- Bulk optimization reports by folder, file type, and savings.
- AVIF support when the Obsidian compatibility story is clear.
- Automatic cleanup suggestions for verified unreferenced originals.
- Scheduled optimization with quiet notifications only for meaningful failures or savings.
- Optional image resizing presets for thumbnails and archival media.

## Out of scope for the MVP

- Cloud conversion or uploading vault media.
- Automatic deletion of originals.
- Video, audio, PDF, SVG, or animated-image optimization.
- AI-generated image edits or descriptions.

## Acceptance criteria

- A pasted PNG or JPEG can be converted in the background without blocking ordinary note editing.
- All supported embeds and links continue to open after conversion.
- A failed or interrupted operation leaves the original usable and does not consume a conversion allowance.
- Bulk runs provide clear preview, progress, skip reasons, and recovery data.
- The user can choose quality, original-file handling, and optional billing without navigating complex settings.
- Core local conversion works offline with no AI account; paid conversion balance is optional and requires billing connectivity only for checkout/synchronization.
