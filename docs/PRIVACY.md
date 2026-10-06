# Mica WebP Optimizer privacy

Current source version: **3.4.56**. MVP selection review and corrections are recorded in MVP_SELECTION_2026-10-06.md.

Image decoding, encoding, reference discovery and file writes stay local. Constance receives billing identity, digests, image byte/pixel counts and recovery metadata rather than image bytes or note content. The local conversion log and batch journal can contain vault paths.

Connect the existing Constance account in settings; registration can require email verification before signing in again. Billing account passwords are sent for authentication and are not persisted. Access/refresh session data and a stable installation identity are saved locally. Account free usage and purchased balance are determined by Constance; cached values and checkout return URLs do not create entitlement. Catalog displays current formatted names, prices, availability and exact price IDs. Unknown usage and checkout results retain their original identities for recovery.

Plugin settings and workflow recovery state remain in local Obsidian plugin data. Account authentication requires network requests; metered usage sends identifiers and the operation metadata required by the existing billing protocol. It does not send plaintext note bodies as billing payloads.

Help is available in settings and through Open documentation. Open plugin settings and Copy full debug log are command-palette fallbacks. Debug logging defaults off for a new installation; failures and full Error objects/stacks still appear in the local developer console. Timed information is enabled by the debug preference. The copyable diagnostic buffer keeps at most 1,000 summarized events and excludes raw error text, stacks, note text, paths and credentials. Full console exceptions can contain whatever the failed operation placed in its error. Logs are not uploaded automatically.

Obsidian and other installed plugins can access the active vault. Local processing does not isolate data from a compromised host process.
