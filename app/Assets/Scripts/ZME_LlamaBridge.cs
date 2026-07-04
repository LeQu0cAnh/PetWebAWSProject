using UnityEngine;
using System;
using System.IO;
using System.Diagnostics;
using System.Threading.Tasks;
using System.Net.Http;
using System.Text;

public class ZME_LlamaBridge : MonoBehaviour
{
    public static ZME_LlamaBridge Instance;

    [Header("Cấu hình Lõi Trí Tuệ")]
    public string modelFileName = "qwen1_5-0_5b-chat-q4_k_m.gguf";
    private string fullModelPath;
    private string serverPath;
    private string dynamicGpuCommand = "";

    private Process serverProcess;
    private HttpClient httpClient;

    public bool isGenerating { get; private set; } = false;
    private bool isServerReady = false;

    [Serializable]
    private class ServerResponse
    {
        public string content;
        public string text; // Quét vạn năng đề phòng Server đổi cấu trúc khóa
        public bool stop;
    }

    [Serializable]
    private class ChatRequest
    {
        public string prompt;
        public int n_predict = 256;
        public float temperature = 0.7f;
        public bool stream = true;

        // Cờ làm sạch Ký ức rác của Server sau mỗi câu hỏi
        public bool cache_prompt = false;
        public int id_slot = 0;
    }

    void Awake() { Instance = this; }

    void Start()
    {
        serverPath = Path.Combine(Application.streamingAssetsPath, "LlamaEngine", "llama-server.exe");
        if (!File.Exists(serverPath)) serverPath = Path.Combine(Application.dataPath, "Plugins", "llama-server.exe");
        if (!File.Exists(serverPath))
        {
            UnityEngine.Debug.LogError("[LỖI CHÍ MẠNG]: Không tìm thấy llama-server.exe!");
            return;
        }

        httpClient = new HttpClient();
        httpClient.Timeout = TimeSpan.FromMinutes(5);

        DetectVRAMAndBalanceLoad();

        // Khởi động lõi mặc định ở Giai đoạn 1
        ChangeLocalModel("trung");
    }

    public void ChangeLocalModel(string tier)
    {
        UnityEngine.Debug.Log($"[ZME_System]: Bắt đầu tiến trình chuyển đổi Lõi AI sang mức [{tier}]...");

        if (serverProcess != null && !serverProcess.HasExited)
        {
            serverProcess.Kill();
            serverProcess.WaitForExit(); // Đảm bảo cổng 8080 được giải phóng hoàn toàn
            serverProcess.Dispose();
        }

        isServerReady = false;

        switch (tier.ToLower())
        {
            case "yeu":
                modelFileName = "qwen1_5-0_5b-chat-q4_k_m.gguf";
                break;

            case "trung":
                modelFileName = "Qwen2.5-3B-Instruct-Q4_K_M.gguf";
                break;

            default:
                modelFileName = "qwen1_5-0_5b-chat-q4_k_m.gguf";
                break;
        }

        StartLlamaServer();
    }

    private void DetectVRAMAndBalanceLoad()
    {
        int vramMB = SystemInfo.graphicsMemorySize;
        if (vramMB >= 4000) dynamicGpuCommand = "-ngl 99";
        else if (vramMB >= 2000) dynamicGpuCommand = "-ngl 20";
        else dynamicGpuCommand = "-ngl 0";
    }

