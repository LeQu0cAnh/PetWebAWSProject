using UnityEngine;
using System.Runtime.InteropServices;
using System.Collections;

public class ZME_SystemMonitor : MonoBehaviour
{
    public static ZME_SystemMonitor Instance;

    [StructLayout(LayoutKind.Sequential)]
    public struct MEMORYSTATUSEX
    {
        public uint dwLength; public uint dwMemoryLoad;
        public ulong ullTotalPhys; public ulong ullAvailPhys;
        public ulong ullTotalPageFile; public ulong ullAvailPageFile;
        public ulong ullTotalVirtual; public ulong ullAvailVirtual;
        public ulong ullAvailExtendedVirtual;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    static extern bool GlobalMemoryStatusEx(ref MEMORYSTATUSEX lpBuffer);

    [StructLayout(LayoutKind.Sequential)]
    public struct FILETIME { public uint dwLowDateTime; public uint dwHighDateTime; }

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool GetSystemTimes(out FILETIME lpIdleTime, out FILETIME lpKernelTime, out FILETIME lpUserTime);

    private int currentCpuLoad = 0;
    private int currentFreeRam = 0;

    void Awake() { Instance = this; }
    void Start() { StartCoroutine(HardwareHeartbeat()); }

    private ulong GetTime(FILETIME ft) { return ((ulong)ft.dwHighDateTime << 32) | ft.dwLowDateTime; }

    private IEnumerator HardwareHeartbeat()
    {
        FILETIME preIdleTime, preKernelTime, preUserTime;
        GetSystemTimes(out preIdleTime, out preKernelTime, out preUserTime);

        while (true)
        {
            yield return new WaitForSeconds(1f);

            FILETIME idleTime, kernelTime, userTime;
            GetSystemTimes(out idleTime, out kernelTime, out userTime);

            ulong uOldIdle = GetTime(preIdleTime), uOldKernel = GetTime(preKernelTime), uOldUser = GetTime(preUserTime);
            ulong uNewIdle = GetTime(idleTime), uNewKernel = GetTime(kernelTime), uNewUser = GetTime(userTime);

            ulong idleDiff = uNewIdle - uOldIdle;
            ulong sysDiff = (uNewKernel + uNewUser) - (uOldKernel + uOldUser);

            if (sysDiff > 0) currentCpuLoad = (int)((sysDiff - idleDiff) * 100.0 / sysDiff);

            preIdleTime = idleTime; preKernelTime = kernelTime; preUserTime = userTime;

            MEMORYSTATUSEX memStatus = new MEMORYSTATUSEX();
            memStatus.dwLength = (uint)Marshal.SizeOf(typeof(MEMORYSTATUSEX));
            if (GlobalMemoryStatusEx(ref memStatus))
            {
                currentFreeRam = (int)(memStatus.ullAvailPhys / (1024 * 1024));
            }

            // [MẠCH DẪN MỚI]: Bơm dữ liệu lên bảng Monitor HUD
            int totalRam = (int)(SystemInfo.systemMemorySize);
            if (ZME_UIManager.Instance != null && ZME_UIManager.Instance.IsMonitorOpen)
            {
                ZME_UIManager.Instance.UpdateMonitorHUD(currentCpuLoad, currentFreeRam, totalRam);
            }
        }
    }

    public string GetSystemStats()
    {
        int totalRam = SystemInfo.systemMemorySize;
        return $"[BÁO CÁO TÀI NGUYÊN HỆ THỐNG]\n> Tải trọng CPU: {currentCpuLoad}%\n> Bộ nhớ RAM khả dụng: {currentFreeRam} MB / {totalRam} MB\n\n> Trạng thái: Ổn định.";
    }
}