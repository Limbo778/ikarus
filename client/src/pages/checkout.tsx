import React, { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CreditCard, Shield, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from "lucide-react";
import { Logo } from '@/components/Logo';
import InteractiveBackground from '@/components/InteractiveBackground';
import WingsIcon from '@/components/icons/WingsIcon';


if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  console.error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}

// Загрузка Stripe за пределами компонента
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY ? 
  loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY) : 
  Promise.resolve(null);

const PaymentForm = ({ plan, amount }: { plan: string, amount: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [_, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить платежную форму",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    // Подтверждаем платеж
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/payment-success",
      },
    });

    setIsProcessing(false);

    if (error) {
      toast({
        title: "Ошибка оплаты",
        description: error.message || "Произошла ошибка при обработке платежа",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Платеж обрабатывается",
        description: "Перенаправление на страницу результата оплаты...",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement className="pt-2" />
      <Button 
        disabled={!stripe || isProcessing} 
        type="submit" 
        className="w-full group relative overflow-hidden cosmic-card"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Обработка платежа...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Оплатить {amount} ₽
          </>
        )}
      </Button>
    </form>
  );
};

export default function Checkout() {
  const [match, params] = useRoute('/checkout');
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  
  const plan = searchParams.get('plan') || 'basic';
  const price = parseInt(searchParams.get('price') || '659');
  const isRenew = searchParams.get('renew') === 'true';
  
  // Данные о планах
  const planData = {
    basic: {
      name: "Базовый",
      months: 1,
      price: 659,
      features: [
        "Видео-конференции до 60 минут",
        "До 25 участников конференции",
        "Базовые инструменты модерации"
      ]
    },
    standard: {
      name: "Стандарт",
      months: 3,
      price: 1119,
      savings: 858,
      features: [
        "Конференции без ограничения времени",
        "До 50 участников конференции",
        "Расширенные инструменты модерации",
        "Запись конференций"
      ]
    },
    premium: {
      name: "Премиум",
      months: 5,
      price: 4359,
      savings: 2936,
      features: [
        "Все возможности Стандарт-плана",
        "До 100 участников конференции",
        "Аналитика и статистика конференций",
        "Интеграция с корпоративными системами",
        "Приоритетная поддержка"
      ]
    }
  };
  
  // Получаем информацию о выбранном плане
  const selectedPlan = planData[plan as keyof typeof planData];

  useEffect(() => {
    if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
      console.log('Необходимо добавить ключи API Stripe');
      toast({
        title: "Требуются ключи API",
        description: "Для работы платежной системы необходимы ключи Stripe API.",
        variant: "destructive",
      });
      setError("missing_keys");
      setLoading(false);
      return;
    }
    
    // Инициализируем платежный интент
    const createPaymentIntent = async () => {
      try {
        setLoading(true);
        
        let endpoint = isRenew ? "/api/renew-subscription" : "/api/create-payment-intent";
        
        const data = { 
          plan, 
          amount: price,
          months: selectedPlan.months 
        };
        
        const res = await apiRequest("POST", endpoint, data);
        
        if (!res.ok) {
          throw new Error("Ошибка создания платежа");
        }
        
        const { clientSecret } = await res.json();
        setClientSecret(clientSecret);
      } catch (err) {
        console.error("Ошибка при создании платежа:", err);
        setError("payment_intent_failed");
        toast({
          title: "Ошибка платежной системы",
          description: "Не удалось инициализировать платеж. Пожалуйста, попробуйте позже.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      createPaymentIntent();
    } else {
      setError("auth_required");
      setLoading(false);
    }
  }, [user, plan, price]);

  // Если пользователь не авторизован
  if (!user && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative">
        <InteractiveBackground className="fixed inset-0" />
        <div className="max-w-md w-full p-6 space-y-6 z-10">
          <div className="text-center mb-6">
            <Logo />
            <h1 className="text-2xl font-bold mt-4">Необходима авторизация</h1>
            <p className="text-muted-foreground mt-2">Для оформления подписки требуется вход в аккаунт</p>
          </div>
          <Card className="overflow-hidden cosmic-card">
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center p-6 space-y-4">
                <Shield className="h-12 w-12 text-primary opacity-60" />
                <p className="text-center">Пожалуйста, войдите в систему или создайте аккаунт для продолжения оформления подписки.</p>
                <div className="flex space-x-4 pt-4">
                  <Button variant="outline" onClick={() => setLocation('/')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    На главную
                  </Button>
                  <Button onClick={() => setLocation('/auth')}>
                    Войти в систему
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Обработка ошибки отсутствия ключей API
  if (error === "missing_keys") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative">
        <InteractiveBackground className="fixed inset-0" />
        <div className="max-w-md w-full p-6 space-y-6 z-10">
          <div className="text-center mb-6">
            <Logo />
            <h1 className="text-2xl font-bold mt-4">Платежная система не настроена</h1>
            <p className="text-muted-foreground mt-2">Отсутствуют необходимые ключи API Stripe</p>
          </div>
          <Card className="overflow-hidden cosmic-card">
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center p-6 space-y-4">
                <Shield className="h-12 w-12 text-primary opacity-60" />
                <p className="text-center">Для работы платежной системы необходимо добавить ключи API Stripe. Обратитесь к администратору системы.</p>
                <Button variant="outline" onClick={() => setLocation('/')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  На главную
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Пока загружается страница
  if (loading || !clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative">
        <InteractiveBackground className="fixed inset-0" />
        <div className="max-w-md w-full p-6 space-y-6 z-10 text-center">
          <Logo />
          <Card className="overflow-hidden cosmic-card">
            <CardContent className="p-8 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p>Инициализация платежной формы...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <InteractiveBackground className="fixed inset-0" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border/40 backdrop-blur-sm bg-background/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <Logo />
            </div>
            <Button variant="ghost" onClick={() => setLocation('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Вернуться на главную
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Checkout Form */}
          <div className="flex flex-col space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight cosmic-text">Оформление подписки</h1>
              <p className="text-muted-foreground mt-2">Заполните данные оплаты для активации выбранного плана</p>
            </div>
            
            <Card className="cosmic-card overflow-hidden">
              <CardHeader className="space-y-1 pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-2xl">Платежная информация</CardTitle>
                  <Badge variant="outline" className="bg-primary/5 border-primary/30">
                    <Shield className="mr-1 h-3 w-3" /> Безопасная оплата
                  </Badge>
                </div>
                <CardDescription>Введите данные карты для оплаты</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {clientSecret && stripePromise ? (
                  <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                    <PaymentForm plan={plan} amount={price} />
                  </Elements>
                ) : (
                  <div className="p-4 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p>Загрузка платежной формы...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Order Summary */}
          <div className="flex flex-col space-y-6">
            <div className="hidden md:block">
              <h2 className="text-xl font-semibold">Детали подписки</h2>
              <p className="text-muted-foreground mt-1">Проверьте выбранный план перед оплатой</p>
            </div>
            
            <Card className="cosmic-card overflow-hidden h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="flex justify-between items-center">
                  <span>План "{selectedPlan.name}"</span>
                  <WingsIcon type={plan === "premium" ? "gold" : "default"} size={30} />
                </CardTitle>
                <CardDescription>
                  {selectedPlan.months} {
                    selectedPlan.months === 1 ? 'месяц' : 
                    selectedPlan.months > 1 && selectedPlan.months < 5 ? 'месяца' : 'месяцев'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center pb-2">
                  <span className="text-muted-foreground">Стоимость</span>
                  <span className="font-medium">{price} ₽</span>
                </div>
                
                {selectedPlan.savings && (
                  <div className="flex justify-between items-center pb-2 text-green-400">
                    <span>Экономия</span>
                    <span>{selectedPlan.savings} ₽</span>
                  </div>
                )}
                
                <Separator className="bg-primary/20" />
                
                <div className="font-medium text-lg flex justify-between items-center">
                  <span>Итого</span>
                  <span className="text-primary">{price} ₽</span>
                </div>
                
                <div className="mt-4 space-y-2">
                  <h3 className="text-sm font-semibold mb-2">Что включено в план:</h3>
                  <ul className="space-y-1.5">
                    {selectedPlan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-4 bg-primary/5 rounded-md p-3 flex items-start">
                  <Clock className="h-4 w-4 text-primary/70 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-xs">
                    <p>После оплаты подписка будет активирована автоматически на вашем аккаунте. 
                    Вы сможете в любой момент заморозить подписку, если понадобится перерыв.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}