import { useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Copy, ChevronUp, ChevronDown, FolderOpen } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore, type LogType } from '@/stores/appStore';
import { ContextMenu, useContextMenu, type MenuItem } from './ContextMenu';
import { loggers } from '@/utils/logger';

// 检测是否在 Tauri 环境中
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

export function LogsPanel() {
  const { t } = useTranslation();
  const logsEndRef = useRef<HTMLDivElement>(null);
  const {
    sidePanelExpanded,
    toggleSidePanelExpanded,
    activeInstanceId,
    instanceLogs,
    clearLogs,
    basePath,
  } = useAppStore();
  const { state: menuState, show: showMenu, hide: hideMenu } = useContextMenu();

  // 获取当前实例的日志
  const logs = activeInstanceId ? instanceLogs[activeInstanceId] || [] : [];

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleClear = useCallback(() => {
    if (activeInstanceId) {
      clearLogs(activeInstanceId);
    }
  }, [activeInstanceId, clearLogs]);

  const handleCopyAll = useCallback(() => {
    const text = logs
      .map((log) => `[${log.timestamp.toLocaleTimeString()}] ${log.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
  }, [logs]);

  // 打开日志目录
  const handleOpenLogDir = useCallback(async () => {
    if (!isTauri() || !basePath) {
      return;
    }

    try {
      const { openPath } = await import('@tauri-apps/plugin-opener');
      const { join } = await import('@tauri-apps/api/path');
      const logPath = await join(basePath, 'debug');
      await openPath(logPath);
    } catch (err) {
      loggers.ui.error('打开日志目录失败:', err);
    }
  }, [basePath]);

  const getLogColor = (type: LogType) => {
    switch (type) {
      case 'success':
        return 'text-success'; // 跟随主题强调色
      case 'warning':
        return 'text-warning';
      case 'error':
        return 'text-error';
      case 'agent':
        return 'text-text-muted';
      case 'focus':
        return 'text-accent'; // 跟随主题强调色
      case 'info':
        return 'text-info'; // 跟随主题强调色
      default:
        return 'text-text-secondary';
    }
  };

  // 右键菜单处理
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      const menuItems: MenuItem[] = [
        {
          id: 'open-log-dir',
          label: t('settings.openLogDir'),
          icon: FolderOpen,
          disabled: !isTauri() || !basePath,
          onClick: handleOpenLogDir,
        },
        {
          id: 'copy',
          label: t('logs.copyAll'),
          icon: Copy,
          disabled: logs.length === 0,
          onClick: handleCopyAll,
        },
        {
          id: 'clear',
          label: t('logs.clear'),
          icon: Trash2,
          disabled: logs.length === 0,
          danger: true,
          onClick: handleClear,
        },
        { id: 'divider-1', label: '', divider: true },
        {
          id: 'toggle-panel',
          label: sidePanelExpanded ? t('logs.collapse') : t('logs.expand'),
          icon: sidePanelExpanded ? ChevronUp : ChevronDown,
          onClick: toggleSidePanelExpanded,
        },
      ];

      showMenu(e, menuItems);
    },
    [
      t,
      logs.length,
      sidePanelExpanded,
      basePath,
      handleOpenLogDir,
      handleCopyAll,
      handleClear,
      toggleSidePanelExpanded,
      showMenu,
    ],
  );

  // 根据日志类型获取前缀标签
  const getLogPrefix = (type: LogType) => {
    switch (type) {
      case 'agent':
        return '[Agent] ';
      case 'focus':
        return '';
      default:
        return '';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-bg-secondary rounded-lg border border-border overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium text-text-primary">{t('logs.title')}</span>
        <div className="flex items-center gap-1">
          {/* 展开/折叠上方面板 */}
          <button
            onClick={toggleSidePanelExpanded}
            className={clsx(
              'p-1.5 rounded-md transition-colors',
              !sidePanelExpanded
                ? 'text-accent bg-accent-light'
                : 'text-text-secondary hover:bg-bg-hover',
            )}
            title={sidePanelExpanded ? t('logs.collapse') : t('logs.expand')}
          >
            <ChevronDown
              className={clsx(
                'w-4 h-4 transition-transform duration-150 ease-out',
                sidePanelExpanded && 'rotate-180',
              )}
            />
          </button>
          {/* 打开日志目录 */}
          <button
            onClick={handleOpenLogDir}
            disabled={!isTauri() || !basePath}
            className={clsx(
              'p-1.5 rounded-md transition-colors',
              !isTauri() || !basePath
                ? 'text-text-muted cursor-not-allowed'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
            )}
            title={t('settings.openLogDir')}
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          {/* 清空 */}
          <button
            onClick={handleClear}
            disabled={logs.length === 0}
            className={clsx(
              'p-1.5 rounded-md transition-colors',
              logs.length === 0
                ? 'text-text-muted cursor-not-allowed'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
            )}
            title={t('logs.clear')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 日志内容 */}
      <div
        className="flex-1 overflow-y-auto p-2 font-mono text-xs bg-bg-tertiary"
        onContextMenu={handleContextMenu}
      >
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-muted">
            {t('logs.noLogs')}
          </div>
        ) : (
          <>
            {logs.map((log) => (
              <div key={log.id} className={clsx('py-0.5 flex gap-2', getLogColor(log.type))}>
                <span className="text-text-muted flex-shrink-0">
                  [{log.timestamp.toLocaleTimeString()}]
                </span>
                <span className="break-all">
                  {getLogPrefix(log.type)}
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </>
        )}
      </div>

      {/* 右键菜单 */}
      {menuState.isOpen && (
        <ContextMenu items={menuState.items} position={menuState.position} onClose={hideMenu} />
      )}
    </div>
  );
}
