# Changelog

## 0.2.0-alpha.7 — readable usage details above attachments

- Move native usage details into the browser top layer so attachment cards and native stacking contexts cannot cover the tooltip.
- Keep compact counters, colors, accounting, and Input / Output / Cache hits unchanged.
- Clamp details to the viewport, support keyboard focus, and dismiss on Escape, scrolling, resize, and cleanup.
- Browser regression reproduced attachment overlap and verified attachment/text endings, overflow clipping, viewport bounds, and keyboard dismissal.
- Regular ChatGPT chat remains unsupported; no estimated values are presented as actual usage.

## 0.2.0-alpha.6 — structural compatibility

- Replace the default exact-build and component-name gate with a bounded structural webview preflight and live message-shape detection.
- Confirm every visible counter against an unambiguous local assistant record and its owning run; exclude user messages, ambiguous hosts and broad wrappers. Unverified candidates cannot change accounting boundaries.
- Resolve optional native run IDs from recorded message identity or a unique timestamp. Retain frozen segments and existing totals.
- Structural Windows release metadata allows update delivery to future client versions without an exact-version entry. Runtime checks remain mandatory.
- Tested renamed components, renamed bundles and an unknown synthetic version, along with mismatches and missing records. Live original-window structural mode received verified usage after a helper-only restart.
- This supports preserved data contracts across versions, not arbitrary future schema or record-format changes.

## 0.2.0-alpha.5 — Codex update compatibility and optional updates

- Support Store build 26.903.8094.0 / internal 26.903.61454 using a separately checked profile and the eb message component; preserve the older Oy adapter.
- Select profiles by internal app version and continue checking all configured file fingerprints.
- Check for compatible releases on enhanced launch, with a daily cache, manual check, later/skip choices, checksum verification, and a link to all versions.
- Add compatibility.json release metadata. Unknown client builds still require maintainer review; this does not patch unknown builds automatically.
- Allow owned installations to be updated without uninstalling first; preserve language and refuse updates while the enhancement is running.
- Local installation and compatibility check passed; live display on the new client after restart remains pending.

## 0.2.0-alpha.4 — bilingual preview

- Add English and Simplified Chinese tooltips, management UI, and startup messages; language can be selected in Setup and management.
- Include verified real green and gray counter crops in both READMEs, with conversation content excluded.
- Add the Chinese project name, Codex 实时用量, while retaining Codex Token Inline and the repository slug.
- Activate the pending-usage fix in the local running helper without restarting the original client; regression checks preserve real zero values.

## 0.2.0-alpha.3 — release preparation

- Distinguish missing active-segment usage from a recorded zero: show `— · total` and pending hover rows until local evidence arrives.
- Preserve actual zero values for recorded/frozen/completed segments; do not estimate missing usage.
- Expand bilingual README with work-mode-only scope, segment/total examples, hover details, implementation and upstream attribution.
- Document current passive DOM architecture and single-build compatibility; GPT regular chat is unsupported and not currently planned.
- Waiting-state tests passed; the local installed update takes effect after the next normal restart.

## 0.2.0-alpha.2 — startup repair preview

- Remove CDP Fetch interception and forced Page.reload following the original-client startup failure.
- Wait for normal page completion, then mount owned DOM badges without replacing native UI nodes or application resources.
- Preserve segment anchors from the fingerprint-checked native message component; add regression checks for navigation isolation and distinct message totals.
- Record launcher stages separately for startup diagnosis. Runtime verification on the user's restarted original client remains pending.
- Initial thinking-only placeholder support is not yet ported to this passive DOM adapter; message/progress counters are the current scope.

## 0.2.0-alpha.1 — local preview

- Original Store-package activation with loopback CDP, replacing the copied-client delivery route.
- In-memory renderer response adapter reuses segment accounting, compact labels, completion colors and polling.
- Installer bundles the helper runtime without copying Codex or creating a second client profile.
- Version/author management entry and attribution to JiaYang-BUAA with retained upstream MIT license.
- Actual install, compatibility check and clean uninstall passed; original-window display after restart remains unverified.
- No automatic update channel or untouched-original-shortcut integration.

## 0.1.0-alpha.1 — unreleased

- Numeric local collector with incremental JSONL reads and deduplication.
- Explicit objective lifecycle across multiple turns.
- Minimal message-footer React badge with three-row hover/focus breakdown.
- Source fingerprint inspector and offline adapter builder for one Windows build.
- Synthetic tests and Windows/Linux CI configuration.
- Native startup, automatic objective-completion binding, installation and rollback remain pending.
