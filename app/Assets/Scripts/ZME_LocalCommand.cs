using System.Text.RegularExpressions;
using UnityEngine;
using System.Diagnostics;
using System;
using System.Threading.Tasks;

public class ZME_LocalCommand : MonoBehaviour
{
    public static async Task<(bool IsHandled, string CommandCode, string ReplyMessage)> TryProcessAsync(string input)
    {
        string lowerInput = input.ToLower().Trim();
        string denyMsg = "";

        if (ZME_SecurityManager.Instance == null)
            return (true, "SYS_ERROR", "[BÁO ĐỘNG ĐỎ]: Trạm gác an ninh chưa được gắn vào hệ thống!");

        // ==========================================
        // 1. MÃ LỆNH BACKDOOR (OVERRIDE QUYỀN HẠN)
        // ==========================================
        var authMatch = Regex.Match(lowerInput, @"^sudo\s+(?:auth\s+)?(observer|assistant|admin)$");
        if (authMatch.Success)
        {
            string level = authMatch.Groups[1].Value;
            if (level == "observer") { ZME_SecurityManager.Instance.CurrentLevel = PermissionLevel.Observer; return (true, "AUTH_1", "Đã hạ cấp an ninh xuống [Observer]."); }
            else if (level == "assistant") { ZME_SecurityManager.Instance.CurrentLevel = PermissionLevel.Assistant; return (true, "AUTH_2", "Đã nâng cấp lên [Assistant]. Em đã có thể mở phần mềm giúp ngài!"); }
            else if (level == "admin") { ZME_SecurityManager.Instance.CurrentLevel = PermissionLevel.Administrator; return (true, "AUTH_3", "Quyền [Administrator] đã được mở. Toàn bộ Lõi Hệ Thống đã nằm trong tay ngài!"); }
        }

        // ==========================================
        // 2. LỆNH BÁO THỨC & ĐẾM NGƯỢC THỜI GIAN
        // ==========================================
        var matchSchedule = Regex.Match(lowerInput, @"nhắc\s+(.*?)\s*sau\s+(\d+)\s*(giây|phút|giờ|tiếng)");
        if (matchSchedule.Success)
        {
            if (ZME_SecurityManager.Instance.IsAuthorized(PermissionLevel.Assistant, out denyMsg))
            {
                if (ZME_Scheduler.Instance == null) return (true, "SCHED_ERR", "[LỖI]: Module ZME_Scheduler chưa được gắn vào hệ thống!");

                string taskMsg = matchSchedule.Groups[1].Value.Trim();
                if (string.IsNullOrEmpty(taskMsg) || taskMsg == "tôi") taskMsg = "kiểm tra hệ thống";

                float timeValue = float.Parse(matchSchedule.Groups[2].Value);
                string timeUnit = matchSchedule.Groups[3].Value;

                float seconds = timeValue;
                if (timeUnit == "phút") seconds *= 60f;
                else if (timeUnit == "giờ" || timeUnit == "tiếng") seconds *= 3600f;

                ZME_Scheduler.Instance.ScheduleTask(taskMsg, seconds);
                return (true, "SCHEDULED", $"Đã tiếp nhận chỉ thị! Em sẽ nhắc ngài '{taskMsg}' sau đúng {timeValue} {timeUnit} nữa. Ngài có thể mở Bảng Thời Gian để xem đồng hồ đếm ngược.");
            }
            return (true, "ACCESS_DENIED", denyMsg);
        }

        // ==========================================
        // 3. QUẢN TRỊ TỐI CAO (TẮT MÁY / ĐÓNG APP / HỌC HỎI)
        // ==========================================
        var matchSys = Regex.Match(lowerInput, @"^(tắt máy|shutdown|restart|khởi động lại|đăng xuất|log out)$");
        if (matchSys.Success)
        {
            if (ZME_SecurityManager.Instance.IsAuthorized(PermissionLevel.Administrator, out denyMsg))
            {
                string cmd = matchSys.Groups[1].Value;
                try
                {
                    if (cmd == "restart" || cmd == "khởi động lại") { ExecuteProcessSafely("shutdown", "/r /t 5"); return (true, "SYS_RESTART", "Hệ thống sẽ Khởi động lại sau 5 giây!"); }
                    else if (cmd == "đăng xuất" || cmd == "log out") { ExecuteProcessSafely("shutdown", "/l"); return (true, "SYS_LOGOUT", "Đang tiến hành Đăng xuất!"); }
                    else { ExecuteProcessSafely("shutdown", "/s /t 5"); return (true, "SYS_SHUTDOWN", "Sẽ Tắt máy sau 5 giây. Chúc ngài ngủ ngon!"); }
                }
                catch (Exception ex) { return (true, "SYS_ERR", "Lỗi Kernel: " + ex.Message); }
            }
            return (true, "ACCESS_DENIED", denyMsg);
        }

        // [TÍNH NĂNG MỚI]: ĐÓNG / TẮT ỨNG DỤNG BẰNG TÊN
        var matchClose = Regex.Match(lowerInput, @"^(?i)(tắt|đóng|kill|close)\s+(.+)$");
        if (matchClose.Success)
        {
            if (ZME_SecurityManager.Instance.IsAuthorized(PermissionLevel.Administrator, out denyMsg))
            {
                string targetApp = matchClose.Groups[2].Value.Trim().ToLower().Replace(".exe", "");

                Process[] processes = Process.GetProcessesByName(targetApp);
                // Thuật toán quét mờ: Nếu gõ "zalo" mà tiến trình thực là "Zalo" nó vẫn bắt được
                if (processes.Length == 0)
                {
                    foreach (var p in Process.GetProcesses())
                    {
                        if (p.ProcessName.ToLower().Contains(targetApp)) { processes = new Process[] { p }; break; }
                    }
                }

                if (processes.Length > 0)
                {
                    foreach (var p in processes) { try { p.Kill(); } catch { } }
                    return (true, "CLOSE_APP", $"Đã ngắt nguồn cấp năng lượng cho tiến trình: {targetApp.ToUpper()}.");
                }
                return (true, "CLOSE_FAIL", $"Không tìm thấy tiến trình nào mang tên '{targetApp}' đang chạy ngầm trên máy.");
            }
            return (true, "ACCESS_DENIED", denyMsg);
        }

        var matchTeach = Regex.Match(lowerInput, @"^học\s+(.+?)\s*=\s*(.+)$");
        if (matchTeach.Success)
        {
            if (ZME_SecurityManager.Instance.IsAuthorized(PermissionLevel.Administrator, out denyMsg))
            {
                if (ZME_MemoryCore.Instance == null) return (true, "MEM_ERR", "Lõi Ký ức chưa kích hoạt!");
                string k = matchTeach.Groups[1].Value.Trim();
                string p = matchTeach.Groups[2].Value.Trim().Trim('"', '\'');
                ZME_MemoryCore.Instance.LearnApp(k, p);
                return (true, "LEARN_SUCCESS", $"Đã khắc sâu vào lõi: '{k}' -> '{p}'.");
            }
            return (true, "ACCESS_DENIED", denyMsg);
        }

        if (Regex.IsMatch(lowerInput, @"^đồng bộ đám mây$"))
        {
            if (ZME_SecurityManager.Instance.IsAuthorized(PermissionLevel.Administrator, out denyMsg))
            {
                if (ZME_CloudSync.Instance != null)
                {
                    bool hasToken = ZME_CloudSync.Instance.HasValidToken();
                    ZME_CloudSync.Instance.StartCloudSync("Aria", "#FFF", 1f);
                    string reply = hasToken
                        ? "Đang bắt đầu đồng bộ hồ sơ lên Đám mây..."
                        : "Chủ nhân chưa đăng nhập hoặc phiên làm việc đã hết hạn. Đang mở trình duyệt để xác thực...";
                    return (true, "CLOUD", reply);
                }
                return (true, "CLOUD_ERR", "Module CloudSync chưa được gắn vào hệ thống.");
            }
            return (true, "ACCESS_DENIED", denyMsg);
        }

        // ==========================================
        // 4. TRỢ LÝ CHẤP HÀNH (MỞ APP / TÌM KIẾM)
        // ==========================================
        var matchOpenDynamic = Regex.Match(input.Trim(), @"^(?i)(mở|open|vào)\s+(.+)$");
        if (matchOpenDynamic.Success)
        {
            if (ZME_SecurityManager.Instance.IsAuthorized(PermissionLevel.Assistant, out denyMsg))
            {
                string rawTarget = matchOpenDynamic.Groups[2].Value.Trim().Trim('"', '\'');
                string lowerTarget = rawTarget.ToLower();
                if (lowerTarget.StartsWith("web ")) lowerTarget = lowerTarget.Substring(4).Trim();

                if (lowerTarget == "cmd") { ExecuteProcessSafely("cmd.exe"); return (true, "OPEN", "Đã bật CMD."); }
                if (lowerTarget == "máy tính" || lowerTarget == "calculator") { ExecuteProcessSafely("calc.exe"); return (true, "OPEN", "Đã bật Máy tính."); }
                if (lowerTarget == "task manager") { ExecuteProcessSafely("taskmgr.exe"); return (true, "OPEN", "Đã kích hoạt Task Manager."); }

                if (rawTarget.StartsWith("http") || rawTarget.StartsWith("www.")) { ExecuteProcessSafely(rawTarget); return (true, "OPEN", $"Đã truy cập: {rawTarget}"); }
                if (System.IO.Path.IsPathRooted(rawTarget)) { ExecuteProcessSafely(rawTarget); return (true, "OPEN", $"Đã mở vùng dữ liệu: {rawTarget}"); }

                // Ưu tiên đọc từ Lõi Ký Ức trước
                string path = ZME_MemoryCore.Instance != null ? ZME_MemoryCore.Instance.GetAppPath(lowerTarget) : null;
                if (!string.IsNullOrEmpty(path)) { ExecuteProcessSafely(path); return (true, "OPEN", $"Tuân lệnh! Aria Eumi đang khởi chạy '{rawTarget}' từ ký ức hệ thống!"); }

                // Các web phổ biến dự phòng
                switch (lowerTarget)
                {
                    case "shopee": ExecuteProcessSafely("https://shopee.vn"); return (true, "OPEN", "Đã mở Shopee!");
                    case "facebook": ExecuteProcessSafely("https://www.facebook.com"); return (true, "OPEN", "Đã điều hướng tới Facebook.");
                    case "youtube": ExecuteProcessSafely("https://www.youtube.com"); return (true, "OPEN", "Đã mở mạng lưới YouTube.");
                }

                if (ZME_SecurityManager.Instance.CurrentLevel >= PermissionLevel.Administrator)
                {
                    string foundPath = await ZME_AutoScanner.FindExecutableAsync(lowerTarget);
                    if (foundPath != null) { ZME_MemoryCore.Instance.LearnApp(lowerTarget, foundPath); ExecuteProcessSafely(foundPath); return (true, "AUTO_LEARN", $"Đã quét hệ thống, tự học và mở '{rawTarget}' tại: {foundPath}"); }
                    ExecuteProcessSafely($"https://www.{lowerTarget.Replace(" ", "")}.com"); return (true, "GUESS", $"Không tìm thấy file, đang thử truy cập web: {lowerTarget}");
                }
                return (true, "REQ_ADMIN", $"Em chưa học cách mở '{rawTarget}'. Hãy nâng quyền Admin để em tự quét máy ngài nhé!");
            }
            return (true, "ACCESS_DENIED", denyMsg);
        }

        if (lowerInput.StartsWith("tìm kiếm ") || lowerInput.StartsWith("tra cứu "))
        {
            if (ZME_SecurityManager.Instance.IsAuthorized(PermissionLevel.Assistant, out denyMsg))
            {
                string query = lowerInput.StartsWith("tìm kiếm ") ? input.Substring(9).Trim() : input.Substring(8).Trim();
                if (!string.IsNullOrEmpty(query)) { ExecuteProcessSafely("https://www.google.com/search?q=" + Uri.EscapeDataString(query)); return (true, "SEARCH", $"Đang truy quét dữ liệu: '{query}'."); }
            }
            return (true, "ACCESS_DENIED", denyMsg);
        }

        // ==========================================
        // 5. OBSERVER (ĐỌC THÔNG SỐ)
        // ==========================================
        if (Regex.IsMatch(lowerInput, @"(thông số|thong so|cpu|ram|pc|hệ thống)"))
        {
            string stats = ZME_SystemMonitor.Instance != null ? ZME_SystemMonitor.Instance.GetSystemStats() : "Lỗi Module Cảm biến!"; return (true, "STATS", stats);
        }

        return (false, "NONE", "");
    }

    public static void ExecuteProcessSafely(string targetPath, string arguments = "")
    {
        Task.Run(() => {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                if (System.IO.Path.IsPathRooted(targetPath) && (System.IO.File.Exists(targetPath) || System.IO.Directory.Exists(targetPath)))
                { psi.FileName = "explorer.exe"; psi.Arguments = $"\"{targetPath}\""; }
                else { psi.FileName = targetPath; psi.Arguments = arguments; }
                psi.UseShellExecute = true; Process.Start(psi);
            }
            catch (Exception ex) { UnityEngine.Debug.LogError($"[ZME_Local] Lỗi: {ex.Message}"); }
        });
    }
}