import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Globe, 
  Palette, 
  Github,
  Mail,
  FileText,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { setLanguage as setI18nLanguage } from '@/i18n';
import { resolveContent, resolveIconPath, simpleMarkdownToHtml } from '@/services/contentResolver';
import clsx from 'clsx';

interface ResolvedContent {
  description: string;
  license: string;
  contact: string;
  iconPath: string | undefined;
}

export function SettingsPage() {
  const { t } = useTranslation();
  const { 
    theme, 
    setTheme, 
    language, 
    setLanguage,
    setCurrentPage,
    projectInterface,
    interfaceTranslations,
    basePath,
    resolveI18nText,
  } = useAppStore();

  const [resolvedContent, setResolvedContent] = useState<ResolvedContent>({
    description: '',
    license: '',
    contact: '',
    iconPath: undefined,
  });
  const [isLoading, setIsLoading] = useState(true);

  const langKey = language === 'zh-CN' ? 'zh_cn' : 'en_us';
  const translations = interfaceTranslations[langKey];

  // 解析内容（支持文件路径、URL、国际化）
  useEffect(() => {
    if (!projectInterface) return;

    const loadContent = async () => {
      setIsLoading(true);
      
      const options = { translations, basePath };
      
      const [description, license, contact] = await Promise.all([
        resolveContent(projectInterface.description, options),
        resolveContent(projectInterface.license, options),
        resolveContent(projectInterface.contact, options),
      ]);
      
      const iconPath = resolveIconPath(projectInterface.icon, basePath, translations);
      
      setResolvedContent({ description, license, contact, iconPath });
      setIsLoading(false);
    };

    loadContent();
  }, [projectInterface, langKey, basePath, translations]);

  const handleLanguageChange = (lang: 'zh-CN' | 'en-US') => {
    setLanguage(lang);
    setI18nLanguage(lang);
  };

  const projectName =
    resolveI18nText(projectInterface?.label, langKey) ||
    projectInterface?.name ||
    'MXU';
  const version = projectInterface?.version || '0.1.0';
  const github = projectInterface?.github;

  // 渲染 Markdown 内容
  const renderMarkdown = (content: string) => {
    if (!content) return null;
    return (
      <div 
        className="text-sm text-text-secondary prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(content) }}
      />
    );
  };

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      {/* 顶部导航 */}
      <div className="flex items-center gap-3 px-4 py-3 bg-bg-secondary border-b border-border">
        <button
          onClick={() => setCurrentPage('main')}
          className="p-2 rounded-lg hover:bg-bg-hover transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <h1 className="text-lg font-semibold text-text-primary">
          {t('settings.title')}
        </h1>
      </div>

      {/* 设置内容 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-8">
          {/* 外观设置 */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              {t('settings.appearance')}
            </h2>
            
            {/* 语言 */}
            <div className="bg-bg-secondary rounded-xl p-4 border border-border">
              <div className="flex items-center gap-3 mb-3">
                <Globe className="w-5 h-5 text-accent" />
                <span className="font-medium text-text-primary">{t('settings.language')}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleLanguageChange('zh-CN')}
                  className={clsx(
                    'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    language === 'zh-CN'
                      ? 'bg-accent text-white'
                      : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'
                  )}
                >
                  中文
                </button>
                <button
                  onClick={() => handleLanguageChange('en-US')}
                  className={clsx(
                    'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    language === 'en-US'
                      ? 'bg-accent text-white'
                      : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'
                  )}
                >
                  English
                </button>
              </div>
            </div>

            {/* 主题 */}
            <div className="bg-bg-secondary rounded-xl p-4 border border-border">
              <div className="flex items-center gap-3 mb-3">
                <Palette className="w-5 h-5 text-accent" />
                <span className="font-medium text-text-primary">{t('settings.theme')}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={clsx(
                    'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    theme === 'light'
                      ? 'bg-accent text-white'
                      : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'
                  )}
                >
                  {t('settings.themeLight')}
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={clsx(
                    'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    theme === 'dark'
                      ? 'bg-accent text-white'
                      : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'
                  )}
                >
                  {t('settings.themeDark')}
                </button>
              </div>
            </div>
          </section>

          {/* 关于 */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              {t('about.title')}
            </h2>
            
            <div className="bg-bg-secondary rounded-xl p-6 border border-border">
              {/* Logo 和名称 */}
              <div className="text-center mb-6">
                {resolvedContent.iconPath ? (
                  <img 
                    src={resolvedContent.iconPath}
                    alt={projectName}
                    className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-lg object-contain"
                    onError={(e) => {
                      // 图标加载失败时显示默认图标
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={clsx(
                  "w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-lg",
                  resolvedContent.iconPath && "hidden"
                )}>
                  <span className="text-3xl font-bold text-white">
                    {projectName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-text-primary">{projectName}</h3>
                <p className="text-sm text-text-secondary mt-1">
                  {t('about.version')}: {version}
                </p>
              </div>

              {/* 内容加载中 */}
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-accent" />
                </div>
              ) : (
                <>
                  {/* 描述 */}
                  {resolvedContent.description && (
                    <div className="mb-6 text-center">
                      {renderMarkdown(resolvedContent.description)}
                    </div>
                  )}

                  {/* 信息列表 */}
                  <div className="space-y-2">
                    {/* 许可证 */}
                    {resolvedContent.license && (
                      <div className="px-4 py-3 rounded-lg bg-bg-tertiary">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="w-5 h-5 text-text-muted flex-shrink-0" />
                          <span className="text-sm font-medium text-text-primary">
                            {t('about.license')}
                          </span>
                        </div>
                        <div className="ml-8">
                          {renderMarkdown(resolvedContent.license)}
                        </div>
                      </div>
                    )}

                    {/* 联系方式 */}
                    {resolvedContent.contact && (
                      <div className="px-4 py-3 rounded-lg bg-bg-tertiary">
                        <div className="flex items-center gap-3 mb-2">
                          <Mail className="w-5 h-5 text-text-muted flex-shrink-0" />
                          <span className="text-sm font-medium text-text-primary">
                            {t('about.contact')}
                          </span>
                        </div>
                        <div className="ml-8">
                          {renderMarkdown(resolvedContent.contact)}
                        </div>
                      </div>
                    )}

                    {/* GitHub */}
                    {github && (
                      <a
                        href={github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-bg-tertiary hover:bg-bg-hover transition-colors"
                      >
                        <Github className="w-5 h-5 text-text-muted flex-shrink-0" />
                        <span className="text-sm text-accent truncate">{github}</span>
                      </a>
                    )}
                  </div>
                </>
              )}

              {/* 底部信息 */}
              <div className="text-center pt-4 mt-4 border-t border-border">
                <p className="text-xs text-text-muted">
                  Powered by MaaFramework & Tauri
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
