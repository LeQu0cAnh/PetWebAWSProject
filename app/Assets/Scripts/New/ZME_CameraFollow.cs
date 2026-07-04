using UnityEngine;

public class ZME_CameraFollow : MonoBehaviour
{
    [Header("Mục Tiêu Theo Dõi")]
    public Transform target; // Điểm neo (Aria)

    [Header("Cấu Hình Khung Hình")]
    public float smoothSpeed = 5f; // Tốc độ trượt của Camera (càng lớn càng bám sát)
    public Vector3 offset;         // Khoảng cách an toàn so với Aria

    // Dùng LateUpdate thay vì Update để chống hiện tượng rung giật (Jitter) khi nhân vật di chuyển
    void LateUpdate()
    {
        if (target == null) return;

        // Tính toán tọa độ Camera cần di chuyển tới
        Vector3 desiredPosition = target.position + offset;

        // Dùng hàm Lerp để nội suy khoảng cách, tạo cảm giác trượt mượt mà
        Vector3 smoothedPosition = Vector3.Lerp(transform.position, desiredPosition, smoothSpeed * Time.deltaTime);

        // Áp dụng tọa độ mới cho Camera
        transform.position = smoothedPosition;
    }
}