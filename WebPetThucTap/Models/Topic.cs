using System.ComponentModel.DataAnnotations;

namespace WebPetThucTap.Models
{
    public class Topic
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public string ? Title { get; set; }
        [Required]
        public string ? Content { get; set; }
        public string ? AuthorName { get; set; }
        public string ? AuthorEmail { get; set; }
        public string ? MediaUrl { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // Trạng thái phê duyệt bài viết
        public bool IsApproved { get; set; } = false; // Mặc định bài mới đăng phải đợi duyệt

        public List<Comment> Comments { get; set; } = new List<Comment>();
    }
}