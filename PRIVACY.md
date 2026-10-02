# Mica privacy and threat model

## Preview and lifetime allowance

Guests see a bounded preview held only in memory. Keep the originating window open through registration, email verification and sign-in, then retry that exact result without regeneration. Guests cannot save, apply, export or queue useful output. Closing the preview or restarting loses unrevealed guest content.

At the saved catalog observation (2026-10-02 13:54 UTC), all four provider rows were active and available: USD $2 / 50, $4 / 150, $8 / 450, and $14 / 1,200 conversions. This is a timestamped catalog observation only; it does not establish current native-operation authorization or a completed checkout. No purchase was performed. Current operations require an exact server quote and reservation before writing. Purchased credits remain app-specific. Pack prices and quantities come from Constance; unavailable catalog rows disable buying.

One successful image conversion is one native unit; free image <=5 MB/four megapixels. Guest thumbnail and size estimate stay in memory; after sign-in the exact converted bytes are applied. Background/startup conversion requires explicit credit-consumption opt-in. Original images and rollback stay available.

Useful local writes follow durable reserve -> write -> verify -> commit. Full reveal commits before showing complete content. Unknown writes retain their journal for status/output reconciliation; they are never blindly refunded or replayed. Billing sends account/install identity, native dimensions and source/result digests, never vault content, image bytes or encryption passwords.


Mica performs image decoding, resizing, WebP encoding, reference discovery, and file writes locally inside the active Obsidian vault. It has no cloud conversion service, analytics, or AI integration. Billing authorizes useful completion, checkout and balance synchronization; local media is never uploaded.

## Data handling

- Image bytes are read from the active vault and are not uploaded.
- Authenticated billing requests contain the fixed Mica app identifier, a cryptographically random install identifier, and a bearer session; checkout sends server-owned plan codes and a durable idempotency key; an uncertain response never opens an alternative checkout. No vault paths, note contents, image bytes, or generated WebP bytes are sent.
- Settings, the conversion log, and the latest recovery journal are stored in Obsidian plugin data in the same local profile.
- Metadata stripping is the default because EXIF can contain GPS coordinates, device identifiers, timestamps, and editing history.
- The optional keep setting only preserves recognized EXIF and compatible ICC/XMP chunks when the local WebP container accepts them. Unrecognized metadata may be dropped.
- Mica never automatically deletes originals. The backup option moves originals within the vault and records the old/new path in the journal.

## Threat model

Mica is designed to reduce accidental data loss and accidental metadata disclosure by staging verified output, persisting a journal before rewrites, and keeping originals by default. The optional billing integration is account-authenticated and rate-limited; the plugin holds no shared HMAC secret and exposes no callback endpoint. It is used only to link this install, authorize checkout, claim/spend conversions, and synchronize balance—not to process media. It does not protect against a malicious or compromised Obsidian process, filesystem ransomware, another plugin modifying the same notes concurrently, or a user granting access to the vault to another application. Keep normal vault backups and review the original-file setting before a large run.

When a reference is ambiguous or a note cannot be safely updated, Mica leaves the original in place and reports a review result. During rollback, a generated output is deleted only when no remaining vault reference is found; otherwise it is retained.

<!-- one-click-workflow:start -->
## Workflow defaults (v3.4.34)

Mica starts conversion directly by default. Review before conversion and the larger-output prompt are optional Settings options and are off by default.
<!-- one-click-workflow:end -->
