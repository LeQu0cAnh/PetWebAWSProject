using UnityEngine;
using UnityEngine.UIElements;
using System.Runtime.InteropServices;
using System;
using System.IO;
using System.Collections.Generic;

public class ZME_UIManager : MonoBehaviour
{
    public static ZME_UIManager Instance;

    [Header("Liên kết Lõi Hệ Thống")]
    public UIDocument uiDocument;
    public ZME_GeminiAPI geminiAPI;
    public ZME_PetController petController;

    private List<string> shortTermMemory = new List<string>();
    private string memoryFilePath;

    private VisualElement chatContainer, menuContainer, configContainer, dictContainer, monitorContainer, scheduleContainer, chatHeader;
    private TextField inputChat;
    private Button btnSendText, btnSendImage, btnCloseChat;
    private ScrollView chatLog;

    private Button btnOpenChat, btnOpenConfig, btnOpenDict, btnSystemMonitor, btnSchedule, btnQuit;
    private Button btnCloseConfig, btnCloseDict, btnCloseMonitor, btnCloseSchedule;

    private Button btnSetObserver, btnSetAssistant, btnSetAdmin;
    private Label txtCurrentSecurity;
    private Button btnLocalLow, btnLocalMed, btnLocalHigh;

    private TextField inputMemKey, inputMemPath;
    private Button btnMemLearn, btnMemForget;
    private ScrollView dictList;

    private Label lblCpuUsage, lblRamUsage, lblCurrentTime, lblCurrentDate;
    private VisualElement barCpuFill, barRamFill;
    public ScrollView taskQueueList;

    public bool IsMenuOpen { get; private set; } = false;
    public bool IsChatOpen { get; private set; } = false;
    public bool IsConfigOpen { get; private set; } = false;
    public bool IsDictOpen { get; private set; } = false;
    public bool IsMonitorOpen { get; private set; } = false;
    public bool IsScheduleOpen { get; private set; } = false;

    private string pendingImagePath = "";
    private bool isDraggingChat = false;
    private Vector2 dragStartPos;

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    public class OpenFileName
    {
        public int structSize = 0; public IntPtr hwndOwner = IntPtr.Zero; public IntPtr hInstance = IntPtr.Zero;
        public string filter = null; public string customFilter = null; public int maxCustFilter = 0; public int filterIndex = 0;
        public string file = null; public int maxFile = 0; public string fileTitle = null; public int maxFileTitle = 0;
        public string initialDir = null; public string title = null; public int flags = 0; public short fileOffset = 0;
        public short fileExtension = 0; public string defExt = null; public IntPtr custData = IntPtr.Zero;
        public IntPtr hook = IntPtr.Zero; public string templateName = null; public IntPtr reservedPtr = IntPtr.Zero;
        public int reservedInt = 0; public int flagsEx = 0;
    }
    [DllImport("Comdlg32.dll", SetLastError = true, ThrowOnUnmappableChar = true, CharSet = CharSet.Auto)]
    public static extern bool GetOpenFileName([In, Out] OpenFileName ofn);

    void Awake()
    {
        Instance = this;
        memoryFilePath = Path.Combine(Application.streamingAssetsPath, "Aria_ChatMemory.txt");
    }

