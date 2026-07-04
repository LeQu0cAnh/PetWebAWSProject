using UnityEngine;
using System;
using System.Collections;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine.Networking;

/// <summary>
/// ZME_CloudSync — Phiên bản mới (v2.0)
/// ─────────────────────────────────────────────────────────────────────────────
/// Đồng bộ hồ sơ Pet với Cloud thông qua Backend Node.js Express (AWS Lambda).
/// Xác thực người dùng bằng Cognito Hosted UI (không dùng AWS SDK nữa).
///
/// LUỒNG HOẠT ĐỘNG:
/// 1. Kiểm tra JWT Token trong PlayerPrefs["JWT_TOKEN"].
/// 2. Nếu token hợp lệ → Gửi dữ liệu lên Backend API ngay.
/// 3. Nếu token chưa có / hết hạn:
///    a. Mở HttpListener trên http://localhost:8524/
///    b. Mở trình duyệt tới Cognito Hosted UI
///    c. Người dùng đăng nhập → Cognito redirect về http://localhost:8524/?code=...
///    d. Unity nhận code → Đổi lấy id_token từ Cognito Token Endpoint
///    e. Lưu id_token vào PlayerPrefs["JWT_TOKEN"]
///    f. Tiến hành gửi dữ liệu lên Backend API
/// </summary>
public class ZME_CloudSync : MonoBehaviour
{
    public static ZME_CloudSync Instance;

    // ── Cấu hình — Điền các giá trị này trong Unity Inspector ────────────────
    [Header("Backend API")]
    [Tooltip("URL đầy đủ tới API Backend (ví dụ: https://xxx.execute-api.ap-southeast-1.amazonaws.com/api/pet/profile)")]
    public string backendApiUrl = "https://<API_ID>.execute-api.ap-southeast-1.amazonaws.com/api/pet/profile";

    [Header("Cognito Hosted UI")]
    [Tooltip("Domain của Cognito (ví dụ: https://your-domain.auth.ap-southeast-1.amazoncognito.com)")]
    public string cognitoDomain = "https://<YOUR_COGNITO_DOMAIN>.auth.ap-southeast-1.amazoncognito.com";

    [Tooltip("Client ID của Cognito App Client")]
    public string clientId = "<YOUR_COGNITO_CLIENT_ID>";

    [Tooltip("Cổng lắng nghe callback cục bộ — phải khớp với Allowed Callback URL trong Cognito")]
    public int localPort = 8524;

    // ── Nội bộ ──────────────────────────────────────────────────────────────
    private const string TOKEN_KEY     = "JWT_TOKEN";

    private string LocalRedirectUri    => $"http://localhost:{localPort}/";

    private string _jwtToken;
    private bool   _isSyncing;

