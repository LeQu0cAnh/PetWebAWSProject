using Microsoft.AspNetCore.SignalR;

namespace WebPetThucTap.Hubs
{
    // Kế thừa từ class Hub của SignalR
    public class ChatHub : Hub
    {
        // Hàm này sẽ được gọi từ phía giao diện web (JavaScript)
        public async Task SendMessage(string user, string message)
        {
            // Gửi tin nhắn đến tất cả các client đang kết nối với sự kiện "ReceiveMessage"
            await Clients.All.SendAsync("ReceiveMessage", user, message);
        }
    }
}