    private void StartLlamaServer()
    {
        fullModelPath = Path.Combine(Application.streamingAssetsPath, "Models_AI", modelFileName);

        // Debug rõ ràng để không phải đoán
        UnityEngine.Debug.Log($"[ZME_Kiểm_Tra_Đường_Dẫn]: {fullModelPath}");

        if (!File.Exists(fullModelPath))
        {
            UnityEngine.Debug.LogError($"[LỖI CHÍ MẠNG]: Không tìm thấy file model tại: {fullModelPath}");
            return;
        }

        UnityEngine.Debug.Log("[ZME_Server]: Đang khởi động Máy chủ AI cục bộ (Cổng 8080)...");

        string args = $"-m \"{fullModelPath}\" --port 8080 -c 2048 {dynamicGpuCommand}";

        ProcessStartInfo psi = new ProcessStartInfo
        {
            FileName = serverPath,
            Arguments = args,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };

        serverProcess = new Process { StartInfo = psi };

        DataReceivedEventHandler logHandler = (sender, e) =>
        {
            if (!string.IsNullOrEmpty(e.Data))
            {
                UnityEngine.Debug.Log($"[Server_Log]: {e.Data}");

                if (e.Data.Contains("listening") || e.Data.Contains("HTTP server"))
                {
                    isServerReady = true;
                    UnityEngine.Debug.Log("[ZME_Server]: 🟢 MÁY CHỦ AI ĐÃ SẴN SÀNG! HỆ THỐNG TRỰC TUYẾN.");
                }
            }
        };

        serverProcess.OutputDataReceived += logHandler;
        serverProcess.ErrorDataReceived += logHandler;

        serverProcess.Start();
        serverProcess.BeginOutputReadLine();
        serverProcess.BeginErrorReadLine();
    }

    public async Task GenerateStreamAsync(string fullChatMLPrompt, Action<string> onUpdate, Action onComplete)
    {
        if (isGenerating) return;
        if (!isServerReady)
        {
            onUpdate?.Invoke("[Hệ thống]: Máy chủ chưa sẵn sàng...");
            onComplete?.Invoke();
            return;
        }

        isGenerating = true;

        try
        {
            var req = new ChatRequest { prompt = fullChatMLPrompt, cache_prompt = false };
            string jsonPayload = JsonUtility.ToJson(req);

            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            using (var request = new HttpRequestMessage(HttpMethod.Post, "http://127.0.0.1:8080/completion"))
            {
                request.Content = content;
                request.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("text/event-stream"));

                using (var response = await httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead))
                {
                    if (!response.IsSuccessStatusCode)
                    {
                        string err = await response.Content.ReadAsStringAsync();
                        UnityEngine.Debug.LogError($"[Server_Error]: {err}");
                        UnityMainThreadDispatcher.Instance().Enqueue(() => { onUpdate?.Invoke("[Lỗi Server]: " + response.StatusCode); });
                        return;
                    }

                    using (var stream = await response.Content.ReadAsStreamAsync())
                    using (var reader = new StreamReader(stream))
                    {
                        string line;
                        string fullAccumulated = "";

                        while ((line = await reader.ReadLineAsync()) != null)
                        {
                            line = line.Trim();
                            if (string.IsNullOrEmpty(line)) continue;

                            string jsonData = line;
                            if (line.StartsWith("data:")) jsonData = line.Substring(5).Trim();

                            if (jsonData == "[DONE]") break;
                            if (!jsonData.StartsWith("{")) continue;

                            try
                            {
                                ServerResponse resp = JsonUtility.FromJson<ServerResponse>(jsonData);

                                string token = "";
                                if (resp != null)
                                {
                                    if (!string.IsNullOrEmpty(resp.content)) token = resp.content;
                                    else if (!string.IsNullOrEmpty(resp.text)) token = resp.text;
                                }

                                if (!string.IsNullOrEmpty(token))
                                {
                                    fullAccumulated += token;
                                    string uiText = fullAccumulated;
                                    UnityMainThreadDispatcher.Instance().Enqueue(() => { onUpdate?.Invoke(uiText); });
                                }

                                if (resp != null && resp.stop) break;
                            }
                            catch (Exception e)
                            {
                                UnityEngine.Debug.LogWarning($"[JSON_Parse_Warning]: Bỏ qua frame lỗi - {e.Message}");
                            }
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            UnityEngine.Debug.LogError($"[LỖI GIAO TIẾP]: {ex.Message}");
            UnityMainThreadDispatcher.Instance().Enqueue(() => { onUpdate?.Invoke("[Lỗi Kết nối API]"); });
        }
        finally
        {
            isGenerating = false;
            UnityMainThreadDispatcher.Instance().Enqueue(() => { onComplete?.Invoke(); });
        }
    }

    void OnApplicationQuit()
    {
        if (serverProcess != null && !serverProcess.HasExited)
        {
            serverProcess.Kill();
            serverProcess.Dispose();
        }
        if (httpClient != null) httpClient.Dispose();
    }
}