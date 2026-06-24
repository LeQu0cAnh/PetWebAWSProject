using UnityEngine;
using UnityEngine.UIElements;

public class ZME_UIManager : MonoBehaviour
{
    public static ZME_UIManager Instance;

    [Header("Liên kết Lõi Hệ Thống")]
    public UIDocument uiDocument;
    public ZME_GeminiAPI geminiAPI;
    public ZME_PetController petController;

    private VisualElement mainContainer;
    private TextField inputChat;
    private Button btnSend;
    private ScrollView chatLog;
    private Label txtAriaResponse;

    public bool IsMenuOpen { get; private set; } = false;

    void Awake() { Instance = this; }

    void OnEnable()
    {
        if (uiDocument == null) return;

        var root = uiDocument.rootVisualElement;
        mainContainer = root.Q<VisualElement>(className: "cyber-container");

        inputChat = root.Q<TextField>("inputChat");
        btnSend = root.Q<Button>("btnSend");
        chatLog = root.Q<ScrollView>(className: "chat-log");
        txtAriaResponse = root.Q<Label>(className: "aria-text");

        if (mainContainer != null)
        {
            // THUẬT TOÁN ĐÓNG ĐINH: Ép bảng UI nằm chính giữa màn hình
            mainContainer.style.position = Position.Absolute;
            mainContainer.style.left = new Length(50, LengthUnit.Percent);
            mainContainer.style.top = new Length(50, LengthUnit.Percent);
            mainContainer.style.translate = new Translate(new Length(-50, LengthUnit.Percent), new Length(-50, LengthUnit.Percent));

            mainContainer.style.display = DisplayStyle.None;
        }

        if (btnSend != null) btnSend.clicked += OnSendClicked;
    }

    void OnDisable()
    {
        if (btnSend != null) btnSend.clicked -= OnSendClicked;
    }

    public void ToggleMenuBar()
    {
        IsMenuOpen = !IsMenuOpen;
        if (mainContainer != null)
        {
            mainContainer.style.display = IsMenuOpen ? DisplayStyle.Flex : DisplayStyle.None;
        }
    }

    // Gửi tọa độ cho WindowManager biết để khóa chuột
    public bool IsPointerOverUI()
    {
        if (!IsMenuOpen || mainContainer == null) return false;
        Vector2 mousePos = Input.mousePosition;
        Vector2 uiPos = new Vector2(mousePos.x, Screen.height - mousePos.y);
        return mainContainer.worldBound.Contains(uiPos);
    }

    private async void OnSendClicked()
    {
        string userMsg = inputChat.value;
        if (string.IsNullOrWhiteSpace(userMsg)) return;

        inputChat.value = "";
        UpdateChat($"[EUA]: {userMsg}\n[Aria Eumi]: Đang phân tích...");

        if (petController != null) petController.ChangeState("Typing", 99f);

        var localFilter = await ZME_LocalCommand.TryProcessAsync(userMsg);
        if (localFilter.IsHandled)
        {
            UpdateChat($"[Aria Eumi]: {localFilter.ReplyMessage}");
            if (petController != null) petController.ChangeState("Idle", 3f);
            return;
        }

        if (geminiAPI != null)
        {
            geminiAPI.SendRequestToGemini(userMsg, (aiResponse) =>
            {
                UpdateChat($"[Aria Eumi]: {aiResponse}");
                if (petController != null) petController.ChangeState("Idle", 3f);
            });
        }
    }

    private void UpdateChat(string message)
    {
        if (txtAriaResponse != null)
        {
            txtAriaResponse.text += $"\n\n{message}";
            if (chatLog != null) chatLog.schedule.Execute(() => chatLog.scrollOffset = new Vector2(0, chatLog.contentContainer.layout.height)).StartingIn(50);
        }
    }
}