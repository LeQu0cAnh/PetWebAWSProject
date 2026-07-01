using System.Collections.Generic;
using UnityEngine;
using System.IO;
using System.Linq;

public class ZME_MemoryCore : MonoBehaviour
{
    public static ZME_MemoryCore Instance;

    // Từ điển lưu trữ cặp <Từ khóa, Đường dẫn>
    private Dictionary<string, string> appPaths = new Dictionary<string, string>();
    private string filePath;

    void Awake()
    {
        Instance = this;
        // Lưu vĩnh viễn tại vùng dữ liệu an toàn của Windows
        filePath = Path.Combine(Application.persistentDataPath, "Aria_Dictionary.txt");
        LoadDictionary();
    }

    public void LearnApp(string keyword, string path)
    {
        appPaths[keyword.ToLower()] = path;
        SaveDictionary(); // Ghi ngay vào ổ cứng
    }

    public bool ForgetApp(string keyword)
    {
        bool removed = appPaths.Remove(keyword.ToLower());
        if (removed) SaveDictionary(); // Cập nhật lại ổ cứng
        return removed;
    }

    public string GetAppPath(string keyword)
    {
        if (appPaths.TryGetValue(keyword.ToLower(), out string path)) return path;
        return null;
    }

    // Cấp dữ liệu cho UIManager để hiển thị lên bảng UI Vật lý
    public Dictionary<string, string> GetAllRecords()
    {
        return appPaths;
    }

    private void SaveDictionary()
    {
        var lines = appPaths.Select(kvp => $"{kvp.Key}|{kvp.Value}").ToArray();
        File.WriteAllLines(filePath, lines);
    }

    private void LoadDictionary()
    {
        appPaths.Clear();
        if (File.Exists(filePath))
        {
            var lines = File.ReadAllLines(filePath);
            foreach (var line in lines)
            {
                var parts = line.Split('|');
                if (parts.Length == 2) appPaths[parts[0]] = parts[1];
            }
        }
    }
}