using System;
using System.IO;
using System.Threading.Tasks;
using System.Collections.Generic;
using UnityEngine;

public static class ZME_AutoScanner
{
    // Đã sắp xếp lại: Cụm từ dài phải nằm trên để được quét trước!
    private static readonly Dictionary<string, string> SmartAliases = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        { "visual studio code", "code" },
        { "vscode", "code" },
        { "vs code", "code" },
        { "visual studio 2022", "devenv" },
        { "visual studio", "devenv" },
        { "word", "winword" },
        { "excel", "excel" },
        { "powerpoint", "powerpnt" },
        { "edge", "msedge" },
        { "task manager", "taskmgr" }
    };

    public static async Task<string> FindExecutableAsync(string appName)
    {
        string searchKeyword = appName.ToLower().Replace(".exe", "").Trim();

        foreach (var alias in SmartAliases)
        {
            if (searchKeyword.Contains(alias.Key))
            {
                searchKeyword = alias.Value;
                break;
            }
        }

        List<string> rootPaths = new List<string> {
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
            Environment.GetFolderPath(Environment.SpecialFolder.Desktop),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs")
        };

        return await Task.Run(() =>
        {
            // Vòng quét 1: Tìm CHÍNH XÁC 100% tên file (Tốc độ ánh sáng)
            foreach (string root in rootPaths)
            {
                if (Directory.Exists(root))
                {
                    string result = DeepSearch(root, searchKeyword, true);
                    if (result != null) return result;
                }
            }

            // Vòng quét 2: Nếu không thấy mới tìm tương đối (Fuzzy)
            foreach (string root in rootPaths)
            {
                if (Directory.Exists(root))
                {
                    string result = DeepSearch(root, searchKeyword, false);
                    if (result != null) return result;
                }
            }
            return null;
        });
    }

    private static string DeepSearch(string directory, string keyword, bool exactMatch)
    {
        try
        {
            string[] files = Directory.GetFiles(directory, "*.exe");
            foreach (string f in files)
            {
                string fileName = Path.GetFileNameWithoutExtension(f).ToLower();

                if (exactMatch)
                {
                    if (fileName == keyword) return f; // Chỉ bắt khi trùng 100%
                }
                else
                {
                    // Chỉ dùng fileName.Contains(keyword), TUYỆT ĐỐI KHÔNG dùng ngược lại để tránh dính "env.exe"
                    if (fileName.Contains(keyword) && !fileName.Contains("uninstall") && !fileName.Contains("unins") && !fileName.Contains("setup") && !fileName.Contains("crash"))
                    {
                        return f;
                    }
                }
            }

            string[] subDirs = Directory.GetDirectories(directory);
            foreach (string sub in subDirs)
            {
                string found = DeepSearch(sub, keyword, exactMatch);
                if (found != null) return found;
            }
        }
        catch { /* Phớt lờ lỗi khóa quyền của Windows */ }
        return null;
    }
}