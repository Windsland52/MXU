import type { ProjectInterface } from '@/types/interface';

export interface LoadResult {
  interface: ProjectInterface;
  translations: Record<string, Record<string, string>>;
  basePath: string;
  isDebugMode: boolean;
}

// 检测是否在 Tauri 环境中
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

/**
 * 从指定路径加载 interface.json 文件
 */
async function loadInterfaceFromPath(interfacePath: string, _basePath: string): Promise<ProjectInterface> {
  let content: string;

  if (isTauri()) {
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    content = await readTextFile(interfacePath);
  } else {
    // 浏览器环境：使用 fetch
    const response = await fetch(interfacePath);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    content = await response.text();
  }

  const pi: ProjectInterface = JSON.parse(content);

  if (pi.interface_version !== 2) {
    throw new Error(`不支持的 interface 版本: ${pi.interface_version}，仅支持 version 2`);
  }

  return pi;
}

/**
 * 加载翻译文件
 */
async function loadTranslations(
  pi: ProjectInterface,
  basePath: string
): Promise<Record<string, Record<string, string>>> {
  const translations: Record<string, Record<string, string>> = {};

  if (!pi.languages) return translations;

  for (const [lang, relativePath] of Object.entries(pi.languages)) {
    try {
      const langPath = `${basePath}/${relativePath}`;
      let langContent: string;

      if (isTauri()) {
        const { readTextFile, exists } = await import('@tauri-apps/plugin-fs');
        if (await exists(langPath)) {
          langContent = await readTextFile(langPath);
          translations[lang] = JSON.parse(langContent);
        }
      } else {
        const response = await fetch(langPath);
        if (response.ok) {
          langContent = await response.text();
          translations[lang] = JSON.parse(langContent);
        }
      }
    } catch (err) {
      console.warn(`加载翻译文件失败 [${lang}]:`, err);
    }
  }

  return translations;
}

/**
 * 检查文件是否存在
 */
async function fileExists(path: string): Promise<boolean> {
  if (isTauri()) {
    const { exists } = await import('@tauri-apps/plugin-fs');
    return await exists(path);
  } else {
    try {
      // Vite 开发服务器可能不支持 HEAD 请求，使用 GET 并设置较短的超时
      const response = await fetch(path);
      // 检查返回的是否是 JSON（而不是 HTML fallback）
      const contentType = response.headers.get('content-type');
      return response.ok && (contentType?.includes('application/json') ?? false);
    } catch {
      return false;
    }
  }
}

/**
 * 自动加载 interface.json
 * 优先读取当前目录下的 interface.json，如果不存在则读取 test/interface.json（调试模式）
 */
export async function autoLoadInterface(): Promise<LoadResult> {
  if (isTauri()) {
    // Tauri 环境：使用相对路径
    const primaryPath = './interface.json';
    const debugPath = './test/interface.json';

    if (await fileExists(primaryPath)) {
      const pi = await loadInterfaceFromPath(primaryPath, '.');
      const translations = await loadTranslations(pi, '.');
      return { interface: pi, translations, basePath: '.', isDebugMode: false };
    }

    if (await fileExists(debugPath)) {
      const pi = await loadInterfaceFromPath(debugPath, './test');
      const translations = await loadTranslations(pi, './test');
      return { interface: pi, translations, basePath: './test', isDebugMode: true };
    }
  } else {
    // 浏览器环境：使用绝对路径（Vite public 目录）
    const primaryPath = '/interface.json';
    const debugPath = '/test/interface.json';

    if (await fileExists(primaryPath)) {
      const pi = await loadInterfaceFromPath(primaryPath, '');
      const translations = await loadTranslations(pi, '');
      return { interface: pi, translations, basePath: '', isDebugMode: false };
    }

    if (await fileExists(debugPath)) {
      const pi = await loadInterfaceFromPath(debugPath, '/test');
      const translations = await loadTranslations(pi, '/test');
      return { interface: pi, translations, basePath: '/test', isDebugMode: true };
    }
  }

  throw new Error('未找到 interface.json 文件，请确保项目根目录或 test 目录下存在 interface.json');
}
