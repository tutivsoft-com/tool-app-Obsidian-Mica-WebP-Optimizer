# Mica privacy and threat model

Mica performs image decoding, resizing, WebP encoding, reference discovery, and file writes locally inside the active Obsidian vault. It has no cloud conversion service, analytics, or AI integration. Billing is optional: only checkout and purchased-balance synchronization use the TutivSoft billing network.

## Data handling

- Image bytes are read from the active vault and are not uploaded.
- Authenticated billing requests contain the fixed Mica app identifier, a cryptographically random install identifier, and a bearer session; only the compatibility `/buy` fallback includes the entered billing email and provisioned Paddle price ID. No vault paths, note contents, image bytes, or generated WebP bytes are sent.
- Settings, the conversion log, and the latest recovery journal are stored in Obsidian plugin data in the same local profile.
- Metadata stripping is the default because EXIF can contain GPS coordinates, device identifiers, timestamps, and editing history.
- The optional keep setting only preserves recognized EXIF and compatible ICC/XMP chunks when the local WebP container accepts them. Unrecognized metadata may be dropped.
- Mica never automatically deletes originals. The backup option moves originals within the vault and records the old/new path in the journal.

## Threat model

Mica is designed to reduce accidental data loss and accidental metadata disclosure by staging verified output, persisting a journal before rewrites, and keeping originals by default. The optional billing integration is account-authenticated and rate-limited; the plugin holds no shared HMAC secret and exposes no callback endpoint. It is used only to link this install, authorize checkout, claim/spend conversions, and synchronize balance—not to process media. It does not protect against a malicious or compromised Obsidian process, filesystem ransomware, another plugin modifying the same notes concurrently, or a user granting access to the vault to another application. Keep normal vault backups and review the original-file setting before a large run.

When a reference is ambiguous or a note cannot be safely updated, Mica leaves the original in place and reports a review result. During rollback, a generated output is deleted only when no remaining vault reference is found; otherwise it is retained.
