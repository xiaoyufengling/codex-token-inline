# 原版 Codex 内嵌增强：GitHub 调研

核对日期：2026-09-08。阅读了项目说明、实现源码及发布信息；未安装或运行第三方代码，未验证本机当前 Codex 的 CDP 启动兼容性。

## 结论

不复制客户端也能向原版窗口添加组件：已有项目通过本机 Chrome DevTools Protocol（CDP）运行时注入实现。不过，它们需要用调试参数启动原版应用。原样点击原来的启动入口并不会自动加载增强。官方插件文档目前未提供任意消息操作行的原生组件扩展接口，不能把这种非官方增强称为已受支持的市场插件。

官方文档：https://developers.openai.com/codex/plugins/

## 最接近的项目

[Codex Desktop Usage Monitor Windows](https://github.com/JiaYang-BUAA/Codex-Desktop-Usage-Monitor-Windows)，MIT。

- [启动实现](https://github.com/JiaYang-BUAA/Codex-Desktop-Usage-Monitor-Windows/blob/main/scripts/monitor-utils.ps1#L742)：为原版传入 remote-debugging-port、127.0.0.1 监听地址及指定 origin；Store 版通过 IApplicationActivationManager.ActivateApplication 激活原安装包。
- [启动流程](https://github.com/JiaYang-BUAA/Codex-Desktop-Usage-Monitor-Windows/blob/main/scripts/launch-codex-monitor.ps1#L70)：已有非 CDP Codex 正在运行时提示用户正常退出，不强行重启。README 明确要求专用入口；原生图标启动不显示监控。
- [注入器](https://github.com/JiaYang-BUAA/Codex-Desktop-Usage-Monitor-Windows/blob/main/scripts/injector.mjs#L467)：通过 WebSocket/CDP Runtime.evaluate 注入，页面重载后重新挂载；辅助进程轮询目标并管理生命周期。
- [界面](https://github.com/JiaYang-BUAA/Codex-Desktop-Usage-Monitor-Windows/blob/main/assets/usage-inject.js#L1523)：在输入框附近创建 DOM 元素及 Shadow DOM，用 MutationObserver 维护位置。是窗口内部组件，不是屏幕悬浮层。
- [数据](https://github.com/JiaYang-BUAA/Codex-Desktop-Usage-Monitor-Windows/blob/main/scripts/usage-client.mjs)：读取本地记录并使用 app-server。README 说明单次回答统计在回答完成后更新，不能据此声称逐 token 实时统计。
- [v3.0.4](https://github.com/JiaYang-BUAA/Codex-Desktop-Usage-Monitor-Windows/releases/tag/v3.0.4)，2026-09-05 发布，ZIP 为 623,302 字节；不含 Node 或 Codex，不能当成完整独立安装体积。

借鉴接入方式，保留我们已接受的分段冻结、累计、简洁标签和刷新逻辑。不要照搬其复杂状态栏、自动更新替换策略或关闭杀毒软件的排障建议。MIT 代码复用应保留许可与署名。

## 其他路线

[CodexPlusPlus](https://github.com/BigPizzaV3/CodexPlusPlus)：外部启动器及本地辅助程序，通过 CDP 增强原版，不改 app.asar；README 仍要求从 Codex++ 入口启动。[launcher.rs](https://github.com/BigPizzaV3/CodexPlusPlus/blob/main/crates/codex-plus-core/src/launcher.rs#L2298) 包含调试启动参数。AGPL-3.0-only，与 MIT 的复用条件不同。可参考安装和生命周期设计，不需要其模型/认证管理功能。

[codex-windows-fast-patch-skill](https://github.com/chen0416ccc-cpu/codex-windows-fast-patch-skill)：名称有 skill，但核心是修改并重新打包 MSIX。[源码](https://github.com/chen0416ccc-cpu/codex-windows-fast-patch-skill/blob/main/scripts/patch_codex_fast_mode_windows_msix.ps1#L2467) 创建自签名证书、写入证书信任、打包签名，再移除并安装替代包。可作为研究原包入口的线索，不能称为轻量普通插件；入口保留、官方更新、数据保留及恢复都需验证。未执行该脚本。

[codex-desktop-rtl-patch](https://github.com/aviz85/codex-desktop-rtl-patch) 在 Windows 使用独立复制运行目录，不符合用户要求。[codexU](https://github.com/shanggqm/codexU) 是独立统计应用，也不是原生消息行扩展。

## 下一步及验收界限

建议先验证当前 Store 版能否用 CDP 激活，并在原版窗口挂载最小标签，再考虑安装器。调试端口权限很强，若实施需仅监听本机并与 Codex 生命周期绑定；不得暴露到外网或宣称没有后台开销。

原版窗口接入与原入口无感启动是两项不同验收。前者有开源实现证据；后者仍未解决，不能悄悄改快捷方式并宣称已经完成。当前任务是调研，没有修改本机安装包、原入口或证书。
