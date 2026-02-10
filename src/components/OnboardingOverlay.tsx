import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useAppStore } from '@/stores/appStore';

/**
 * 检查当前是否有任何模态弹窗（z-50 级别的 fixed 遮罩）正在显示。
 * 涵盖 WelcomeDialog、InstallConfirmModal、VCRedistModal、
 * BadPathModal、VersionWarningModal 等所有全局遮罩。
 */
function hasActiveModal(): boolean {
  // 所有模态弹窗都使用 fixed inset-0 z-50 的模式
  const overlays = document.querySelectorAll('.fixed.inset-0.z-50');
  return overlays.length > 0;
}

/**
 * 新用户引导覆盖层
 * 使用 driver.js 高亮连接设置面板，引导用户完成首次配置。
 * 会等待所有模态弹窗（Welcome、安装确认等）关闭后再显示。
 */
export function OnboardingOverlay() {
  const { t } = useTranslation();
  const {
    onboardingCompleted,
    setOnboardingCompleted,
    instanceConnectionStatus,
    instanceResourceLoaded,
    activeInstanceId,
  } = useAppStore();

  const driverRef = useRef<Driver | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);

  // 启动 driver.js 引导
  const startTour = useCallback(() => {
    if (startedRef.current || onboardingCompleted) return;

    const element = document.getElementById('connection-panel');
    if (!element) return;

    startedRef.current = true;

    const steps: DriveStep[] = [
      {
        element: '#connection-panel',
        popover: {
          title: t('onboarding.title'),
          description: t('onboarding.message'),
          side: 'left',
          align: 'start',
          // 单步引导，只显示关闭按钮
          showButtons: ['close'],
        },
      },
    ];

    const driverInstance = driver({
      steps,
      animate: true,
      overlayColor: 'black',
      overlayOpacity: 0.4,
      stagePadding: 6,
      stageRadius: 8,
      allowClose: true,
      popoverClass: 'mxu-onboarding-popover',
      onDestroyed: () => {
        setOnboardingCompleted(true);
      },
    });

    driverRef.current = driverInstance;
    driverInstance.drive();
  }, [onboardingCompleted, t, setOnboardingCompleted]);

  // 监听连接状态，一旦用户成功连接设备并加载资源，自动关闭引导
  useEffect(() => {
    if (onboardingCompleted || !driverRef.current?.isActive()) return;

    const currentInstanceId = activeInstanceId;
    if (!currentInstanceId) return;

    const isConnected = instanceConnectionStatus[currentInstanceId] === 'Connected';
    const isResourceLoaded = instanceResourceLoaded[currentInstanceId];

    if (isConnected && isResourceLoaded) {
      driverRef.current?.destroy();
      setOnboardingCompleted(true);
    }
  }, [
    onboardingCompleted,
    activeInstanceId,
    instanceConnectionStatus,
    instanceResourceLoaded,
    setOnboardingCompleted,
  ]);

  // 等待所有模态弹窗关闭后再启动引导
  useEffect(() => {
    if (onboardingCompleted || startedRef.current) return;

    // 先等一个初始延迟，让界面和可能的模态弹窗都渲染完成
    const initialDelay = setTimeout(() => {
      // 如果此时没有模态弹窗，直接启动
      if (!hasActiveModal()) {
        startTour();
        return;
      }

      // 否则轮询等待模态弹窗关闭
      pollTimerRef.current = setInterval(() => {
        if (!hasActiveModal()) {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          // 模态弹窗关闭后再延迟一小段时间，让退出动画完成
          setTimeout(() => {
            startTour();
          }, 300);
        }
      }, 200);
    }, 600);

    return () => {
      clearTimeout(initialDelay);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (driverRef.current?.isActive()) {
        driverRef.current.destroy();
      }
    };
  }, [onboardingCompleted, startTour]);

  // driver.js 自己管理 DOM，这个组件不需要渲染任何内容
  return null;
}
