import { useTranslation } from 'react-i18next';
import {
  CheckSquare,
  Square,
  ChevronsUpDown,
  ChevronsDownUp,
  Plus,
  Play,
  StopCircle,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import clsx from 'clsx';

interface ToolbarProps {
  showAddPanel: boolean;
  onToggleAddPanel: () => void;
}

export function Toolbar({ showAddPanel, onToggleAddPanel }: ToolbarProps) {
  const { t } = useTranslation();
  const { getActiveInstance, selectAllTasks, collapseAllTasks } = useAppStore();

  const instance = getActiveInstance();
  const tasks = instance?.selectedTasks || [];
  const allEnabled = tasks.length > 0 && tasks.every((t) => t.enabled);
  const anyExpanded = tasks.some((t) => t.expanded);

  const handleSelectAll = () => {
    if (!instance) return;
    selectAllTasks(instance.id, !allEnabled);
  };

  const handleCollapseAll = () => {
    if (!instance) return;
    collapseAllTasks(instance.id, !anyExpanded);
  };

  const handleStartStop = () => {
    // TODO: 实现任务执行逻辑
    console.log('Start/Stop tasks');
  };

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-bg-secondary border-t border-border">
      {/* 左侧工具按钮 */}
      <div className="flex items-center gap-1">
        {/* 全选/取消全选 */}
        <button
          onClick={handleSelectAll}
          disabled={tasks.length === 0}
          className={clsx(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm transition-colors',
            tasks.length === 0
              ? 'text-text-muted cursor-not-allowed'
              : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
          )}
          title={allEnabled ? t('taskList.deselectAll') : t('taskList.selectAll')}
        >
          {allEnabled ? (
            <CheckSquare className="w-4 h-4" />
          ) : (
            <Square className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">
            {allEnabled ? t('taskList.deselectAll') : t('taskList.selectAll')}
          </span>
        </button>

        {/* 展开/折叠 */}
        <button
          onClick={handleCollapseAll}
          disabled={tasks.length === 0}
          className={clsx(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm transition-colors',
            tasks.length === 0
              ? 'text-text-muted cursor-not-allowed'
              : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
          )}
          title={anyExpanded ? t('taskList.collapseAll') : t('taskList.expandAll')}
        >
          {anyExpanded ? (
            <ChevronsDownUp className="w-4 h-4" />
          ) : (
            <ChevronsUpDown className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">
            {anyExpanded ? t('taskList.collapseAll') : t('taskList.expandAll')}
          </span>
        </button>

        {/* 添加任务 */}
        <button
          onClick={onToggleAddPanel}
          className={clsx(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm transition-colors',
            showAddPanel
              ? 'bg-accent text-white'
              : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
          )}
          title={t('taskList.addTask')}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('taskList.addTask')}</span>
        </button>
      </div>

      {/* 右侧执行按钮 */}
      <button
        onClick={handleStartStop}
        disabled={tasks.length === 0 || !tasks.some((t) => t.enabled)}
        className={clsx(
          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          instance?.isRunning
            ? 'bg-error hover:bg-error/90 text-white'
            : tasks.length === 0 || !tasks.some((t) => t.enabled)
            ? 'bg-bg-active text-text-muted cursor-not-allowed'
            : 'bg-accent hover:bg-accent-hover text-white'
        )}
      >
        {instance?.isRunning ? (
          <>
            <StopCircle className="w-4 h-4" />
            <span>{t('taskList.stopTasks')}</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            <span>{t('taskList.startTasks')}</span>
          </>
        )}
      </button>
    </div>
  );
}
