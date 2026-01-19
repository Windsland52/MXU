// MaaFramework 服务层
// 封装 Tauri 命令调用，提供前端友好的 API

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import type {
  AdbDevice,
  Win32Window,
  ControllerConfig,
  ConnectionStatus,
  TaskStatus,
  AgentConfig,
  TaskConfig,
} from '@/types/maa';
import { loggers } from '@/utils/logger';
import { supportsWin32Controller } from '@/utils/platform';

const log = loggers.maa;

/** MaaFramework 回调事件载荷 */
export interface MaaCallbackEvent {
  /** 消息类型，如 "Resource.Loading.Succeeded", "Controller.Action.Succeeded", "Tasker.Task.Succeeded" */
  message: string;
  /** 详细数据 JSON 字符串 */
  details: string;
}

/** 回调消息详情（通用字段） */
export interface MaaCallbackDetails {
  res_id?: number;
  ctrl_id?: number;
  task_id?: number;
  path?: string;
  type?: string;
  hash?: string;
  uuid?: string;
  action?: string;
  param?: unknown;
  entry?: string;
  name?: string;
}

// 检测是否在 Tauri 环境中
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

/** MaaFramework 服务 */
export const maaService = {
  /**
   * 初始化 MaaFramework
   * @param libDir MaaFramework 库目录（可选，默认从 exe 目录/maafw 加载）
   * @returns 版本号
   */
  async init(libDir?: string): Promise<string> {
    log.info('初始化 MaaFramework, libDir:', libDir || '(默认)');
    const version = await invoke<string>('maa_init', { libDir: libDir || null });
    log.info('MaaFramework 版本:', version);
    return version;
  },

  /**
   * 设置资源目录
   * @param resourceDir 资源目录路径
   */
  async setResourceDir(resourceDir: string): Promise<void> {
    if (!isTauri()) return;
    log.debug('设置资源目录:', resourceDir);
    return await invoke('maa_set_resource_dir', { resourceDir });
  },

  /**
   * 获取 MaaFramework 版本
   */
  async getVersion(): Promise<string> {
    return await invoke<string>('maa_get_version');
  },

  /**
   * 查找 ADB 设备
   */
  async findAdbDevices(): Promise<AdbDevice[]> {
    log.debug('搜索 ADB 设备...');
    const devices = await invoke<AdbDevice[]>('maa_find_adb_devices');
    log.info('找到 ADB 设备:', devices.length, '个');
    return devices;
  },

  /**
   * 查找 Win32 窗口
   * @param classRegex 窗口类名正则表达式（可选）
   * @param windowRegex 窗口标题正则表达式（可选）
   */
  async findWin32Windows(classRegex?: string, windowRegex?: string): Promise<Win32Window[]> {
    // Win32 窗口检测仅在 Windows 平台可用
    if (!supportsWin32Controller()) {
      log.debug('当前平台不支持 Win32 窗口检测');
      return [];
    }
    
    log.debug('搜索 Win32 窗口, classRegex:', classRegex, 'windowRegex:', windowRegex);
    const windows = await invoke<Win32Window[]>('maa_find_win32_windows', {
      classRegex: classRegex || null,
      windowRegex: windowRegex || null,
    });
    log.info('找到 Win32 窗口:', windows.length, '个');
    return windows;
  },

  /**
   * 创建实例
   * @param instanceId 实例 ID
   */
  async createInstance(instanceId: string): Promise<void> {
    if (!isTauri()) return;
    log.debug('创建实例:', instanceId);
    return await invoke('maa_create_instance', { instanceId });
  },

  /**
   * 销毁实例
   * @param instanceId 实例 ID
   */
  async destroyInstance(instanceId: string): Promise<void> {
    if (!isTauri()) return;
    log.debug('销毁实例:', instanceId);
    return await invoke('maa_destroy_instance', { instanceId });
  },

  /**
   * 连接控制器（异步，通过回调通知完成状态）
   * @param instanceId 实例 ID
   * @param config 控制器配置
   * @param agentPath MaaAgentBinary 路径（可选）
   * @returns 连接请求 ID，通过监听 maa-callback 事件获取完成状态
   */
  async connectController(
    instanceId: string,
    config: ControllerConfig,
    agentPath?: string
  ): Promise<number> {
    log.info('连接控制器, 实例:', instanceId, '类型:', config.type);
    log.debug('控制器配置:', config);
    
    if (!isTauri()) {
      log.warn('非 Tauri 环境，模拟连接');
      return Math.floor(Math.random() * 10000);
    }
    
    try {
      const ctrlId = await invoke<number>('maa_connect_controller', {
        instanceId,
        config,
        agentPath: agentPath || null,
      });
      log.info('控制器连接请求已发送, ctrlId:', ctrlId);
      return ctrlId;
    } catch (err) {
      log.error('控制器连接请求失败:', err);
      throw err;
    }
  },

  /**
   * 获取连接状态
   * @param instanceId 实例 ID
   */
  async getConnectionStatus(instanceId: string): Promise<ConnectionStatus> {
    if (!isTauri()) return 'Disconnected';
    return await invoke<ConnectionStatus>('maa_get_connection_status', { instanceId });
  },

  /**
   * 加载资源（异步，通过回调通知完成状态）
   * @param instanceId 实例 ID
   * @param paths 资源路径列表
   * @returns 资源加载请求 ID 列表，通过监听 maa-callback 事件获取完成状态
   */
  async loadResource(instanceId: string, paths: string[]): Promise<number[]> {
    log.info('加载资源, 实例:', instanceId, '路径数:', paths.length);
    if (!isTauri()) {
      return paths.map((_, i) => i + 1);
    }
    const resIds = await invoke<number[]>('maa_load_resource', { instanceId, paths });
    log.info('资源加载请求已发送, resIds:', resIds);
    return resIds;
  },

  /**
   * 检查资源是否已加载
   * @param instanceId 实例 ID
   */
  async isResourceLoaded(instanceId: string): Promise<boolean> {
    if (!isTauri()) return false;
    return await invoke<boolean>('maa_is_resource_loaded', { instanceId });
  },

  /**
   * 运行任务
   * @param instanceId 实例 ID
   * @param entry 任务入口
   * @param pipelineOverride Pipeline 覆盖 JSON
   * @returns 任务 ID
   */
  async runTask(instanceId: string, entry: string, pipelineOverride: string = '{}'): Promise<number> {
    log.info('运行任务, 实例:', instanceId, '入口:', entry);
    if (!isTauri()) {
      return Math.floor(Math.random() * 10000);
    }
    return await invoke<number>('maa_run_task', {
      instanceId,
      entry,
      pipelineOverride,
    });
  },

  /**
   * 获取任务状态
   * @param instanceId 实例 ID
   * @param taskId 任务 ID
   */
  async getTaskStatus(instanceId: string, taskId: number): Promise<TaskStatus> {
    if (!isTauri()) return 'Pending';
    return await invoke<TaskStatus>('maa_get_task_status', { instanceId, taskId });
  },

  /**
   * 停止任务
   * @param instanceId 实例 ID
   */
  async stopTask(instanceId: string): Promise<void> {
    log.info('停止任务, 实例:', instanceId);
    if (!isTauri()) return;
    return await invoke('maa_stop_task', { instanceId });
  },

  /**
   * 检查是否正在运行
   * @param instanceId 实例 ID
   */
  async isRunning(instanceId: string): Promise<boolean> {
    if (!isTauri()) return false;
    return await invoke<boolean>('maa_is_running', { instanceId });
  },

  /**
   * 发起截图请求（异步，通过回调通知完成状态）
   * @param instanceId 实例 ID
   * @returns 截图请求 ID，通过监听 maa-callback 事件获取完成状态
   */
  async postScreencap(instanceId: string): Promise<number> {
    if (!isTauri()) return -1;
    const screencapId = await invoke<number>('maa_post_screencap', { instanceId });
    log.debug('截图请求已发送, screencapId:', screencapId);
    return screencapId;
  },

  /**
   * 获取缓存的截图
   * @param instanceId 实例 ID
   * @returns base64 编码的图像 data URL
   */
  async getCachedImage(instanceId: string): Promise<string> {
    if (!isTauri()) return '';
    return await invoke<string>('maa_get_cached_image', { instanceId });
  },

  /**
   * 启动任务（支持 Agent）
   * @param instanceId 实例 ID
   * @param tasks 任务列表
   * @param agentConfig Agent 配置（可选）
   * @param cwd 工作目录（Agent 子进程的 CWD）
   * @returns 任务 ID 列表
   */
  async startTasks(
    instanceId: string,
    tasks: TaskConfig[],
    agentConfig?: AgentConfig,
    cwd?: string
  ): Promise<number[]> {
    log.info('启动任务, 实例:', instanceId, '任务数:', tasks.length);
    if (!isTauri()) {
      return tasks.map((_, i) => i + 1);
    }
    return await invoke<number[]>('maa_start_tasks', {
      instanceId,
      tasks,
      agentConfig: agentConfig || null,
      cwd: cwd || '.',
    });
  },

  /**
   * 停止 Agent 并断开连接
   * @param instanceId 实例 ID
   */
  async stopAgent(instanceId: string): Promise<void> {
    log.info('停止 Agent, 实例:', instanceId);
    if (!isTauri()) return;
    return await invoke('maa_stop_agent', { instanceId });
  },

  /**
   * 监听 MaaFramework 回调事件
   * @param callback 回调函数，接收消息类型和详情
   * @returns 取消监听的函数
   * 
   * 常见消息类型：
   * - Resource.Loading.Starting/Succeeded/Failed - 资源加载状态，details 包含 res_id
   * - Controller.Action.Starting/Succeeded/Failed - 控制器动作状态，details 包含 ctrl_id
   * - Tasker.Task.Starting/Succeeded/Failed - 任务执行状态，details 包含 task_id
   * - Node.Recognition.Starting/Succeeded/Failed - 节点识别状态
   * - Node.Action.Starting/Succeeded/Failed - 节点动作状态
   */
  async onCallback(callback: (message: string, details: MaaCallbackDetails) => void): Promise<UnlistenFn> {
    if (!isTauri()) {
      // 非 Tauri 环境返回空函数
      return () => {};
    }
    
    return await listen<MaaCallbackEvent>('maa-callback', (event) => {
      const { message, details } = event.payload;
      log.debug('MaaCallback:', message, details);
      
      try {
        const parsedDetails = JSON.parse(details) as MaaCallbackDetails;
        callback(message, parsedDetails);
      } catch {
        log.warn('Failed to parse callback details:', details);
        callback(message, {});
      }
    });
  },

  /**
   * 等待单个操作完成的一次性回调（适用于截图等需要立即获取结果的场景）
   * 注意：此函数会阻塞调用者直到回调到达，适合在非 UI 线程或循环中使用
   * @param idField 要匹配的 ID 字段名（ctrl_id）
   * @param id 要等待的 ID 值
   * @param timeout 超时时间（毫秒），默认 10000
   * @returns 是否成功
   */
  async waitForScreencap(id: number, timeout: number = 10000): Promise<boolean> {
    if (!isTauri()) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
    }

    return new Promise<boolean>((resolve) => {
      let unlisten: UnlistenFn | null = null;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (unlisten) unlisten();
        if (timeoutId) clearTimeout(timeoutId);
      };

      // 设置超时
      timeoutId = setTimeout(() => {
        cleanup();
        log.warn(`截图等待超时, ctrl_id=${id}`);
        resolve(false);
      }, timeout);

      // 监听回调
      this.onCallback((message, details) => {
        if (details.ctrl_id !== id) return;

        if (message === 'Controller.Action.Succeeded') {
          cleanup();
          resolve(true);
        } else if (message === 'Controller.Action.Failed') {
          cleanup();
          resolve(false);
        }
      }).then(fn => {
        unlisten = fn;
      });
    });
  },
};

export default maaService;
