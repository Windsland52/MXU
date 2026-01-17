import type { MxuConfig } from '@/types/config';
import { defaultConfig } from '@/types/config';

const CONFIG_FILE_NAME = 'mxu.json';

// 检测是否在 Tauri 环境中
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

/**
 * 获取配置文件路径
 */
function getConfigPath(basePath: string): string {
  if (basePath === '' || basePath === '.') {
    return `./${CONFIG_FILE_NAME}`;
  }
  return `${basePath}/${CONFIG_FILE_NAME}`;
}

/**
 * 从文件加载配置
 */
export async function loadConfig(basePath: string): Promise<MxuConfig> {
  const configPath = getConfigPath(basePath);

  if (isTauri()) {
    const { readTextFile, exists } = await import('@tauri-apps/plugin-fs');
    
    if (await exists(configPath)) {
      try {
        const content = await readTextFile(configPath);
        const config = JSON.parse(content) as MxuConfig;
        return config;
      } catch (err) {
        console.warn('读取配置文件失败，使用默认配置:', err);
        return defaultConfig;
      }
    }
  } else {
    // 浏览器环境：尝试从 public 目录加载
    try {
      const fetchPath = basePath === '' ? `/${CONFIG_FILE_NAME}` : `${basePath}/${CONFIG_FILE_NAME}`;
      const response = await fetch(fetchPath);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const config = await response.json() as MxuConfig;
          return config;
        }
      }
    } catch {
      // 浏览器环境加载失败是正常的，使用默认配置
    }
  }

  return defaultConfig;
}

/**
 * 保存配置到文件
 */
export async function saveConfig(basePath: string, config: MxuConfig): Promise<boolean> {
  if (!isTauri()) {
    // 浏览器环境不支持保存文件，使用 localStorage 作为后备
    try {
      localStorage.setItem('mxu-config', JSON.stringify(config));
      return true;
    } catch {
      return false;
    }
  }

  const configPath = getConfigPath(basePath);

  try {
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    const content = JSON.stringify(config, null, 2);
    await writeTextFile(configPath, content);
    return true;
  } catch (err) {
    console.error('保存配置文件失败:', err);
    return false;
  }
}

/**
 * 浏览器环境下从 localStorage 加载配置
 */
export function loadConfigFromStorage(): MxuConfig | null {
  if (isTauri()) return null;
  
  try {
    const stored = localStorage.getItem('mxu-config');
    if (stored) {
      return JSON.parse(stored) as MxuConfig;
    }
  } catch {
    // ignore
  }
  return null;
}
