using System.ComponentModel.DataAnnotations;

namespace WebPetThucTap.Models
{
    public class LikeLog
    {
        [Key]
        public int Id { get; set; }
        public string ? UserEmail { get; set; } // Ai like
        public int? TopicId { get; set; }     // Like bài viết nào (để trống nếu là like comment)
        public int? CommentId { get; set; }   // Like comment nào (để trống nếu là like topic)
    }
}