using UnityEngine;
using TMPro; // Có thể xóa nếu sau này ngài dọn nốt các TextMeshPro 3D
using System.Text.RegularExpressions;

public class ZME_CoreEngine : MonoBehaviour
{
    [Header("Core Body")]
    public Animator petAnimator;
    public float walkSpeed = 3f;

    [Header("VPet Menu System (Legacy - Cần chuyển dần sang UI Toolkit)")]
    public GameObject vpetMenuObj;

    private Camera mainCam;
    private bool isDragging = false;
    private Vector3 dragOffset;
    private string currentState = "Idle";
    private float stateTimer = 0f;
    private int moveDirection = 1;

    void Start()
    {
        mainCam = Camera.main;
        // KHÔNG CÒN GỌI WIN32 API Ở ĐÂY NỮA. Tất cả đã nhường cho ZME_WindowManager.

        if (petAnimator != null) ChangeState("Idle", 2f);
    }

    void Update()
    {
        // Đã xóa HandleWindowClickThrough() gây xung đột UI
        HandleAI();
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

            // TÍNH NĂNG LỒNG GIAM
            Vector3 screenPos = mainCam.WorldToScreenPoint(transform.position);
            if (screenPos.x < 100 && moveDirection == -1) moveDirection = 1;
            else if (screenPos.x > Screen.width - 100 && moveDirection == 1) moveDirection = -1;
        }
        else if (currentState == "Idle" || currentState == "Thinking")
        {
            transform.rotation = Quaternion.Euler(0, 180, 0);
        }
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