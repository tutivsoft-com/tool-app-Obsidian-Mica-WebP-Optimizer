# Mica WebP Optimizer privacy

Image processing and note-reference updates happen locally. Account requests use the existing service; plugin settings, conversion logs and recovery data are stored locally.

The current full privacy statement is [docs/PRIVACY.md](docs/PRIVACY.md).

Basic app usage events are sent to https://atcdn.cyou without note contents. Account and purchase operations use Constance. The local diagnostic buffer is separate from automatic startup and plugin error reports sent to Datadog. Reports include the plugin version, platform, error details and recent action names. Credentials are redacted; details from a failed operation can include file paths or content.
