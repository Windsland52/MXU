// MXU 配置文件结构 (mxu.json)

import type { OptionValue } from './interface';

// 保存的任务配置
export interface SavedTask {
  id: string;
  taskName: string;           // 对应 interface 中的 task.name
  customName?: string;        // 用户自定义名称
  enabled: boolean;
  optionValues: Record<string, OptionValue>;
}

// 保存的实例配置
export interface SavedInstance {
  id: string;
  name: string;
  controllerId?: string;
  resourceId?: string;
  tasks: SavedTask[];
}

// 应用设置
export interface AppSettings {
  theme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
}

// MXU 配置文件完整结构
export interface MxuConfig {
  version: string;
  instances: SavedInstance[];
  settings: AppSettings;
}

// 默认配置
export const defaultConfig: MxuConfig = {
  version: '1.0',
  instances: [],
  settings: {
    theme: 'light',
    language: 'zh-CN',
  },
};
