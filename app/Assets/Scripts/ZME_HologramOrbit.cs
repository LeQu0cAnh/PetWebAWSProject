using UnityEngine;

public class ZME_HologramOrbit : MonoBehaviour
{
    [Header("Cấu hình Quỹ đạo")]
    public float rotationSpeed = 15f; // Tốc độ xoay quanh Aria
    public float floatSpeed = 2f;     // Tốc độ nhấp nhô
    public float floatHeight = 0.05f; // Độ cao nhấp nhô

    private Vector3 startPos;

    void Start()
    {
        startPos = transform.localPosition;
    }

    void Update()
    {
        // 1. Lệnh xoay tròn liên tục quanh trục Y
        transform.Rotate(Vector3.up, rotationSpeed * Time.deltaTime);

        // 2. Lệnh bay lơ lửng (dùng sóng Sin)
        float newY = startPos.y + Mathf.Sin(Time.time * floatSpeed) * floatHeight;
        transform.localPosition = new Vector3(transform.localPosition.x, newY, transform.localPosition.z);
    }
}