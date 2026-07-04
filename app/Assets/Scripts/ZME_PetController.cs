using UnityEngine;

public class ZME_PetController : MonoBehaviour
{
    public Animator petAnimator;
    public float walkSpeed = 2f; // Giảm tốc độ để trông tự nhiên hơn
    public GameObject[] hologramPanels;
    public GameObject handTouchScreen;

    private ZME_UIManager uiManager;
    private Camera mainCam;
    private bool isDragging = false;
    private Vector3 dragOffset, mouseDownPos;
    private string currentState = "Idle";
    private float stateTimer = 0f;
    private Vector3 targetWalkPos;
    private float dragDuration = 0f;

    void Start()
    {
        mainCam = Camera.main;
        uiManager = GetComponent<ZME_UIManager>();
        ToggleHolograms(false);
        ChangeState("Idle", 2f);
    }

    void Update()
    {
        HandleAI();
        if (!isDragging) CheckScreenBounds();
    }

    private void HandleAI()
    {
        if (isDragging || petAnimator == null) return;

        bool isMenuOpen = uiManager != null && uiManager.IsMenuOpen;

        // CẬP NHẬT: Ép dừng ngay lập tức khi Menu xuất hiện
        if (isMenuOpen)
        {
            if (currentState == "Walking") ChangeState("Idle", 99f);
            return;
        }

        stateTimer -= Time.deltaTime;

        if (stateTimer <= 0)
        {
            if (currentState == "Down" || currentState == "Thinking" || currentState == "Typing" ||
                currentState == "Sitting" || currentState == "Swimming" ||
                currentState == "Yawn" || currentState == "Stretch" || currentState == "Look Around")
            {
                ToggleHolograms(false);
                ChangeState("Idle", Random.Range(3f, 5f));
            }
            else
            {
                int rand = Random.Range(0, 100);
                if (rand < 30) ChangeState("Idle", Random.Range(4f, 8f));
                else if (rand < 50)
                {
                    int idleRand = Random.Range(0, 3);
                    if (idleRand == 0) ChangeState("Yawn", Random.Range(3f, 5f));
                    else if (idleRand == 1) ChangeState("Stretch", Random.Range(3f, 5f));
                    else ChangeState("Look Around", Random.Range(3f, 5f));
                }
                else if (rand < 80)
                {
                    // THUẬT TOÁN ĐI TÌM MỤC TIÊU 2D MỚI
                    float margin = 0.1f; // Không cho điểm đến nằm quá sát mép (10%)
                    float randomX = Random.Range(margin, 1.0f - margin);
                    float randomY = Random.Range(margin, 1.0f - margin);

                    // Quy đổi từ tọa độ Viewport (0-1) sang tọa độ thế giới 3D
                    Vector3 randomViewportPos = new Vector3(randomX, randomY, Mathf.Abs(mainCam.transform.position.z));
                    targetWalkPos = mainCam.ViewportToWorldPoint(randomViewportPos);

                    ChangeState("Walking", Random.Range(4f, 8f));
                }
                else
                {
                    ToggleHolograms(true);
                    ChangeState("Thinking", Random.Range(4f, 6f));
                }
            }
        }

        // THỰC THI DI CHUYỂN 2D (Không xoay 3D)
        if (currentState == "Walking")
        {
            transform.position = Vector3.MoveTowards(transform.position, targetWalkPos, walkSpeed * Time.deltaTime);

            // Nếu điểm đến ở bên trái, lật mặt sang trái. Ở bên phải, lật sang phải.
            Vector3 direction = targetWalkPos - transform.position;
            Vector3 scale = transform.localScale;
            if (direction.x < 0) scale.x = -Mathf.Abs(scale.x); // Quay trái
            else if (direction.x > 0) scale.x = Mathf.Abs(scale.x); // Quay phải
            transform.localScale = scale;

            // Giữ cho Aria luôn quay mặt ra màn hình (Không lật xoay trục Y)
            transform.rotation = Quaternion.identity;

            if (Vector3.Distance(transform.position, targetWalkPos) < 0.1f) ChangeState("Idle", Random.Range(2f, 4f));
        }
        else if (currentState != "Floating" && currentState != "Swimming")
        {
            transform.rotation = Quaternion.identity; // Giữ mặt hướng ra màn hình
        }
    }

