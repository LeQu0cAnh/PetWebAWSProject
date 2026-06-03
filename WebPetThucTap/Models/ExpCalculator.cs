namespace WebPetThucTap.Models
{
    public static class ExpCalculator
    {
        // Đổi CurrentExp và NextExp trong Tuple trả về thành long.
        // Đổi tham số đầu vào totalExp thành long.
        public static (int Level, string Title, long CurrentExp, long NextExp) Calculate(long totalExp, ExpConfig config)
        {
            int level = 1; // Cấp độ vẫn giữ int vì không bao giờ vượt quá 2 tỷ

            // Các biến tính toán EXP chuyển hết sang long
            long expNeededForCurrentLevel = config.BaseExpNeeded;
            long accumulatedExp = 0;

            while (totalExp >= accumulatedExp + expNeededForCurrentLevel)
            {
                accumulatedExp += expNeededForCurrentLevel;
                level++;

                // Ép kiểu về (long) thay vì (int) để tránh tràn số sau khi nhân hệ số
                expNeededForCurrentLevel = (long)(expNeededForCurrentLevel * config.Multiplier);
            }

            // Số EXP dư ở cấp hiện tại cũng là một con số rất lớn nên dùng long
            long expIntoCurrentLevel = totalExp - accumulatedExp;

            string[] titles = config.TitlesString.Split(',');

            // Các biến dùng làm index mảng và phép toán nhỏ vẫn dùng int
            int titleIndex = (level - 1) / config.LevelsPerTitle;
            int subLevel = (level - 1) % config.LevelsPerTitle;

            if (titleIndex >= titles.Length)
            {
                titleIndex = titles.Length - 1;
                subLevel = level - (titleIndex * config.LevelsPerTitle) - 1;
            }

            string currentTitle = titles[titleIndex].Trim();
            if (subLevel > 0)
            {
                currentTitle += $" {subLevel}";
            }

            // Trả về tuple đã cập nhật kiểu dữ liệu
            return (level, currentTitle, expIntoCurrentLevel, expNeededForCurrentLevel);
        }
    }
}