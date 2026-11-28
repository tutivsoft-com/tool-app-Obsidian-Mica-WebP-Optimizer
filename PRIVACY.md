# Mica WebP Optimizer privacy

Image processing and note-reference updates happen locally. Account requests use the existing service; plugin settings, conversion logs and recovery data are stored locally.

The current full privacy statement is [docs/PRIVACY.md](docs/PRIVACY.md).

Matomo receives fixed app usage events. Account and purchase operations use Constance. The plugin sends startup and error diagnostics to Datadog, separately from the local support buffer. Reports can include the plugin version, platform, error details and recent action names. The reporter redacts recognized credential patterns. Error text can still include paths or content supplied by the failed operation.
