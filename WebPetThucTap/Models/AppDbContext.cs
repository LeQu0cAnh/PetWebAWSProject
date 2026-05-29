using Microsoft.EntityFrameworkCore;

namespace WebPetThucTap.Models
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Topic> Topics { get; set; }
        public DbSet<Comment> Comments { get; set; }
        public DbSet<UserAccount> UserAccounts { get; set; }
        public DbSet<CommentHistory> CommentHistories { get; set; }
        public DbSet<LikeLog> LikeLogs { get; set; }
        public DbSet<ExpConfig> ExpConfigs { get; set; }
    }
}