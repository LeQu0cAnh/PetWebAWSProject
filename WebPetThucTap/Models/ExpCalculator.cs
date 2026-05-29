namespace WebPetThucTap.Models
{
    public static class ExpCalculator
    {
        public static (int Level, string Title, int CurrentExp, int NextExp) Calculate(int totalExp, ExpConfig config)
        {
            int level = 1;
            int expNeededForCurrentLevel = config.BaseExpNeeded;
            int accumulatedExp = 0;

            while (totalExp >= accumulatedExp + expNeededForCurrentLevel)
            {
                accumulatedExp += expNeededForCurrentLevel;
                level++;
                expNeededForCurrentLevel = (int)(expNeededForCurrentLevel * config.Multiplier);
            }

            // Tính số EXP lẻ đang có trong cấp độ hiện tại
            int expIntoCurrentLevel = totalExp - accumulatedExp;

            string[] titles = config.TitlesString.Split(',');
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

            // Trả về thêm CurrentExp và NextExp để làm thanh Progress Bar
            return (level, currentTitle, expIntoCurrentLevel, expNeededForCurrentLevel);
        }
    }
}