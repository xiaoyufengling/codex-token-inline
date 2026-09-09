using System;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Reflection;
using System.Windows.Forms;
[assembly: AssemblyTitle("Codex Token Inline")]
[assembly: AssemblyCompany("xiaoyufengling")]
[assembly: AssemblyVersion("0.2.0.5")]
[assembly: AssemblyInformationalVersion("0.2.0-alpha.5")]
static class NativeLauncher {
    const string Version="0.2.0-alpha.5";
    static string Root=AppDomain.CurrentDomain.BaseDirectory;
    static bool English {
        get { try { return File.ReadAllText(Path.Combine(Root,"language.txt")).Trim()=="en"; }
              catch { return CultureInfo.CurrentUICulture.TwoLetterISOLanguageName!="zh"; } }
    }
    static string L(string zh,string en){return English?en:zh;}
    [STAThread] static void Main(string[] args){
        Application.EnableVisualStyles();
        try{
            if(args.Length>0 && args[0]=="--manage"){Manage();return;}
            CheckUpdates(false);
            string script=Path.Combine(Root,"installer","launch-native.ps1");
            if(!File.Exists(script))throw new Exception(L("安装不完整，请重新安装。","Installation is incomplete. Please reinstall."));
            var start=new ProcessStartInfo(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),"WindowsPowerShell","v1.0","powershell.exe"),
                "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File \""+script+"\"");
            start.UseShellExecute=false;start.CreateNoWindow=true;start.WindowStyle=ProcessWindowStyle.Hidden;
            Process.Start(start);
        }catch(Exception error){MessageBox.Show(error.Message,"Codex Token Inline");}
    }
    static void OpenLink(string url){Process.Start(new ProcessStartInfo(url){UseShellExecute=true});}
    static void CheckUpdates(bool manual){
        var script=Path.Combine(Root,"installer","check-updates.ps1");
        if(!File.Exists(script))return;
        Process.Start(new ProcessStartInfo(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),"WindowsPowerShell","v1.0","powershell.exe"),
            "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File \""+script+"\""+(manual?" -Manual":"")){UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden});
    }
    static void Manage(){
        using(var form=new Form()){
            form.Text="Codex Token Inline";form.ClientSize=new Size(520,390);
            form.Font=new Font("Segoe UI",10);form.FormBorderStyle=FormBorderStyle.FixedDialog;
            form.MaximizeBox=false;form.StartPosition=FormStartPosition.CenterScreen;
            form.Icon=Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            var text=new Label{Left=24,Top=20,Width=474,Height=90};
            var author=new LinkLabel{Left=24,Top=112,Width=474,Text="by xiaoyufengling · GitHub"};
            author.LinkClicked+=delegate{OpenLink("https://github.com/xiaoyufengling");};
            var credit=new LinkLabel{Left=24,Top=144,Width=474,Text="Thanks: JiaYang-BUAA · Codex Usage Monitor (MIT)"};
            credit.LinkClicked+=delegate{OpenLink("https://github.com/JiaYang-BUAA/Codex-Desktop-Usage-Monitor-Windows");};
            var languageLabel=new Label{Left=24,Top=184,Width=104,Height=26};
            var language=new ComboBox{Left=136,Top=180,Width=170,DropDownStyle=ComboBoxStyle.DropDownList};
            language.Items.AddRange(new object[]{"简体中文","English"});language.SelectedIndex=English?1:0;
            var note=new Label{Left=24,Top=220,Width=474,Height=42};
            var updates=new Button{Left=24,Top=330,Width=220,Height=38};
            updates.Click+=delegate{CheckUpdates(true);};
            var versions=new Button{Left=268,Top=330,Width=228,Height=38};
            versions.Click+=delegate{OpenLink("https://github.com/xiaoyufengling/codex-token-inline/releases");};
            var open=new Button{Left=24,Top=280,Width=220,Height=38};
            open.Click+=delegate{Main(new string[0]);form.Close();};
            var uninstall=new Button{Left=268,Top=280,Width=228,Height=38};
            uninstall.Click+=delegate{Process.Start(new ProcessStartInfo(Path.Combine(Root,"unins000.exe")){UseShellExecute=true});form.Close();};
            Action refresh=delegate{
                text.Text="Codex Token Inline  "+Version+"\n"+L("原版 Codex 工作模式的用量显示","Inline usage in original Codex work mode")+"\n"+L("启动时检查更新 · 自愿安装","Checks for updates on launch · Optional installation");
                updates.Text=L("检查更新","Check for updates");versions.Text=L("所有版本","All releases");
                languageLabel.Text=L("界面语言","Language");
                note.Text=L("语言设置会保存。新版本首次使用需重启增强入口。","Your language preference is saved. Restart the enhanced entry after updating.");
                open.Text=L("打开原版 Codex","Open original Codex");uninstall.Text=L("卸载","Uninstall");
            };
            language.SelectedIndexChanged+=delegate{
                try{File.WriteAllText(Path.Combine(Root,"language.txt"),language.SelectedIndex==1?"en":"zh");refresh();}
                catch{MessageBox.Show(L("无法保存语言设置。","Could not save the language preference."),"Codex Token Inline");}
            };
            refresh();form.Controls.AddRange(new Control[]{text,author,credit,languageLabel,language,note,open,uninstall,updates,versions});Application.Run(form);
        }
    }
}
