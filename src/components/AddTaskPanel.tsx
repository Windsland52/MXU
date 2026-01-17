import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import clsx from 'clsx';

export function AddTaskPanel() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const {
    projectInterface,
    getActiveInstance,
    addTaskToInstance,
    resolveI18nText,
    language,
  } = useAppStore();

  const instance = getActiveInstance();
  const langKey = language === 'zh-CN' ? 'zh_cn' : 'en_us';

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

    return projectInterface.task.filter((task) => {
      const label = resolveI18nText(task.label, langKey) || task.name;
      const searchLower = searchQuery.toLowerCase();
      return (
        task.name.toLowerCase().includes(searchLower) ||
        label.toLowerCase().includes(searchLower)
      );
    });
  }, [projectInterface, searchQuery, resolveI18nText, langKey]);

  const handleAddTask = (taskName: string) => {
    if (!instance || !projectInterface) return;

    const task = projectInterface.task.find((t) => t.name === taskName);
    if (task) {
      addTaskToInstance(instance.id, task);
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
              'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20'
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

              return (
                <button
                  key={task.name}
                  onClick={() => handleAddTask(task.name)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left',
                    'bg-bg-secondary hover:bg-bg-hover text-text-primary border border-border hover:border-accent'
                  )}
                >
                  <Plus className="w-4 h-4 flex-shrink-0 text-accent" />
                  <span className="flex-1 truncate">{label}</span>
                  {count > 0 && (
                    <span className="flex-shrink-0 px-1.5 py-0.5 text-xs rounded-full bg-accent/10 text-accent font-medium">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
