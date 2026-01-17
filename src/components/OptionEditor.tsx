import { useAppStore } from '@/stores/appStore';
import type { OptionValue } from '@/types/interface';
import clsx from 'clsx';

interface OptionEditorProps {
  instanceId: string;
  taskId: string;
  optionKey: string;
  value?: OptionValue;
}

export function OptionEditor({ instanceId, taskId, optionKey, value }: OptionEditorProps) {
  const { projectInterface, setTaskOptionValue, resolveI18nText, language } = useAppStore();

  const optionDef = projectInterface?.option?.[optionKey];
  if (!optionDef) return null;

  const langKey = language === 'zh-CN' ? 'zh_cn' : 'en_us';
  const optionLabel = resolveI18nText(optionDef.label, langKey) || optionKey;

  // Switch 类型
  if (optionDef.type === 'switch') {
    const isChecked = value?.type === 'switch' ? value.value : false;

    return (
      <div className="flex items-center justify-between">
        <label className="text-sm text-text-secondary">{optionLabel}</label>
        <button
          onClick={() => {
            setTaskOptionValue(instanceId, taskId, optionKey, {
              type: 'switch',
              value: !isChecked,
            });
          }}
          className={clsx(
            'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
            isChecked ? 'bg-accent' : 'bg-bg-active'
          )}
        >
          <span
            className={clsx(
              'absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200',
              isChecked ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </button>
      </div>
    );
  }

  // Input 类型
  if (optionDef.type === 'input') {
    const inputValues = value?.type === 'input' ? value.values : {};

    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-secondary">{optionLabel}</label>
        {optionDef.inputs.map((input) => {
          const inputLabel = resolveI18nText(input.label, langKey) || input.name;
          const inputValue = inputValues[input.name] || input.default || '';

          return (
            <div key={input.name} className="flex items-center gap-3">
              <span className="text-sm text-text-tertiary min-w-[80px]">{inputLabel}</span>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setTaskOptionValue(instanceId, taskId, optionKey, {
                    type: 'input',
                    values: { ...inputValues, [input.name]: e.target.value },
                  });
                }}
                placeholder={input.default}
                className={clsx(
                  'flex-1 px-3 py-1.5 text-sm rounded-md border border-border',
                  'bg-bg-secondary text-text-primary',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20'
                )}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // Select 类型 (默认)
  const selectedCase = value?.type === 'select' ? value.caseName : optionDef.default_case || optionDef.cases[0]?.name;

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-text-secondary min-w-[80px]">{optionLabel}</label>
      <select
        value={selectedCase}
        onChange={(e) => {
          setTaskOptionValue(instanceId, taskId, optionKey, {
            type: 'select',
            caseName: e.target.value,
          });
        }}
        className={clsx(
          'flex-1 px-3 py-1.5 text-sm rounded-md border border-border',
          'bg-bg-secondary text-text-primary',
          'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20',
          'cursor-pointer'
        )}
      >
        {optionDef.cases.map((caseItem) => {
          const caseLabel = resolveI18nText(caseItem.label, langKey) || caseItem.name;
          return (
            <option key={caseItem.name} value={caseItem.name}>
              {caseLabel}
            </option>
          );
        })}
      </select>
    </div>
  );
}
