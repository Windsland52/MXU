import type { ProjectInterface } from '@/types/interface';
import { loggers } from '@/utils/logger';

const log = loggers.app;

export interface LoadResult {
  interface: ProjectInterface;
  translations: Record<string, Record<string, string>>;
  basePath: string;
  isDebugMode: boolean;
}

/**
 * 检查文件是否存在（HTTP 方式）
 */
async function httpFileExists(path: string): Promise<boolean> {
  try {
    const response = await fetch(path);
    const contentType = response.headers.get('content-type');
    return response.ok && (contentType?.includes('application/json') ?? false);
  } catch {
    return false;
  }
}

/**
 * 从 HTTP 路径加载 interface.json
 */
async function loadInterfaceFromHttp(path: string): Promise<ProjectInterface> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const content = await response.text();
  const pi: ProjectInterface = JSON.parse(content);

  if (pi.interface_version !== 2) {
    throw new Error(`不支持的 interface 版本: ${pi.interface_version}，仅支持 version 2`);
  }

  return pi;
}

/**
 * 从 HTTP 路径加载翻译文件
 */
async function loadTranslationsFromHttp(
  pi: ProjectInterface,
  basePath: string
): Promise<Record<string, Record<string, string>>> {
  const translations: Record<string, Record<string, string>> = {};

  if (!pi.languages) return translations;

  for (const [lang, relativePath] of Object.entries(pi.languages)) {
    try {
      const langPath = basePath ? `${basePath}/${relativePath}` : `/${relativePath}`;
      const response = await fetch(langPath);
      if (response.ok) {
        const langContent = await response.text();
        translations[lang] = JSON.parse(langContent);
      }
    } catch (err) {
      log.warn(`加载翻译文件失败 [${lang}]:`, err);
    }
  }

  return translations;
}

/**
 * 自动加载 interface.json
 * 优先读取当前目录下的 interface.json，如果不存在则读取 test/interface.json（调试模式）
 */
export async function autoLoadInterface(): Promise<LoadResult> {
  // 统一使用 HTTP 方式加载（Tauri 和浏览器都支持）
  const primaryPath = '/interface.json';
  const debugPath = '/test/interface.json';

  if (await httpFileExists(primaryPath)) {
    const pi = await loadInterfaceFromHttp(primaryPath);
    const translations = await loadTranslationsFromHttp(pi, '');
    return { interface: pi, translations, basePath: '', isDebugMode: false };
  }

  if (await httpFileExists(debugPath)) {
    log.info('使用调试模式加载 interface.json');
    const pi = await loadInterfaceFromHttp(debugPath);
    const translations = await loadTranslationsFromHttp(pi, '/test');
    return { interface: pi, translations, basePath: '/test', isDebugMode: true };
  }

  throw new Error('未找到 interface.json 文件，请确保项目根目录或 test 目录下存在 interface.json');
}
