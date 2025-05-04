import { useState, useEffect, useRef, memo } from 'react';
import { cn } from "@/lib/utils";

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholderClassName?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  onLoad?: () => void;
  onError?: () => void;
  threshold?: number;
  blur?: boolean;
  priority?: boolean;
}

/**
 * Компонент для ленивой загрузки изображений с плавным появлением
 * и оптимизацией производительности
 */
const LazyImage = memo(({
  src,
  alt,
  width,
  height,
  className = '',
  placeholderClassName = '',
  objectFit = 'cover',
  onLoad,
  onError,
  threshold = 0.1,
  blur = true,
  priority = false
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Обработчик успешной загрузки
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // Обработчик ошибки загрузки
  const handleError = () => {
    setHasError(true);
    setIsLoaded(true); // Помечаем как загруженное, чтобы убрать плейсхолдер
    onError?.();
  };

  // Настраиваем IntersectionObserver для отслеживания видимости
  useEffect(() => {
    // Если изображение приоритетное, не используем ленивую загрузку
    if (priority) return;

    if (imgRef.current && !observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            setIsVisible(true);
            
            // Отключаем наблюдение после обнаружения
            if (observerRef.current && imgRef.current) {
              observerRef.current.unobserve(imgRef.current);
            }
          }
        },
        {
          root: null,
          rootMargin: '200px', // Загружаем с запасом
          threshold
        }
      );
      
      observerRef.current.observe(imgRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, priority]);

  // Стили объекта подгонки изображения
  const objectFitClass = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    none: 'object-none',
    'scale-down': 'object-scale-down'
  };

  // Плейсхолдер для изображения
  const renderPlaceholder = () => {
    return (
      <div 
        className={cn(
          "absolute inset-0 bg-muted/25 animate-pulse",
          placeholderClassName
        )}
        style={{ 
          width: width ? `${width}px` : '100%',
          height: height ? `${height}px` : '100%',
        }}
      />
    );
  };

  // Если произошла ошибка загрузки, показываем заглушку
  if (hasError) {
    return (
      <div 
        className={cn(
          "relative bg-muted/20 flex items-center justify-center text-muted-foreground",
          className
        )}
        style={{ 
          width: width ? `${width}px` : '100%',
          height: height ? `${height}px` : '100%',
        }}
      >
        <span className="text-xs">{alt || 'Image not available'}</span>
      </div>
    );
  }

  return (
    <div 
      className={cn("relative overflow-hidden", className)}
      style={{ 
        width: width ? `${width}px` : 'auto',
        height: height ? `${height}px` : 'auto',
      }}
    >
      {/* Показываем плейсхолдер, пока изображение не загружено */}
      {!isLoaded && renderPlaceholder()}
      
      {/* Загружаем изображение только когда оно видимо */}
      {(isVisible || priority) && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          className={cn(
            objectFitClass[objectFit],
            "transition-opacity duration-300 ease-in-out w-full h-full",
            isLoaded ? "opacity-100" : "opacity-0",
            blur && !isLoaded ? "blur-sm" : "blur-0",
          )}
        />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;