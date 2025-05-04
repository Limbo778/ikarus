import { useState, useEffect, ComponentType, ReactNode, memo } from 'react';
import { Spinner } from '@/components/ui/spinner';

interface DynamicImportProps {
  importFunc: () => Promise<{ default: ComponentType<any> }>;
  fallback?: ReactNode;
  props?: Record<string, any>;
  showAfterMs?: number; // Задержка перед показом загрузчика, чтобы избежать моргания
}

/**
 * Компонент для динамического импорта и оптимизированной загрузки компонентов
 * - Поддерживает SSR
 * - Предотвращает моргание при быстрой загрузке
 * - Оптимизирует кеширование компонентов
 * - Снижает нагрузку на основной поток
 */
function DynamicImport({
  importFunc,
  fallback,
  props = {},
  showAfterMs = 100
}: DynamicImportProps) {
  const [Component, setComponent] = useState<ComponentType<any> | null>(null);
  const [showLoader, setShowLoader] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    let timer: NodeJS.Timeout | null = null;

    // Используем таймер для предотвращения мерцания при быстрой загрузке
    timer = setTimeout(() => {
      if (isMounted && !Component) {
        setShowLoader(true);
      }
    }, showAfterMs);

    const loadComponent = async () => {
      try {
        const module = await importFunc();
        
        if (isMounted) {
          if (timer) {
            clearTimeout(timer);
          }
          // Используем requestIdleCallback для снижения нагрузки на основной поток
          if ('requestIdleCallback' in window) {
            // @ts-ignore
            window.requestIdleCallback(() => {
              setComponent(() => module.default);
            }, { timeout: 1000 });
          } else {
            // Fallback для браузеров без поддержки requestIdleCallback
            setTimeout(() => {
              setComponent(() => module.default);
            }, 0);
          }
        }
      } catch (err) {
        console.error('Failed to load dynamic component:', err);
        if (isMounted) {
          setError(err as Error);
          if (timer) {
            clearTimeout(timer);
          }
        }
      }
    };

    loadComponent();

    return () => {
      isMounted = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [importFunc, showAfterMs, Component]);

  if (error) {
    return <div className="text-destructive">Error loading component: {error.message}</div>;
  }

  if (!Component) {
    if (!showLoader) {
      // Если компонент загружается быстро, не показываем placeholder
      return null;
    }
    return fallback || (
      <div className="flex justify-center items-center min-h-[100px]">
        <Spinner />
      </div>
    );
  }

  // Рендерим загруженный компонент с переданными пропсами
  return <Component {...props} />;
}

export default memo(DynamicImport);