# Contributing

Keep this project small: one quiet token label, three tooltip rows and reliable objective accounting.

Forks, independent variants, accessibility improvements and ports to additional devices or operating systems are welcome. Contributors are not required to keep this project's presentation. Feedback, documentation and compatibility findings are valuable alongside code. Discuss large upstream changes in an issue so scope and maintenance expectations are clear; independent forks need not obtain our approval.

Respect upstream licenses and attribution, retain required notices, and describe borrowed work accurately. Credit contributors in relevant changes. Sharing modifications upstream is encouraged, not an additional license condition. Keep discussions constructive and evaluate contributions on their technical merits.

Scope is Codex work mode only. GPT regular chat is unsupported and is not currently planned. Preserve the documented `100`, then `50 · 150`, then `20 · 170` segment/total semantics and segment-only hover details. Keep attribution to JiaYang-BUAA and the retained upstream MIT notice when changing the launcher.

## Local checks

```sh
npm ci
npm run check
npm test
```

Tests use synthetic events. Do not add your real Codex session logs, account snapshots, private screenshots, auth files or prepared client archives. Keep local experiments under `.local/`.

## Client adaptation

Read the installed client only on your own machine. Record only version metadata, original source fingerprints and minimal functional adapter anchors. Do not commit extracted vendor bundles. Add a new profile for a new build instead of overwriting an older supported profile.

Unknown source must fail closed. Do not bypass OS package signatures, relax CSP, disable the sandbox, enable broad remote debugging, or automatically patch after a client upgrade.

Keep runtime support marked unverified until every applicable check in [compatibility](docs/compatibility.md) passes. Include behavior and evidence in the pull request, not only successful patch construction.

## Releases

The Windows alpha now has an installer that activates the original package; local installation, uninstallation and work-mode display have been confirmed. Describe it as a preview with the exact tested client version and limitations. Distribute project source and intentionally built installer assets with their licenses; never upload copied clients, `.local/app.patched.asar`, logs or credentials. Do not claim broad compatibility from a single-PC test.

Use semantic versioning for the public collector/lifecycle APIs and separate versioned adapter profiles for client builds. CI runs on Windows and Linux with Node 22 and 24; a passing Linux test job is not a claim of Linux desktop support.
