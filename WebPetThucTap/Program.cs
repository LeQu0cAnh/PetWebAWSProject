using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication; // Bắt buộc phải có để dùng ClaimActions lấy ảnh
using WebPetThucTap.Hubs;
using WebPetThucTap.Models; // Bắt buộc phải có using này để nhận diện AppDbContext

var builder = WebApplication.CreateBuilder(args);

// 1. Khai báo MVC và SignalR (Chat)
builder.Services.AddControllersWithViews();
builder.Services.AddSignalR();

// 2. KHAI BÁO DATABASE
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(
        connectionString,
        // Thay vì dùng AutoDetect bắt nó gọi lên mạng, ta hardcode luôn phiên bản MySQL 8.0.32
        new MySqlServerVersion(new Version(8, 0, 32))
    ));
// 3. Cấu hình Đăng nhập bằng Google
builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = GoogleDefaults.AuthenticationScheme;
})
.AddCookie()
.AddGoogle(googleOptions =>
{
    // Lấy mã từ appsettings.json hoặc User Secrets, KHÔNG gán mã cứng ở đây
#pragma warning disable CS8601 // Possible null reference assignment.
    googleOptions.ClientId = builder.Configuration["Authentication:Google:ClientId"];
#pragma warning restore CS8601 // Possible null reference assignment.
#pragma warning disable CS8601 // Possible null reference assignment.
    googleOptions.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];
#pragma warning restore CS8601 // Possible null reference assignment.

    // THÊM MỚI: Ép hệ thống bóc tách thêm dữ liệu ảnh "picture" từ Google Profile
    googleOptions.ClaimActions.MapJsonKey("picture", "picture");

    // Xử lý nạp dữ liệu tài khoản và phân quyền ngay khi đăng nhập thành công
    googleOptions.Events.OnTicketReceived = async context =>
    {
        var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();

        var name = context.Principal?.Identity?.Name ?? "Ẩn danh";
        var email = context.Principal?.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value;

        if (!string.IsNullOrEmpty(email))
        {
            var user = await db.UserAccounts.FindAsync(email);
            if (user == null)
            {
                user = new UserAccount
                {
                    Email = email,
                    Name = name,
                    TotalExp = 9223372036854775807,
                    // Nếu trùng email của bạn thì gán thẳng quyền DEV, người khác đăng nhập là USER thường
                    Role = email == "lequocanh.work@gmail.com"
                        ? UserRole.Dev
                        : UserRole.User
                };
                db.UserAccounts.Add(user);
            }
            else
            {
                // Đảm bảo nếu là tài khoản của bạn thì luôn giữ quyền Dev
                if (email == "lequocanh.work@gmail.com")
                {
                    user.Role = UserRole.Dev;
                }
            }
            await db.SaveChangesAsync();
        }
    };
});

// Thiết lập ép hệ thống luôn dùng chuẩn Quốc Tế (Dấu chấm cho số thập phân)
var cultureInfo = new System.Globalization.CultureInfo("en-US");
System.Globalization.CultureInfo.DefaultThreadCurrentCulture = cultureInfo;
System.Globalization.CultureInfo.DefaultThreadCurrentUICulture = cultureInfo;

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseRouting();

// 4. BẮT BUỘC có UseAuthentication NẰM TRƯỚC UseAuthorization
app.UseAuthentication();
app.UseAuthorization();

app.MapStaticAssets();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();

// 5. Mở cổng cho ChatHub
app.MapHub<ChatHub>("/chatHub");

//Tự động chạy Migration khi web khởi động trên máy ảo
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        // Lệnh này tương đương với việc bạn gõ Update-Database
        context.Database.Migrate();
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Đã xảy ra lỗi khi tạo Database tự động.");
    }
}


app.Run();