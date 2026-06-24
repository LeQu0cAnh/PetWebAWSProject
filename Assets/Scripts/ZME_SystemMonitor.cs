using UnityEngine;
using System.Runtime.InteropServices;
using System.Collections;

public class ZME_SystemMonitor : MonoBehaviour
{
    public static ZME_SystemMonitor Instance;

    // ==========================================
    // 1. CẤU TRÚC KERNEL32 ĐỂ LẤY RAM THỰC TẾ
    // ==========================================
    [StructLayout(LayoutKind.Sequential)]
    public struct MEMORYSTATUSEX
    {
        public uint dwLength;
        public uint dwMemoryLoad;
        public ulong ullTotalPhys;
        public ulong ullAvailPhys;
        public ulong ullTotalPageFile;
        public ulong ullAvailPageFile;
        public ulong ullTotalVirtual;
        public ulong ullAvailVirtual;
        public ulong ullAvailExtendedVirtual;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    static extern bool GlobalMemoryStatusEx(ref MEMORYSTATUSEX lpBuffer);

    // ==========================================
    // 2. CẤU TRÚC KERNEL32 ĐỂ LẤY CPU THỰC TẾ
    // ==========================================
    [StructLayout(LayoutKind.Sequential)]
    public struct FILETIME
    {
        public uint dwLowDateTime;
        public uint dwHighDateTime;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool GetSystemTimes(out FILETIME lpIdleTime, out FILETIME lpKernelTime, out FILETIME lpUserTime);

    // ==========================================

    private int currentCpuLoad = 0;
    private int currentFreeRam = 0;

    void Awake()
    {
        Instance = this;
    }

    void Start()
    {
        StartCoroutine(HardwareHeartbeat());
    }

    // Hàm chuyển đổi thời gian Kernel
    private ulong GetTime(FILETIME ft)
    {
        return ((ulong)ft.dwHighDateTime << 32) | ft.dwLowDateTime;
    }

    private IEnumerator HardwareHeartbeat()
    {
        FILETIME preIdleTime, preKernelTime, preUserTime;
        GetSystemTimes(out preIdleTime, out preKernelTime, out preUserTime);

        while (true)
        {
            // Nhịp tim đo đạc mỗi 1 giây
            yield return new WaitForSeconds(1f);

            // --- TÍNH TOÁN CPU ---
            FILETIME idleTime, kernelTime, userTime;
            GetSystemTimes(out idleTime, out kernelTime, out userTime);

            ulong uOldIdle = GetTime(preIdleTime);
            ulong uOldKernel = GetTime(preKernelTime);
            ulong uOldUser = GetTime(preUserTime);

            ulong uNewIdle = GetTime(idleTime);
            ulong uNewKernel = GetTime(kernelTime);
            ulong uNewUser = GetTime(userTime);

            ulong idleDiff = uNewIdle - uOldIdle;
            ulong sysDiff = (uNewKernel + uNewUser) - (uOldKernel + uOldUser);

            if (sysDiff > 0)
            {
                currentCpuLoad = (int)((sysDiff - idleDiff) * 100.0 / sysDiff);
            }

            preIdleTime = idleTime;
            preKernelTime = kernelTime;
            preUserTime = userTime;

            // --- TÍNH TOÁN RAM ---
            MEMORYSTATUSEX memStatus = new MEMORYSTATUSEX();
            memStatus.dwLength = (uint)Marshal.SizeOf(typeof(MEMORYSTATUSEX));
            if (GlobalMemoryStatusEx(ref memStatus))
            {
                // Chuyển từ Byte sang Megabyte
                currentFreeRam = (int)(memStatus.ullAvailPhys / (1024 * 1024));
            }
        }
    }

    public string GetSystemStats()
    {
        int totalRam = SystemInfo.systemMemorySize;
        return $"Tài nguyên không gian mạng hiện tại:\n> CPU Load: {currentCpuLoad}%\n> Free RAM: {currentFreeRam} MB / {totalRam} MB\n\nMọi thông số vẫn đang nằm trong tầm kiểm soát thưa Kỹ sư trưởng EUA!";
    }
}