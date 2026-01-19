/**
 * 平台检测工具
 * 用于识别当前运行的平台，以便在 UI 中隐藏不支持的功能
 */

export type Platform = 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'unknown';

/**
 * 检测当前运行平台
 */
export function detectPlatform(): Platform {
  // 优先检测 Tauri 的平台信息
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    const tauri = window.__TAURI__ as { os?: { platform?: () => string } };
    if (tauri.os?.platform) {
      try {
        const platform = tauri.os.platform();
        switch (platform) {
          case 'win32':
          case 'windows':
            return 'windows';
          case 'darwin':
          case 'macos':
            return 'macos';
          case 'linux':
            return 'linux';
          case 'android':
            return 'android';
          case 'ios':
            return 'ios';
        }
      } catch {
        // 忽略错误，使用 navigator 检测
      }
    }
  }

  // 使用 navigator.userAgent 作为备用检测
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    
    if (/android/.test(ua)) {
      return 'android';
    }
    if (/iphone|ipad|ipod/.test(ua)) {
      return 'ios';
    }
    if (/windows/.test(ua)) {
      return 'windows';
    }
    if (/macintosh|mac os x/.test(ua)) {
      return 'macos';
    }
    if (/linux/.test(ua)) {
      return 'linux';
    }
  }

  return 'unknown';
}

/**
 * 检测是否为移动平台（Android/iOS）
 */
export function isMobilePlatform(): boolean {
  const platform = detectPlatform();
  return platform === 'android' || platform === 'ios';
}

/**
 * 检测是否为桌面平台（Windows/macOS/Linux）
 */
export function isDesktopPlatform(): boolean {
  const platform = detectPlatform();
  return platform === 'windows' || platform === 'macos' || platform === 'linux';
}

/**
 * 检测是否支持 Win32 窗口控制器
 * 仅 Windows 平台支持
 */
export function supportsWin32Controller(): boolean {
  return detectPlatform() === 'windows';
}

/**
 * 检测是否支持 Gamepad 控制器
 * 仅桌面平台支持
 */
export function supportsGamepadController(): boolean {
  return isDesktopPlatform();
}

/**
 * 检测是否支持 PlayCover 控制器
 * 仅 macOS 平台支持
 */
export function supportsPlayCoverController(): boolean {
  return detectPlatform() === 'macos';
}
