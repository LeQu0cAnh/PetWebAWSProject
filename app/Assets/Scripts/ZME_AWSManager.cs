using UnityEngine;
using Amazon;
using Amazon.CognitoIdentity;
using System.Threading.Tasks;
using System;

/// <summary>
/// [DEPRECATED — v2.0]
/// ZME_AWSManager không còn được sử dụng trong phiên bản mới.
///
/// Kể từ khi ứng dụng chuyển sang xác thực qua Cognito Hosted UI và giao tiếp
/// với Backend Node.js Express, class này không còn cần thiết nữa.
///
/// Không xóa để giữ tương thích nếu các Scene/Prefab cũ vẫn đang tham chiếu.
/// Để gỡ bỏ hoàn toàn: xóa component này khỏi tất cả GameObject trong Scene
/// và gỡ bỏ AWS SDK khỏi thư mục Plugins.
/// </summary>
[System.Obsolete("ZME_AWSManager đã bị deprecated. Dùng ZME_CloudSync (v2.0) thay thế.")]
public class ZME_AWSManager : MonoBehaviour
{
    public static ZME_AWSManager Instance;

    // Giữ lại các property để tránh compile error nếu script khác còn tham chiếu
    public CognitoAWSCredentials Credentials { get; private set; }

    [Header("[DEPRECATED] AWS Cognito Configuration")]
    public string IdentityPoolId = "ap-southeast-1:4f0b1fb3-6483-49be-9f0b-1ebfbe0d7a42";

    public string CurrentUserId { get; private set; }

    void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);

            // [DISABLED] Không khởi tạo AWS Cognito SDK nữa.
            // Xác thực hiện được xử lý bởi ZME_CloudSync thông qua Cognito Hosted UI.
            Debug.LogWarning("[ZME_AWSManager] ⚠️ Component này đã DEPRECATED. Vui lòng dùng ZME_CloudSync (v2.0).");
        }
        else
        {
            Destroy(gameObject);
        }
    }
}