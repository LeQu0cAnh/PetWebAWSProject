using System.Collections.Generic;

namespace WebPetThucTap.Models
{
    public class DashboardViewModel
    {
        public List<Topic> PendingTopics { get; set; } = new List<Topic>();
        public List<Topic> ApprovedTopics { get; set; } = new List<Topic>();
        public List<UserAccount> Users { get; set; } = new List<UserAccount>();
    }
}