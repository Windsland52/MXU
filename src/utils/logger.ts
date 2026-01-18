/**
 * 统一日志服务
 * 基于 loglevel 实现，支持模块化日志、日志级别控制
 */

import log from 'loglevel';

// 日志级别类型
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';

// 根据环境设置默认日志级别
const isDev = import.meta.env.DEV;
const defaultLevel: LogLevel = isDev ? 'debug' : 'warn';

// 配置根日志器
log.setLevel(defaultLevel);

// 日志前缀格式化（带时间戳和模块名）
const originalFactory = log.methodFactory;

log.methodFactory = function (methodName, logLevel, loggerName) {
  const rawMethod = originalFactory(methodName, logLevel, loggerName);

  return function (...args: unknown[]) {
    const timestamp = new Date().toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const prefix = loggerName ? `[${timestamp}][${String(loggerName)}]` : `[${timestamp}]`;
    rawMethod(prefix, ...args);
  };
};

// 重新应用配置以激活自定义 factory
log.setLevel(log.getLevel());

/**
 * 创建模块专用日志器
 * @param moduleName 模块名称
 * @param level 可选的日志级别（默认继承根日志器级别）
 */
export function createLogger(moduleName: string, level?: LogLevel) {
  const logger = log.getLogger(moduleName);

  // 应用自定义格式
  logger.methodFactory = function (methodName, logLevel, loggerName) {
    const rawMethod = originalFactory(methodName, logLevel, loggerName);

    return function (...args: unknown[]) {
      const timestamp = new Date().toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const prefix = `[${timestamp}][${String(loggerName)}]`;
      rawMethod(prefix, ...args);
    };
  };

  logger.setLevel(level ?? log.getLevel());
  return logger;
}

/**
 * 设置全局日志级别
 */
export function setLogLevel(level: LogLevel) {
  log.setLevel(level);
}

/**
 * 获取当前日志级别
 */
export function getLogLevel(): LogLevel {
  const levels: Record<number, LogLevel> = {
    0: 'trace',
    1: 'debug',
    2: 'info',
    3: 'warn',
    4: 'error',
    5: 'silent',
  };
  return levels[log.getLevel()] || 'warn';
}

// 预创建常用模块的日志器
export const loggers = {
  maa: createLogger('MAA'),
  config: createLogger('Config'),
  device: createLogger('Device'),
  task: createLogger('Task'),
  ui: createLogger('UI'),
  app: createLogger('App'),
};

// 默认导出根日志器
export default log;