    private void CheckScreenBounds()
    {
        float distanceToCam = Mathf.Abs(mainCam.transform.position.z);
        Vector3 viewportPos = mainCam.WorldToViewportPoint(transform.position);

        float marginX = 0.05f; // Rìa trái/phải
        float marginY = 0.08f; // Rìa trên/dưới (Rộng hơn chút để không vướng Taskbar)

        if (viewportPos.x < marginX || viewportPos.x > 1.0f - marginX ||
            viewportPos.y < marginY || viewportPos.y > 1.0f - marginY)
        {
            viewportPos.x = Mathf.Clamp(viewportPos.x, marginX, 1.0f - marginX);
            viewportPos.y = Mathf.Clamp(viewportPos.y, marginY, 1.0f - marginY);

            // Sửa lại đoạn tính Z để tương thích với Camera Orthographic/Perspective
            viewportPos.z = distanceToCam;
            transform.position = mainCam.ViewportToWorldPoint(viewportPos);

            if (currentState == "Walking") ChangeState("Idle", 1.5f);
        }
    }

    public void ChangeState(string newState, float time)
    {
        stateTimer = time;
        if (currentState == newState && newState != "Idle") return;

        currentState = newState;
        if (petAnimator != null) petAnimator.CrossFade(newState, 0.15f);
        if (handTouchScreen != null) handTouchScreen.SetActive(newState == "Typing" || newState == "Thinking");
    }

    public void ToggleHolograms(bool isActive)
    {
        if (hologramPanels == null) return;
        foreach (var panel in hologramPanels) if (panel != null) panel.SetActive(isActive);
    }

    // ==========================================
    // KHU VỰC CẬP NHẬT: TÁCH CHUỘT TRÁI / PHẢI
    // ==========================================

    // 1. CHUỘT TRÁI - Nhấn xuống để nhấc lên
    void OnMouseDown()
    {
        mouseDownPos = Input.mousePosition;
        isDragging = true;
        dragDuration = 0f;
        ToggleHolograms(false); // Giấu UI khi đang bị nhấc lên
        ChangeState("Floating", 99f);
        dragOffset = transform.position - GetMouseWorldPos();
    }

    // 2. CHUỘT TRÁI - Kéo đi
    void OnMouseDrag()
    {
        transform.position = GetMouseWorldPos() + dragOffset;
        dragDuration += Time.deltaTime;
        if (dragDuration > 3f && currentState == "Floating") ChangeState("Swimming", 99f);
    }

    // 3. CHUỘT TRÁI - Thả tay ra
    void OnMouseUp()
    {
        isDragging = false;
        ChangeState("Down", 1.2f); // Rơi xuống đất
    }

    // 4. CHUỘT PHẢI - Gọi / Tắt Menu
    void OnMouseOver()
    {
        // 1 = Mã của Chuột Phải trong Unity
        if (Input.GetMouseButtonDown(1))
        {
            if (uiManager != null)
            {
                uiManager.ToggleMenuBar();

                if (uiManager.IsMenuOpen)
                {
                    ToggleHolograms(true);
                    ChangeState("Typing", 99f);
                }
                else
                {
                    ToggleHolograms(false);
                    ChangeState("Idle", 1f);
                }
            }
        }
    }

    private Vector3 GetMouseWorldPos()
    {
        Vector3 mousePos = Input.mousePosition;
        mousePos.z = Mathf.Abs(mainCam.transform.position.z);
        return mainCam.ScreenToWorldPoint(mousePos);
    }
}