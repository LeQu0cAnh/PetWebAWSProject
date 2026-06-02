using System.ComponentModel.DataAnnotations;

namespace WebPetThucTap.Models
{
    public class CommentHistory
    {
        [Key]
        public int Id { get; set; }
        public int CommentId { get; set; }
        public Comment ? Comment { get; set; }

        public string ? OldContent { get; set; } // Nội dung cũ trước khi sửa
        public DateTime EditedAt { get; set; } = DateTime.Now; // Thời gian sửa
    }
}