import { useState, useCallback } from "react";

type ToastVariant = "default" | "destructive";

export type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastOptions = Omit<Toast, "id">;

let toastCount = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ title, description, variant = "default" }: ToastOptions) => {
    const id = `toast-${toastCount++}`;
    const newToast = { id, title, description, variant };

    setToasts((currentToasts) => [...currentToasts, newToast]);

    // Автоматически удалять через 5 секунд
    setTimeout(() => {
      dismiss(id);
    }, 5000);

    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  return {
    toast,
    toasts,
    dismiss,
  };
}