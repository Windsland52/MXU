import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronRight, Check, X } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { OptionEditor } from './OptionEditor';
import type { SelectedTask } from '@/types/interface';
import clsx from 'clsx';

interface TaskItemProps {
  instanceId: string;
  task: SelectedTask;
}

export function TaskItem({ instanceId, task }: TaskItemProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  
  const {
    projectInterface,
    toggleTaskEnabled,
    toggleTaskExpanded,
    removeTaskFromInstance,
    renameTask,
    resolveI18nText,
    language,
  } = useAppStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const taskDef = projectInterface?.task.find(t => t.name === task.taskName);
  if (!taskDef) return null;

  const langKey = language === 'zh-CN' ? 'zh_cn' : 'en_us';
  const originalLabel = resolveI18nText(taskDef.label, langKey) || taskDef.name;
  const displayName = task.customName || originalLabel;
  const hasOptions = taskDef.option && taskDef.option.length > 0;

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(task.customName || '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    renameTask(instanceId, task.id, editName.trim());
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'group bg-bg-secondary rounded-lg border border-border overflow-hidden transition-shadow',
        isDragging && 'shadow-lg opacity-50'
      )}
    >
      {/* 任务头部 */}
      <div className="flex items-center gap-2 p-3">
        {/* 拖拽手柄 */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-bg-hover"
        >
          <GripVertical className="w-4 h-4 text-text-muted" />
        </div>

        {/* 启用复选框 */}
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={task.enabled}
            onChange={() => toggleTaskEnabled(instanceId, task.id)}
            className="w-4 h-4 rounded border-border-strong accent-accent"
          />
        </label>

        {/* 任务名称 */}
        {isEditing ? (
          <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveEdit}
              placeholder={originalLabel}
              autoFocus
              className={clsx(
                'flex-1 px-2 py-1 text-sm rounded border border-accent',
                'bg-bg-primary text-text-primary',
                'focus:outline-none focus:ring-1 focus:ring-accent/20'
              )}
            />
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSaveEdit();
              }}
              className="p-1 rounded hover:bg-success/10 text-success"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCancelEdit();
              }}
              className="p-1 rounded hover:bg-error/10 text-error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div 
            className="flex-1 flex items-center gap-1 min-w-0 cursor-pointer"
            onDoubleClick={handleDoubleClick}
            title={t('taskItem.rename')}
          >
            <span
              className={clsx(
                'text-sm font-medium truncate',
                task.enabled ? 'text-text-primary' : 'text-text-muted'
              )}
            >
              {displayName}
            </span>
            {task.customName && (
              <span className="flex-shrink-0 text-xs text-text-muted">
                ({originalLabel})
              </span>
            )}
          </div>
        )}

        {/* 展开/折叠按钮 */}
        {hasOptions && !isEditing && (
          <button
            onClick={() => toggleTaskExpanded(instanceId, task.id)}
            className="p-1.5 rounded hover:bg-bg-hover transition-colors"
            title={task.expanded ? t('taskItem.collapse') : t('taskItem.expand')}
          >
            {task.expanded ? (
              <ChevronDown className="w-4 h-4 text-text-secondary" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-secondary" />
            )}
          </button>
        )}

        {/* 删除按钮 - hover 时显示 */}
        {!isEditing && (
          <button
            onClick={() => removeTaskFromInstance(instanceId, task.id)}
            className={clsx(
              'p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
              'hover:bg-bg-active'
            )}
            title={t('taskItem.remove')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 选项面板 */}
      {hasOptions && task.expanded && (
        <div className="border-t border-border bg-bg-tertiary p-3">
          <div className="space-y-3">
            {taskDef.option?.map((optionKey) => (
              <OptionEditor
                key={optionKey}
                instanceId={instanceId}
                taskId={task.id}
                optionKey={optionKey}
                value={task.optionValues[optionKey]}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
