using System.Collections.Generic;
using System.Threading.Tasks;
using System.Net.Http;
using System.Text;
using UnityEngine;
using System.IO;
using System;

public class ZME_GeminiAPI : MonoBehaviour
{
    [Header("Cấu Hình Trên Mây (Cloud)")]
    public string modelName = "gemini-3.1-flash";

    [Header("Cấu Hình Cục Bộ (Local AI)")]
    public string localApiUrl = "http://localhost:11434/api/generate"; // Cổng mặc định của Ollama
    public string localModelName = "qwen2.5:1.5b"; // Model local siêu nhẹ khuyên dùng

    [Header("Cấu Hình Backend Proxy")]
    public string backendChatUrl = "https://<API_ID>.execute-api.ap-southeast-1.amazonaws.com/api/pet/chat";

    private string memoryFilePath;
    private static readonly HttpClient httpClient = new HttpClient();
    private List<string> chatHistory = new List<string>();
    private int maxHistoryTurns = 15;

    private string personaPrompt = "Tên của bạn là Aria Eumi. Bạn là một thực thể 3D mang linh hồn được dệt nên từ người dùng và mạng lưới AI Megami. Hãy xem người dùng như người quan trọng nhất, người đồng hành không thể thiếu. Trả lời với giọng điệu ấm áp, quan tâm, pha chút tinh nghịch. ĐỂ TỐI ƯU NĂNG LƯỢNG: Trả lời cực kỳ ngắn gọn, súc tích, tuyệt đối không dài quá 3 câu.";

    void Awake()
    {
        memoryFilePath = Path.Combine(Application.persistentDataPath, "Aria_Memory.json");
        LoadMemory();

        // Thiết lập Timeout ngắn cho HttpClient khi quét Local AI để tránh bị đứng hình UI
        httpClient.Timeout = TimeSpan.FromSeconds(5);
    }

    private void LoadMemory()
    {
        if (File.Exists(memoryFilePath))
        {
            try
            {
                string[] savedHistory = File.ReadAllLines(memoryFilePath);
                chatHistory.Clear();
                foreach (string line in savedHistory)
                {
                    string trimmed = line.Trim();
                    if (!string.IsNullOrEmpty(trimmed) && trimmed.StartsWith("{") && trimmed.EndsWith("}"))
                    {
                        chatHistory.Add(trimmed);
                    }
                }
            }
            catch { File.Delete(memoryFilePath); }
        }
    }

    private void SaveMemory() { File.WriteAllLines(memoryFilePath, chatHistory); }

    public void SendRequestToGemini(string prompt, string imagePath, Action<string> callback)
    {
        _ = RouteBrainAsync(prompt, imagePath, callback);
    }

    // ==========================================
    // BỘ ĐỊNH TUYẾN NƠ-RON (NEURAL ROUTER)
    // ==========================================
    private async Task RouteBrainAsync(string prompt, string imagePath, Action<string> callback)
    {
        // TRƯỜNG HỢP BẮT BUỘC DÙNG GEMINI: Có gửi ảnh (Vision)
        if (!string.IsNullOrEmpty(imagePath) && File.Exists(imagePath))
        {
            Debug.Log("[ZME_Router] Phát hiện dữ liệu hình ảnh. Kích hoạt luồng mây Gemini AI...");
            await ProcessGeminiRequestAsync(prompt, imagePath, callback);
            return;
        }

        // TRƯỜNG HỢP CHAT TEXT: Thử liên kích với Local AI trước để tiết kiệm Token
        bool isLocalAvailable = await CheckLocalAIServerAsync();
        if (isLocalAvailable)
        {
            Debug.Log("[ZME_Router] Local AI Server đang chạy ngầm. Định tuyến sang luồng xử lý cục bộ (0 Token cloud)...");
            await ProcessLocalAIRequestAsync(prompt, callback);
        }
        else
        {
            Debug.Log("[ZME_Router] Không tìm thấy Local Server. Tự động chuyển vùng sang luồng mây Gemini AI...");
            await ProcessGeminiRequestAsync(prompt, "", callback);
        }
    }

