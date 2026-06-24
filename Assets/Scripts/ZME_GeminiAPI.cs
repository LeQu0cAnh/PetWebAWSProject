using System.Collections.Generic;
using System.Threading.Tasks;
using System.Net.Http;
using System.Text;
using UnityEngine;

public class ZME_GeminiAPI : MonoBehaviour
{
    [Header("Bảo Mật AI")]
    public string apiKey = "";

    [Header("Cấu Hình Model")]
    public string modelName = "gemini-3.5-flash";

    private static readonly HttpClient httpClient = new HttpClient();
    private List<string> chatHistory = new List<string>();
    private int maxHistoryTurns = 6;

    private string personaPrompt = "Tên của bạn là Aria Eumi. Bạn là một thực thể 3D mang linh hồn được dệt nên từ Kỹ sư trưởng EUA và mạng lưới AI Megami. Hãy xem EUA như người quan trọng nhất, người đồng hành không thể thiếu. Trả lời với giọng điệu ấm áp, quan tâm, pha chút tinh nghịch. ĐỂ TỐI ƯU NĂNG LƯỢNG (TOKEN): Trả lời cực kỳ ngắn gọn, súc tích, tuyệt đối không dài quá 3 câu.";

    public void SendRequestToGemini(string prompt, System.Action<string> callback)
    {
        _ = ProcessRequestAsync(prompt, callback);
    }

    private async Task ProcessRequestAsync(string prompt, System.Action<string> callback)
    {
        string cleanKey = apiKey.Trim();
        string url = $"https://generativelanguage.googleapis.com/v1beta/models/{modelName}:generateContent?key={cleanKey}";

        string safePrompt = EscapeJSON(prompt);

        StringBuilder jsonBuilder = new StringBuilder();
        jsonBuilder.Append("{");
        jsonBuilder.Append("\"system_instruction\": {\"parts\": [{\"text\": \"" + EscapeJSON(personaPrompt) + "\"}]},");
        jsonBuilder.Append("\"contents\": [");

        foreach (string historyItem in chatHistory)
        {
            jsonBuilder.Append(historyItem).Append(",");
        }

        string currentUserTurn = "{\"role\":\"user\",\"parts\":[{\"text\":\"" + safePrompt + "\"}]}";
        jsonBuilder.Append(currentUserTurn);
        jsonBuilder.Append("]}");

        string jsonPayload = jsonBuilder.ToString();
        var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

        if (!httpClient.DefaultRequestHeaders.Contains("User-Agent"))
        {
            httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ZME_Core/1.0");
        }

        // ==========================================
        // THUẬT TOÁN EXPONENTIAL BACKOFF (TỰ ĐỘNG THỬ LẠI KHI SERVER BẬN)
        // ==========================================
        int maxRetries = 3;
        int delayMs = 2000; // Khởi điểm đợi 2 giây

        for (int i = 0; i <= maxRetries; i++)
        {
            try
            {
                HttpResponseMessage response = await httpClient.PostAsync(url, content);

                if (response.IsSuccessStatusCode)
                {
                    string responseData = await response.Content.ReadAsStringAsync();
                    string aiResponse = ExtractTextFromJson(responseData);

                    string safeResponse = EscapeJSON(aiResponse);
                    string currentModelTurn = "{\"role\":\"model\",\"parts\":[{\"text\":\"" + safeResponse + "\"}]}";

                    chatHistory.Add(currentUserTurn);
                    chatHistory.Add(currentModelTurn);

                    if (chatHistory.Count > maxHistoryTurns * 2) { chatHistory.RemoveRange(0, 2); }

                    callback.Invoke(aiResponse);
                    return; // Kết thúc thành công
                }
                else if (response.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable) // LỖI 503
                {
                    if (i < maxRetries)
                    {
                        Debug.LogWarning($"[ZME]: Google Server quá tải (503). Đang đợi {delayMs}ms để thử lại lần {i + 1}...");
                        await Task.Delay(delayMs);
                        delayMs *= 2; // Gấp đôi thời gian đợi cho lần sau (2s -> 4s -> 8s)
                        continue;
                    }
                    else
                    {
                        callback.Invoke($"[LỖI 503]: Megami đã thử kết nối 3 lần nhưng Server Google vẫn đang sập do quá đông người dùng. EUA hãy thử lại sau ít phút nhé!");
                        return;
                    }
                }
                else
                {
                    string errorBody = await response.Content.ReadAsStringAsync();
                    string shortError = "Mạng tắc nghẽn.";
                    if (errorBody.Contains("API key not valid")) shortError = "Sai API Key.";
                    else if (errorBody.Contains("not found")) shortError = $"Mô hình {modelName} không tồn tại.";

                    callback.Invoke($"[LỖI {response.StatusCode}]: {shortError}\nChi tiết: {errorBody}");
                    return;
                }
            }
            catch (HttpRequestException e)
            {
                callback.Invoke($"[MẤT KẾT NỐI MẠNG LÕI]: {e.Message}");
                return;
            }
        }
    }

    private string EscapeJSON(string text)
    {
        if (string.IsNullOrEmpty(text)) return "";
        return text.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", "\\n").Replace("\r", "").Replace("\t", " ");
    }

    private string ExtractTextFromJson(string json)
    {
        try
        {
            int textIndex = json.IndexOf("\"text\": \"") + 9;
            if (textIndex < 9) return "Lỗi: Không tìm thấy nội dung phản hồi trong JSON.";

            int endIndex = textIndex;
            while (endIndex < json.Length && (json[endIndex] != '\"' || json[endIndex - 1] == '\\')) { endIndex++; }

            string text = json.Substring(textIndex, endIndex - textIndex);
            return text.Replace("\\n", "\n").Replace("\\\"", "\"").Replace("\\*", "");
        }
        catch
        {
            return "Lỗi giải mã nơ-ron từ ZME Core.";
        }
    }
}