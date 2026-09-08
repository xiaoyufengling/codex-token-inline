using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Windows.Forms;
[assembly: AssemblyTitle("Codex Token Inline")]
[assembly: AssemblyDescription("Local token counter for Codex")]
[assembly: AssemblyCompany("xiaoyufengling")]
[assembly: AssemblyVersion("0.1.0.1")]
[assembly: AssemblyInformationalVersion("0.1.0-alpha.1")]
static class Launcher {
    static string Root = AppDomain.CurrentDomain.BaseDirectory;
    [STAThread] static void Main(string[] args) {
        Application.EnableVisualStyles();
        try {
            if (args.Length > 0 && args[0] == "--manage") { Manage(); return; }
            Start();
        } catch (Exception ex) { MessageBox.Show(ex.Message, "Codex Token Inline", MessageBoxButtons.OK, MessageBoxIcon.Error); }
    }
    static void Start() {
        string exe = Path.Combine(Root, "desktop", "ChatGPT.exe");
        if (!File.Exists(exe)) throw new Exception("安装文件不完整，请重新运行安装程序。\nInstallation is incomplete. Please run Setup again.");
        string profile = Path.Combine(Root, "profile");
        Directory.CreateDirectory(profile);
        var start = new ProcessStartInfo(exe, "--user-data-dir=\"" + profile + "\"");
        start.UseShellExecute = false;
        start.WorkingDirectory = Path.GetDirectoryName(exe);
        start.EnvironmentVariables["CODEX_ELECTRON_USER_DATA_PATH"] = profile;
        start.EnvironmentVariables.Remove("CTI_DIAGNOSTIC_PATH");
        Process.Start(start);
    }
    static void Manage() {
        using (var form = new Form()) {
            form.Text = "Codex Token Inline";
            form.ClientSize = new Size(460, 270);
            form.Font = new Font("Microsoft YaHei UI", 10);
            form.FormBorderStyle = FormBorderStyle.FixedDialog;
            form.MaximizeBox = false;
            form.StartPosition = FormStartPosition.CenterScreen;
            form.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            var label = new Label { Left=24, Top=24, Width=415, Height=105,
                Text="Codex Token Inline  0.1.0-alpha.1\n\n本机体验版 · Windows\n更新频道尚未发布；本版本不会自动升级。" };
            var link = new LinkLabel { Left=24, Top=140, Width=410, Text="by xiaoyufengling · GitHub" };
            link.LinkClicked += delegate { Process.Start("https://github.com/xiaoyufengling"); };
            var launch = new Button { Left=24, Top=197, Width=180, Height=38, Text="启动 / Open Codex" };
            launch.Click += delegate { try { Start(); form.Close(); } catch(Exception ex) { MessageBox.Show(ex.Message); } };
            var uninstall = new Button { Left=230, Top=197, Width=205, Height=38, Text="卸载 / Uninstall" };
            uninstall.Click += delegate {
                Process.Start(new ProcessStartInfo(Path.Combine(Root,"unins000.exe")) { UseShellExecute=true });
                form.Close();
            };
            form.Controls.AddRange(new Control[] {label,link,launch,uninstall});
            Application.Run(form);
        }
    }
}
