using UnityEngine;
using Amazon;
using Amazon.CognitoIdentity;
using System.Threading.Tasks;
using System;

public class ZME_AWSManager : MonoBehaviour
{
    public static ZME_AWSManager Instance;

    // Nơi chứa chứng chỉ/chìa khóa kết nối
    public CognitoAWSCredentials Credentials { get; private set; }

    [Header("AWS Cognito Configuration")]
    public string IdentityPoolId = "ap-southeast-1:4f0b1fb3-6483-49be-9f0b-1ebfbe0d7a42";

    // Biến lưu trữ ID định danh duy nhất của người chơi hiện tại
    public string CurrentUserId { get; private set; }

    void Awake()
    {
        // Đảm bảo chỉ có 1 Trạm AWS tồn tại trong suốt quá trình chạy game
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject); // Không bị hủy khi chuyển Scene

            // Kích hoạt luồng kết nối phi đồng bộ
            _ = InitializeAWSAsync();
        }
        else
        {
            Destroy(gameObject);
        }
    }

    // Đổi sang chuẩn async/await của AWS SDK mới
    private async Task InitializeAWSAsync()
    {
        try
        {
            // 1. Thiết lập khu vực máy chủ (Singapore)
            AWSConfigs.AWSRegion = "ap-southeast-1";

            // 2. Khởi tạo chìa khóa Cognito với Pool ID
            Credentials = new CognitoAWSCredentials(
                IdentityPoolId,
                RegionEndpoint.APSoutheast1
            );

            UnityEngine.Debug.Log("[AWS_ZME]: Đang gửi yêu cầu định danh lên Trạm Không Gian AP-SOUTHEAST-1...");

            // 3. Lấy ID định danh bằng await (Chuẩn mã hóa mới)
            CurrentUserId = await Credentials.GetIdentityIdAsync();

            UnityEngine.Debug.Log($"[AWS_ZME_SUCCESS]: Kết nối thành công! Đã nhận được Passport Sinh trắc học: {CurrentUserId}");
            if (ZME_CloudSync.Instance != null)
            {
                ZME_CloudSync.Instance.InitializeDB();
            }
        }
        catch (Exception ex)
        {
            UnityEngine.Debug.LogError($"[AWS_ZME_ERROR]: Kết nối đám mây thất bại! Lỗi: {ex.Message}");
        }
    }
}