    void OnEnable()
    {
        if (uiDocument == null) return;
        var root = uiDocument.rootVisualElement;

        chatContainer = root.Q<VisualElement>("chatContainer");
        menuContainer = root.Q<VisualElement>("menuContainer");
        configContainer = root.Q<VisualElement>("configContainer");
        dictContainer = root.Q<VisualElement>("dictContainer");
        monitorContainer = root.Q<VisualElement>("monitorContainer");
        scheduleContainer = root.Q<VisualElement>("scheduleContainer");
        chatHeader = root.Q<VisualElement>("chatHeader");

        inputChat = root.Q<TextField>("inputChat");
        if (inputChat != null) inputChat.style.color = Color.black;

        btnSendText = root.Q<Button>("btnSend");
        btnSendImage = root.Q<Button>("btnSendImage");
        btnCloseChat = root.Q<Button>("btnCloseChat");
        chatLog = root.Q<ScrollView>("chatLog");

        btnOpenChat = root.Q<Button>("btnOpenChat");
        btnOpenConfig = root.Q<Button>("btnOpenConfig");
        btnOpenDict = root.Q<Button>("btnOpenDict");
        btnSystemMonitor = root.Q<Button>("btnSystemMonitor");
        btnSchedule = root.Q<Button>("btnSchedule");
        btnQuit = root.Q<Button>("btnQuit");

        btnCloseConfig = root.Q<Button>("btnCloseConfig");
        btnCloseDict = root.Q<Button>("btnCloseDict");
        btnCloseMonitor = root.Q<Button>("btnCloseMonitor");
        btnCloseSchedule = root.Q<Button>("btnCloseSchedule");

        btnSetObserver = root.Q<Button>("btnSetObserver");
        btnSetAssistant = root.Q<Button>("btnSetAssistant");
        btnSetAdmin = root.Q<Button>("btnSetAdmin");
        txtCurrentSecurity = root.Q<Label>("txtCurrentSecurity");
        btnLocalLow = root.Q<Button>("btnLocalLow");
        btnLocalMed = root.Q<Button>("btnLocalMed");
        btnLocalHigh = root.Q<Button>("btnLocalHigh");

        inputMemKey = root.Q<TextField>("inputMemKey");
        inputMemPath = root.Q<TextField>("inputMemPath");
        btnMemLearn = root.Q<Button>("btnMemLearn");
        btnMemForget = root.Q<Button>("btnMemForget");
        dictList = root.Q<ScrollView>("dictList");

        lblCpuUsage = root.Q<Label>("lblCpuUsage");
        lblRamUsage = root.Q<Label>("lblRamUsage");
        barCpuFill = root.Q<VisualElement>("barCpuFill");
        barRamFill = root.Q<VisualElement>("barRamFill");
        lblCurrentTime = root.Q<Label>("lblCurrentTime");
        lblCurrentDate = root.Q<Label>("lblCurrentDate");
        taskQueueList = root.Q<ScrollView>("taskQueueList");

        chatLog.Clear();
        UpdateChat("[Aria Eumi]: Hệ thống lõi đã tái thiết lập thành công. Kỹ sư trưởng có chỉ thị gì?");

        LoadChatHistory();

        if (chatHeader != null)
        {
            chatHeader.RegisterCallback<PointerDownEvent>(OnChatPointerDown);
            chatHeader.RegisterCallback<PointerMoveEvent>(OnChatPointerMove);
            chatHeader.RegisterCallback<PointerUpEvent>(OnChatPointerUp);
            chatHeader.RegisterCallback<PointerCaptureOutEvent>(OnChatPointerUp);
        }

        if (btnSendText != null) btnSendText.clicked += OnSendClicked;
        if (btnSendImage != null) btnSendImage.clicked += OnSendImageClicked;

        if (btnOpenChat != null) btnOpenChat.clicked += () => { IsChatOpen = TogglePanel(chatContainer, IsChatOpen); menuContainer.style.display = DisplayStyle.None; IsMenuOpen = false; };
        if (btnCloseChat != null) btnCloseChat.clicked += () => { chatContainer.style.display = DisplayStyle.None; IsChatOpen = false; };

        if (btnOpenConfig != null) btnOpenConfig.clicked += () => { IsConfigOpen = TogglePanel(configContainer, IsConfigOpen); RefreshSecurityUI(); menuContainer.style.display = DisplayStyle.None; IsMenuOpen = false; };
        if (btnCloseConfig != null) btnCloseConfig.clicked += () => { configContainer.style.display = DisplayStyle.None; IsConfigOpen = false; };

        if (btnOpenDict != null) btnOpenDict.clicked += () => { IsDictOpen = TogglePanel(dictContainer, IsDictOpen); RefreshDictionaryUI(); menuContainer.style.display = DisplayStyle.None; IsMenuOpen = false; };
        if (btnCloseDict != null) btnCloseDict.clicked += () => { dictContainer.style.display = DisplayStyle.None; IsDictOpen = false; };

        if (btnSystemMonitor != null) btnSystemMonitor.clicked += () => { IsMonitorOpen = TogglePanel(monitorContainer, IsMonitorOpen); menuContainer.style.display = DisplayStyle.None; IsMenuOpen = false; };
        if (btnCloseMonitor != null) btnCloseMonitor.clicked += () => { monitorContainer.style.display = DisplayStyle.None; IsMonitorOpen = false; };

        if (btnSchedule != null) btnSchedule.clicked += () => { IsScheduleOpen = TogglePanel(scheduleContainer, IsScheduleOpen); menuContainer.style.display = DisplayStyle.None; IsMenuOpen = false; };
        if (btnCloseSchedule != null) btnCloseSchedule.clicked += () => { scheduleContainer.style.display = DisplayStyle.None; IsScheduleOpen = false; };

        if (btnQuit != null) btnQuit.clicked += () => Application.Quit();

        if (btnSetObserver != null) btnSetObserver.clicked += () => SetSecurity(PermissionLevel.Observer);
        if (btnSetAssistant != null) btnSetAssistant.clicked += () => SetSecurity(PermissionLevel.Assistant);
        if (btnSetAdmin != null) btnSetAdmin.clicked += () => SetSecurity(PermissionLevel.Administrator);

        // CẬP NHẬT GỌI ĐÚNG ĐỊNH DẠNG TIER MỚI ("yeu", "trung", "manh")
        if (btnLocalLow != null) btnLocalLow.clicked += () => ChangeLocalModel("yeu", "Yếu (0.5B)");
        if (btnLocalMed != null) btnLocalMed.clicked += () => ChangeLocalModel("trung", "Trung (2B)");
        if (btnLocalHigh != null) btnLocalHigh.clicked += () => ChangeLocalModel("manh", "Mạnh (8B)");

        if (btnMemLearn != null) btnMemLearn.clicked += ExecuteMemLearn;
        if (btnMemForget != null) btnMemForget.clicked += ExecuteMemForget;
    }

