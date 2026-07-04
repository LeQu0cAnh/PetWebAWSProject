using System;
using System.Runtime.InteropServices;
using System.Collections;
using UnityEngine;

public class ZME_WindowManager : MonoBehaviour
{
    [DllImport("user32.dll")] private static extern IntPtr GetActiveWindow();
    [DllImport("user32.dll")] private static extern int SetWindowLong(IntPtr hWnd, int nIndex, uint dwNewLong);
    [DllImport("user32.dll")] private static extern int SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    [DllImport("Dwmapi.dll")] private static extern uint DwmExtendFrameIntoClientArea(IntPtr hWnd, ref MARGINS margins);
    [DllImport("user32.dll")] private static extern int SetLayeredWindowAttributes(IntPtr hWnd, uint crKey, byte bAlpha, uint dwFlags);

    private struct MARGINS { public int cxLeftWidth, cxRightWidth, cyTopHeight, cyBottomHeight; }

    // Cờ xử lý Layer
    private const int GWL_EXSTYLE = -20;
    private const uint WS_EX_LAYERED = 0x00080000;
    private const uint WS_EX_TOPMOST = 0x00000008;

    // THÊM: Cờ xử lý Viền Cửa Sổ (Chém Title Bar)
    private const int GWL_STYLE = -16;
    private const uint WS_POPUP = 0x80000000;
    private const uint WS_VISIBLE = 0x10000000;

    private const uint LWA_COLORKEY = 0x00000001;

    public static ZME_WindowManager Instance;

    void Awake() { Instance = this; }

    void Start()
    {
        Application.runInBackground = true;
#if !UNITY_EDITOR
        StartCoroutine(MakeWindowTransparent());
#endif
    }

#if !UNITY_EDITOR
    private IEnumerator MakeWindowTransparent()
    {
        Screen.SetResolution(Display.main.systemWidth, Display.main.systemHeight, FullScreenMode.Windowed);
        
        yield return new WaitForEndOfFrame();
        yield return new WaitForEndOfFrame();

        IntPtr hWnd = GetActiveWindow();
        
        // 1. LỘT BỎ THANH TIÊU ĐỀ VÀ VIỀN CỬA SỔ
        SetWindowLong(hWnd, GWL_STYLE, WS_POPUP | WS_VISIBLE);

        // 2. ÉP NẰM TRÊN CÙNG
        SetWindowLong(hWnd, GWL_EXSTYLE, WS_EX_LAYERED | WS_EX_TOPMOST);
        
        // 3. ĐỤC LỖ MÀU ĐEN (0x000000)
        SetLayeredWindowAttributes(hWnd, 0x000000, 0, LWA_COLORKEY);

        MARGINS margins = new MARGINS { cxLeftWidth = -1 };
        DwmExtendFrameIntoClientArea(hWnd, ref margins);
        
        // Cập nhật lại khung frame sau khi lột viền (Thêm cờ 0x0020 - SWP_FRAMECHANGED)
        SetWindowPos(hWnd, new IntPtr(-1), 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0020); 
    }
#endif
}