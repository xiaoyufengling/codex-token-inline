# Codex Token Inline

[简体中文](README.md) · [How it works](docs/architecture.md) · [Compatibility](docs/compatibility.md) · [Acknowledgments](THIRD_PARTY_NOTICES.md)

A minimal token counter beneath replies and progress messages in **Codex work mode**. Hover to see input, output, and cache hits.

> **Codex/work mode only. GPT regular chat mode is not supported, and support for its token display is not currently planned.** Some client versions use the name “ChatGPT” for the app icon or window; support depends on the mode being used, not that label.

**Version: 0.2.0-alpha.6.** An unofficial preview. Display in the original client was confirmed by the local user, and installation/uninstallation were verified on the same PC. This is not a claim of broad device or version compatibility.

## Display

These are cropped screenshots of the actual counter inside the original client. Only the numeric widgets are retained; conversation text is excluded. They show separate examples, not consecutive stages of one execution.

Active, first segment:

![Active first-segment usage](assets/screenshots/active-single.png)

Active, segment · total:

![Active segment and total usage](assets/screenshots/active-total.png)

Completed:

![Completed usage in gray](assets/screenshots/complete-total.png)

```text
First segment     100 tokens
Next segment      50 · 150 tokens
Next segment      20 · 170 tokens
```

The first number is segment usage; the second is the execution-scope total. Historical segments freeze while the newest updates. Do not add the running totals together. These figures cover associated model input and output, not merely the visible text's length.

- Green while active; native gray after recorded execution completion.
- Two decimal places above one million, such as `1.27M tokens`; thousands separators below it.
- Hover order: **Input → Output → Cache hits**, with exact values. English and Simplified Chinese labels are supported.
- Total = input + output. Cached input is already part of input; reasoning is already part of output.
- Updates use recorded local usage, not simulated token streaming, billing estimates, or subscription quota calculations.
- A badge stays hidden until its message uniquely matches a local assistant record. This prevents attribution to another message.
- A verified newest segment awaiting its first usage record shows, for example, `— · 476,637 tokens`: unknown segment usage alongside the recorded total, rather than a misleading zero.

## Install and use

1. Download the current Windows installer from [Releases](https://github.com/xiaoyufengling/codex-token-inline/releases). Choose the `.exe` installer.
2. Run Setup; it shows the version, author, and GitHub link.
3. Quit Codex, then open **Codex Token Inline** from the desktop or Start menu.
4. Enter **Codex work mode**, open a local task, and look below assistant messages.

The enhanced entry starts your **original installed Codex**, without copying the client, creating a second client profile, or changing its installed files. You must use this entry for future enhanced launches. Original Start-menu pins and existing or self-created original desktop shortcuts do not automatically load it.

Use **Manage Codex Token Inline** in the Start menu for version, author, upstream attribution, uninstall options, and the English / Simplified Chinese language selector. Tooltip labels follow this preference. The new installer can update an existing owned installation in place. Quit Codex and wait about 10 seconds before uninstalling through Windows Settings or management.

The enhanced launcher checks GitHub for updates at most once a day, checking again when the Codex version changes. It offers only releases that declare compatibility with the installed Codex. Choose Download & install, Later, or Skip version. Installation is optional and Codex is never closed automatically. Downloads are verified with SHA-256. Management includes manual checks and an All releases link for choosing historical versions.

Starting with alpha.5, the new installer can update an existing owned installation while preserving its language preference. Quit the running enhancement before installing. Alpha.4 and earlier lack update checks and need one manual upgrade to the current release. Starting with alpha.6, structural detection replaces build-number, bundle-name and component-name gating. Future clients preserving the contract can continue working; contract changes may still need a repair.

## Scope

| Area | Status |
| --- | --- |
| Windows x64 Store Codex 26.901.6511.0 / inner 26.901.51231 | Original-window display confirmed on one PC |
| Windows x64 Store Codex 26.903.8094.0 / inner 26.903.61454 | Structural adapter running in the original window with verified usage snapshots |
| Local Codex work tasks | Supported within available local records |
| GPT regular chat mode | Unsupported; not currently planned |
| Other client versions, macOS, Linux | Unverified |
| Untouched original launch entries | Do not activate the enhancement |
| Thinking-only placeholder before message/progress content | Not implemented in the current DOM adapter |

Startup checks the message structure. Every displayed counter must map unambiguously to a local assistant-message record; conflicting or missing evidence keeps it hidden. One continuous execution is the default scope, including steering during that execution. New requests after completion count separately. Explicit goals can join executions; semantic long-goal grouping and automatic cross-task subagent aggregation are not implemented.

## How it works

1. A launcher activates the installed Store package through Windows application activation, adding local debugging arguments. Setup bundles the launcher, Node, and this project's code.
2. A local helper connects through **Chrome DevTools Protocol (CDP)** on `127.0.0.1`, checking that the endpoint belongs to the original process it launched.
3. It waits for normal page completion before adding the enhancement. It does not intercept resources, force a page reload, or replace installed application files.
4. Using the message data contract rather than component names, it reads opaque task/run/message identifiers and timestamps from native message component metadata, then inserts owned badge nodes beside visible actions or below messages.
5. It incrementally reads local work-task usage records, deduplicates model responses, calculates segment/scope snapshots, and returns numeric data through a restricted bridge.

The UI uses a roughly 500ms check cadence, revisits frozen data around every 10 seconds, and checks hidden pages no more frequently than every 2 seconds. Request duration and record arrival affect actual refresh timing; it is not a server-side per-token stream.

See [architecture](docs/architecture.md) for component responsibilities, data flow, and accounting limits.

## Credits

Thanks to **[JiaYang-BUAA](https://github.com/JiaYang-BUAA)** and contributors of **[Codex Desktop Usage Monitor Windows](https://github.com/JiaYang-BUAA/Codex-Desktop-Usage-Monitor-Windows)**.

That project's original-package activation, loopback CDP connection, and in-window runtime injection informed this implementation. The COM declarations and activation call in `installer/launch-native.ps1` are adapted from it. Segment accounting, minimal badge presentation, and message mapping are maintained here separately. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for exact attribution and the retained upstream MIT license.

## Build on it

You are welcome to fork, learn from, modify, and make this project your own. Improve the accounting, presentation, or accessibility; explore support for more operating systems, devices, and Codex versions. You do not have to keep our visual design or every product choice.

Bug reports, documentation fixes, compatibility findings, and pull requests are all welcome. New platform ports are opportunities to explore together, not existing compatibility guarantees. For larger changes, consider opening an issue first to discuss the approach.

We respect upstream authors and contributors. Follow each applicable license, retain required copyright notices and license text, and make sources and modifications clear. We will continue acknowledging upstream work and contributions and treating alternative approaches respectfully. Sharing improvements back is welcome, but we impose no extra requirement to contribute modifications upstream.

## Development and privacy

Node.js 22+ is needed for development. The installer bundles the runtime for users.

```sh
npm ci
npm test
npm run check
```

See [installer documentation](installer/README.md) and [contributing](CONTRIBUTING.md). The collector reads local work records, not auth.json, and does not upload transcripts. CDP itself grants powerful page access: never expose its port remotely. Do not publish private logs, account data, or extracted client archives.

MIT-licensed code, independently maintained and not affiliated with OpenAI. Attribution does not imply upstream endorsement. Codex client files are not distributed. See [security](SECURITY.md).
