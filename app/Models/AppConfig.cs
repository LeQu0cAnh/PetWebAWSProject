namespace ZME_CloudPet.Models
{
    public class AppConfig
    {
        public string Keyword { get; set; }  // Khóa chính (Ví dụ: gemini, chrome)
        public string AppPath { get; set; }  // Đường dẫn hoặc URL web
        public string AppType { get; set; }  // Loại: "Web" hoặc "App"
    }
}