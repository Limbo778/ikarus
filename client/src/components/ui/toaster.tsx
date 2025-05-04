import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

export function Toaster() {
  const { toasts, dismiss } = useToast();
  const [mounted, setMounted] = useState(false);

  // Нужно во избежание гидрационных ошибок
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-0 right-0 z-50 flex flex-col items-end p-4 gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-lg shadow-lg p-4 text-white w-full max-w-sm transform transition-all duration-300 ease-in-out ${
            toast.variant === "destructive" ? "bg-red-500" : "bg-primary"
          }`}
        >
          <div className="flex justify-between items-start">
            {toast.title && (
              <h3 className="font-semibold text-sm">{toast.title}</h3>
            )}
            <button
              onClick={() => dismiss(toast.id)}
              className="text-white opacity-70 hover:opacity-100 transition-opacity"
            >
              <X size={16} />
            </button>
          </div>
          {toast.description && (
            <div className="mt-1 text-sm opacity-90">{toast.description}</div>
          )}
        </div>
      ))}
    </div>
  );
}