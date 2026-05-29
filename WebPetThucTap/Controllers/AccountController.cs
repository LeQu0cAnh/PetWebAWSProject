using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Mvc;

namespace WebPetThucTap.Controllers
{
    public class AccountController : Controller
    {
        // Hàm gọi cửa sổ đăng nhập Google
        public IActionResult LoginWithGoogle()
        {
            // Sau khi đăng nhập thành công, tự động quay về trang chủ (/)
            var properties = new AuthenticationProperties { RedirectUri = "/" };
            return Challenge(properties, GoogleDefaults.AuthenticationScheme);
        }

        // Hàm Đăng xuất
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return RedirectToAction("Index", "Home");
        }
    }
}