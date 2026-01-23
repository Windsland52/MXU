import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Sparkles, Loader2 } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { maaService } from '@/services/maaService';
import { useResolvedContent } from '@/services/contentResolver';
import { loggers, generateTaskPipelineOverride } from '@/utils';
import { getInterfaceLangKey } from '@/i18n';
import type { TaskItem } from '@/types/interface';
import clsx from 'clsx';

const log = loggers.task;

/** 任务按钮组件：支持 hover 显示 description tooltip */
function TaskButton({
  task,
  count,
  isNew,
  label,
  langKey,
  basePath,
  onClick,
}: {
  task: TaskItem;
  count: number;
  isNew: boolean;
  label: string;
  langKey: string;
  basePath: string;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { resolveI18nText, interfaceTranslations } = useAppStore();

  // 获取翻译表
  const translations = interfaceTranslations[langKey];

  // 解析 description（支持文件/URL/Markdown）
  const resolvedDescription = useResolvedContent(
    task.description ? resolveI18nText(task.description, langKey) : undefined,
    basePath,
    translations,
  );

  const hasDescription = !!resolvedDescription.html || resolvedDescription.loading;

  // 计算 tooltip 位置
  useEffect(() => {
    if (showTooltip && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setTooltipPos({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
  }, [showTooltip]);

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      onMouseEnter={() => hasDescription && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={clsx(
        'relative flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left',
        'bg-bg-secondary hover:bg-bg-hover text-text-primary border border-border hover:border-accent',
      )}
    >
      {/* 新增任务标记 */}
      {isNew && (
        <span className="absolute -top-2 -right-2 flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-accent text-white animate-pulse-glow-accent">
          <Sparkles className="w-3 h-3" />
          new
        </span>
      )}
      <Plus className="w-4 h-4 flex-shrink-0 text-accent" />
      <span className="flex-1 truncate">{label}</span>
      {count > 0 && (
        <span className="flex-shrink-0 px-1.5 py-0.5 text-xs rounded-full bg-accent/10 text-accent font-medium">
          {count}
        </span>
      )}

      {/* Description Tooltip - 使用 Portal 渲染到 body，避免被 overflow 裁剪 */}
      {showTooltip &&
        hasDescription &&
        createPortal(
          <div
            className={clsx(
              'fixed z-[9999] pointer-events-none',
              'px-3 py-2 text-xs bg-bg-primary border border-border rounded-lg shadow-lg',
              'w-max max-w-[280px] animate-fade-in-up',
            )}
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y - 8,
            }}
          >
            {resolvedDescription.loading ? (
              <div className="flex items-center gap-1.5 text-text-muted">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{t('taskItem.loadingDescription')}</span>
              </div>
            ) : (
              <div
                className="text-text-secondary [&_p]:my-0.5 [&_a]:text-accent [&_a]:hover:underline"
                dangerouslySetInnerHTML={{ __html: resolvedDescription.html }}
              />
            )}
            {/* Tooltip 箭头 */}
            <div className="absolute left-1/2 top-full -translate-x-1/2 -mt-px">
              <div className="w-2 h-2 bg-bg-primary border-r border-b border-border rotate-45 -translate-y-1" />
            </div>
          </div>,
          document.body,
        )}
    </button>
  );
}

export function AddTaskPanel() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const {
    projectInterface,
    getActiveInstance,
    addTaskToInstance,
    resolveI18nText,
    language,
    basePath,
    // 任务运行状态管理
    setTaskRunStatus,
    registerMaaTaskMapping,
    appendPendingTaskId,
    // 新增任务标记
    newTaskNames,
    removeNewTaskName,
  } = useAppStore();

  const instance = getActiveInstance();
  const langKey = getInterfaceLangKey(language);

  // 统计每个任务被添加的次数
  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    instance?.selectedTasks.forEach((t) => {
      counts[t.taskName] = (counts[t.taskName] || 0) + 1;
    });
    return counts;
  }, [instance?.selectedTasks]);

  const filteredTasks = useMemo(() => {
    if (!projectInterface) return [];

    // 获取当前实例选中的控制器和资源
    const selectedControllerName = instance?.controllerName;
    const selectedResourceName = instance?.resourceName;

    return projectInterface.task.filter((task) => {
      const label = resolveI18nText(task.label, langKey) || task.name;
      const searchLower = searchQuery.toLowerCase();

      // 搜索关键词过滤
      const matchesSearch =
        task.name.toLowerCase().includes(searchLower) || label.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // 控制器过滤：如果任务指定了 controller 字段，只在选中的控制器匹配时显示
      if (task.controller && task.controller.length > 0) {
        if (!selectedControllerName || !task.controller.includes(selectedControllerName)) {
          return false;
        }
      }

      // 资源过滤：如果任务指定了 resource 字段，只在选中的资源匹配时显示
      if (task.resource && task.resource.length > 0) {
        if (!selectedResourceName || !task.resource.includes(selectedResourceName)) {
          return false;
        }
      }

      return true;
    });
  }, [projectInterface, searchQuery, resolveI18nText, langKey, instance?.controllerName, instance?.resourceName]);

  const handleAddTask = async (taskName: string) => {
    if (!instance || !projectInterface) return;

    const task = projectInterface.task.find((t) => t.name === taskName);
    if (!task) return;

    // 如果是新增任务，移除 "new" 标记
    if (newTaskNames.includes(taskName)) {
      removeNewTaskName(taskName);
    }

    // 先添加任务到列表
    addTaskToInstance(instance.id, task);

    // 如果实例正在运行，立即调用 PostTask 追加到执行队列
    if (instance.isRunning) {
      try {
        // 使用 getState() 获取最新状态（zustand 状态更新是同步的）
        const latestState = useAppStore.getState();
        const updatedInstance = latestState.instances.find((i) => i.id === instance.id);
        const addedTask = updatedInstance?.selectedTasks
          .filter((t) => t.taskName === taskName)
          .pop();

        if (!addedTask) {
          log.warn('无法找到刚添加的任务');
          return;
        }

        // 构建 pipeline override
        const pipelineOverride = generateTaskPipelineOverride(addedTask, projectInterface);

        log.info('运行中追加任务:', task.entry, ', pipelineOverride:', pipelineOverride);

        // 调用 PostTask
        const maaTaskId = await maaService.runTask(instance.id, task.entry, pipelineOverride);

        log.info('任务已追加, maaTaskId:', maaTaskId);

        // 注册映射关系
        registerMaaTaskMapping(instance.id, maaTaskId, addedTask.id);

        // 设置任务状态为 pending
        setTaskRunStatus(instance.id, addedTask.id, 'pending');

        // 追加到任务队列
        appendPendingTaskId(instance.id, maaTaskId);
      } catch (err) {
        log.error('追加任务失败:', err);
      }
    }
  };

  if (!projectInterface) {
    return null;
  }

  return (
    <div className="border-t border-border bg-bg-tertiary">
      {/* 搜索框 */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('addTaskPanel.searchPlaceholder')}
            className={clsx(
              'w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border',
              'bg-bg-secondary text-text-primary placeholder:text-text-muted',
              'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20',
            )}
          />
        </div>
      </div>

      {/* 任务列表 */}
      <div className="max-h-48 overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="p-4 text-center text-sm text-text-muted">
            {t('addTaskPanel.noResults')}
          </div>
        ) : (
          <div className="p-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {filteredTasks.map((task) => {
              const count = taskCounts[task.name] || 0;
              const label = resolveI18nText(task.label, langKey) || task.name;
              const isNew = newTaskNames.includes(task.name);

              return (
                <TaskButton
                  key={task.name}
                  task={task}
                  count={count}
                  isNew={isNew}
                  label={label}
                  langKey={langKey}
                  basePath={basePath}
                  onClick={() => handleAddTask(task.name)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
