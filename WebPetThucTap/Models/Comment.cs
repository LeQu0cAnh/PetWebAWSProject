using System.ComponentModel.DataAnnotations;

namespace WebPetThucTap.Models
{
    public class Comment
    {
        [Key]
        public int Id { get; set; }
        public int TopicId { get; set; }
        public Topic ? Topic { get; set; }

        public string ? AuthorName { get; set; }
        public string ? AuthorEmail { get; set; } // Thêm email để kiểm tra quyền chỉnh sửa
        public string ? Content { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // Trạng thái chỉnh sửa
        public bool IsEdited { get; set; } = false;

        // Mối quan hệ 1-N đến bảng lịch sử chỉnh sửa
        public List<CommentHistory> Histories { get; set; } = new List<CommentHistory>();
    }
}