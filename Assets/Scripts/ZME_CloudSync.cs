using UnityEngine;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;

public class ZME_CloudSync : MonoBehaviour
{
    public static ZME_CloudSync Instance;
    private AmazonDynamoDBClient dbClient;

    // Tên bảng phải khớp 100% với tên ngài vừa tạo trên AWS
    private const string TABLE_NAME = "ZME_PetProfiles";

    void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }

    // Hàm này sẽ được gọi TỰ ĐỘNG sau khi lấy được Căn cước Cognito
    public void InitializeDB()
    {
        if (ZME_AWSManager.Instance != null && ZME_AWSManager.Instance.Credentials != null)
        {
            // Mở cổng kết nối vào DynamoDB tại cụm máy chủ Singapore
            dbClient = new AmazonDynamoDBClient(ZME_AWSManager.Instance.Credentials, Amazon.RegionEndpoint.APSoutheast1);
            UnityEngine.Debug.Log("[AWS_DYNAMO]: Đã thiết lập trạm thu phát dữ liệu DynamoDB thành công!");
        }
    }

    // Lệnh Ghi dữ liệu sinh trắc học lên Cloud
    public async Task SaveProfileAsync(string petName, string hairHexColor, float scale)
    {
        string userId = ZME_AWSManager.Instance.CurrentUserId;
        if (string.IsNullOrEmpty(userId) || dbClient == null)
        {
            UnityEngine.Debug.LogWarning("[AWS_DYNAMO]: Chưa có ID định danh hoặc chưa kết nối DB!");
            return;
        }

        // Đóng gói dữ liệu thành chuẩn JSON của DynamoDB
        var request = new PutItemRequest
        {
            TableName = TABLE_NAME,
            Item = new Dictionary<string, AttributeValue>
            {
                { "UserID", new AttributeValue { S = userId } },          // Khóa chính (Bắt buộc)
                { "PetName", new AttributeValue { S = petName } },        // Tên Pet
                { "HairColor", new AttributeValue { S = hairHexColor } }, // Mã màu Hex
                { "Scale", new AttributeValue { N = scale.ToString() } }, // Tỉ lệ cơ thể (Number)
                { "LastUpdated", new AttributeValue { S = DateTime.UtcNow.ToString("o") } }
            }
        };

        try
        {
            await dbClient.PutItemAsync(request);
            UnityEngine.Debug.Log($"[AWS_DYNAMO_SUCCESS]: Đã đồng bộ thành công hồ sơ của bé '{petName}' lên Đám mây!");
        }
        catch (Exception ex)
        {
            UnityEngine.Debug.LogError("[AWS_DYNAMO_ERROR]: Lỗi đồng bộ: " + ex.Message);
        }
    }
}