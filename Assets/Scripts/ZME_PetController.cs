using UnityEngine;

public class ZME_PetController : MonoBehaviour
{
    public Animator petAnimator;
    public float walkSpeed = 3f;
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

    void Update() { HandleAI(); }

    private void HandleAI()
    {
        if (isDragging || petAnimator == null) return;

        bool isMenuOpen = uiManager != null && uiManager.IsMenuOpen;
        if (isMenuOpen) return;

        stateTimer -= Time.deltaTime;

        if (stateTimer <= 0)
        {
            // Danh sách các hoạt ảnh cần tự động trở về Idle
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
                    // KHÔI PHỤC LẠI CÁC HOẠT ẢNH ĐA DẠNG BỊ MẤT!
                    int idleRand = Random.Range(0, 3);
                    if (idleRand == 0) ChangeState("Yawn", Random.Range(3f, 5f));
                    else if (idleRand == 1) ChangeState("Stretch", Random.Range(3f, 5f));
                    else ChangeState("Look Around", Random.Range(3f, 5f));
                }
                else if (rand < 80)
                {
                    float randomX = Random.Range(100, Screen.width - 100);
                    float randomY = Random.Range(100, Screen.height - 100);
                    Vector3 screenPos = new Vector3(randomX, randomY, mainCam.WorldToScreenPoint(transform.position).z);
                    targetWalkPos = mainCam.ScreenToWorldPoint(screenPos);
                    ChangeState("Walking", Random.Range(4f, 8f));
                }
                else
                {
                    ToggleHolograms(true);
                    ChangeState("Thinking", Random.Range(4f, 6f));
                }
            }
        }

        if (currentState == "Walking")
        {
            transform.position = Vector3.MoveTowards(transform.position, targetWalkPos, walkSpeed * Time.deltaTime);
            Vector3 direction = (targetWalkPos - transform.position).normalized;
            if (direction != Vector3.zero)
            {
                Quaternion lookRot = Quaternion.LookRotation(direction);
                transform.rotation = Quaternion.Euler(0, lookRot.eulerAngles.y, 0);
            }
            if (Vector3.Distance(transform.position, targetWalkPos) < 0.1f) ChangeState("Idle", Random.Range(2f, 4f));
        }
        else if (currentState != "Floating" && currentState != "Swimming") transform.rotation = Quaternion.Euler(0, 180, 0);
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

    void OnMouseDown()
    {
        mouseDownPos = Input.mousePosition;
        isDragging = true;
        dragDuration = 0f;
        ToggleHolograms(false);
        ChangeState("Floating", 99f);
        dragOffset = transform.position - GetMouseWorldPos();
    }

    void OnMouseDrag()
    {
        transform.position = GetMouseWorldPos() + dragOffset;
        dragDuration += Time.deltaTime;
        if (dragDuration > 3f && currentState == "Floating") ChangeState("Swimming", 99f);
    }

    void OnMouseUp()
    {
        isDragging = false;
        if (Vector3.Distance(Input.mousePosition, mouseDownPos) < 10f)
        {
            if (uiManager != null) uiManager.ToggleMenuBar();

            // CẬP NHẬT THEO UX CỦA KẬU: Mở menu -> Typing + Bật Hologram
            if (uiManager != null && uiManager.IsMenuOpen)
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
        else ChangeState("Down", 1.2f);
    }

    private Vector3 GetMouseWorldPos()
    {
        Vector3 mousePos = Input.mousePosition;
        mousePos.z = mainCam.WorldToScreenPoint(transform.position).z;
        return mainCam.ScreenToWorldPoint(mousePos);
    }
}