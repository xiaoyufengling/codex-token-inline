# Optional compatible updates

The launcher starts a separate short-lived update check without delaying Codex. Automatic checks are cached for 24 hours per installed Codex package version. Changing that version triggers a new check. Manual checks bypass the cache and skip preference. Failed checks leave the installation unchanged and automatic failures remain quiet.

`release.json` defines the project version, GitHub repository and compatible Windows package versions. Fork maintainers should change the repository there and the management-page links. Every release participating in updates must upload that JSON as `compatibility.json`, together with `CodexTokenInline-Setup-VERSION.exe`. The updater requires GitHub's SHA-256 asset digest, verifies the manifest before reading it, accepts either an exact package version declaration or Windows structural-v1 mode, and verifies the installer before execution. A release must be newer than the installed project version and use the supported semantic version format, including numbered alpha previews. Draft releases are excluded; compatible alpha previews are eligible.

Only HTTPS GitHub asset paths belonging to the configured repository and release tag are accepted. Manifest and installer sizes are bounded. Requests have timeouts. Checks transmit ordinary requests to GitHub; they do not upload Codex logs, conversations or credentials. Client package matching occurs locally.

The prompt offers Download & install, Later, or Skip version. Download and installation require a choice. Installation uses the normal installer, preserves language, and refuses to replace files while the enhancement's runtime mutex is held. It never closes Codex automatically. An All releases link allows users to choose historical installers; it is not an automatic downgrade system. Alpha.4 and earlier need one manual upgrade because they have no update checker.

The installer owns `state/update.json` and `state/update-installer.exe`; uninstall removes them along with the language preference and other owned state. Structural releases can be offered to future Windows client versions without adding an exact version entry. Their runtime still requires structure and ledger checks; update metadata does not bypass those checks. Update availability is not evidence of broad runtime compatibility.

## Publishing a compatibility update

1. Inspect the installed client and confirm the structural contract; adapt detection only if key fields or record formats changed.
2. Run old and new component tests, accounting tests, update-selection/checksum tests and the installed compatibility check.
3. Update release.json and application versions, build, and test the original client after a normal enhanced restart when available.
4. Upload the installer, compatibility.json and SHA256SUMS.txt to the matching release. State any remaining runtime-verification limits in its notes.

This separates repeatable update delivery from the evidence required to trust a new private client implementation.
