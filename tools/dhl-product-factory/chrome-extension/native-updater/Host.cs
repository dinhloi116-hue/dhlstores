// Chrome Native Messaging host for DHL Product Factory. Compiled locally by cai-dat-nut-cap-nhat.ps1.
// Accepts only two literal messages: {"command":"ping"} or {"command":"update"}.
// No user-selected commands, paths, URLs or arguments can be executed.
using System;
using System.IO;
using System.Text;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;

internal static class Host
{
    const string AllowedCaller = "chrome-extension://ojbejkjaalblfimeojmobicanhbipkel";
    static byte[] ReadBytes(Stream input, int count)
    {
        byte[] buffer = new byte[count]; int n = 0;
        while (n < count) { int k = input.Read(buffer, n, count-n); if (k <= 0) throw new EndOfStreamException(); n += k; }
        return buffer;
    }
    static string Escape(string s)
    {
        if(s == null) return "";
        StringBuilder b = new StringBuilder();
        foreach (char c in s) {
            if (c == '\\') b.Append("\\\\");
            else if (c == '"') b.Append("\\\"");
            else if (c == '\n') b.Append("\\n");
            else if (c == '\r') b.Append("\\r");
            else if (c == '\t') b.Append("\\t");
            else if (c < 32) b.Append(" ");
            else b.Append(c);
        }
        return b.ToString();
    }
    static void Reply(bool ok, string version, string msg)
    {
        string json = "{\"ok\":" + (ok ? "true" : "false") + ",\"version\":\"" + Escape(version) + "\",\"message\":\"" + Escape(msg) + "\"}";
        byte[] payload = Encoding.UTF8.GetBytes(json);
        Stream output = Console.OpenStandardOutput();
        byte[] prefix = BitConverter.GetBytes(payload.Length);
        output.Write(prefix,0,4); output.Write(payload,0,payload.Length); output.Flush();
    }
    static string LocalVersion(string root)
    {
        string data = File.ReadAllText(Path.Combine(root, "manifest.json"), Encoding.UTF8);
        System.Text.RegularExpressions.Match m = System.Text.RegularExpressions.Regex.Match(data, "\\\"version\\\"\\s*:\\s*\\\"(\\d+\\.\\d+\\.\\d+)\\\"");
        if (!m.Success) throw new Exception("Khong doc duoc phien ban manifest.");
        return m.Groups[1].Value;
    }
    static void RunUpdate(string root)
    {
        string ps = Path.Combine(root, "cap-nhat-tu-git.ps1");
        if (!File.Exists(ps)) throw new FileNotFoundException("Khong tim thay script cap nhat.");
        string shell = Path.Combine(Environment.SystemDirectory, "WindowsPowerShell", "v1.0", "powershell.exe");
        if (!File.Exists(shell)) throw new FileNotFoundException("Khong tim thay Windows PowerShell.");
        ProcessStartInfo start = new ProcessStartInfo();
        start.FileName = shell;
        start.Arguments = "-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File \"" + ps + "\"";
        start.WorkingDirectory = root;
        start.UseShellExecute = false; start.CreateNoWindow = true;
        start.RedirectStandardOutput = true; start.RedirectStandardError = true;
        using (Process p = Process.Start(start)) {
            Task<string> stdout = p.StandardOutput.ReadToEndAsync();
            Task<string> stderr = p.StandardError.ReadToEndAsync();
            if (!p.WaitForExit(300000)) {
                try { p.Kill(); } catch { }
                throw new TimeoutException("Cap nhat qua 5 phut. Kiem tra ket noi mang.");
            }
            Task.WaitAll(stdout, stderr);
            if (p.ExitCode != 0) {
                string error = stderr.Result.Trim();
                if (error.Length == 0) error = stdout.Result.Trim();
                if (error.Length > 600) error = error.Substring(error.Length - 600);
                throw new Exception("PowerShell cap nhat that bai: " + error);
            }
        }
    }
    static int Main(string[] args)
    {
        try {
            string caller = args.Length > 0 ? args[0].TrimEnd('/') : "";
            if (!String.Equals(caller, AllowedCaller, StringComparison.Ordinal)) {
                Reply(false, "", "Nguon yeu cau khong duoc cho phep."); return 0;
            }
            Stream input = Console.OpenStandardInput();
            byte[] header = ReadBytes(input, 4);
            int size = BitConverter.ToInt32(header, 0);
            if (size < 2 || size > 4096) throw new Exception("Message khong hop le.");
            string body = Encoding.UTF8.GetString(ReadBytes(input, size)).Trim();
            string root = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, ".."));
            if (body == "{\"command\":\"ping\"}") {
                Reply(true, LocalVersion(root), "Bo cap nhat Windows da san sang.");
                return 0;
            }
            if (body != "{\"command\":\"update\"}") {
                Reply(false, "", "Lenh khong duoc ho tro."); return 0;
            }
            using(Mutex gate = new Mutex(false, "Local\\DHLProductFactoryUpdate")) {
                bool lockTaken = false;
                try {
                    try { lockTaken = gate.WaitOne(0); } catch(AbandonedMutexException) { lockTaken = true; }
                    if(!lockTaken) throw new Exception("Mot ban cap nhat khac dang chay.");
                    RunUpdate(root);
                } finally { if(lockTaken) gate.ReleaseMutex(); }
            }
            Reply(true, LocalVersion(root), "Cap nhat thanh cong.");
        } catch(Exception e) {
            Reply(false, "", e.Message);
        }
        return 0;
    }
}
