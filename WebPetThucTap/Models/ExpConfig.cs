using System.ComponentModel.DataAnnotations;

namespace WebPetThucTap.Models
{
    public class ExpConfig
    {
        [Key]
        public int Id { get; set; }
        public int BaseExpNeeded { get; set; } = 1000; // Cấp 1 cần 1000 exp
        public double Multiplier { get; set; } = 2.5;  // Cấp sau = cấp trước x 2.5
        public int LevelsPerTitle { get; set; } = 10;  // Cứ 10 cấp đổi danh hiệu 1 lần

        // Danh sách các danh hiệu ngăn cách bằng dấu phẩy,
        public string TitlesString { get; set; } = "Tân Tinh,Bạch Lộc,Thương Lang,Kim Ô,Xích Hồ,Tử Hiêu,Chu Phượng,Ngân Long,Sáng Thế Thần Minh";
    }
}