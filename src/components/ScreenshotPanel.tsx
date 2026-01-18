import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Maximize2, X, Monitor, ChevronDown, ChevronUp, Play, Pause } from 'lucide-react';
import clsx from 'clsx';
import { maaService } from '@/services/maaService';
import { useAppStore } from '@/stores/appStore';
import { loggers } from '@/utils/logger';

const log = loggers.ui;

// 默认帧率限制：每秒 5 帧
const DEFAULT_FPS = 5;

export function ScreenshotPanel() {
  const { t } = useTranslation();
  const { activeInstanceId, instanceConnectionStatus } = useAppStore();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // 用于控制截图流的引用
  const streamingRef = useRef(false);
  const lastFrameTimeRef = useRef(0);
  const frameIntervalRef = useRef(1000 / DEFAULT_FPS);
  
  const instanceId = activeInstanceId || '';

  // 获取单帧截图（任务未运行时使用）
  const captureFrame = useCallback(async (): Promise<string | null> => {
    if (!instanceId) return null;
    
    try {
      // 发起截图请求
      const screencapId = await maaService.postScreencap(instanceId);
      if (screencapId < 0) {
        throw new Error('Failed to post screencap');
      }
      
      // 等待截图完成
      const success = await maaService.screencapWait(instanceId, screencapId);
      if (!success) {
        throw new Error('Screencap failed');
      }
      
      // 获取缓存的图像
      const imageData = await maaService.getCachedImage(instanceId);
      return imageData || null;
    } catch (err) {
      log.warn('截图失败:', err);
      throw err;
    }
  }, [instanceId]);

  // 获取缓存截图（任务运行时直接获取）
  const getCachedFrame = useCallback(async (): Promise<string | null> => {
    if (!instanceId) return null;
    
    try {
      const imageData = await maaService.getCachedImage(instanceId);
      return imageData || null;
    } catch (err) {
      log.warn('获取缓存截图失败:', err);
      throw err;
    }
  }, [instanceId]);

  // 全屏模式切换
  const toggleFullscreen = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsFullscreen(!isFullscreen);
  };

  // ESC 键退出全屏
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    
    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // 截图流循环
  const streamLoop = useCallback(async () => {
    while (streamingRef.current) {
      const now = Date.now();
      const elapsed = now - lastFrameTimeRef.current;
      
      // 帧率限制
      if (elapsed < frameIntervalRef.current) {
        await new Promise(resolve => setTimeout(resolve, frameIntervalRef.current - elapsed));
        continue;
      }
      
      lastFrameTimeRef.current = Date.now();
      
      try {
        // 检查任务是否正在运行
        const isRunning = await maaService.isRunning(instanceId);
        
        let imageData: string | null = null;
        
        if (isRunning) {
          // 任务运行中，直接获取缓存的截图（任务会自动更新缓存）
          imageData = await getCachedFrame();
        } else {
          // 任务未运行，需要主动发起截图
          imageData = await captureFrame();
        }
        
        if (imageData && streamingRef.current) {
          setScreenshotUrl(imageData);
          setError(null);
        }
      } catch {
        // 静默处理错误，继续下一帧
      }
      
      // 短暂等待再进行下一次循环检查
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }, [instanceId, captureFrame, getCachedFrame]);

  // 开始/停止截图流
  const toggleStreaming = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (!instanceId) return;
    
    if (isStreaming) {
      // 停止流
      streamingRef.current = false;
      setIsStreaming(false);
    } else {
      // 开始流
      streamingRef.current = true;
      setIsStreaming(true);
      setError(null);
      streamLoop();
    }
  };

  // 组件卸载或 instanceId 变化时停止流
  useEffect(() => {
    return () => {
      streamingRef.current = false;
    };
  }, [instanceId]);

  // 面板折叠时停止流
  useEffect(() => {
    if (isCollapsed && isStreaming) {
      streamingRef.current = false;
      setIsStreaming(false);
    }
  }, [isCollapsed, isStreaming]);

  // 连接成功后自动开始实时截图
  const connectionStatus = instanceId ? instanceConnectionStatus[instanceId] : undefined;
  useEffect(() => {
    if (connectionStatus === 'Connected' && !isStreaming && !isCollapsed && instanceId) {
      streamingRef.current = true;
      setIsStreaming(true);
      setError(null);
      streamLoop();
    }
  }, [connectionStatus, instanceId, isCollapsed]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-bg-secondary rounded-lg border border-border">
      {/* 标题栏（可点击折叠） */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={clsx(
          'w-full flex items-center justify-between px-3 py-2 hover:bg-bg-hover transition-colors',
          isCollapsed ? 'rounded-lg' : 'rounded-t-lg border-b border-border'
        )}
      >
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-text-secondary" />
          <span className="text-sm font-medium text-text-primary">
            {t('screenshot.title')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* 流模式开关按钮 */}
          <button
            onClick={toggleStreaming}
            disabled={!instanceId}
            className={clsx(
              'p-1 rounded-md transition-colors',
              !instanceId
                ? 'text-text-muted cursor-not-allowed'
                : isStreaming
                ? 'text-green-500 hover:bg-bg-tertiary'
                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
            )}
            title={isStreaming ? t('screenshot.stopStream') : t('screenshot.startStream')}
          >
            {isStreaming ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
          </button>
          
          {/* 全屏按钮 */}
          <button
            onClick={toggleFullscreen}
            disabled={!screenshotUrl}
            className={clsx(
              'p-1 rounded-md transition-colors',
              !screenshotUrl
                ? 'text-text-muted cursor-not-allowed'
                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
            )}
            title={t('screenshot.fullscreen')}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronUp className="w-4 h-4 text-text-muted" />
          )}
        </div>
      </button>

      {/* 可折叠内容 */}
      {!isCollapsed && (
        <div className="p-3">
          {/* 截图区域 */}
          <div className="aspect-video bg-bg-tertiary rounded-md flex items-center justify-center overflow-hidden relative">
            {screenshotUrl ? (
              <>
                <img
                  src={screenshotUrl}
                  alt="Screenshot"
                  className="w-full h-full object-contain rounded-md"
                />
                {/* 流模式指示器 */}
                {isStreaming && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-green-500/80 rounded text-white text-xs">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-text-muted">
                <Monitor className="w-10 h-10 opacity-30" />
                {error ? (
                  <span className="text-xs text-red-500">{error}</span>
                ) : (
                  <>
                    <span className="text-xs">{t('screenshot.noScreenshot')}</span>
                    <span className="text-xs text-text-muted">
                      {t('screenshot.connectFirst')}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 全屏模态框 */}
      {isFullscreen && screenshotUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={toggleFullscreen}
        >
          {/* 关闭按钮 */}
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title={t('screenshot.exitFullscreen')}
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* 全屏图片 */}
          <img
            src={screenshotUrl}
            alt="Screenshot"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          
          {/* 流模式指示器 */}
          {isStreaming && (
            <div className="absolute top-4 left-4 flex items-center gap-1 px-2 py-1 bg-green-500/80 rounded text-white text-sm">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </div>
          )}
        </div>
      )}
    </div>
  );
}
