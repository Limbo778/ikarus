import { useAuth } from "@/hooks/use-auth";
import { hasRole } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
  requiredRoles?: string[];
}

export function ProtectedRoute({
  path,
  component: Component,
  requiredRoles = [],
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Проверяем, имеет ли пользователь необходимые роли, если они указаны
  if (requiredRoles.length > 0 && !hasRole(user, requiredRoles)) {
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-2xl font-bold mb-4">Доступ запрещен</h1>
          <p className="text-muted-foreground mb-8">
            У вас нет необходимых прав для доступа к этой странице.
          </p>
          <Redirect to="/home" />
        </div>
      </Route>
    );
  }

  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}