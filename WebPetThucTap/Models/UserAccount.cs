using System.ComponentModel.DataAnnotations;

namespace WebPetThucTap.Models
{
    public enum UserRole
    {
        User = 0,
        Admin = 1,
        Dev = 2
    }

    public class UserAccount
    {
        [Key]
        public string ? Email { get; set; } // Dùng Email Google làm Khóa chính
        public string ? Name { get; set; }
        public UserRole Role { get; set; } = UserRole.User;

        // Hệ thống EXP
        public int TotalExp { get; set; } = 0;

        // Quản lý BAN người dùng
        public DateTime? BannedUntil { get; set; } // Nếu NULL là không bị BAN, nếu có ngày là bị BAN đến ngày đó
    }
}