    // ============================================================
    // Lifecycle
    // ============================================================
    void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
            _jwtToken = PlayerPrefs.GetString(TOKEN_KEY, null);
            if (!string.IsNullOrEmpty(_jwtToken))
                Debug.Log("[CloudSync] ✅ Đã tìm thấy JWT Token từ phiên trước.");
        }
        else
        {
            Destroy(gameObject);
        }
    }

    // ============================================================
    // Public API — được gọi từ ZME_LocalCommand
    // ============================================================

    /// <summary>Kiểm tra nhanh xem token có hợp lệ không (dùng cho hiển thị chat).</summary>
    public bool HasValidToken()
    {
        return !string.IsNullOrEmpty(_jwtToken) && !IsTokenExpired(_jwtToken);
    }

    /// <summary>
    /// Khởi động luồng đồng bộ đám mây. Nếu cần đăng nhập sẽ mở trình duyệt.
    /// Hàm này không block — Unity sẽ tiếp tục chạy bình thường.
    /// </summary>
    public void StartCloudSync(string petName, string hairColor, float scale)
    {
        if (_isSyncing)
        {
            Debug.LogWarning("[CloudSync] Đang đồng bộ, vui lòng chờ...");
            return;
        }
        _ = RunSyncAsync(petName, hairColor, scale);
    }

    // ============================================================
    // Luồng chính (Async)
    // ============================================================
    private async Task RunSyncAsync(string petName, string hairColor, float scale)
    {
        _isSyncing = true;
        try
        {
            // Bước 1: Xác thực token
            if (!HasValidToken())
            {
                Debug.Log("[CloudSync] Token chưa có hoặc hết hạn. Bắt đầu luồng đăng nhập qua Cognito Hosted UI...");
                
                // Thông báo mở trình duyệt
                UnityMainThreadDispatcher.Instance().Enqueue(
                    () => ZME_UIManager.Instance.UpdateChat("[Hệ Thống]: Đang mở trình duyệt để người dùng đăng nhập...")
                );

                string newToken = await WaitForBrowserLogin();
                if (string.IsNullOrEmpty(newToken))
                {
                    Debug.LogError("[CloudSync] ❌ Không nhận được token. Đồng bộ bị hủy.");
                    UnityMainThreadDispatcher.Instance().Enqueue(
                        () => ZME_UIManager.Instance.UpdateChat("[Aria Eumi]: ❌ Quá trình đăng nhập bị hủy hoặc thất bại.")
                    );
                    return;
                }
                _jwtToken = newToken;
                PlayerPrefs.SetString(TOKEN_KEY, _jwtToken);
                PlayerPrefs.Save();
                Debug.Log("[CloudSync] ✅ Đăng nhập thành công. Token đã được lưu.");

                UnityMainThreadDispatcher.Instance().Enqueue(
                    () => ZME_UIManager.Instance.UpdateChat("[Aria Eumi]: ✅ Đăng nhập thành công! Bắt đầu đồng bộ...")
                );
            }

            // Bước 2: Gửi dữ liệu lên Backend
            // Coroutine phải chạy trên Main Thread
            UnityMainThreadDispatcher.Instance().Enqueue(
                () => Instance.StartCoroutine(Instance.UploadProfile(petName, hairColor, scale))
            );
        }
        catch (Exception ex)
        {
            Debug.LogError($"[CloudSync] ❌ Lỗi trong quá trình đồng bộ: {ex.Message}");
            UnityMainThreadDispatcher.Instance().Enqueue(
                () => ZME_UIManager.Instance.UpdateChat($"[Aria Eumi]: ❌ Lỗi đồng bộ: {ex.Message}")
            );
        }
        finally
        {
            _isSyncing = false;
        }
    }

    // ============================================================
    // Bước 1: Đăng nhập qua Cognito Hosted UI + HttpListener
    // ============================================================
    private async Task<string> WaitForBrowserLogin()
    {
        // Xây dựng URL Cognito Hosted UI
        string authUrl = $"{cognitoDomain}/oauth2/authorize"
            + $"?response_type=code"
            + $"&client_id={clientId}"
            + $"&redirect_uri={Uri.EscapeDataString(LocalRedirectUri)}"
            + $"&scope=openid+email+profile";

        // Mở trình duyệt (phải gọi trên Main Thread)
        string capturedCode = null;
        var tcs = new TaskCompletionSource<string>();

        // Khởi chạy HttpListener trên thread riêng để không block Unity
        var listenerThread = new Thread(() =>
        {
            using var listener = new HttpListener();
            listener.Prefixes.Add(LocalRedirectUri);
            try
            {
                listener.Start();
                Debug.Log($"[CloudSync] 🔊 HttpListener đang lắng nghe tại {LocalRedirectUri}");

                // Chờ 1 request (timeout 5 phút)
                var ctSource = new CancellationTokenSource(TimeSpan.FromMinutes(5));
                HttpListenerContext ctx = null;

                // Lấy request (blocking)
                var asyncResult = listener.BeginGetContext(null, null);
                if (asyncResult.AsyncWaitHandle.WaitOne(TimeSpan.FromMinutes(5)))
                {
                    ctx = listener.EndGetContext(asyncResult);
                }

                if (ctx == null)
                {
                    tcs.SetResult(null);
                    return;
                }

                // Lấy authorization code từ query string
                string code = ctx.Request.QueryString["code"];

                // Phản hồi HTML cho trình duyệt
                string responseHtml = @"
<!DOCTYPE html>
<html lang='vi'>
<head><meta charset='UTF-8'><title>Aria Eumi — Xác Thực</title>
<style>body{font-family:monospace;background:#0d0d0d;color:#17deca;display:flex;
justify-content:center;align-items:center;height:100vh;margin:0;flex-direction:column;gap:16px}
h2{font-size:1.8rem;margin:0}p{color:#aaa;margin:0}</style></head>
<body>
<h2>✅ Đăng nhập thành công!</h2>
<p>Bạn có thể đóng tab này và quay lại Aria Eumi.</p>
</body></html>";
                byte[] buffer = Encoding.UTF8.GetBytes(responseHtml);
                ctx.Response.ContentType     = "text/html; charset=utf-8";
                ctx.Response.ContentLength64 = buffer.Length;
                ctx.Response.StatusCode      = 200;
                ctx.Response.OutputStream.Write(buffer, 0, buffer.Length);
                ctx.Response.Close();

                tcs.SetResult(code);
            }
            catch (Exception ex)
            {
                Debug.LogError($"[CloudSync] HttpListener Error: {ex.Message}");
                tcs.SetResult(null);
            }
            finally
            {
                try { listener.Stop(); } catch { }
            }
        });
        listenerThread.IsBackground = true;
        listenerThread.Start();

        // Mở trình duyệt sau khi listener đã sẵn sàng (delay nhỏ để listener bind port trước)
        await Task.Delay(300);
        UnityMainThreadDispatcher.Instance().Enqueue(
            () => Instance.StartCoroutine(Instance.OpenBrowserCoroutine(authUrl))
        );

        // Chờ nhận code
        capturedCode = await tcs.Task;
        if (string.IsNullOrEmpty(capturedCode))
            return null;

        // Bước 1b: Đổi authorization code lấy id_token từ Cognito
        string idToken = await ExchangeCodeForToken(capturedCode);
        return idToken;
    }

    // Coroutine wrapper để mở URL trên main thread
    private IEnumerator OpenBrowserCoroutine(string url)
    {
        Application.OpenURL(url);
        Debug.Log($"[CloudSync] 🌐 Đã mở trình duyệt tới Cognito Hosted UI.");
        yield break;
    }

    // ============================================================
    // Bước 1b: Trao đổi Authorization Code → id_token (PKCE-less / public client)
    // ============================================================
    private async Task<string> ExchangeCodeForToken(string code)
    {
        string tokenEndpoint = $"{cognitoDomain}/oauth2/token";
        string body = $"grant_type=authorization_code"
                    + $"&client_id={clientId}"
                    + $"&redirect_uri={Uri.EscapeDataString(LocalRedirectUri)}"
                    + $"&code={code}";

        // Gửi POST bằng HttpWebRequest (không dùng using vì HttpWebRequest không IDisposable ở một số bản .NET)
        var request = (HttpWebRequest)WebRequest.Create(tokenEndpoint);
        request.Method      = "POST";
        request.ContentType = "application/x-www-form-urlencoded";
        byte[] bodyBytes = Encoding.UTF8.GetBytes(body);
        request.ContentLength = bodyBytes.Length;

        using (var stream = await request.GetRequestStreamAsync())
            await stream.WriteAsync(bodyBytes, 0, bodyBytes.Length);

        try
        {
            using var response = (HttpWebResponse)await request.GetResponseAsync();
            using var reader   = new StreamReader(response.GetResponseStream());
            string json        = await reader.ReadToEndAsync();
            Debug.Log($"[CloudSync] Token response nhận được.");

            // Parse id_token từ JSON thủ công (không cần thư viện ngoài)
            string idToken = ExtractJsonField(json, "id_token");
            return idToken;
        }
        catch (WebException ex)
        {
            using var reader = new StreamReader(ex.Response.GetResponseStream());
            string errBody   = reader.ReadToEnd();
            Debug.LogError($"[CloudSync] ❌ Lỗi đổi token: {ex.Message} | Body: {errBody}");
            return null;
        }
    }

    // ============================================================
    // Bước 2: Gửi Profile lên Backend API (UnityWebRequest - Coroutine)
    // ============================================================
    private IEnumerator UploadProfile(string petName, string hairColor, float scale)
    {
        string jsonBody = $"{{\"petName\":\"{EscapeJson(petName)}\","
                        + $"\"hairColor\":\"{EscapeJson(hairColor)}\","
                        + $"\"scale\":{scale.ToString(System.Globalization.CultureInfo.InvariantCulture)}}}";

        byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonBody);

        using var request = new UnityWebRequest(backendApiUrl, "POST");
        request.uploadHandler   = new UploadHandlerRaw(bodyRaw);
        request.downloadHandler = new DownloadHandlerBuffer();
        request.SetRequestHeader("Content-Type", "application/json");
        request.SetRequestHeader("Authorization", $"Bearer {_jwtToken}");

        Debug.Log($"[CloudSync] 📡 Đang gửi hồ sơ Pet lên Backend...");
        yield return request.SendWebRequest();

        if (request.result == UnityWebRequest.Result.Success)
        {
            Debug.Log($"[CloudSync] ✅ Đồng bộ thành công! Response: {request.downloadHandler.text}");
            ZME_UIManager.Instance.UpdateChat("[Aria Eumi]: ✅ Đồng bộ hồ sơ Pet thành công lên Đám mây!");
        }
        else
        {
            Debug.LogError($"[CloudSync] ❌ Lỗi đồng bộ ({request.responseCode}): {request.downloadHandler.text}");
            ZME_UIManager.Instance.UpdateChat($"[Aria Eumi]: ❌ Đồng bộ đám mây thất bại. (Mã lỗi: {request.responseCode})");

            // Nếu server trả 401 → token hết hạn, xóa để lần sau đăng nhập lại
            if (request.responseCode == 401)
            {
                _jwtToken = null;
                PlayerPrefs.DeleteKey(TOKEN_KEY);
                PlayerPrefs.Save();
                Debug.LogWarning("[CloudSync] Token đã hết hạn. Đã xóa token cũ. Lần sau sẽ đăng nhập lại.");
                ZME_UIManager.Instance.UpdateChat("[Hệ Thống]: Phiên đăng nhập đã hết hạn, đã làm mới trạng thái xác thực.");
            }
        }
    }

    // ============================================================
    // Utilities
    // ============================================================

    /// <summary>Kiểm tra token JWT có hết hạn chưa bằng cách decode payload base64.</summary>
    private bool IsTokenExpired(string token)
    {
        try
        {
            string[] parts = token.Split('.');
            if (parts.Length < 2) return true;

            // Base64Url decode phần payload
            string payload = parts[1];
            payload = payload.Replace('-', '+').Replace('_', '/');
            switch (payload.Length % 4)
            {
                case 2: payload += "=="; break;
                case 3: payload += "=";  break;
            }
            string json = Encoding.UTF8.GetString(Convert.FromBase64String(payload));
            string expStr = ExtractJsonField(json, "exp");
            if (string.IsNullOrEmpty(expStr)) return true;

            long expUnix = long.Parse(expStr);
            long nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            return nowUnix >= expUnix;
        }
        catch
        {
            return true; // Mọi lỗi parse đều coi như hết hạn
        }
    }

    /// <summary>
    /// Trích xuất giá trị của một field từ JSON đơn giản bằng string search.
    /// Không cần thư viện JSON — dùng cho các payload nhỏ.
    /// </summary>
    private static string ExtractJsonField(string json, string fieldName)
    {
        string searchKey = $"\"{fieldName}\"";
        int keyIdx = json.IndexOf(searchKey, StringComparison.Ordinal);
        if (keyIdx < 0) return null;

        int colonIdx = json.IndexOf(':', keyIdx + searchKey.Length);
        if (colonIdx < 0) return null;

        int valueStart = colonIdx + 1;
        while (valueStart < json.Length && json[valueStart] == ' ') valueStart++;

        if (json[valueStart] == '"')
        {
            // String value
            int end = json.IndexOf('"', valueStart + 1);
            return end < 0 ? null : json.Substring(valueStart + 1, end - valueStart - 1);
        }
        else
        {
            // Number / boolean
            int end = valueStart;
            while (end < json.Length && json[end] != ',' && json[end] != '}' && json[end] != ']')
                end++;
            return json.Substring(valueStart, end - valueStart).Trim();
        }
    }

    /// <summary>Escape ký tự đặc biệt khi nhúng string vào JSON thủ công.</summary>
    private static string EscapeJson(string s)
    {
        return s.Replace("\\", "\\\\").Replace("\"", "\\\"");
    }
}