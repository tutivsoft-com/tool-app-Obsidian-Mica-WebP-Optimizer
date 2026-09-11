# Mica privacy and threat model

Mica performs image decoding, resizing, WebP encoding, reference discovery, and file writes locally inside the active Obsidian vault. It has no HTTP client, cloud conversion service, analytics, AI integration, account, or paid-credit dependency.

## Data handling

- Image bytes are read from the active vault and are not uploaded.
- Settings, the conversion log, and the latest recovery journal are stored in Obsidian plugin data in the same local profile.
- Metadata stripping is the default because EXIF can contain GPS coordinates, device identifiers, timestamps, and editing history.
- The optional keep setting only preserves recognized EXIF and compatible ICC/XMP chunks when the local WebP container accepts them. Unrecognized metadata may be dropped.
- Mica never automatically deletes originals. The backup option moves originals within the vault and records the old/new path in the journal.

## Threat model

Mica is designed to reduce accidental data loss and accidental metadata disclosure by staging verified output, persisting a journal before rewrites, and keeping originals by default. It does not protect against a malicious or compromised Obsidian process, filesystem ransomware, another plugin modifying the same notes concurrently, or a user granting access to the vault to another application. Keep normal vault backups and review the original-file setting before a large run.

When a reference is ambiguous or a note cannot be safely updated, Mica leaves the original in place and reports a review result. During rollback, a generated output is deleted only when no remaining vault reference is found; otherwise it is retained.