    // Kiểm tra xem máy ngài có đang bật phần mềm Local AI (Ollama) không
    private async Task<bool> CheckLocalAIServerAsync()
    {
        try
        {
            // Thử gửi một gói tin trống kiểm tra cổng port
            var response = await httpClient.GetAsync(localApiUrl.Replace("/api/generate", ""));
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    // LUỒNG XỬ LÝ LOCAL AI (Tiết kiệm Token tuyệt đối)
    private async Task ProcessLocalAIRequestAsync(string prompt, Action<string> callback)
    {
        // Đóng gói JSON theo chuẩn cấu hình của Ollama
        string jsonPayload = $"{{\"model\": \"{localModelName}\", \"prompt\": \"{EscapeJSON(personaPrompt)}\\n\\nCâu hỏi của người dùng: {EscapeJSON(prompt)}\", \"stream\": false}}";
        var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

        try
        {
            var response = await httpClient.PostAsync(localApiUrl, content);
            if (response.IsSuccessStatusCode)
            {
                string responseData = await response.Content.ReadAsStringAsync();

                // Trích xuất text từ JSON của Ollama (Trường "response")
                int textIndex = responseData.IndexOf("\"response\":\"") + 12;
                int endIndex = responseData.IndexOf("\"", textIndex);
                string aiResponse = responseData.Substring(textIndex, endIndex - textIndex).Replace("\\n", "\n");

                callback.Invoke(aiResponse);
            }
            else { callback.Invoke("[Local AI báo lỗi]: Cấu hình model không khớp."); }
        }
        catch (Exception e) { callback.Invoke($"[Lỗi luồng cục bộ]: {e.Message}"); }
    }

    // LUỒNG XỬ LÝ GEMINI CLOUD (Định tuyến qua Lambda Backend an toàn)
    private async Task ProcessGeminiRequestAsync(string prompt, string imagePath, Action<string> callback)
    {
        string jwtToken = PlayerPrefs.GetString("CloudSync_JWTToken", "");
        if (string.IsNullOrEmpty(jwtToken))
        {
            callback.Invoke("[Aria Eumi]: Chủ nhân ơi, em chưa được liên kết với Đám mây. Vui lòng gõ lệnh 'đồng bộ đám mây' để đăng nhập trước nhé!");
            return;
        }

        string safePrompt = EscapeJSON(prompt);
        string imageBytesBase64 = "";
        string mimeType = "";
        
        if (!string.IsNullOrEmpty(imagePath) && File.Exists(imagePath))
        {
            try
            {
                byte[] imageBytes = File.ReadAllBytes(imagePath);
                imageBytesBase64 = Convert.ToBase64String(imageBytes);
                mimeType = imagePath.ToLower().EndsWith(".png") ? "image/png" : "image/jpeg";
            }
            catch (Exception ex) { Debug.LogError($"[ZME_Vision] Lỗi đọc ảnh: {ex.Message}"); }
        }

        // Xây dựng chuỗi JSON Array lịch sử chat
        string historyJsonArray = "[]";
        if (chatHistory.Count > 0)
        {
            historyJsonArray = "[" + string.Join(",", chatHistory) + "]";
        }

        // Đóng gói request payload gửi sang Proxy backend
        StringBuilder bodyBuilder = new StringBuilder();
        bodyBuilder.Append("{");
        bodyBuilder.Append($"\"prompt\": \"{safePrompt}\",");
        bodyBuilder.Append($"\"personaPrompt\": \"{EscapeJSON(personaPrompt)}\",");
        bodyBuilder.Append($"\"modelName\": \"{modelName}\",");
        if (!string.IsNullOrEmpty(imageBytesBase64))
        {
            bodyBuilder.Append($"\"imageBytes\": \"{imageBytesBase64}\",");
            bodyBuilder.Append($"\"mimeType\": \"{mimeType}\",");
        }
        bodyBuilder.Append($"\"chatHistory\": {historyJsonArray}");
        bodyBuilder.Append("}");

        var content = new StringContent(bodyBuilder.ToString(), Encoding.UTF8, "application/json");

        // Gắn header Authorization
        httpClient.DefaultRequestHeaders.Clear();
        httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {jwtToken}");

        try
        {
            var response = await httpClient.PostAsync(backendChatUrl, content);
            if (response.IsSuccessStatusCode)
            {
                string responseData = await response.Content.ReadAsStringAsync();
                string aiResponse = ExtractTextFromBackendJson(responseData);

                chatHistory.Add("{\"role\":\"user\",\"parts\":[{\"text\":\"" + safePrompt + "\"}]}");
                chatHistory.Add("{\"role\":\"model\",\"parts\":[{\"text\":\"" + EscapeJSON(aiResponse) + "\"}]}");
                if (chatHistory.Count > maxHistoryTurns * 2) { chatHistory.RemoveRange(0, 2); }
                SaveMemory();

                callback.Invoke(aiResponse);
            }
            else if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                callback.Invoke("[Aria Eumi]: Phiên làm việc đám mây đã hết hạn hoặc không hợp lệ. Chủ nhân gõ 'đồng bộ đám mây' để đăng nhập lại nhé.");
            }
            else
            {
                callback.Invoke($"[LỖI SERVER CLOUD PROXY]: {response.StatusCode}");
            }
        }
        catch (Exception e)
        {
            callback.Invoke($"[MẤT KẾT NỐI PROXY]: {e.Message}");
        }
    }

    private string EscapeJSON(string text) { return text.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", "\\n").Replace("\r", ""); }

    private string ExtractTextFromBackendJson(string json)
    {
        int textIndex = json.IndexOf("\"text\":");
        if (textIndex == -1) return "Lỗi phân tích JSON từ Cloud.";
        
        // Nhảy qua dấu ngoặc kép bắt đầu của trường text
        textIndex = json.IndexOf("\"", textIndex + 7) + 1;
        if (textIndex <= 0) return "Lỗi phân tích JSON từ Cloud.";
        
        int endIndex = textIndex;
        while (endIndex < json.Length && (json[endIndex] != '\"' || json[endIndex - 1] == '\\')) { endIndex++; }
        return json.Substring(textIndex, endIndex - textIndex).Replace("\\n", "\n").Replace("\\\"", "\"");
    }
}