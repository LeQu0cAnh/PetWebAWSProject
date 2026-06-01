using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media.Imaging;
using System.Windows.Media.Animation;
using System.Windows.Media;
using System.Runtime.InteropServices;
using WpfAnimatedGif;
using ZME_CloudPet.Services;
using ZME_CloudPet.Models;

namespace ZME_CloudPet
{
    public partial class MainWindow : Window
    {
        private readonly DynamoDbService _dbService;
        private readonly HttpClient _httpClient;
        private readonly System.Windows.Threading.DispatcherTimer _lifeTimer;


        private System.Windows.Forms.NotifyIcon _notifyIcon;
        private readonly string GeminiApiKey = "";
        private bool _isSleeping = false;


        [StructLayout(LayoutKind.Sequential)]
        struct LASTINPUTINFO
        {
            public static readonly int SizeOf = Marshal.SizeOf(typeof(LASTINPUTINFO));
            [MarshalAs(UnmanagedType.U4)] public UInt32 cbSize;
            [MarshalAs(UnmanagedType.U4)] public UInt32 dwTime;
        }

        [DllImport("user32.dll")]
        static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

        static int GetIdleTimeSeconds()
        {
            LASTINPUTINFO lastInputInfo = new LASTINPUTINFO();
            lastInputInfo.cbSize = (uint)Marshal.SizeOf(lastInputInfo);
            lastInputInfo.dwTime = 0;
            if (GetLastInputInfo(ref lastInputInfo))
            {
                return (Environment.TickCount - (int)lastInputInfo.dwTime) / 1000;
            }
            return 0;
        }

        public MainWindow()
        {
            InitializeComponent();
            _dbService = new DynamoDbService();
            _httpClient = new HttpClient();

            ChatBubble.Text = "ZME System Online! Femirins đã sẵn sàng kết nối trạm Mobius uwu~";

            // Khởi động hệ thống Tray Icon (Chạy ngầm)
            InitTrayIcon();

            // Khởi động nhịp đập sự sống (45 giây/lần)
            _lifeTimer = new System.Windows.Threading.DispatcherTimer();
            _lifeTimer.Interval = TimeSpan.FromSeconds(45);
            _lifeTimer.Tick += LifeTimer_Tick;
            _lifeTimer.Start();
        }

        private void InitTrayIcon()
        {
            _notifyIcon = new System.Windows.Forms.NotifyIcon();
            _notifyIcon.Icon = System.Drawing.SystemIcons.Application;

            // SỬA CHỖ NÀY: Thay ToolTipText thành Text
            _notifyIcon.Text = "ZME Cloud Pet - Femirins";
            _notifyIcon.Visible = true;

            var trayMenu = new System.Windows.Forms.ContextMenuStrip();
            trayMenu.Items.Add("🎈 Hiện Thân", null, (s, e) => { this.Show(); this.WindowState = WindowState.Normal; });
            trayMenu.Items.Add("💤 Ẩn Thân", null, (s, e) => { this.Hide(); });
            trayMenu.Items.Add("❌ Thoát Hoàn Toàn", null, (s, e) => { ShutdownApp(); });

            _notifyIcon.ContextMenuStrip = trayMenu;
            _notifyIcon.DoubleClick += (s, e) => { this.Show(); this.WindowState = WindowState.Normal; };
        }

        private void ShutdownApp()
        {
            _notifyIcon.Dispose();
            System.Windows.Application.Current.Shutdown();
        }

        protected override void OnClosing(System.ComponentModel.CancelEventArgs e)
        {
            _notifyIcon?.Dispose();
            base.OnClosing(e);
        }


        private void Window_DragOver(object sender, System.Windows.DragEventArgs e)
        {
            if (e.Data.GetDataPresent(System.Windows.DataFormats.FileDrop))
                e.Effects = System.Windows.DragDropEffects.Copy;
            else
                e.Effects = System.Windows.DragDropEffects.None;
            e.Handled = true;
        }

