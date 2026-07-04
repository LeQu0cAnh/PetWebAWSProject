using UnityEngine;

public enum PermissionLevel
{
    Observer = 1,
    Assistant = 2,
    Administrator = 3
}

public class ZME_SecurityManager : MonoBehaviour
{
    public static ZME_SecurityManager Instance;

    [Header("Cấp độ An ninh Hiện tại")]
    public PermissionLevel CurrentLevel = PermissionLevel.Observer; // Luôn bắt đầu ở mức an toàn nhất

    void Awake()
    {
        Instance = this;
    }

    // Hàm chốt chặn kiểm tra quyền hạn
    public bool IsAuthorized(PermissionLevel requiredLevel, out string denyMessage)
    {
        if (CurrentLevel >= requiredLevel)
        {
            denyMessage = "";
            return true; // Cấp phép thông hành
        }
        else
        {
            // Trả về câu từ chối nhẹ nhàng của Aria
            denyMessage = $"Lệnh này yêu cầu quyền hạn [{requiredLevel}]. Hiện tại em chỉ là [{CurrentLevel}], ngài hãy nâng cấp quyền cho em nhé!";
            return false; // Chặn đứng lệnh
        }
    }
}