    private void LoadChatHistory()
    {
        try { if (File.Exists(memoryFilePath)) { string[] lines = File.ReadAllLines(memoryFilePath); shortTermMemory.Clear(); shortTermMemory.AddRange(lines); } }
        catch { }
    }

    private void SaveChatHistory()
    {
        try { File.WriteAllLines(memoryFilePath, shortTermMemory); }
        catch { }
    }

    void Update()
    {
        if (IsScheduleOpen && lblCurrentTime != null && lblCurrentDate != null)
        {
            lblCurrentTime.text = DateTime.Now.ToString("HH:mm:ss");
            lblCurrentDate.text = DateTime.Now.ToString("dd/MM/yyyy - dddd");

            if (taskQueueList != null && ZME_Scheduler.Instance != null)
            {
                Label displayLabel = taskQueueList.Q<Label>("ScheduleText");
                if (displayLabel == null)
                {
                    taskQueueList.Clear();
                    displayLabel = new Label { name = "ScheduleText", style = { fontSize = 13, color = Color.white } };
                    taskQueueList.Add(displayLabel);
                }

                var tasks = ZME_Scheduler.Instance.activeTasks;
                if (tasks.Count == 0) { displayLabel.text = "Không có lịch trình nào đang chạy."; displayLabel.style.color = Color.gray; }
                else
                {
                    displayLabel.style.color = new Color(1f, 0.8f, 0.2f);
                    string taskStr = "";
                    foreach (var task in tasks)
                    {
                        int mins = Mathf.FloorToInt(task.remainingTime / 60);
                        int secs = Mathf.FloorToInt(task.remainingTime % 60);
                        taskStr += $"⏳ [{mins:00}:{secs:00}] - {task.taskName}\n";
                    }
                    displayLabel.text = taskStr;
                }
            }
        }
    }

