using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using WebPetThucTap.Models;

namespace WebPetThucTap.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly AppDbContext _context; // Biến kết nối Database

        // Constructor nhận cả Logger và AppDbContext (Giữ nguyên cấu trúc)
        public HomeController(ILogger<HomeController> logger, AppDbContext context)
        {
            _logger = logger;
            _context = context;
        }

        // =========================================================================
        // THÊM MỚI: Hàm phụ trợ nạp thông tin đồng bộ danh hiệu cho TOÀN BỘ hệ thống
        // =========================================================================
        private async Task LoadUserLayoutDataAsync()
        {
            if (User.Identity != null && User.Identity.IsAuthenticated)
            {
                var currentUserEmail = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value;
                if (!string.IsNullOrEmpty(currentUserEmail))
                {
                    var account = await _context.UserAccounts.FindAsync(currentUserEmail);
                    var expConfig = await _context.ExpConfigs.FirstOrDefaultAsync() ?? new ExpConfig();

                    if (account != null)
                    {
                        var expInfo = ExpCalculator.Calculate(account.TotalExp, expConfig);
                        ViewData["UserTitle"] = expInfo.Title; // Ném danh hiệu lên Layout
                        
                        ViewBag.CurrentUserRole = account.Role; // Dự phòng cho các logic cần quyền trên Layout
                        ViewData["CurrentExp"] = expInfo.CurrentExp;
                        ViewData["NextExp"] = expInfo.NextExp;
                        ViewData["ExpPercent"] = expInfo.NextExp > 0 ? (int)((double)expInfo.CurrentExp / expInfo.NextExp * 100) : 0;
                    }
                }
            }
        }

        // =========================================================================
        // CẬP NHẬT: Các action chuyển sang Async để đồng bộ nạp danh hiệu cho Navbar
        // =========================================================================

        public async Task<IActionResult> Index()
        {
            await LoadUserLayoutDataAsync();
            return View();
        }

        public async Task<IActionResult> Privacy()
        {
            await LoadUserLayoutDataAsync();
            return View();
        }

        public async Task<IActionResult> Htu()
        {
            await LoadUserLayoutDataAsync();
            return View();
        }

        public async Task<IActionResult> Information()
        {
            await LoadUserLayoutDataAsync();
            return View();
        }

        // CẬP NHẬT: Đã tối ưu hóa luồng IQueryable kết hợp nạp danh hiệu dùng chung
        // 1. CẬP NHẬT HÀM COMMUNITY: Thêm thống kê số lượng Like
        public async Task<IActionResult> Community(int? id)
        {
            await LoadUserLayoutDataAsync();

            var currentUserEmail = User.Identity?.IsAuthenticated == true ? User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value : "";
            var account = await _context.UserAccounts.FindAsync(currentUserEmail);
            var role = account?.Role ?? UserRole.User;
            ViewBag.CurrentUserRole = role;

            IQueryable<Topic> topicsQuery = _context.Topics.Include(t => t.Comments);
            if (role == UserRole.User)
            {
                topicsQuery = topicsQuery.Where(t => t.IsApproved);
            }

            var topics = await topicsQuery.OrderByDescending(t => t.CreatedAt).ToListAsync();
            var activeTopic = id.HasValue ? topics.FirstOrDefault(t => t.Id == id.Value) : topics.FirstOrDefault();
            ViewBag.ActiveTopic = activeTopic;

            // Trạng thái Like của người dùng hiện tại (để tô đỏ nút Like)
            var likedElements = User.Identity?.IsAuthenticated == true
                ? await _context.LikeLogs.Where(l => l.UserEmail == currentUserEmail).Select(l => l.CommentId.HasValue ? l.CommentId.Value : -l.TopicId!.Value).ToListAsync()
                : new List<int>();
            ViewBag.LikedElements = likedElements;

            // =========================================================================
            // THÊM MỚI: Đếm tổng số lượng Like của TẤT CẢ Topic và Comment truyền ra View
            // =========================================================================
            var topicLikesCount = await _context.LikeLogs
                .Where(l => l.TopicId != null)
                .GroupBy(l => l.TopicId)
                .ToDictionaryAsync(g => g.Key!.Value, g => g.Count());

            var commentLikesCount = await _context.LikeLogs
                .Where(l => l.CommentId != null)
                .GroupBy(l => l.CommentId)
                .ToDictionaryAsync(g => g.Key!.Value, g => g.Count());

            ViewBag.TopicLikesCount = topicLikesCount;
            ViewBag.CommentLikesCount = commentLikesCount;

            return View(topics);
        }

        // 2. CẬP NHẬT HÀM LIKE TOPIC: Cộng/Trừ EXP cho tác giả bài viết
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> ToggleLikeTopic(int topicId)
        {
            var email = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value;
            var topic = await _context.Topics.FindAsync(topicId);
            if (topic == null) return NotFound();

            var existingLike = await _context.LikeLogs.FirstOrDefaultAsync(l => l.UserEmail == email && l.TopicId == topicId);
            var authorAccount = await _context.UserAccounts.FindAsync(topic.AuthorEmail);

            if (existingLike == null)
            {
                _context.LikeLogs.Add(new LikeLog { UserEmail = email!, TopicId = topicId });
                if (authorAccount != null) authorAccount.TotalExp += 1; // Cộng 1 EXP cho chủ Topic
            }
            else
            {
                _context.LikeLogs.Remove(existingLike);
                if (authorAccount != null && authorAccount.TotalExp > 0) authorAccount.TotalExp -= 1; // Bỏ Like trừ 1 EXP
            }

            await _context.SaveChangesAsync();
            return RedirectToAction("Community", new { id = topicId });
        }

        // 3. CẬP NHẬT HÀM XÓA TOPIC: Dọn dẹp sạch sẽ (Trừ EXP Topic + Trừ EXP mọi Comment bên trong)
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> DeleteTopic(int id)
        {
            var email = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value;
            var account = await _context.UserAccounts.FindAsync(email);

            // Phải Include Comments để xử lý triệt để
            var topic = await _context.Topics.Include(t => t.Comments).FirstOrDefaultAsync(t => t.Id == id);

            if (topic != null && (topic.AuthorEmail == email || account?.Role >= UserRole.Admin))
            {
                // A. Thu hồi EXP của chính Topic đó
                var topicLikes = await _context.LikeLogs.Where(l => l.TopicId == id).ToListAsync();
                var topicAuthor = await _context.UserAccounts.FindAsync(topic.AuthorEmail);
                if (topicAuthor != null)
                {
                    topicAuthor.TotalExp -= topicLikes.Count;
                    if (topicAuthor.TotalExp < 0) topicAuthor.TotalExp = 0;
                }
                _context.LikeLogs.RemoveRange(topicLikes); // Xóa bản ghi Like của Topic

                // B. Thu hồi EXP của toàn bộ Comment nằm trong Topic này
                var commentIds = topic.Comments.Select(c => c.Id).ToList();
                if (commentIds.Any())
                {
                    // Tìm tất cả các Like thuộc về các comment này
                    var commentLikes = await _context.LikeLogs.Where(l => l.CommentId.HasValue && commentIds.Contains(l.CommentId.Value)).ToListAsync();

                    foreach (var comment in topic.Comments)
                    {
                        var likesForThisComment = commentLikes.Count(l => l.CommentId == comment.Id);
                        if (likesForThisComment > 0)
                        {
                            var cmtAuthor = await _context.UserAccounts.FindAsync(comment.AuthorEmail);
                            if (cmtAuthor != null)
                            {
                                cmtAuthor.TotalExp -= likesForThisComment; // Trừ EXP của chủ nhân comment
                                if (cmtAuthor.TotalExp < 0) cmtAuthor.TotalExp = 0;
                            }
                        }
                    }
                    _context.LikeLogs.RemoveRange(commentLikes); // Xóa bản ghi Like của Comment

                    // C. Xóa các lịch sử sửa chữa của Comment để tránh lỗi khóa ngoại (Foreign Key)
                    var commentHistories = await _context.CommentHistories.Where(h => commentIds.Contains(h.CommentId)).ToListAsync();
                    _context.CommentHistories.RemoveRange(commentHistories);

                    // Xóa luôn danh sách bình luận
                    _context.Comments.RemoveRange(topic.Comments);
                }

                // D. Cuối cùng, xóa Topic và lưu vào DB
                _context.Topics.Remove(topic);
                await _context.SaveChangesAsync();
            }
            return RedirectToAction("Community");
        }

        public async Task<IActionResult> Contact()
        {
            await LoadUserLayoutDataAsync();
            return View();
        }

        // Action xử lý tải file cài đặt App Pet (Giữ nguyên gốc)
        public IActionResult DownloadApp()
        {
            string fileName = "PetApp_Installer.exe";
            string filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "downloads", fileName);

            if (!System.IO.File.Exists(filePath))
            {
                return Content("Bản cài đặt đang được cập nhật, bạn vui lòng quay lại sau nhé!");
            }

            byte[] fileBytes = System.IO.File.ReadAllBytes(filePath);
            return File(fileBytes, "application/octet-stream", fileName);
        }

        // CẬP NHẬT: Thêm kiểm tra trạng thái BAN khi viết bài (IsApproved mặc định = false)
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> CreateTopic(string title, string content, string? mediaUrl)
        {
            var email = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value ?? "";
            var account = await _context.UserAccounts.FindAsync(email);

            if (account?.BannedUntil.HasValue == true && account.BannedUntil.Value > DateTime.Now)
                return Content($"Tài khoản của bạn đang bị khóa viết bài đến: {account.BannedUntil.Value:dd/MM/yyyy HH:mm}");

            if (!string.IsNullOrEmpty(title) && !string.IsNullOrEmpty(content))
            {
                var topic = new Topic
                {
                    Title = title,
                    Content = content,
                    MediaUrl = mediaUrl,
                    AuthorName = User.Identity?.Name ?? "Ẩn danh",
                    AuthorEmail = email,
                    CreatedAt = DateTime.Now,
                    IsApproved = false // Mặc định chuyển thành bài đợi duyệt
                };

                _context.Topics.Add(topic);
                await _context.SaveChangesAsync();
            }
            return RedirectToAction("Community");
        }

        // CẬP NHẬT: Thêm kiểm tra trạng thái BAN khi bình luận
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> CreateComment(int topicId, string content)
        {
            var email = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value ?? "";
            var account = await _context.UserAccounts.FindAsync(email);

            if (account?.BannedUntil.HasValue == true && account.BannedUntil.Value > DateTime.Now)
                return Content($"Tài khoản của bạn đang bị khóa bình luận đến: {account.BannedUntil.Value:dd/MM/yyyy HH:mm}");

            if (!string.IsNullOrEmpty(content))
            {
                var comment = new Comment
                {
                    TopicId = topicId,
                    Content = content,
                    AuthorName = User.Identity?.Name ?? "Ẩn danh",
                    AuthorEmail = email,
                    CreatedAt = DateTime.Now
                };

                _context.Comments.Add(comment);
                await _context.SaveChangesAsync();
            }
            return RedirectToAction("Community", new { id = topicId });
        }

        // THÊM MỚI: Sửa bình luận của chính mình & Lưu lịch sử
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> EditComment(int commentId, string newContent)
        {
            var email = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value;
            var comment = await _context.Comments.FindAsync(commentId);

            if (comment != null && comment.AuthorEmail == email && !string.IsNullOrEmpty(newContent))
            {
#pragma warning disable CS8601 // Possible null reference assignment.
                _ = _context.CommentHistories.Add(new CommentHistory
                {
                    CommentId = comment.Id,
                    OldContent = comment.Content,
                    EditedAt = DateTime.Now
                });
#pragma warning restore CS8601 // Possible null reference assignment.

                comment.Content = newContent;
                comment.IsEdited = true;
                await _context.SaveChangesAsync();
                return RedirectToAction("Community", new { id = comment.TopicId });
            }
            return Forbid();
        }

        // THÊM MỚI: API phục vụ tải lịch sử chỉnh sửa bình luận qua AJAX
        public async Task<IActionResult> GetCommentHistory(int commentId)
        {
            var history = await _context.CommentHistories
                .Where(h => h.CommentId == commentId)
                .OrderByDescending(h => h.EditedAt)
                .Select(h => new { oldContent = h.OldContent, editedAt = h.EditedAt.ToString("HH:mm dd/MM/yyyy") })
                .ToListAsync();
            return Json(history);
        }

        // THÊM MỚI: Xóa bình luận (Chính mình hoặc Ban quản trị)
        [Authorize]
        [HttpPost]
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> DeleteComment(int id)
        {
            var email = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value;
            var account = await _context.UserAccounts.FindAsync(email);
            var comment = await _context.Comments.FindAsync(id);

            if (comment != null && (comment.AuthorEmail == email || account?.Role >= UserRole.Admin))
            {
                // 1. Tìm tất cả các lượt Like của comment sắp bị xóa này
                var relatedLikes = await _context.LikeLogs.Where(l => l.CommentId == id).ToListAsync();
                int totalLikesOfComment = relatedLikes.Count;

                // 2. Tìm tài khoản của tác giả viết comment đó để trừ EXP
                var authorAccount = await _context.UserAccounts.FindAsync(comment.AuthorEmail);
                if (authorAccount != null)
                {
                    // Trừ đi số EXP tương ứng với số lượt Like đã nhận (mỗi Like = 1 EXP)
                    authorAccount.TotalExp -= totalLikesOfComment;

                    // Đảm bảo EXP không bị âm dưới 0 nếu có lỗi dữ liệu
                    if (authorAccount.TotalExp < 0) authorAccount.TotalExp = 0;
                }

                // 3. Xóa các bản ghi Like liên quan trong bảng LikeLogs trước để tránh lỗi ràng buộc (Foreign Key)
                if (relatedLikes.Any())
                {
                    _context.LikeLogs.RemoveRange(relatedLikes);
                }

                // 4. Tiến hành xóa bình luận
                _context.Comments.Remove(comment);

                // 5. Lưu toàn bộ thay đổi vào Database
                await _context.SaveChangesAsync();

                return RedirectToAction("Community", new { id = comment.TopicId });
            }
            return Forbid();
        }

        // THÊM MỚI: Tính năng Thích/Bỏ Thích bình luận để tăng/giảm EXP tích lũy của tác giả
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> ToggleLikeComment(int commentId)
        {
            var email = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value;
            var comment = await _context.Comments.FindAsync(commentId);
            if (comment == null) return NotFound();

            var existingLike = await _context.LikeLogs.FirstOrDefaultAsync(l => l.UserEmail == email && l.CommentId == commentId);
            var authorAccount = await _context.UserAccounts.FindAsync(comment.AuthorEmail);

            if (existingLike == null)
            {
                _context.LikeLogs.Add(new LikeLog { UserEmail = email!, CommentId = commentId });
                if (authorAccount != null) authorAccount.TotalExp += 1; // Đạt 1 like được +1 EXP
            }
            else
            {
                _context.LikeLogs.Remove(existingLike);
                if (authorAccount != null && authorAccount.TotalExp > 0) authorAccount.TotalExp -= 1; // Bỏ thích bị -1 EXP
            }

            await _context.SaveChangesAsync();
            return RedirectToAction("Community", new { id = comment.TopicId });
        }

        // ==================== HỆ THỐNG ĐIỀU HÀNH DASHBOARD (ADMIN & DEV) ====================

        // Mở màn hình quản trị Dashboard tập trung
        public async Task<IActionResult> Dashboard()
        {
            await LoadUserLayoutDataAsync();
            var email = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value;
            var account = await _context.UserAccounts.FindAsync(email);

            if (account == null || account.Role < UserRole.Admin) return Forbid(); // Người dùng thường bị từ chối truy cập

            ViewBag.CurrentUserRole = account.Role;
            ViewBag.ExpConfig = await _context.ExpConfigs.FirstOrDefaultAsync() ?? new ExpConfig();

            var viewModel = new DashboardViewModel
            {
                PendingTopics = await _context.Topics.Where(t => !t.IsApproved).OrderByDescending(t => t.CreatedAt).ToListAsync(),
                ApprovedTopics = await _context.Topics.Where(t => t.IsApproved).OrderByDescending(t => t.CreatedAt).ToListAsync(),
                Users = await _context.UserAccounts.ToListAsync()
            };

            return View(viewModel);
        }

        // Duyệt bài viết chờ phê duyệt
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> ApproveTopic(int id)
        {
            var email = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value;
            var account = await _context.UserAccounts.FindAsync(email);

            if (account?.Role >= UserRole.Admin)
            {
                var topic = await _context.Topics.FindAsync(id);
                if (topic != null) topic.IsApproved = true;
                await _context.SaveChangesAsync();
            }
            return RedirectToRoute(new { controller = "Home", action = Request.Headers["Referer"].ToString().Contains("Dashboard") ? "Dashboard" : "Community" });
        }

        // Khóa tính năng tương tác của thành viên (Ban) theo giờ số lượng động
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> BanUser(string userEmail, int hours)
        {
            var email = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value;
            var account = await _context.UserAccounts.FindAsync(email);

            if (account?.Role >= UserRole.Admin)
            {
                var targetUser = await _context.UserAccounts.FindAsync(userEmail);
                if (targetUser != null && targetUser.Role < account.Role) // Không thể ban người có cấp bậc cao hơn mình
                {
                    targetUser.BannedUntil = DateTime.Now.AddHours(hours);
                    await _context.SaveChangesAsync();
                }
            }
            return RedirectToAction("Community");
        }

        // Gỡ án cấm (Unban) cho thành viên từ Dashboard
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> UnbanUser(string email)
        {
            var myEmail = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value;
            var myAccount = await _context.UserAccounts.FindAsync(myEmail);

            if (myAccount?.Role >= UserRole.Admin)
            {
                var targetUser = await _context.UserAccounts.FindAsync(email);
                if (targetUser != null) targetUser.BannedUntil = null;
                await _context.SaveChangesAsync();
            }
            return RedirectToAction("Dashboard");
        }

        // THẦN LỆNH CỦA DEV: Thăng chức thành viên lên Admin
        [Authorize]
        public async Task<IActionResult> PromoteToAdmin(string email)
        {
            var myEmail = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value;
            var myAccount = await _context.UserAccounts.FindAsync(myEmail);

            if (myAccount?.Role == UserRole.Dev)
            {
                var targetUser = await _context.UserAccounts.FindAsync(email);
                if (targetUser != null) targetUser.Role = UserRole.Admin;
                await _context.SaveChangesAsync();
            }
            return RedirectToRoute(new { controller = "Home", action = Request.Headers["Referer"].ToString().Contains("Dashboard") ? "Dashboard" : "Community" });
        }

        // THẦN LỆNH CỦA DEV: Hạ cấp bậc Admin xuống thành User bình thường
        [Authorize]
        public async Task<IActionResult> DemoteToUser(string email)
        {
            var myEmail = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value;
            var myAccount = await _context.UserAccounts.FindAsync(myEmail);

            if (myAccount?.Role == UserRole.Dev)
            {
                var targetUser = await _context.UserAccounts.FindAsync(email);
                if (targetUser != null) targetUser.Role = UserRole.User;
                await _context.SaveChangesAsync();
            }
            return RedirectToRoute(new { controller = "Home", action = Request.Headers["Referer"].ToString().Contains("Dashboard") ? "Dashboard" : "Community" });
        }

        // THẦN LỆNH CỦA DEV: Cập nhật cấu hình công thức EXP lũy tiến
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> UpdateExpConfig(ExpConfig formConfig)
        {
            var myEmail = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value;
            var myAccount = await _context.UserAccounts.FindAsync(myEmail);

            if (myAccount?.Role == UserRole.Dev)
            {
                var config = await _context.ExpConfigs.FirstOrDefaultAsync();
                if (config == null)
                {
                    _context.ExpConfigs.Add(formConfig);
                }
                else
                {
                    config.BaseExpNeeded = formConfig.BaseExpNeeded;
                    config.Multiplier = formConfig.Multiplier;
                    config.LevelsPerTitle = formConfig.LevelsPerTitle;
                    config.TitlesString = formConfig.TitlesString;
                }
                await _context.SaveChangesAsync();
            }
            return RedirectToAction("Dashboard");
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}