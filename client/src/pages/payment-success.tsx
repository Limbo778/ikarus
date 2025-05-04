import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useStripe } from '@stripe/react-stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowLeft, Star, Shield, Loader2, AlertTriangle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import InteractiveBackground from '@/components/InteractiveBackground';
import { useAuth } from '@/hooks/use-auth';
import WingsIcon from '@/components/icons/WingsIcon';

export default function PaymentSuccess() {
  const [_, setLocation] = useLocation();
  const stripe = useStripe();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'processing' | 'error' | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<{
    amount: number;
    plan: string;
    months: number;
  } | null>(null);
  const { user } = useAuth();

  // Получаем результат платежа из URL
  useEffect(() => {
    if (!stripe) {
      return;
    }

    const clientSecret = new URLSearchParams(window.location.search).get('payment_intent_client_secret');

    if (!clientSecret) {
      setPaymentStatus('error');
      setLoading(false);
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      if (!paymentIntent) {
        setPaymentStatus('error');
        setLoading(false);
        return;
      }

      switch (paymentIntent.status) {
        case "succeeded":
          setPaymentStatus('success');
          // Извлекаем информацию о плане из метаданных платежа
          if (paymentIntent.metadata) {
            setPaymentInfo({
              amount: paymentIntent.amount ? paymentIntent.amount / 100 : 0,
              plan: paymentIntent.metadata.plan || 'basic',
              months: parseInt(paymentIntent.metadata.months || '1', 10)
            });
          }
          break;
        case "processing":
          setPaymentStatus('processing');
          break;
        default:
          setPaymentStatus('error');
          break;
      }
      setLoading(false);
    });
  }, [stripe]);

  // Загрузочное состояние
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative">
        <InteractiveBackground className="fixed inset-0" />
        <div className="max-w-md w-full p-6 space-y-6 z-10 text-center">
          <Logo />
          <Card className="overflow-hidden cosmic-card">
            <CardContent className="p-8 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p>Проверяем статус платежа...</p>
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
              На главную
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-lg mx-auto">
          <Card className="cosmic-card overflow-hidden animate-slide-up">
            <CardHeader className="text-center pb-6">
              {paymentStatus === 'success' && (
                <>
                  <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <CardTitle className="text-2xl">Оплата успешно завершена!</CardTitle>
                  <CardDescription>Ваша подписка была успешно активирована</CardDescription>
                </>
              )}
              
              {paymentStatus === 'processing' && (
                <>
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                  <CardTitle className="text-2xl">Платеж обрабатывается</CardTitle>
                  <CardDescription>Это может занять некоторое время</CardDescription>
                </>
              )}
              
              {paymentStatus === 'error' && (
                <>
                  <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                  </div>
                  <CardTitle className="text-2xl">Ошибка платежа</CardTitle>
                  <CardDescription>Возникли проблемы при обработке платежа</CardDescription>
                </>
              )}
            </CardHeader>
            
            <CardContent className="space-y-6 pb-8">
              {paymentStatus === 'success' && paymentInfo && (
                <>
                  <div className="rounded-lg bg-primary/5 p-4 border border-primary/20">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="font-medium">Детали подписки</h3>
                        <p className="text-sm text-muted-foreground">
                          {user?.email || 'Пользователь'}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-primary/10 border-primary/30">
                        <WingsIcon type="gold" size={16} className="mr-1" />
                        PRO-аккаунт
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">План:</span>
                        <span>{paymentInfo.plan.charAt(0).toUpperCase() + paymentInfo.plan.slice(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Период:</span>
                        <span>{paymentInfo.months} мес.</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span className="text-muted-foreground">Сумма:</span>
                        <span>{paymentInfo.amount} ₽</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-medium flex items-center">
                      <Star className="h-4 w-4 text-primary mr-2" />
                      Что теперь доступно:
                    </h3>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-400 mr-2 mt-0.5" />
                        <span className="text-sm">Конференции без ограничения времени</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-400 mr-2 mt-0.5" />
                        <span className="text-sm">Увеличенный лимит участников (до 100 человек)</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-400 mr-2 mt-0.5" />
                        <span className="text-sm">Запись конференций и аналитика</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-400 mr-2 mt-0.5" />
                        <span className="text-sm">Все расширенные инструменты для работы с конференциями</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="pt-4 flex flex-col space-y-3">
                    <Button onClick={() => setLocation('/')}>
                      Перейти в личный кабинет
                    </Button>
                    <Button variant="outline" onClick={() => setLocation('/dashboard')}>
                      Создать новую конференцию
                    </Button>
                  </div>
                </>
              )}
              
              {paymentStatus === 'processing' && (
                <>
                  <p className="text-center text-muted-foreground">
                    Ваш платеж обрабатывается платежной системой. Это может занять некоторое время.
                    Вы будете уведомлены о результате по электронной почте.
                  </p>
                  
                  <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30 text-sm">
                    <div className="flex items-start">
                      <Shield className="h-5 w-5 text-blue-400 mr-2 mt-0.5" />
                      <p>
                        Не закрывайте эту страницу, пока обработка не завершится. 
                        Вы будете автоматически перенаправлены, когда платеж будет подтвержден.
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button variant="outline" onClick={() => setLocation('/')}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Вернуться на главную
                    </Button>
                  </div>
                </>
              )}
              
              {paymentStatus === 'error' && (
                <>
                  <p className="text-center text-muted-foreground">
                    Произошла ошибка при обработке вашего платежа. Пожалуйста, проверьте 
                    данные платежа и попробуйте снова.
                  </p>
                  
                  <div className="bg-destructive/10 rounded-lg p-4 border border-destructive/30 text-sm">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-destructive mr-2 mt-0.5" />
                      <p>
                        Возможные причины ошибки:<br />
                        - Недостаточно средств на карте<br />
                        - Банк отклонил транзакцию<br />
                        - Проблема с платежной системой
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-4 flex space-x-4">
                    <Button variant="outline" onClick={() => setLocation('/')}>
                      На главную
                    </Button>
                    <Button onClick={() => setLocation('/checkout')}>
                      Попробовать снова
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}