using System;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.EventSystems;
using TMPro;
using UnityEngine.UI;

public class ZME_CoreEngine : MonoBehaviour
{
    // --- WIN32 API ---
    [DllImport("user32.dll")] private static extern IntPtr GetActiveWindow();
    [DllImport("user32.dll")] private static extern int SetWindowLong(IntPtr hWnd, int nIndex, uint dwNewLong);
    [DllImport("user32.dll")] private static extern uint GetWindowLong(IntPtr hWnd, int nIndex);
    [DllImport("user32.dll")] private static extern int SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    [DllImport("Dwmapi.dll")] private static extern uint DwmExtendFrameIntoClientArea(IntPtr hWnd, ref MARGINS margins);

    private struct MARGINS { public int cxLeftWidth, cxRightWidth, cyTopHeight, cyBottomHeight; }
    private const int GWL_EXSTYLE = -20;
    private const uint WS_EX_LAYERED = 0x00080000;
    private const uint WS_EX_TRANSPARENT = 0x00000020;
    private const uint WS_EX_TOPMOST = 0x00000008;
    private IntPtr hWnd;

    [Header("Core Body")]
    public Animator petAnimator;
    public float walkSpeed = 3f;

    [Header("Hologram System")]
    public RectTransform uiPanel;
    public TextMeshProUGUI txtChatLog;
    public TextMeshProUGUI txtCPU;
    public TextMeshProUGUI txtRAM;
    public TMP_InputField inputChat;
    public Button btnSend;

    [Header("VPet Menu System")]
    public Button btnOpenMenu;     // Nút gọi Menu
    public GameObject vpetMenuObj; // Bảng Menu Chi Tiết
    public Button btnCloseMenu;    // Nút X tắt Menu

    private Camera mainCam;
    private bool isDragging = false;
    private Vector3 dragOffset;
    private string currentState = "Idle";
    private float stateTimer = 0f;
    private int moveDirection = 1;

    void Start()
    {
        mainCam = Camera.main;
        Application.runInBackground = true;

#if !UNITY_EDITOR
        hWnd = GetActiveWindow();
        MARGINS margins = new MARGINS { cxLeftWidth = -1 };
        DwmExtendFrameIntoClientArea(hWnd, ref margins);
        SetWindowLong(hWnd, GWL_EXSTYLE, WS_EX_LAYERED | WS_EX_TOPMOST);
        SetWindowPos(hWnd, new IntPtr(-1), 0, 0, 0, 0, 0x0001 | 0x0002);
#endif
        if (petAnimator != null) ChangeState("Idle", 2f);
        if (btnSend != null) btnSend.onClick.AddListener(OnSendClicked);

        // Khởi tạo Menu ẩn
        if (vpetMenuObj != null) vpetMenuObj.SetActive(false);
        if (btnOpenMenu != null) btnOpenMenu.onClick.AddListener(() => vpetMenuObj.SetActive(true));
        if (btnCloseMenu != null) btnCloseMenu.onClick.AddListener(() => vpetMenuObj.SetActive(false));

        InvokeRepeating("UpdateRadar", 1f, 1f);
    }

    void Update()
    {
        HandleWindowClickThrough();
        HandleAI();
    }

    private void OnSendClicked()
    {
        string msg = inputChat.text;
        if (!string.IsNullOrWhiteSpace(msg))
        {
            txtChatLog.text += $"\n[Đại]: {msg}\n[ZME]: Đang phân tích...";
            inputChat.text = "";
            ChangeState("Thinking", 5f);
        }
    }

    private void UpdateRadar()
    {
        if (txtRAM != null) txtRAM.text = $"RAM: {(System.GC.GetTotalMemory(false) / 1048576f) + UnityEngine.Random.Range(45f, 55f):F1} MB";
        if (txtCPU != null) txtCPU.text = $"CPU: {UnityEngine.Random.Range(1, 10)}%";
    }

    private void HandleWindowClickThrough()
    {
#if !UNITY_EDITOR
        bool isOverUI = false;
        if (uiPanel != null) isOverUI = RectTransformUtility.RectangleContainsScreenPoint(uiPanel, Input.mousePosition, null);
        
        // Quét thêm Menu VPet nếu nó đang mở
        if (!isOverUI && vpetMenuObj != null && vpetMenuObj.activeSelf)
        {
            RectTransform menuRect = vpetMenuObj.GetComponent<RectTransform>();
            if (menuRect != null) isOverUI = RectTransformUtility.RectangleContainsScreenPoint(menuRect, Input.mousePosition, null);
        }

        bool isTyping = inputChat != null && inputChat.isFocused;
        bool isOverPet = false;
        Ray ray = mainCam.ScreenPointToRay(Input.mousePosition);
        if (Physics.Raycast(ray, out RaycastHit hit) && hit.collider != null && hit.collider.gameObject == this.gameObject) isOverPet = true;

        uint currentExStyle = GetWindowLong(hWnd, GWL_EXSTYLE);
        if (isOverUI || isOverPet || isDragging || isTyping) SetWindowLong(hWnd, GWL_EXSTYLE, currentExStyle & ~WS_EX_TRANSPARENT);
        else SetWindowLong(hWnd, GWL_EXSTYLE, currentExStyle | WS_EX_TRANSPARENT);
#endif
    }

    private void HandleAI()
    {
        if (isDragging || petAnimator == null) return;

        stateTimer -= Time.deltaTime;
        if (stateTimer <= 0)
        {
            int rand = UnityEngine.Random.Range(0, 100);
            if (rand < 50) ChangeState("Idle", UnityEngine.Random.Range(4f, 8f));
            else if (rand < 85)
            {
                moveDirection = UnityEngine.Random.Range(0, 2) == 0 ? -1 : 1;
                ChangeState("Walking", UnityEngine.Random.Range(3f, 6f));
            }
            else ChangeState("Thinking", 3f);
        }

        if (currentState == "Walking")
        {
            transform.Translate(Vector3.forward * walkSpeed * Time.deltaTime);
            transform.rotation = Quaternion.Euler(0, moveDirection == 1 ? 90 : -90, 0);

            // TÍNH NĂNG LỒNG GIAM: Ép quay đầu khi đụng mép màn hình
            Vector3 screenPos = mainCam.WorldToScreenPoint(transform.position);
            if (screenPos.x < 100 && moveDirection == -1) moveDirection = 1; // Đụng mép trái
            else if (screenPos.x > Screen.width - 100 && moveDirection == 1) moveDirection = -1; // Đụng mép phải
        }
        else if (currentState == "Idle" || currentState == "Thinking") transform.rotation = Quaternion.Euler(0, 180, 0);
    }

    public void ChangeState(string newState, float time)
    {
        currentState = newState;
        stateTimer = time;
        if (petAnimator != null) petAnimator.Play(newState);
    }

    void OnMouseDown() { isDragging = true; ChangeState("Thinking", 99f); dragOffset = transform.position - GetMouseWorldPos(); }
    void OnMouseDrag() { transform.position = GetMouseWorldPos() + dragOffset; }
    void OnMouseUp() { isDragging = false; ChangeState("Idle", 2f); }
    private Vector3 GetMouseWorldPos()
    {
        Vector3 mousePos = Input.mousePosition;
        mousePos.z = mainCam.WorldToScreenPoint(transform.position).z;
        return mainCam.ScreenToWorldPoint(mousePos);
    }
}