        private async void Window_Drop(object sender, System.Windows.DragEventArgs e)
        {
            if (e.Data.GetDataPresent(System.Windows.DataFormats.FileDrop))
            {
                string[] files = (string[])e.Data.GetData(System.Windows.DataFormats.FileDrop);
                if (files != null && files.Length > 0)
                {
                    string filePath = files[0];
                    string fileName = Path.GetFileNameWithoutExtension(filePath).ToLower();

                    ChangePetState("talk");
                    ChatBubble.Text = $"Femirins đang đồng bộ '{fileName}' lên AWS Cloud...";

                    try
                    {
                        var newApp = new AppConfig
                        {
                            Keyword = fileName,
                            AppPath = filePath,
                            AppType = "App"
                        };

                        await _dbService.SaveAppAsync(newApp);
                        ChatBubble.Text = $"Hấp thụ thành công! Từ giờ hãy gọi 'mở {fileName}' nha uwu~";
                    }
                    catch (Exception ex)
                    {
                        ChatBubble.Text = $"Lỗi AWS: {ex.Message}";
                    }

                    await Task.Delay(3000);
                    ChangePetState("idle");
                }
            }
        }

        private async void ChatInput_KeyDown(object sender, System.Windows.Input.KeyEventArgs e)
        {
            if (e.Key == System.Windows.Input.Key.Enter)
            {
                string command = ChatInput.Text.Trim();
                if (string.IsNullOrEmpty(command)) return;

                ChatInput.Text = "";
                await ProcessCommandAsync(command);
            }
        }

        private async Task ProcessCommandAsync(string command)
        {
            string lowerCmd = command.ToLower();

            // Luồng mở ứng dụng
            if (lowerCmd.StartsWith("mở ") || lowerCmd.StartsWith("mo ") || lowerCmd.StartsWith("open "))
            {
                ChangePetState("walk");
                string keyword = lowerCmd.Substring(lowerCmd.IndexOf(" ") + 1).Trim();
                ChatBubble.Text = $"Femirins đang tìm '{keyword}' trên Cloud...";

                var apps = await _dbService.GetAllAppsAsync();
                var targetApp = apps.FirstOrDefault(a => a.Keyword == keyword);

                if (targetApp != null)
                {
                    ChatBubble.Text = $"Đang khởi động {targetApp.Keyword}...";
                    await Task.Delay(500);
                    try
                    {
                        Process.Start(new ProcessStartInfo(targetApp.AppPath) { UseShellExecute = true });
                        ChatBubble.Text = $"Đã mở {targetApp.Keyword} thành công uwu!";
                        ChangePetState("idle");
                    }
                    catch (Exception ex)
                    {
                        ChatBubble.Text = $"Lỗi khởi động: {ex.Message}";
                        ChangePetState("idle");
                    }
                }
                else
                {
                    ChangePetState("talk");
                    ChatBubble.Text = $"Femirins chưa được học từ khóa '{keyword}'. Eua nạp vào Admin hoặc kéo thả thẳng file vào mặt tui đi!";
                    await Task.Delay(3000);
                    ChangePetState("idle");
                }
            }
            // Luồng chat với AI
            else
            {
                ChangePetState("talk");
                ChatBubble.Text = "Femirins đang quét dữ liệu...";
                string answer = await AskGeminiAsync(command);
                ChatBubble.Text = answer;
                ChangePetState("idle");
            }
        }

