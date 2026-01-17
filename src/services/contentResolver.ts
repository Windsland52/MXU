/**
 * 内容解析服务
 * 根据 ProjectInterface V2 协议，处理以下类型的内容：
 * 1. 国际化文本（以 $ 开头）
 * 2. 文件路径（相对路径）
 * 3. URL（http:// 或 https://）
 * 4. 直接文本
 */

// 检测是否在 Tauri 环境中
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

/**
 * 判断内容是否为 URL
 */
function isUrl(content: string): boolean {
  return content.startsWith('http://') || content.startsWith('https://');
}

/**
 * 判断内容是否为文件路径（简单判断：包含文件扩展名或以 ./ 开头）
 */
function isFilePath(content: string): boolean {
  if (isUrl(content)) return false;
  // 检查是否以 ./ 或 ../ 开头，或者包含常见文件扩展名
  return (
    content.startsWith('./') ||
    content.startsWith('../') ||
    /\.(md|txt|json|html)$/i.test(content)
  );
}

/**
 * 从文件路径加载内容
 */
async function loadFromFile(filePath: string, basePath: string): Promise<string> {
  // 构建完整路径
  const fullPath = filePath.startsWith('./')
    ? `${basePath}/${filePath.slice(2)}`
    : filePath.startsWith('../')
      ? `${basePath}/${filePath}`
      : `${basePath}/${filePath}`;

  if (isTauri()) {
    const { readTextFile, exists } = await import('@tauri-apps/plugin-fs');
    if (await exists(fullPath)) {
      return await readTextFile(fullPath);
    }
    throw new Error(`文件不存在: ${fullPath}`);
  } else {
    const response = await fetch(fullPath);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  }
}

/**
 * 从 URL 加载内容
 */
async function loadFromUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return await response.text();
}

export interface ResolveOptions {
  /** 翻译映射表 */
  translations?: Record<string, string>;
  /** 资源基础路径 */
  basePath?: string;
  /** 是否加载外部内容（文件/URL），默认 true */
  loadExternal?: boolean;
}

/**
 * 解析国际化文本
 * 如果文本以 $ 开头，则从翻译表中查找对应的值
 */
export function resolveI18nText(
  text: string | undefined,
  translations?: Record<string, string>
): string {
  if (!text) return '';
  if (!text.startsWith('$')) return text;
  
  const key = text.slice(1);
  return translations?.[key] || key;
}

/**
 * 解析内容（同步版本，仅处理国际化）
 * 用于不需要加载外部内容的场景
 */
export function resolveContentSync(
  content: string | undefined,
  options: ResolveOptions = {}
): string {
  if (!content) return '';
  
  // 先处理国际化
  const resolved = resolveI18nText(content, options.translations);
  
  return resolved;
}

/**
 * 解析内容（异步版本，完整处理）
 * 支持国际化、文件路径、URL
 */
export async function resolveContent(
  content: string | undefined,
  options: ResolveOptions = {}
): Promise<string> {
  if (!content) return '';
  
  const { translations, basePath = '.', loadExternal = true } = options;
  
  // 先处理国际化
  let resolved = resolveI18nText(content, translations);
  
  if (!loadExternal) return resolved;
  
  try {
    // 检查是否为 URL
    if (isUrl(resolved)) {
      resolved = await loadFromUrl(resolved);
    }
    // 检查是否为文件路径
    else if (isFilePath(resolved)) {
      resolved = await loadFromFile(resolved, basePath);
    }
  } catch (err) {
    console.warn(`加载内容失败 [${resolved}]:`, err);
    // 加载失败时返回原始文本
  }
  
  return resolved;
}

/**
 * 解析图标路径
 * 返回可用于 img src 的路径
 */
export function resolveIconPath(
  iconPath: string | undefined,
  basePath: string,
  translations?: Record<string, string>
): string | undefined {
  if (!iconPath) return undefined;
  
  // 先处理国际化
  let resolved = resolveI18nText(iconPath, translations);
  
  if (!resolved) return undefined;
  
  // 如果是 URL 直接返回
  if (isUrl(resolved)) return resolved;
  
  // 构建完整路径
  if (resolved.startsWith('./')) {
    resolved = `${basePath}/${resolved.slice(2)}`;
  } else if (!resolved.startsWith('/') && !resolved.startsWith('http')) {
    resolved = `${basePath}/${resolved}`;
  }
  
  return resolved;
}

/**
 * 简单的 Markdown 转 HTML（仅支持基础语法）
 * 支持：标题、粗体、斜体、链接、代码块、列表
 */
export function simpleMarkdownToHtml(markdown: string): string {
  let html = markdown
    // 转义 HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // 代码块
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.slice(3, -3).replace(/^\w*\n/, '');
      return `<pre class="bg-bg-tertiary rounded p-2 my-2 overflow-x-auto text-sm"><code>${code}</code></pre>`;
    })
    // 行内代码
    .replace(/`([^`]+)`/g, '<code class="bg-bg-tertiary px-1 rounded text-sm">$1</code>')
    // 标题
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
    // 粗体和斜体
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">$1</a>')
    // 无序列表
    .replace(/^[\-\*] (.+)$/gm, '<li class="ml-4">$1</li>')
    // 有序列表
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // 换行
    .replace(/\n\n/g, '</p><p class="my-2">')
    .replace(/\n/g, '<br/>');
  
  // 包装段落
  if (!html.startsWith('<')) {
    html = `<p class="my-2">${html}</p>`;
  }
  
  return html;
}