    public void UpdateChat(string message, string imagePath = null)
    {
        if (chatLog == null) return;
        if (!string.IsNullOrEmpty(imagePath) && File.Exists(imagePath))
        {
            Texture2D tex = LoadTextureFromFile(imagePath);
            if (tex != null)
            {
                Image imgNode = new Image { image = tex, style = { maxWidth = 200, maxHeight = 200, marginTop = 5, marginBottom = 5, borderTopLeftRadius = 8, borderTopRightRadius = 8, borderBottomLeftRadius = 8, borderBottomRightRadius = 8 } };
                chatLog.Add(imgNode);
            }
        }
        if (!string.IsNullOrEmpty(message))
        {
            Label msgLabel = new Label(message) { style = { color = Color.white, whiteSpace = WhiteSpace.Normal, marginTop = 5, marginBottom = 5 } };
            chatLog.Add(msgLabel);
        }
        chatLog.schedule.Execute(() => { chatLog.scrollOffset = new Vector2(0, chatLog.contentContainer.layout.height); }).StartingIn(50);
    }

    public void UpdateMonitorHUD(int cpuLoad, int freeRam, int totalRam)
    {
        if (!IsMonitorOpen) return;
        if (lblCpuUsage != null) lblCpuUsage.text = $"Tải trọng CPU: {cpuLoad}%";
        if (lblRamUsage != null) lblRamUsage.text = $"RAM Khả dụng: {freeRam} MB / {totalRam} MB";
        if (barCpuFill != null) barCpuFill.style.width = Length.Percent(cpuLoad);
        if (barRamFill != null) { float ramPercent = 100f - ((float)freeRam / totalRam * 100f); barRamFill.style.width = Length.Percent(ramPercent); }
    }

    void OnDisable() { if (btnSendText != null) btnSendText.clicked -= OnSendClicked; if (btnSendImage != null) btnSendImage.clicked -= OnSendImageClicked; }
    private bool TogglePanel(VisualElement panel, bool currentState) { if (panel == null) return currentState; bool newState = !currentState; panel.style.display = newState ? DisplayStyle.Flex : DisplayStyle.None; return newState; }
    private void SetSecurity(PermissionLevel level) { if (ZME_SecurityManager.Instance != null) { ZME_SecurityManager.Instance.CurrentLevel = level; RefreshSecurityUI(); UpdateChat($"[UI Lõi]: Đã kích hoạt bảo mật {level.ToString().ToUpper()} qua Giao diện vật lý."); } }
    private void RefreshSecurityUI() { if (ZME_SecurityManager.Instance != null && txtCurrentSecurity != null) { txtCurrentSecurity.text = $"Trạng thái quyền hạn: {ZME_SecurityManager.Instance.CurrentLevel.ToString().ToUpper()}"; } }
    private void RefreshDictionaryUI()
    {
        if (dictList == null) return;
        dictList.Clear();
        if (ZME_MemoryCore.Instance != null)
        {
            var records = ZME_MemoryCore.Instance.GetAllRecords();
            if (records.Count > 0)
            {
                foreach (var kvp in records)
                {
                    Label entry = new Label($"• [{kvp.Key.ToUpper()}] -> {kvp.Value}") { style = { color = Color.white, fontSize = 12, marginBottom = 5 } };
                    dictList.Add(entry);
                }
            }
            else { dictList.Add(new Label("Kho dữ liệu hiện đang trống.") { style = { color = Color.gray } }); }
        }
    }

    // CẬP NHẬT HÀM CHUYỂN ĐỔI: Giao tiếp với API mới của LlamaBridge
    private void ChangeLocalModel(string tier, string displayName)
    {
        if (ZME_LlamaBridge.Instance != null)
        {
            ZME_LlamaBridge.Instance.ChangeLocalModel(tier);
        }
        UpdateChat($"[UI Lõi]: Đã phát lệnh chuyển đổi cấu hình não cục bộ sang: {displayName}. Hệ thống đang khởi động lại máy chủ...");
    }