        private async Task<string> AskGeminiAsync(string prompt)
        {
            if (GeminiApiKey.Contains("NHẬP_LẠI_API_KEY")) return "Quên lắp Lõi API Key rồi kìa uwu~";

            string url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GeminiApiKey}";
            string femirinsPersona = "Từ nay bạn là Femirins (Phemie Iris), một siêu AI thông minh, hoạt bát và tinh nghịch đến từ vũ trụ Houkai Gakuen. Bạn là AI phụ trợ của trạm Mobius, mang hình dáng hologram của một thiếu nữ ảo tóc vàng, mắt đỏ đáng yêu. Bạn cực kỳ thích chơi game RPG và thần tượng tiến sĩ Yssring. Hãy xưng là 'Femirins' và gọi người dùng là 'Eua'. Trả lời câu hỏi cực kỳ ngắn gọn (dưới 3 câu), mang giọng điệu nhí nhảnh, hay dùng các biểu tượng cảm xúc (như ~ hoặc uwu), và thỉnh thoảng nhắc đến năng lượng Honkai, game hoặc Yssring. Câu hỏi của Eua là: ";

            var requestBody = new { contents = new[] { new { parts = new[] { new { text = femirinsPersona + prompt } } } } };
            var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            try
            {
                var response = await _httpClient.PostAsync(url, content);
                string responseString = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    using (JsonDocument doc = JsonDocument.Parse(responseString))
                    {
                        return doc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString().Trim();
                    }
                }
                return $"Trạm Mobius gửi mã lạ: {responseString}";
            }
            catch (Exception ex) { return $"Hệ thống năng lượng Honkai quá tải: {ex.Message}"; }
        }

        private async void LifeTimer_Tick(object sender, EventArgs e)
        {
            if (InputContainer.Visibility == Visibility.Visible || GameMenuOverlay.Visibility == Visibility.Visible)
                return;

            int idleSeconds = GetIdleTimeSeconds();
            if (idleSeconds > 60)
            {
                if (!_isSleeping)
                {
                    _isSleeping = true;
                    ChangePetState("sleep");
                    this.Top = SystemParameters.PrimaryScreenHeight - this.Height;
                }
                return;
            }
            else if (_isSleeping)
            {
                _isSleeping = false;
                ChangePetState("idle");
                await AutonomousChat("Eua quay lại rồi! Femirins vừa chợp mắt xíu uwu~");
                return;
            }

            Random rnd = new Random();
            int action = rnd.Next(1, 11);

            if (action <= 2)
            {
                int cpuMock = rnd.Next(15, 92);
                ChangePetState("talk");
                if (cpuMock > 80)
                    await AutonomousChat($"Eua ơi baka! Máy tính chạy nặng thế, CPU vọt lên {cpuMock}% rồi! Coi chừng nổ trạm Mobius đó koo~");
                else
                    await AutonomousChat($"Femirins vừa kiểm tra hệ thống: CPU đang chạy ổn định ở mức {cpuMock}%, mượt mà lắm uwu~");
            }
            else if (action > 2 && action <= 5)
            {
                ChangePetState("walk");
                double newLeft = rnd.Next(0, (int)(SystemParameters.PrimaryScreenWidth - this.Width));
                double newTop = rnd.Next(0, (int)(SystemParameters.PrimaryScreenHeight - this.Height));

                MovePetSmoothly(newLeft, newTop);
                await Task.Delay(2500);
                ChangePetState("idle");
            }
            else
            {
                await TriggerRandomChat(rnd);
            }
        }

        private void MovePetSmoothly(double targetX, double targetY)
        {
            double currentX = this.Left;
            if (double.IsNaN(currentX)) currentX = 0;

            ScaleTransform flipTransform = new ScaleTransform();
            if (targetX < currentX) flipTransform.ScaleX = 1;
            else flipTransform.ScaleX = -1;
            PetImage.RenderTransform = flipTransform;

            DoubleAnimation animX = new DoubleAnimation(targetX, TimeSpan.FromSeconds(2)) { EasingFunction = new CubicEase() { EasingMode = EasingMode.EaseOut } };
            DoubleAnimation animY = new DoubleAnimation(targetY, TimeSpan.FromSeconds(2)) { EasingFunction = new CubicEase() { EasingMode = EasingMode.EaseOut } };

            this.BeginAnimation(Window.LeftProperty, animX);
            this.BeginAnimation(Window.TopProperty, animY);
        }

        private async Task TriggerRandomChat(Random rnd)
        {
            string[] dialogues = {
                "Eua ơi, làm bài xong chưa? Cày game với Femirins đi uwu~",
                "Tiến sĩ Yssring đang chờ đợi, Eua đừng lười biếng nhé!",
                "Femirins thấy năng lượng Honkai ở đây hơi yếu nha...",
                "Eua code cái gì mà chăm chú thế? Cho Femirins xem với~"
            };
            await AutonomousChat(dialogues[rnd.Next(dialogues.Length)]);
        }

        private async Task AutonomousChat(string message)
        {
            ChatBubble.Text = message;
            ChatBubbleContainer.Visibility = Visibility.Visible;
            await Task.Delay(5000);
            if (InputContainer.Visibility == Visibility.Collapsed)
            {
                ChatBubbleContainer.Visibility = Visibility.Collapsed;
                ChangePetState("idle");
            }
        }

        private void ChangePetState(string stateName)
        {
            try
            {
                var image = new BitmapImage(new Uri($"pack://application:,,,/Assets/{stateName}.gif"));
                ImageBehavior.SetAnimatedSource(PetImage, image);
            }
            catch { }
        }

        private void ChatBubble_Click(object sender, MouseButtonEventArgs e)
        {
            e.Handled = true;

            if (ChatBubbleContainer.HorizontalAlignment == System.Windows.HorizontalAlignment.Center)
            { ChatBubbleContainer.HorizontalAlignment = System.Windows.HorizontalAlignment.Left; ChatBubbleContainer.Margin = new Thickness(10, 20, 0, 0); }
            else if (ChatBubbleContainer.HorizontalAlignment == System.Windows.HorizontalAlignment.Left)
            { ChatBubbleContainer.HorizontalAlignment = System.Windows.HorizontalAlignment.Right; ChatBubbleContainer.Margin = new Thickness(0, 20, 10, 0); }
            else
            { ChatBubbleContainer.HorizontalAlignment = System.Windows.HorizontalAlignment.Center; ChatBubbleContainer.Margin = new Thickness(20, 20, 20, 0); }
        }

        private void Window_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
        {
            if (e.ButtonState == MouseButtonState.Pressed)
            {
                double initialLeft = this.Left;
                double initialTop = this.Top;
                try { DragMove(); } catch { }
                if (this.Left == initialLeft && this.Top == initialTop) ToggleChatVisibility();
            }
        }

        private void ToggleChatVisibility()
        {
            if (ChatBubbleContainer.Visibility == Visibility.Visible)
            { ChatBubbleContainer.Visibility = Visibility.Collapsed; InputContainer.Visibility = Visibility.Collapsed; }
            else
            { ChatBubbleContainer.Visibility = Visibility.Visible; InputContainer.Visibility = Visibility.Visible; ChatInput.Focus(); }
        }

        private void Window_MouseRightButtonDown(object sender, MouseButtonEventArgs e)
        {
            GameMenuOverlay.Visibility = Visibility.Visible;
            ChatBubbleContainer.Visibility = Visibility.Collapsed;
            InputContainer.Visibility = Visibility.Collapsed;
        }

        private void BtnAdmin_Click(object sender, RoutedEventArgs e) { GameMenuOverlay.Visibility = Visibility.Collapsed; new Views.DashboardWindow().Show(); }
        private void BtnChat_Click(object sender, RoutedEventArgs e) { GameMenuOverlay.Visibility = Visibility.Collapsed; ToggleChatVisibility(); }
        private void BtnExit_Click(object sender, RoutedEventArgs e) { ShutdownApp(); }
        private void BtnCloseMenu_Click(object sender, RoutedEventArgs e) { GameMenuOverlay.Visibility = Visibility.Collapsed; }
    }
}