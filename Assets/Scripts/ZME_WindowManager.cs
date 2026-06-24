using System;
using System.Runtime.InteropServices;
using UnityEngine;

public class ZME_WindowManager : MonoBehaviour
{
    [DllImport("user32.dll")] private static extern IntPtr GetActiveWindow();
    [DllImport("user32.dll")] private static extern int SetWindowLong(IntPtr hWnd, int nIndex, uint dwNewLong);
    [DllImport("user32.dll")] private static extern uint GetWindowLong(IntPtr hWnd, int nIndex);
    [DllImport("user32.dll")] private static extern int SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    [DllImport("Dwmapi.dll")] private static extern uint DwmExtendFrameIntoClientArea(IntPtr hWnd, ref MARGINS margins);

    private struct MARGINS { public int cxLeftWidth, cxRightWidth, cyTopHeight, cyBottomHeight; }
    private const int GWL_EXSTYLE = -20;
    private const uint WS_EX_LAYERED = 0x00080000;
    private const uint WS_EX_TRANSPARENT = 0x00000020;
    private const uint WS_EX_TOPMOST = 0x00000008;
    private IntPtr hWnd;

    public static ZME_WindowManager Instance;

    // CẦU DAO CHỐNG SPAM LỆNH (Tuyệt đối không được xóa)
    private bool isCurrentlyTransparent = false;
    private bool isFirstFrame = true;

    void Awake() { Instance = this; }

    void Start()
    {
        Application.runInBackground = true;
#if !UNITY_EDITOR
        hWnd = GetActiveWindow();
        MARGINS margins = new MARGINS { cxLeftWidth = -1 };
        DwmExtendFrameIntoClientArea(hWnd, ref margins);
        SetWindowLong(hWnd, GWL_EXSTYLE, WS_EX_LAYERED | WS_EX_TOPMOST);
        SetWindowPos(hWnd, new IntPtr(-1), 0, 0, 0, 0, 0x0001 | 0x0002);
#endif
    }

    void Update()
    {
#if !UNITY_EDITOR
        bool isMouseOverSomething = false;

        // 1. Quét chạm vào Aria 3D
        Ray ray = Camera.main.ScreenPointToRay(Input.mousePosition);
        if (Physics.Raycast(ray, out RaycastHit hit)) {
            isMouseOverSomething = true;
        }

        // 2. Quét chạm vào bảng Hologram 2D
        if (ZME_UIManager.Instance != null && ZME_UIManager.Instance.IsPointerOverUI()) {
            isMouseOverSomething = true;
        }

        bool shouldBeTransparent = !isMouseOverSomething;

        // CHỈ GỌI LỆNH XUỐNG WINDOWS KHI TRẠNG THÁI THỰC SỰ THAY ĐỔI (Chống sập màn hình đen)
        if (shouldBeTransparent != isCurrentlyTransparent || isFirstFrame)
        {
            uint currentExStyle = GetWindowLong(hWnd, GWL_EXSTYLE);
            
            if (shouldBeTransparent) {
                SetWindowLong(hWnd, GWL_EXSTYLE, currentExStyle | WS_EX_TRANSPARENT);
            } else {
                SetWindowLong(hWnd, GWL_EXSTYLE, currentExStyle & ~WS_EX_TRANSPARENT);
            }
            
            isCurrentlyTransparent = shouldBeTransparent;
            isFirstFrame = false;
        }
#endif
    }
}