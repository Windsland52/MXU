import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ListTodo } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { TaskItem } from './TaskItem';

export function TaskList() {
  const { t } = useTranslation();
  const { getActiveInstance, reorderTasks } = useAppStore();

  const instance = getActiveInstance();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && instance) {
      const oldIndex = instance.selectedTasks.findIndex((t) => t.id === active.id);
      const newIndex = instance.selectedTasks.findIndex((t) => t.id === over.id);
      reorderTasks(instance.id, oldIndex, newIndex);
    }
  };

  if (!instance) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted">
        {t('taskList.noTasks')}
      </div>
    );
  }

  const tasks = instance.selectedTasks;

  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-muted gap-3">
        <ListTodo className="w-12 h-12 opacity-30" />
        <p className="text-sm">{t('taskList.noTasks')}</p>
        <p className="text-xs">{t('taskList.dragToReorder')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskItem key={task.id} instanceId={instance.id} task={task} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
