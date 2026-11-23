# Mica WebP Optimizer privacy

Applies to the current plugin source. The version is listed in [manifest.json](../manifest.json).

Image decoding, encoding, reference discovery and file writes stay local. Conversion billing sends the app ID, usage units and a retry or operation ID to Constance. Image digests, byte and pixel counts, and file-write evidence are stored locally for recovery. The local conversion log and batch journal can contain vault paths.

Connect the existing Constance account in settings; registration can require email verification before signing in again. Billing account passwords are sent for authentication and are not persisted. Access/refresh session data and a stable installation identity are saved locally. Account free usage and purchased balance are determined by Constance; cached values and checkout return URLs do not create entitlement. Catalog displays current formatted names, prices, availability and exact price IDs. Unknown usage and checkout results retain their original identities for recovery.

Plugin settings and workflow recovery state remain in local Obsidian plugin data. Account authentication requires network requests; metered usage sends identifiers and the operation metadata required by the existing billing protocol. It does not send plaintext note bodies as billing payloads.

Help is available in settings and through Open documentation. Open plugin settings and Copy diagnostic log are command-palette fallbacks. Debug logging defaults off for a new installation; failures and full Error objects/stacks still appear in the local developer console. Timed information is enabled by the debug preference. The copyable diagnostic log keeps up to 1,000 events from the current plugin session. Error entries can include messages, stack traces and causes with recognized credential patterns redacted. Error details can still contain vault paths or content. Full exceptions are available in the local developer console. The copyable log stays local unless you share it.

Obsidian and other installed plugins can access the active vault. Local processing does not isolate data from a compromised host process.

Basic app usage events are sent to https://atcdn.cyou without note contents. Account and purchase operations use Constance. Datadog automatically receives startup and plugin error reports with the plugin version, platform, timestamp and a session ID. Error reports also include recent action names and error details. The plugin redacts recognized credential patterns in error details. Those details can still include file paths or content.
