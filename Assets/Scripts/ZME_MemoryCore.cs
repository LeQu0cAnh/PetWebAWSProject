using System.Collections.Generic;
using UnityEngine;
using System.IO;
using System.Linq;

// Cấu trúc tế bào nhớ (Ký ức về 1 ứng dụng)
[System.Serializable]
public class AppRecord
{
    public string keyword;
    public string appPath;
}

// Tổng thể não bộ
[System.Serializable]
public class MemoryDatabase
{
    public List<AppRecord> apps = new List<AppRecord>();
}

public class ZME_MemoryCore : MonoBehaviour
{
    public static ZME_MemoryCore Instance;

    private string savePath;
    private MemoryDatabase db = new MemoryDatabase();

    void Awake()
    {
        Instance = this;
        // Thiết lập đường dẫn lưu trữ vĩnh viễn (Không bị mất khi Build lại game)
        savePath = Path.Combine(Application.persistentDataPath, "Aria_Memory.json");
        LoadMemory();
    }

    // Đọc ký ức từ ổ cứng
    public void LoadMemory()
    {
        if (File.Exists(savePath))
        {
            string json = File.ReadAllText(savePath);
            db = JsonUtility.FromJson<MemoryDatabase>(json) ?? new MemoryDatabase();
            UnityEngine.Debug.Log($"[Aria Eumi]: Đã khôi phục thành công {db.apps.Count} ký ức từ Core.");
        }
    }

    // Ghi đè ký ức vào ổ cứng
    public void SaveMemory()
    {
        string json = JsonUtility.ToJson(db, true);
        File.WriteAllText(savePath, json);
    }

    // Học một kỹ năng mới (Lưu đường dẫn)
    public void LearnApp(string keyword, string path)
    {
        string safeKeyword = keyword.ToLower().Trim();
        var existing = db.apps.FirstOrDefault(a => a.keyword == safeKeyword);

        if (existing != null)
        {
            existing.appPath = path; // Cập nhật nếu đã biết
        }
        else
        {
            db.apps.Add(new AppRecord { keyword = safeKeyword, appPath = path }); // Học mới
        }
        SaveMemory();
    }

    // Truy xuất kỹ năng (Lấy đường dẫn)
    public string GetAppPath(string keyword)
    {
        string safeKeyword = keyword.ToLower().Trim();
        var app = db.apps.FirstOrDefault(a => a.keyword == safeKeyword);
        return app != null ? app.appPath : null;
    }

    public bool ForgetApp(string keyword)
    {
        string safeKeyword = keyword.ToLower().Trim();
        var existing = db.apps.FirstOrDefault(a => a.keyword == safeKeyword);

        if (existing != null)
        {
            db.apps.Remove(existing);
            SaveMemory(); // Lưu lại thay đổi xuống ổ cứng
            return true; // Xóa thành công
        }
        return false; // Không tìm thấy để xóa
    }
}