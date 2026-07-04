using System.Windows;
using System.Windows.Controls;
using ZME_CloudPet.Models;
using ZME_CloudPet.Services;

namespace ZME_CloudPet.Views
{
    public partial class DashboardWindow : Window
    {
        private readonly DynamoDbService _dbService;

        public DashboardWindow()
        {
            InitializeComponent();
            _dbService = new DynamoDbService();
            LoadDataGrid(); // Tự động load dữ liệu trên Cloud xuống bảng khi vừa mở cửa sổ lên
        }

        private async void LoadDataGrid()
        {
            var apps = await _dbService.GetAllAppsAsync();
            DgApps.ItemsSource = apps;
        }

        private void BtnRefresh_Click(object sender, RoutedEventArgs e) => LoadDataGrid();

        // SỰ KIỆN CLICK NÚT LƯU (TỰ ĐỘNG PHÂN BIỆT THÊM MỚI HOẶC ĐÈ LÊN SỬA)
        private async void BtnSave_Click(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrEmpty(TxtKeyword.Text) || string.IsNullOrEmpty(TxtPath.Text))
            {
                System.Windows.MessageBox.Show("Đại vui lòng nhập đủ Từ khóa và Đường dẫn nhé!", "Thông báo Admin");
                return;
            }

            var app = new AppConfig
            {
                Keyword = TxtKeyword.Text.ToLower().Trim(),
                AppPath = TxtPath.Text.Trim(),
                AppType = (CbType.SelectedItem as ComboBoxItem)?.Content.ToString()
            };

            bool success = await _dbService.SaveAppAsync(app);
            if (success)
            {
                System.Windows.MessageBox.Show($"Đã đồng bộ thành công lệnh '{app.Keyword}' lên Cloud DynamoDB!", "Thành công");
                LoadDataGrid();
                ClearInput();
            }
            else { System.Windows.MessageBox.Show("Lỗi kết nối hoặc phân quyền AWS!"); }
        }

        // SỰ KIỆN CLICK NÚT XÓA
        private async void BtnDelete_Click(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrEmpty(TxtKeyword.Text)) return;

            string keyword = TxtKeyword.Text.Trim();
            var res = System.Windows.MessageBox.Show($"Đại có chắc muốn xóa lệnh '{keyword}' khỏi bộ não trên mây không?", "Xác nhận xóa", MessageBoxButton.YesNo);
            if (res == MessageBoxResult.Yes)
            {
                bool success = await _dbService.DeleteAppAsync(keyword);
                if (success)
                {
                    System.Windows.MessageBox.Show("Đã bốc bứng lệnh ra khỏi hệ thống!", "Đã xóa");
                    LoadDataGrid();
                    ClearInput();
                }
            }
        }

        // KHI CLICK CHỌN 1 DÒNG TRÊN BẢNG -> TỰ ĐỘNG ĐIỀN CHỮ XUỐNG CÁC Ô NHẬP ĐỂ SỬA CHO LẸ
        private void DgApps_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (DgApps.SelectedItem is AppConfig selectedApp)
            {
                TxtKeyword.Text = selectedApp.Keyword;
                TxtPath.Text = selectedApp.AppPath;
                CbType.SelectedIndex = selectedApp.AppType == "App" ? 1 : 0;
            }
        }

        private void ClearInput()
        {
            TxtKeyword.Clear();
            TxtPath.Clear();
            CbType.SelectedIndex = 0;
        }
    }
}