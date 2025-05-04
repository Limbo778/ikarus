import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'ghost';
  label?: string;
}

/**
 * Компонент спиннера для индикации загрузки
 * с оптимизацией производительности
 */
export function Spinner({
  size = 'md',
  className = '',
  variant = 'default',
  label
}: SpinnerProps) {
  // Размеры спиннера
  const sizeClasses = {
    xs: 'w-3 h-3 border-[1.5px]',
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-[3px]',
    xl: 'w-12 h-12 border-4'
  };

  // Цветовые варианты
  const variantClasses = {
    default: 'border-muted-foreground/30 border-t-muted-foreground',
    primary: 'border-primary/30 border-t-primary',
    secondary: 'border-secondary/30 border-t-secondary',
    ghost: 'border-foreground/10 border-t-foreground/50'
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={cn(
          "rounded-full animate-spin",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        role="status"
        aria-label={label || "Loading"}
      />
      {label && (
        <span className="ml-2 text-sm text-foreground/80">{label}</span>
      )}
    </div>
  );
}