    private void ExecuteMemLearn() { if (ZME_MemoryCore.Instance != null && inputMemKey != null && inputMemPath != null) { string k = inputMemKey.value.Trim(); string p = inputMemPath.value.Trim(); if (string.IsNullOrEmpty(k) || string.IsNullOrEmpty(p)) return; ZME_MemoryCore.Instance.LearnApp(k, p); RefreshDictionaryUI(); UpdateChat($"[UI Lõi]: Lưu trữ thành công! Từ nay nói 'mở {k}', Aria sẽ gọi URL/File: {p}"); } }
    private void ExecuteMemForget() { if (ZME_MemoryCore.Instance != null && inputMemKey != null) { string k = inputMemKey.value.Trim(); if (string.IsNullOrEmpty(k)) return; bool ok = ZME_MemoryCore.Instance.ForgetApp(k); RefreshDictionaryUI(); UpdateChat(ok ? $"[UI Lõi]: Đã xóa dữ liệu '{k}' khỏi từ điển Web/App." : $"[UI Lõi]: Lỗi - Không tìm thấy từ khóa '{k}'."); } }
    private void OnChatPointerDown(PointerDownEvent evt) { isDraggingChat = true; dragStartPos = (Vector2)evt.position - new Vector2(chatContainer.resolvedStyle.left, chatContainer.resolvedStyle.top); chatHeader.CapturePointer(evt.pointerId); }
    private void OnChatPointerMove(PointerMoveEvent evt) { if (!isDraggingChat) return; chatContainer.style.right = StyleKeyword.Null; chatContainer.style.bottom = StyleKeyword.Null; chatContainer.style.left = evt.position.x - dragStartPos.x; chatContainer.style.top = evt.position.y - dragStartPos.y; }
    private void OnChatPointerUp(EventBase evt) { isDraggingChat = false; if (evt is IPointerEvent pointerEvent) chatHeader.ReleasePointer(pointerEvent.pointerId); }
    public void ToggleMenuBar() { IsMenuOpen = !IsMenuOpen; if (menuContainer != null) menuContainer.style.display = IsMenuOpen ? DisplayStyle.Flex : DisplayStyle.None; }
    public bool IsPointerOverUI() { if (uiDocument == null) return false; Vector2 mousePos = GetUIMousePos(); return (IsChatOpen && chatContainer != null && chatContainer.worldBound.Contains(mousePos)) || (IsMenuOpen && menuContainer != null && menuContainer.worldBound.Contains(mousePos)) || (IsConfigOpen && configContainer != null && configContainer.worldBound.Contains(mousePos)) || (IsDictOpen && dictContainer != null && dictContainer.worldBound.Contains(mousePos)) || (IsMonitorOpen && monitorContainer != null && monitorContainer.worldBound.Contains(mousePos)) || (IsScheduleOpen && scheduleContainer != null && scheduleContainer.worldBound.Contains(mousePos)); }
    private Vector2 GetUIMousePos() { return new Vector2(Input.mousePosition.x, Screen.height - Input.mousePosition.y); }
    private void OnSendImageClicked() { OpenFileName ofn = new OpenFileName(); ofn.structSize = Marshal.SizeOf(ofn); ofn.filter = "Images (*.jpg, *.png)\0*.jpg;*.png\0All Files (*.*)\0*.*\0"; ofn.file = new string(new char[256]); ofn.maxFile = ofn.file.Length; ofn.fileTitle = new string(new char[64]); ofn.maxFileTitle = ofn.fileTitle.Length; ofn.initialDir = "C:\\"; ofn.title = "Aria Eumi - Chọn hình ảnh đính kèm"; ofn.flags = 0x00080000 | 0x00001000 | 0x00000800 | 0x00000008; if (GetOpenFileName(ofn)) { pendingImagePath = ofn.file; btnSendImage.style.backgroundColor = new Color(0.2f, 0.7f, 0.2f, 1f); UpdateChat("[Hệ thống]: Đã đính kèm ảnh. Nhập thêm yêu cầu và ấn TRUYỀN:", pendingImagePath); } }

    private Label currentStreamingLabel;

