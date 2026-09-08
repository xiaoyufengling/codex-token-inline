# Security and privacy

- No remote telemetry, API key, cookie collection or login-file access. Original-app integration enables Codex's loopback CDP debugging endpoint; this is a powerful local HTTP/WebSocket interface, not a sandboxed plugin API. Never expose it remotely.
- JSONL is parsed locally. Only numeric usage, timestamps and identifiers are retained by the ledger; message and command content is discarded.
- The usage bridge exposes only a validated numeric snapshot operation to the original app's main-frame context. It does not expose arbitrary filesystem paths, shell execution or general IPC. The underlying CDP endpoint has broader debugging powers; the launcher checks its loopback address and owning original process.
- Objective state is local to the user. CLI writes use a file lock and atomic replacement.
- Unknown client fingerprints stop runtime attachment. The 0.2 launcher does not modify installed Codex files. Older copied-client preparation tools remain development-only.
- Prepared archives contain third-party application content and must remain local.

Do not paste raw logs, credentials, private prompts, identifying screenshots or prepared archives into a public issue. Until a private reporting channel is configured on GitHub, do not publish exploit details; contact the repository maintainer privately. The repository owner should enable GitHub private vulnerability reporting before public launch.

The 0.2 installer and clean uninstall were tested locally, and original-window work-mode display was confirmed by the user. This is still a single-PC preview, not a broadly verified stable integration. GPT regular chat is outside scope. A release must never require users to disable security protections.
