# Compatibility

Current preview: **0.2.0-alpha.5**. Current integration: passive DOM injection into the original Windows Store application, after normal page load.

| Environment or mode | Evidence / support |
| --- | --- |
| Windows x64 Store Codex 26.901.6511.0 / inner app 26.901.51231, work mode | User confirmed original-window token display on the development PC |
| Windows x64 Store Codex 26.903.8094.0 / inner app 26.903.61454, work mode | Fingerprints checked; eb adapter tests and installed compatibility check passed. Live display after restart pending |
| Installation and clean uninstall on that PC | Earlier preview verified; full alpha.4 language-setting install/uninstall retest remains pending |
| GPT regular chat mode | Unsupported; user tested it, and support is not currently planned |
| Other client versions | Unverified; fingerprints must match before attachment |
| macOS / Linux desktop | Unsupported by this installer; platform-independent tests do not imply desktop support |
| Original pinned app entry or self-created original shortcut | Does not automatically activate the helper |
| Thinking-only placeholder | Not implemented by the current DOM adapter |
| Automatic grouping of independent runs into a natural-language long goal | Not implemented |

The app may be labeled ChatGPT while exposing both modes. The label is not a promise of regular-chat support. Local record collection and native component mapping target Codex work tasks.

## What is actually checked

The package and internal app versions may differ. The profile checks SHA-256 fingerprints of four original source files. The passive DOM adapter also relies on the corresponding native message component metadata; a matching version string alone is insufficient.

Tests cover numeric boundaries, exact/legacy deduplication, cached-input subsets, message anchoring, hover order, completion colors, preservation of native DOM, and prohibition of forced reload/resource interception. Local confirmation establishes usable behavior on one setup, not complete verification of all DPI settings, themes, multi-window behavior, or future versions.

## Adding support for a build

1. Confirm ordinary startup of the original client and its work mode.
2. Inspect metadata/anchors locally and add a separate fingerprint profile without publishing vendor bundles.
3. Verify original process identity, loopback ownership, normal page loading, and numeric bridge origin restrictions.
4. Test segment freezing, a fresh independent request, late usage, cached subsets, completion, task switching and multiple windows.
5. Check native buttons, tooltip accessibility, scaling, theme and placement.
6. Verify installation, ordinary enhanced launch and clean uninstall.

Do not call an adapter verified solely because an archive can be parsed or a test suite passes. Do not reintroduce copied clients, resource interception, forced page reload, weakened security controls, or original-shortcut replacement as if they satisfied the current integration contract.

The earlier isolated-copy experiments and alpha1 resource-interception route are historical development baselines, not supported installation methods. See [architecture](architecture.md) for the current implementation.
