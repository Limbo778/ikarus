import { useCallback, useState, useEffect, memo } from 'react';
import { cn } from "@/lib/utils";
import { User, Image } from "lucide-react";

interface ImagePlaceholderProps {
  src?: string;
  alt?: string;
  fallbackType?: 'user' | 'image' | 'text';
  fallbackText?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackClassName?: string;
  onClick?: () => void;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  showFallback?: boolean;
}

/**
 * Компонент для оптимизированной загрузки изображений с управлением плейсхолдерами
 * - Поддерживает отложенную загрузку для улучшения производительности
 * - Отображает плейсхолдеры во время загрузки или при ошибке
 * - Оптимизирует память и потребление CPU
 */
const ImagePlaceholder = memo(({
  src,
  alt = '',
  fallbackType = 'user',
  fallbackText,
  size = 'md',
  className = '',
  fallbackClassName = '',
  onClick,
  rounded = 'full',
  showFallback = false
}: ImagePlaceholderProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  
  // Сбрасываем состояние при изменении источника
  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [src]);
  
  // Обработчик успешной загрузки
  const handleLoad = useCallback(() => {
    setLoaded(true);
    setError(false);
  }, []);
  
  // Обработчик ошибки загрузки
  const handleError = useCallback(() => {
    setError(true);
    setLoaded(false);
  }, []);
  
  // Определяем размеры на основе пропса size
  const sizeStyles = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl'
  };
  
  // Определяем скругление на основе пропса rounded
  const roundedStyles = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  };
  
  // Если нет источника или принудительно показываем fallback
  const shouldShowFallback = !src || error || showFallback;
  
  // Создаем и кешируем инициалы из fallbackText
  const initials = useCallback(() => {
    if (!fallbackText) return '';
    return fallbackText
      .split(' ')
      .slice(0, 2)
      .map(word => word.charAt(0).toUpperCase())
      .join('');
  }, [fallbackText]);
  
  // Рендеринг фоллбека на основе типа
  const renderFallback = () => {
    if (fallbackType === 'text' && fallbackText) {
      return (
        <div className={cn(
          "flex items-center justify-center bg-primary/10 text-primary font-medium",
          sizeStyles[size],
          roundedStyles[rounded],
          fallbackClassName
        )}>
          {initials()}
        </div>
      );
    }
    
    return (
      <div className={cn(
        "flex items-center justify-center bg-muted",
        sizeStyles[size],
        roundedStyles[rounded],
        fallbackClassName
      )}>
        {fallbackType === 'user' ? (
          <User 
            className={cn(
              "text-muted-foreground", 
              size === 'xs' ? 'w-3 h-3' :
              size === 'sm' ? 'w-4 h-4' :
              size === 'md' ? 'w-5 h-5' :
              size === 'lg' ? 'w-6 h-6' : 'w-8 h-8'
            )} 
          />
        ) : (
          <Image 
            className={cn(
              "text-muted-foreground", 
              size === 'xs' ? 'w-3 h-3' :
              size === 'sm' ? 'w-4 h-4' :
              size === 'md' ? 'w-5 h-5' :
              size === 'lg' ? 'w-6 h-6' : 'w-8 h-8'
            )} 
          />
        )}
      </div>
    );
  };
  
  // Оптимизированный рендер
  return (
    <div 
      className={cn(
        "relative overflow-hidden",
        sizeStyles[size],
        roundedStyles[rounded],
        onClick ? "cursor-pointer" : "",
        className
      )}
      onClick={onClick}
    >
      {/* Показываем изображение только если есть источник и нет ошибки */}
      {src && !error && (
        <img
          src={src}
          alt={alt}
          className={cn(
            roundedStyles[rounded],
            "object-cover w-full h-full transition-opacity duration-200",
            loaded ? "opacity-100" : "opacity-0",
          )}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
      
      {/* Показываем фоллбек, если нужно */}
      {(shouldShowFallback || !loaded) && renderFallback()}
    </div>
  );
});

ImagePlaceholder.displayName = 'ImagePlaceholder';

export default ImagePlaceholder;