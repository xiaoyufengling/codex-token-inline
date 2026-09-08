# Windows 原版接入安装器

0.2.0-alpha.4 适配 Store Codex 26.901.6511.0。

使用 Windows PowerShell 5.1 执行 installer/build.ps1，通过 NodePath 指定 Node.js，通过 CompilerPath 指定 Inno Setup 6.7.3 的 ISCC.exe。Node 同目录需要 LICENSE 文件。默认使用 NativeLauncher.cs 与 native.iss，构建到 .local/dist；LegacyCopy 开关仅用于旧基线。

安装到当前用户 LocalAppData/Programs/CodexTokenInline，包含 Node、我们的源文件、指纹配置、启动器、图标与许可证。没有客户端复制或 profile；约 98 MB 的安装体积主要为 Node。

首次使用需退出原版，再从增强入口启动原安装包。原有入口不会自动注入。原版由 IApplicationActivationManager 激活；调试端口只在本机监听并核对进程归属。辅助程序与启动脚本在 Codex 退出后结束。没有开机启动项和自动升级。

管理页显示版本、作者、JiaYang-BUAA 项目链接和卸载入口。安装时发现旧安装会要求先卸载。卸载核对归属标记并等待运行中的增强退出；只删除安装器登记的文件及精确列出的状态文件，不清理共享 Codex 数据。

同一台电脑上已验证此前预览版的实际安装、兼容性检查及卸载：目录、快捷方式和卸载登记均被清理；原版工作模式的显示已获确认。alpha.4 已通过源码测试和安装包编译，更新后的计数器已在原版窗口接收数据；此版本新增的语言设置与卸载清理尚未完成完整安装/卸载实机复测。不要将前版验证等同于本版或更多设备的验证。

图标按用户提供的透明原图内容边界适配 96% 可用尺寸，编码为 16–256 像素 ICO。Inno Setup 简体中文翻译保留作者信息。Node 与参考项目许可随安装分发。代码签名及联网更新通知未配置。
