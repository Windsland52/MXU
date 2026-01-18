import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckSquare,
  Square,
  ChevronsUpDown,
  ChevronsDownUp,
  Plus,
  Play,
  StopCircle,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { maaService } from '@/services/maaService';
import clsx from 'clsx';
import { loggers } from '@/utils/logger';

const log = loggers.task;

interface ToolbarProps {
  showAddPanel: boolean;
  onToggleAddPanel: () => void;
}

export function Toolbar({ showAddPanel, onToggleAddPanel }: ToolbarProps) {
  const { t } = useTranslation();
  const {
    getActiveInstance,
    selectAllTasks,
    collapseAllTasks,
    updateInstance,
    projectInterface,
    instanceConnectionStatus,
    instanceResourceLoaded,
    setInstanceCurrentTaskId,
    setInstanceTaskStatus,
  } = useAppStore();

  const [isStarting, setIsStarting] = useState(false);

  const instance = getActiveInstance();
  const tasks = instance?.selectedTasks || [];
  const allEnabled = tasks.length > 0 && tasks.every((t) => t.enabled);
  const anyExpanded = tasks.some((t) => t.expanded);

  // 检查是否可以运行
  const instanceId = instance?.id || '';
  const isConnected = instanceConnectionStatus[instanceId] === 'Connected';
  const isResourceLoaded = instanceResourceLoaded[instanceId] || false;
  const canRun = isConnected && isResourceLoaded && tasks.some((t) => t.enabled);

  const handleSelectAll = () => {
    if (!instance) return;
    selectAllTasks(instance.id, !allEnabled);
  };

  const handleCollapseAll = () => {
    if (!instance) return;
    collapseAllTasks(instance.id, !anyExpanded);
  };

  // 生成 pipeline override JSON
  const generatePipelineOverride = () => {
    if (!instance || !projectInterface) return '{}';

    const enabledTasks = tasks.filter(t => t.enabled);
    const overrides: Record<string, unknown> = {};
    const allOptions = projectInterface.option || {};

    /**
     * 递归处理选项的 pipeline_override
     * @param optionKey 选项键
     * @param optionValues 当前任务的所有选项值
     */
    const processOptionOverride = (optionKey: string, optionValues: Record<string, import('@/types/interface').OptionValue>) => {
      const optionDef = allOptions[optionKey];
      const optionValue = optionValues[optionKey];
      if (!optionDef || !optionValue) return;

      if ((optionValue.type === 'select' || optionValue.type === 'switch') && 'cases' in optionDef) {
        // 找到当前选中的 case
        let caseName: string;
        if (optionValue.type === 'switch') {
          // switch 类型需要匹配 Yes/yes/Y/y 或 No/no/N/n
          const isChecked = optionValue.value;
          const yesCase = optionDef.cases?.find(c => ['Yes', 'yes', 'Y', 'y'].includes(c.name));
          const noCase = optionDef.cases?.find(c => ['No', 'no', 'N', 'n'].includes(c.name));
          caseName = isChecked ? (yesCase?.name || 'Yes') : (noCase?.name || 'No');
        } else {
          caseName = optionValue.caseName;
        }
        
        const caseDef = optionDef.cases?.find((c) => c.name === caseName);
        
        // 添加该 case 的 pipeline_override
        if (caseDef?.pipeline_override) {
          deepMerge(overrides, caseDef.pipeline_override);
        }
        
        // 递归处理嵌套选项
        if (caseDef?.option) {
          for (const nestedKey of caseDef.option) {
            processOptionOverride(nestedKey, optionValues);
          }
        }
      } else if (optionValue.type === 'input' && 'pipeline_override' in optionDef && optionDef.pipeline_override) {
        // 处理输入类型选项，支持 pipeline_type 类型转换
        const inputDefs = optionDef.inputs || [];
        let overrideStr = JSON.stringify(optionDef.pipeline_override);
        
        for (const [inputName, inputVal] of Object.entries(optionValue.values)) {
          const inputDef = inputDefs.find(i => i.name === inputName);
          const pipelineType = inputDef?.pipeline_type || 'string';
          const placeholder = `{${inputName}}`;
          const placeholderRegex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          
          // 根据 pipeline_type 进行类型转换
          if (pipelineType === 'int') {
            // 数字类型：移除引号，直接替换为数字
            overrideStr = overrideStr.replace(new RegExp(`"${placeholder}"`, 'g'), inputVal || '0');
            overrideStr = overrideStr.replace(placeholderRegex, inputVal || '0');
          } else if (pipelineType === 'bool') {
            // 布尔类型：转换为 true/false
            const boolVal = ['true', '1', 'yes', 'y'].includes((inputVal || '').toLowerCase()) ? 'true' : 'false';
            overrideStr = overrideStr.replace(new RegExp(`"${placeholder}"`, 'g'), boolVal);
            overrideStr = overrideStr.replace(placeholderRegex, boolVal);
          } else {
            // 字符串类型：保持引号内替换
            overrideStr = overrideStr.replace(placeholderRegex, inputVal || '');
          }
        }
        
        try {
          deepMerge(overrides, JSON.parse(overrideStr));
        } catch (e) {
          log.warn('解析选项覆盖失败:', e);
        }
      }
    };

    /**
     * 深度合并对象
     */
    const deepMerge = (target: Record<string, unknown>, source: Record<string, unknown>) => {
      for (const key of Object.keys(source)) {
        if (
          source[key] &&
          typeof source[key] === 'object' &&
          !Array.isArray(source[key]) &&
          target[key] &&
          typeof target[key] === 'object' &&
          !Array.isArray(target[key])
        ) {
          deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
        } else {
          target[key] = source[key];
        }
      }
    };

    for (const selectedTask of enabledTasks) {
      const taskDef = projectInterface.task.find(t => t.name === selectedTask.taskName);
      if (!taskDef) continue;

      // 添加任务自身的 pipeline_override
      if (taskDef.pipeline_override) {
        deepMerge(overrides, taskDef.pipeline_override as Record<string, unknown>);
      }

      // 处理顶层选项及其嵌套选项
      if (taskDef.option) {
        for (const optionKey of taskDef.option) {
          processOptionOverride(optionKey, selectedTask.optionValues);
        }
      }
    }

    return JSON.stringify(overrides);
  };

  const handleStartStop = async () => {
    if (!instance) return;

    if (instance.isRunning) {
      // 停止任务
      try {
        log.info('停止任务...');
        await maaService.stopTask(instance.id);
        updateInstance(instance.id, { isRunning: false });
        setInstanceTaskStatus(instance.id, null);
        setInstanceCurrentTaskId(instance.id, null);
      } catch (err) {
        log.error('停止任务失败:', err);
      }
    } else {
      // 启动任务
      if (!canRun) {
        log.warn('无法运行任务：未连接或资源未加载');
        return;
      }

      setIsStarting(true);

      try {
        const enabledTasks = tasks.filter(t => t.enabled);
        log.info('开始执行任务, 数量:', enabledTasks.length);
        
        // 依次运行每个启用的任务
        for (const selectedTask of enabledTasks) {
          const taskDef = projectInterface?.task.find(t => t.name === selectedTask.taskName);
          if (!taskDef) continue;

          updateInstance(instance.id, { isRunning: true });
          
          // 生成当前任务的 pipeline override
          const pipelineOverride = generatePipelineOverride();
          
          // 运行任务
          const taskId = await maaService.runTask(instance.id, taskDef.entry, pipelineOverride);
          setInstanceCurrentTaskId(instance.id, taskId);
          setInstanceTaskStatus(instance.id, 'Running');

          // 等待任务完成
          const status = await maaService.waitTask(instance.id, taskId);
          setInstanceTaskStatus(instance.id, status);

          if (status === 'Failed') {
            log.error('任务执行失败:', taskDef.name);
            break;
          }
        }

        log.info('所有任务执行完成');
        updateInstance(instance.id, { isRunning: false });
        setInstanceCurrentTaskId(instance.id, null);
      } catch (err) {
        log.error('任务执行异常:', err);
        updateInstance(instance.id, { isRunning: false });
        setInstanceTaskStatus(instance.id, 'Failed');
      } finally {
        setIsStarting(false);
      }
    }
  };

  const isDisabled = tasks.length === 0 || !tasks.some((t) => t.enabled) || (!canRun && !instance?.isRunning);

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
        disabled={isDisabled || isStarting}
        className={clsx(
          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          instance?.isRunning
            ? 'bg-error hover:bg-error/90 text-white'
            : isDisabled || isStarting
            ? 'bg-bg-active text-text-muted cursor-not-allowed'
            : 'bg-accent hover:bg-accent-hover text-white'
        )}
        title={!canRun && !instance?.isRunning ? '请先连接设备并加载资源' : undefined}
      >
        {isStarting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>启动中...</span>
          </>
        ) : instance?.isRunning ? (
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
