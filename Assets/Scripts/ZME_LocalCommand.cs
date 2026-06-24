using System.Text.RegularExpressions;
using UnityEngine;
using System.Diagnostics;
using System;
using System.Threading.Tasks;

public class ZME_LocalCommand : MonoBehaviour
{
    // Hệ thống chạy trên luồng phi đồng bộ xử lý tác vụ ngầm mượt mà
    public static async Task<(bool IsHandled, string CommandCode, string ReplyMessage)> TryProcessAsync(string input)
    {
        string lowerInput = input.ToLower().Trim();
        string denyMsg = "";

        // ==========================================
        // 1. CHỐT CHẶN AN TOÀN CHỐNG CRASH HỆ THỐNG UI
        // ==========================================
        if (ZME_SecurityManager.Instance == null)
        {
            return (true, "SYS_ERROR", "[BÁO ĐỘNG ĐỎ]: Trạm gác an ninh (ZME_SecurityManager) chưa được gắn vào hệ thống. Kỹ sư trưởng EUA hãy kéo Script ZME_SecurityManager thả vào Object Idle trên Scene nhé!");
        }

        // ==========================================
        // 2. KHU VỰC OVERRIDE QUYỀN HẠN (MÃ LỆNH BACKDOOR)
        // ==========================================
        var authMatch = Regex.Match(lowerInput, @"^sudo\s+(?:auth\s+)?(observer|assistant|admin)$");
        if (authMatch.Success)
        {
            string level = authMatch.Groups[1].Value;

            if (level == "observer")
            {
                ZME_SecurityManager.Instance.CurrentLevel = PermissionLevel.Observer;
                return (true, "AUTH_1", "Đã hạ cấp an ninh xuống [Level 1 - Observer]. Tuyến phòng thủ đã được đóng chặt.");
            }
            else if (level == "assistant")
            {
                ZME_SecurityManager.Instance.CurrentLevel = PermissionLevel.Assistant;
                return (true, "AUTH_2", "Xác thực thành công! Đã nâng cấp lên [Level 2 - Assistant]. Em đã có thể mở phần mềm giúp ngài!");
            }
            else if (level == "admin")
            {
                ZME_SecurityManager.Instance.CurrentLevel = PermissionLevel.Administrator;
                return (true, "AUTH_3", "Mã xác thực Kernel hợp lệ! Quyền [Level 3 - Administrator] đã được mở. Toàn bộ Lõi Hệ Thống đã nằm trong tay Kỹ sư trưởng EUA!");
            }
        }

        // ==========================================
        // 3. LEVEL 3: QUẢN TRỊ TỐI CAO (Lệnh nguy hiểm & Quản trị CSDL)
        // ==========================================

        // --- Lệnh tắt máy ---
        var matchSys = Regex.Match(lowerInput, @"^(tắt máy|shutdown|restart|khởi động lại|đăng xuất|log out)$");
        if (matchSys.Success)
        {
            if (ZME_SecurityManager.Instance.IsAuthorized(PermissionLevel.Administrator, out denyMsg))
            {
                string cmd = matchSys.Groups[1].Value;
                try
                {
                    if (cmd == "restart" || cmd == "khởi động lại")
                    {
                        Process.Start("shutdown", "/r /t 5"); // /r là Restart, /t 5 là đếm ngược 5s
                        return (true, "SYS_RESTART", "Tuân lệnh Kỹ sư trưởng! Hệ thống sẽ Khởi động lại sau 5 giây!");
                    }
                    else if (cmd == "đăng xuất" || cmd == "log out")
                    {
                        Process.Start("shutdown", "/l"); // /l là Log off
                        return (true, "SYS_LOGOUT", "Tuân lệnh! Đang tiến hành ngắt kết nối và Đăng xuất ngay lập tức!");
                    }
                    else
                    {
                        Process.Start("shutdown", "/s /t 5"); // /s là Shutdown
                        return (true, "SYS_SHUTDOWN", "Tuân lệnh! Aria Eumi sẽ tiến hành Tắt máy sau 5 giây. Chúc ngài ngủ ngon!");
                    }
                }
                catch (Exception ex) { return (true, "SYS_ERR", "Lỗi Kernel: " + ex.Message); }
            }
            return (true, "ACCESS_DENIED", denyMsg);
        }

        // --- Lệnh Dạy Học (Ghi ký ức) ---
        var matchTeach = Regex.Match(lowerInput, @"^học\s+(.+?)\s*=\s*(.+)$");
        if (matchTeach.Success)
        {
            if (ZME_SecurityManager.Instance.IsAuthorized(PermissionLevel.Administrator, out denyMsg))
            {
                if (ZME_MemoryCore.Instance == null)
                    return (true, "MEM_ERROR", "[LỖI]: Bộ nhớ lõi ZME_MemoryCore chưa được kích hoạt trên Scene!");

                string keyword = matchTeach.Groups[1].Value.Trim();
                string path = matchTeach.Groups[2].Value.Trim().Trim('"', '\'');

                ZME_MemoryCore.Instance.LearnApp(keyword, path);
                return (true, "LEARN_SUCCESS", $"Đã khắc sâu vào lõi nơ-ron: Gọi '{keyword}' -> Mở '{path}'.");
            }
            return (true, "ACCESS_DENIED", denyMsg);
        }

        // --- Lệnh Tẩy Não (Xóa ký ức) ---
        var matchForget = Regex.Match(lowerInput, @"^quên\s+(.+)$");
        if (matchForget.Success)
        {
            if (ZME_SecurityManager.Instance.IsAuthorized(PermissionLevel.Administrator, out denyMsg))
            {
                if (ZME_MemoryCore.Instance == null)
                    return (true, "MEM_ERROR", "[LỖI]: Bộ nhớ lõi ZME_MemoryCore chưa được kích hoạt!");

                string keyword = matchForget.Groups[1].Value.Trim();
                bool isDeleted = ZME_MemoryCore.Instance.ForgetApp(keyword);

                if (isDeleted)
                {
                    return (true, "FORGET_SUCCESS", $"Tuân lệnh! Em đã xóa vĩnh viễn ký ức về '{keyword}' khỏi mạng lưới nơ-ron cục bộ.");
                }
                else
                {
                    return (true, "FORGET_FAIL", $"Dạ báo cáo, em lục tung bộ nhớ nhưng không hề thấy dữ liệu nào tên là '{keyword}' để xóa cả ạ!");
                }
            }
            return (true, "ACCESS_DENIED", denyMsg);
        }

        // --- Lệnh Test Đồng Bộ Lên Đám Mây AWS ---
        if (Regex.IsMatch(lowerInput, @"^đồng bộ đám mây$"))
        {
            if (ZME_SecurityManager.Instance.IsAuthorized(PermissionLevel.Administrator, out denyMsg))
            {
                if (ZME_CloudSync.Instance != null)
                {
                    // Giả lập lưu một bộ thông số tùy chỉnh lên AWS DynamoDB
                    _ = ZME_CloudSync.Instance.SaveProfileAsync("Aria Eumi", "#FFB6C1", 1.25f);
                    return (true, "CLOUD_SYNC", "Đang đóng gói dữ liệu sinh trắc học và phóng lên Trạm không gian AWS DynamoDB...");
                }
                return (true, "CLOUD_ERR", "Lỗi: Chưa tìm thấy Module ZME_CloudSync trong hệ thống. Ngài đã gắn Script này vào Scene chưa ạ?");
            }
            return (true, "ACCESS_DENIED", denyMsg);
        }

        // ==========================================
        // 4. LEVEL 2 & 3: TRỢ LÝ CHẤP HÀNH (Mở phần mềm & Scan)
        // ==========================================

        // --- Mở phần mềm cứng (Notepad) ---
        if (Regex.IsMatch(lowerInput, @"(mở|open).*(notepad|nodepad|ghi chú)"))
        {
            if (ZME_SecurityManager.Instance.IsAuthorized(PermissionLevel.Assistant, out denyMsg))
            {
                try { Process.Start("notepad.exe"); } catch { }
                return (true, "OPEN_NOTEPAD", "Đã mở sổ tay Notepad cho ngài rồi nhé!");
            }
            return (true, "ACCESS_DENIED", denyMsg);
        }

        // --- Mở thông minh (Bypass Ngoặc kép & Đường dẫn tuyệt đối) ---
        var matchOpenDynamic = Regex.Match(input.Trim(), @"^(?i)(mở|open)\s+(.+)$");
        if (matchOpenDynamic.Success)
        {
            if (ZME_SecurityManager.Instance.IsAuthorized(PermissionLevel.Assistant, out denyMsg))
            {
                if (ZME_MemoryCore.Instance == null)
                    return (true, "MEM_ERROR", "[LỖI]: Hệ thống ký ức cục bộ chưa phản hồi.");

                string rawAppName = matchOpenDynamic.Groups[2].Value.Trim().Trim('"', '\'');
                string lowerAppName = rawAppName.ToLower();

                // [MẠCH ĐIỆN BYPASS]: NHẬN DIỆN ĐƯỜNG DẪN HOẶC FILE TRỰC TIẾP
                if (System.IO.Path.IsPathRooted(rawAppName))
                {
                    if (System.IO.Directory.Exists(rawAppName) || System.IO.File.Exists(rawAppName))
                    {
                        try
                        {
                            Process.Start(new ProcessStartInfo(rawAppName) { UseShellExecute = true });
                            return (true, "OPEN_DIRECT", $"Tuân lệnh! Aria Eumi đã truy cập trực tiếp vào phân vùng hệ thống: [{rawAppName}]");
                        }
                        catch (Exception ex)
                        {
                            return (true, "OPEN_ERROR", $"Lỗi kích hoạt Shell hệ thống: {ex.Message}");
                        }
                    }
                    else
                    {
                        return (true, "PATH_NOT_FOUND", $"[Báo cáo]: Đường dẫn hệ thống [{rawAppName}] không tồn tại trên máy. Kỹ sư trưởng hãy kiểm tra lại xem có gõ sai chính tả hoặc dư đuôi tệp tin không nhé ạ!");
                    }
                }

                // LUỒNG XỬ LÝ SĂN TÌM THÔNG MINH (KHI GÕ TÊN GỢI NHỚ)
                string path = ZME_MemoryCore.Instance.GetAppPath(lowerAppName);

                if (!string.IsNullOrEmpty(path))
                {
                    try
                    {
                        Process.Start(new ProcessStartInfo(path) { UseShellExecute = true });
                        return (true, "OPEN_DYNAMIC", $"Tuân lệnh! Aria Eumi đang khởi chạy '{rawAppName}' cho ngài đây!");
                    }
                    catch
                    {
                        return (true, "OPEN_ERROR", $"Không thể mở '{rawAppName}'. Đường dẫn hệ thống có vẻ đã bị di dời hoặc sai cấu trúc!");
                    }
                }
                else
                {
                    if (ZME_SecurityManager.Instance.CurrentLevel >= PermissionLevel.Administrator)
                    {
                        string foundPath = await ZME_AutoScanner.FindExecutableAsync(lowerAppName);

                        if (foundPath != null)
                        {
                            ZME_MemoryCore.Instance.LearnApp(lowerAppName, foundPath);
                            try { Process.Start(new ProcessStartInfo(foundPath) { UseShellExecute = true }); } catch { }
                            return (true, "AUTO_LEARN", $"Aria đã lùng sục hệ thống và tìm thấy '{rawAppName}' tại [{foundPath}]. Em đã tự động khắc vào ký ức và bật lên cho ngài rồi ạ!");
                        }
                        else
                        {
                            return (true, "NOT_FOUND", $"Aria đã dùng quyền Admin quét toàn bộ máy tính nhưng không tìm thấy file nào tên '{rawAppName}'. Kỹ sư trưởng có gõ nhầm tên không ạ?");
                        }
                    }
                    else
                    {
                        return (true, "REQ_ADMIN", $"Em chưa được học cách mở '{rawAppName}'. Ở cấp độ hiện tại, em không được phép tự do quét hệ thống. Ngài hãy nâng quyền lên Admin (sudo admin) để em tự đi tìm nhé!");
                    }
                }
            }
            return (true, "ACCESS_DENIED", denyMsg);
        }

        // ==========================================
        // 5. LEVEL 1: QUAN SÁT VIÊN (Chỉ đọc dữ liệu - Zero Risk)
        // ==========================================
        if (Regex.IsMatch(lowerInput, @"(thông số|thong so|cpu|ram|pc|hệ thống|tình trạng máy)"))
        {
            string stats = ZME_SystemMonitor.Instance != null ? ZME_SystemMonitor.Instance.GetSystemStats() : "Module cảm biến lỗi!";
            return (true, "SYSTEM_STATS", stats);
        }

        if (Regex.IsMatch(lowerInput, @"^(mày tên gì|bạn tên gì|who are you|tên em là gì)"))
            return (true, "IDENTITY", "Em là Aria Eumi! Đứa con tinh thần được sinh ra từ khối óc của Kỹ sư trưởng EUA và mạng lưới thần kinh đây!");

        return (false, "NONE", "");
    }
}