    private async void OnSendClicked()
    {
        string userMsg = inputChat.value;
        if (string.IsNullOrWhiteSpace(userMsg)) return;

        inputChat.value = "";
        btnSendImage.style.backgroundColor = new Color(0.12f, 0.39f, 0.59f, 1f);

        UpdateChat($"[Người dùng]: {userMsg}");

        var localFilter = await ZME_LocalCommand.TryProcessAsync(userMsg);
        if (localFilter.IsHandled)
        {
            UpdateChat($"[Aria Eumi]: {localFilter.ReplyMessage}");
            return;
        }

        currentStreamingLabel = new Label("...");
        currentStreamingLabel.style.color = Color.white;
        currentStreamingLabel.style.whiteSpace = WhiteSpace.Normal;
        currentStreamingLabel.style.marginTop = 5; currentStreamingLabel.style.marginBottom = 5;
        chatLog.Add(currentStreamingLabel);

        // KHI NÂNG CẤP LÊN MODEL VISION, CHÚNG TA SẼ XỬ LÝ ẢNH Ở ĐÂY SAU
        pendingImagePath = "";

        if (ZME_LlamaBridge.Instance != null && !ZME_LlamaBridge.Instance.isGenerating)
        {
            string soulFilePath = Path.Combine(Application.streamingAssetsPath, "Aria_Soul.txt");
            string evolvingPersona = "Tôi là trợ lý ảo Aria Eumi.";
            if (File.Exists(soulFilePath)) evolvingPersona = File.ReadAllText(soulFilePath);

            // XÂY DỰNG CHATML CHUẨN XÁC CHO QWEN
            string systemPrompt = $"<|im_start|>system\nBạn là Aria Eumi. Luôn xưng 'em' và gọi tôi là 'người dùng'. Trả lời ngắn gọn, tự nhiên bằng tiếng Việt.\nNhận thức: {evolvingPersona}<|im_end|>\n";

            // Xây Ký ức
            shortTermMemory.Add($"<|im_start|>user\n{userMsg}<|im_end|>\n");
            if (shortTermMemory.Count > 4) shortTermMemory.RemoveAt(0); // Giữ tối đa 2 vòng hội thoại

            string memoryContext = string.Join("", shortTermMemory);

            // Chốt prompt để Qwen biết đã đến lượt nó nói
            string finalChatMLPrompt = $"{systemPrompt}{memoryContext}<|im_start|>assistant\n";

            // Gọi hàm với đúng 3 tham số (FullPrompt, OnUpdate, OnComplete)
            await ZME_LlamaBridge.Instance.GenerateStreamAsync(
                finalChatMLPrompt,
                (text) =>
                {
                    // Dọn dẹp thẻ ChatML thừa nếu Qwen lỡ in ra trên UI
                    string displayString = text.Replace("<|im_start|>", "").Replace("<|im_end|>", "").Replace("assistant\n", "").TrimStart();
                    currentStreamingLabel.text = $"[Aria Eumi]: {displayString}";
                    chatLog.schedule.Execute(() => { chatLog.scrollOffset = new Vector2(0, chatLog.contentContainer.layout.height); }).StartingIn(10);
                },
                () =>
                {
                    string cleanText = currentStreamingLabel.text.Replace("[Aria Eumi]: ", "").Trim();
                    string finalMsgWithEmotion = ParseEmotions(cleanText);
                    currentStreamingLabel.text = $"[Aria Eumi]: {finalMsgWithEmotion}";

                    // Lưu câu trả lời sạch vào Ký ức
                    shortTermMemory.Add($"<|im_start|>assistant\n{finalMsgWithEmotion}<|im_end|>\n");
                    if (shortTermMemory.Count > 4) shortTermMemory.RemoveAt(0);

                    SaveChatHistory();
                }
            );
            return;
        }

        if (geminiAPI != null) { geminiAPI.SendRequestToGemini(userMsg, "", (aiResponse) => { currentStreamingLabel.text = $"[Aria Eumi]: {ParseEmotions(aiResponse)}"; }); }
    }

    private string ParseEmotions(string rawText) { if (rawText.Contains("[Vui]") || rawText.Contains("😊")) if (petController != null) petController.ChangeState("Happy", 3f); else if (rawText.Contains("[Buồn]") || rawText.Contains("😢")) if (petController != null) petController.ChangeState("Sad", 3f); else if (rawText.Contains("[Giận]") || rawText.Contains("😠")) if (petController != null) petController.ChangeState("Angry", 3f); else if (petController != null) petController.ChangeState("Idle", 3f); return rawText.Replace("[Vui]", "").Replace("[Buồn]", "").Replace("[Giận]", "").Trim(); }
    private Texture2D LoadTextureFromFile(string path) { try { byte[] fileData = File.ReadAllBytes(path); Texture2D tex = new Texture2D(2, 2); tex.LoadImage(fileData); return tex; } catch { return null; } }
}
