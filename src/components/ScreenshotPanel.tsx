import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Monitor } from 'lucide-react';
import clsx from 'clsx';

export function ScreenshotPanel() {
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // TODO: 实现截图刷新逻辑
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsRefreshing(false);
  };

  return (
    <div className="flex flex-col bg-bg-secondary rounded-lg border border-border overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium text-text-primary">
          {t('screenshot.title')}
        </span>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={clsx(
            'p-1.5 rounded-md transition-colors',
            isRefreshing
              ? 'text-text-muted cursor-not-allowed'
              : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
          )}
          title={t('screenshot.refresh')}
        >
          <RefreshCw
            className={clsx('w-4 h-4', isRefreshing && 'animate-spin')}
          />
        </button>
      </div>

      {/* 截图区域 */}
      <div className="flex-1 aspect-video bg-bg-tertiary flex items-center justify-center">
        {screenshotUrl ? (
          <img
            src={screenshotUrl}
            alt="Screenshot"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-text-muted">
            <Monitor className="w-10 h-10 opacity-30" />
            <span className="text-xs">{t('screenshot.noScreenshot')}</span>
            <button
              onClick={handleRefresh}
              className="text-xs text-accent hover:underline"
            >
              {t('screenshot.clickToRefresh')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
