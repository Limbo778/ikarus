import { useRef, useState, useEffect, memo, ReactNode, useMemo, useCallback } from 'react';
import { cn } from "@/lib/utils";
import useMediaQuery from "../hooks/use-media-query";

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemHeight: number;
  height?: number | string;
  className?: string;
  overscan?: number;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  uniqueId: (item: T) => string | number;
  emptyComponent?: ReactNode;
  loadingComponent?: ReactNode;
  isLoading?: boolean;
}

/**
 * Компонент для эффективного рендеринга длинных списков с виртуализацией
 * для снижения нагрузки на устройство и улучшения производительности
 */
function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight,
  height = 400,
  className = '',
  overscan = 5,
  onEndReached,
  endReachedThreshold = 200,
  uniqueId,
  emptyComponent,
  loadingComponent,
  isLoading = false
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [isEndReached, setIsEndReached] = useState(false);
  
  // Используем медиа-запросы для оптимизации на разных устройствах
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isLowEndDevice = useMediaQuery('(max-width: 640px)');
  
  // Адаптируем размеры и буферизацию для разных устройств
  const adaptedOverscan = useMemo(() => {
    return isLowEndDevice ? 2 : (isMobile ? 3 : overscan);
  }, [overscan, isMobile, isLowEndDevice]);

  // Обработчик прокрутки с оптимизацией производительности
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const currentScrollTop = containerRef.current.scrollTop;
    
    // Оптимизация: обновляем состояние только при значительном изменении
    if (Math.abs(currentScrollTop - scrollTop) >= (itemHeight / 2)) {
      setScrollTop(currentScrollTop);
      
      // Проверяем, достиг ли пользователь конца списка
      if (onEndReached && !isEndReached) {
        const scrollBottom = containerRef.current.scrollHeight - 
                            currentScrollTop - 
                            containerRef.current.clientHeight;
                            
        if (scrollBottom < endReachedThreshold) {
          setIsEndReached(true);
          onEndReached();
        }
      }
    }
  }, [scrollTop, itemHeight, onEndReached, isEndReached, endReachedThreshold]);
  
  // Сбрасываем флаг достижения конца при изменении списка
  useEffect(() => {
    setIsEndReached(false);
  }, [items.length]);
  
  // Измеряем контейнер при монтировании
  useEffect(() => {
    if (!containerRef.current) return;
    
    setContainerHeight(containerRef.current.clientHeight);
    
    // Используем ResizeObserver для отслеживания изменений размера
    const resizeObserver = new ResizeObserver(entries => {
      const { height } = entries[0].contentRect;
      setContainerHeight(height);
    });
    
    resizeObserver.observe(containerRef.current);
    
    // Устанавливаем слушатель прокрутки с throttling для оптимизации производительности
    let ticking = false;
    const scrollListener = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    containerRef.current.addEventListener('scroll', scrollListener);
    
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('scroll', scrollListener);
      }
      resizeObserver.disconnect();
    };
  }, [handleScroll]);
  
  // Вычисляем, какие элементы нужно отрендерить
  const { visibleItems, startIndex, totalHeight } = useMemo(() => {
    if (!containerHeight) {
      return { visibleItems: [], startIndex: 0, totalHeight: 0 };
    }
    
    const totalHeight = items.length * itemHeight;
    
    // Вычисляем диапазон видимых элементов
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - adaptedOverscan);
    const visibleCount = Math.min(
      items.length - startIndex,
      Math.ceil(containerHeight / itemHeight) + 2 * adaptedOverscan
    );
    
    // Выбираем только те элементы, которые будут видны
    const visibleItems = items.slice(startIndex, startIndex + visibleCount);
    
    return { visibleItems, startIndex, totalHeight };
  }, [items, itemHeight, scrollTop, containerHeight, adaptedOverscan]);
  
  // Рендер загрузочного компонента
  if (isLoading && loadingComponent) {
    return (
      <div 
        className={cn("overflow-auto relative", className)}
        style={{ height }}
        ref={containerRef}
      >
        {loadingComponent}
      </div>
    );
  }
  
  // Рендер пустого состояния
  if (items.length === 0 && emptyComponent) {
    return (
      <div 
        className={cn("overflow-auto relative", className)}
        style={{ height }}
        ref={containerRef}
      >
        {emptyComponent}
      </div>
    );
  }
  
  // Основной рендер виртуализированного списка
  return (
    <div 
      className={cn("overflow-auto relative", className)}
      style={{ height }}
      ref={containerRef}
    >
      {/* Контейнер с полной высотой для правильной прокрутки */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Контейнер с видимыми элементами */}
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          transform: `translateY(${startIndex * itemHeight}px)`,
          willChange: 'transform' // Оптимизация для GPU
        }}>
          {visibleItems.map((item, relativIndex) => {
            const absoluteIndex = startIndex + relativIndex;
            const key = uniqueId(item);
            
            return (
              <div key={key} style={{ height: itemHeight }}>
                {renderItem(item, absoluteIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default memo(VirtualizedList) as typeof VirtualizedList;