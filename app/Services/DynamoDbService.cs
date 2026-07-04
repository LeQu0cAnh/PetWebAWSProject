using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Amazon;
using Amazon.Runtime;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using ZME_CloudPet.Models;

namespace ZME_CloudPet.Services
{
    public class DynamoDbService
    {
        private readonly AmazonDynamoDBClient _client;
        private const string TableName = "ZmeAppDictionary";

        public DynamoDbService()
        {
            // =========================================================================
            // ⚠️ CẢNH BÁO BẢO MẬT: ĐIỀN 2 CÁI CHÌA KHÓA AWS CẬU VỪA LẤY VÀO ĐÂY VÀ
            // TUYỆT ĐỐI KHÔNG PUSH CÁI FILE CHỨA KEY NÀY LÊN GITHUB Ở CHẾ ĐỘ PUBLIC NHA!
            // =========================================================================
            string accessKey = "";
            string secretKey = "";

            // Chọn Region trùng với Region trên AWS Console của cậu (Ví dụ: RegionEndpoint.USEast1)
            var credentials = new BasicAWSCredentials(accessKey, secretKey);
            _client = new AmazonDynamoDBClient(credentials, RegionEndpoint.USEast1);
        }

        // 1. LẤY TẤT CẢ DANH SÁCH APP/WEB VỀ MÁY (Hàm Scan)
        public async Task<List<AppConfig>> GetAllAppsAsync()
        {
            var list = new List<AppConfig>();
            try
            {
                var request = new ScanRequest { TableName = TableName };
                var response = await _client.ScanAsync(request);

                foreach (var item in response.Items)
                {
                    list.Add(new AppConfig
                    {
                        Keyword = item.ContainsKey("Keyword") ? item["Keyword"].S : "",
                        AppPath = item.ContainsKey("AppPath") ? item["AppPath"].S : "",
                        AppType = item.ContainsKey("AppType") ? item["AppType"].S : "Web"
                    });
                }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("Lỗi tải data AWS: " + ex.Message); }
            return list;
        }

        // 2. THÊM HOẶC CẬP NHẬT (SỬA) MỘT LỆNH MỚI (Hàm PutItem)
        public async Task<bool> SaveAppAsync(AppConfig app)
        {
            try
            {
                var request = new PutItemRequest
                {
                    TableName = TableName,
                    Item = new Dictionary<string, AttributeValue>
                    {
                        { "Keyword", new AttributeValue { S = app.Keyword.ToLower().Trim() } },
                        { "AppPath", new AttributeValue { S = app.AppPath.Trim() } },
                        { "AppType", new AttributeValue { S = app.AppType } }
                    }
                };
                await _client.PutItemAsync(request);
                return true;
            }
            catch { return false; }
        }

        // 3. XÓA MỘT LỆNH KHỎI DATABASE (Hàm DeleteItem)
        public async Task<bool> DeleteAppAsync(string keyword)
        {
            try
            {
                var request = new DeleteItemRequest
                {
                    TableName = TableName,
                    Key = new Dictionary<string, AttributeValue>
                    {
                        { "Keyword", new AttributeValue { S = keyword.ToLower().Trim() } }
                    }
                };
                await _client.DeleteItemAsync(request);
                return true;
            }
            catch { return false; }
        }
    }
}