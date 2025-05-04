import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { WebRTCProvider } from "@/contexts/WebRTCContext";
import WebRTCOptimizer from "@/components/WebRTCOptimizer";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ConferencePage from "@/pages/conference-page";
import JoinConferencePage from "@/pages/join-conference-page";
import AdminLogin from "@/pages/admin-login";
import { ProtectedRoute } from "@/lib/protected-route";
import Checkout from "@/pages/checkout";
import PaymentSuccess from "@/pages/payment-success";
import { lazy, Suspense } from "react";
import { ParticleBackground } from "@/components";

// Ленивая загрузка админ-панели для оптимизации производительности
const AdminPanel = lazy(() => import("@/pages/admin-panel"));

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthPage} />
      <ProtectedRoute path="/home" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/conference/:id" component={ConferencePage} />
      <Route path="/join/:id" component={JoinConferencePage} />
      <Route path="/admin-login" component={AdminLogin} />
      <ProtectedRoute 
        path="/admin" 
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>}>
            <AdminPanel />
          </Suspense>
        )}
        requiredRoles={["admin", "superadmin"]}
      />
      <ProtectedRoute path="/checkout" component={Checkout} />
      <ProtectedRoute path="/payment-success" component={PaymentSuccess} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebRTCProvider>
          <ParticleBackground 
            particleColor="rgba(138, 43, 226, 0.6)"
            linkColor="rgba(138, 43, 226, 0.15)"
            particleCount={50}
            speed={0.3}
          />
          {/* Оптимизатор WebRTC для улучшения производительности */}
          <WebRTCOptimizer />
          <Router />
          <Toaster />
        </WebRTCProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
