using UnityEngine;
using System.Collections.Generic;

public class ZME_Scheduler : MonoBehaviour
{
    public static ZME_Scheduler Instance;

    public class ScheduledTask
    {
        public string taskName;
        public float remainingTime;
    }

    // Danh sách các công việc đang đếm ngược
    public List<ScheduledTask> activeTasks = new List<ScheduledTask>();

    void Awake() { Instance = this; }

    void Update()
    {
        // Quét ngược danh sách và giảm thời gian
        for (int i = activeTasks.Count - 1; i >= 0; i--)
        {
            activeTasks[i].remainingTime -= Time.deltaTime;

            if (activeTasks[i].remainingTime <= 0)
            {
                TriggerAlarm(activeTasks[i].taskName);
                activeTasks.RemoveAt(i); // Xong thì xóa khỏi danh sách
            }
        }
    }

    public void ScheduleTask(string taskName, float seconds)
    {
        activeTasks.Add(new ScheduledTask { taskName = taskName, remainingTime = seconds });
    }

    private void TriggerAlarm(string taskName)
    {
        if (ZME_UIManager.Instance != null)
        {
            string alertMsg = $"[BÁO ĐỘNG HỆ THỐNG] ⏰ Người dùng ơi, đã đến lúc thực hiện: {taskName.ToUpper()}!";
            ZME_UIManager.Instance.UpdateChat($"[Aria Eumi]: {alertMsg}");
        }
    }
}