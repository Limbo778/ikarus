import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'wouter';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Logo } from '@/components/Logo';
import { BrandTelegram } from '@/components/ui/brand-telegram';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { AlertCircle, CheckCircle2, Video, Group, Save } from 'lucide-react';
import InteractiveBackground from '@/components/InteractiveBackground';
// Удалён импорт OrbitingParticles - больше нет анимаций движения по часовой стрелке

// Схема для входа
const loginSchema = z.object({
  username: z.string().min(1, 'Имя пользователя обязательно'),
  password: z.string().min(1, 'Пароль обязателен'),
});

// Расширенная схема для регистрации с проверкой сложности пароля
const registerSchema = z.object({
  username: z.string()
    .min(3, 'Имя пользователя должно содержать минимум 3 символа')
    .max(50, 'Имя пользователя не должно превышать 50 символов')
    .regex(/^[a-zA-Z0-9_]+$/, 'Допустимы только латинские буквы, цифры и подчеркивания'),
  
  email: z.string()
    .min(1, 'Email обязателен')
    .email('Введите корректный email адрес'),
  
  password: z.string()
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .max(100, 'Пароль не должен превышать 100 символов')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, 
      'Пароль должен содержать заглавные и строчные буквы, цифры и специальные символы'),
  
  confirmPassword: z.string()
    .min(1, 'Подтверждение пароля обязательно'),
  
  terms: z.boolean()
    .refine(val => val === true, {
      message: 'Необходимо принять условия использования',
    }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

interface TelegramStatus {
  isConnected: boolean;
  connectedAt: string | null;
}

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('user');
  const [isRegistering, setIsRegistering] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showTelegramForm, setShowTelegramForm] = useState(false);
  
  // Состояние для отслеживания силы пароля
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  });
  
  // Форма для входа
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });
  
  // Форма для регистрации
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
  });
  
  // Функция для проверки сложности пароля
  const checkPasswordStrength = (password: string) => {
    setPasswordStrength({
      score: calculatePasswordScore(password),
      hasMinLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[^A-Za-z0-9]/.test(password)
    });
  };
  
  // Вычисляет оценку надежности пароля по шкале от 0 до 4
  const calculatePasswordScore = (password: string) => {
    if (!password) return 0;
    let score = 0;
    
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 0.5;
    if (/[^A-Za-z0-9]/.test(password)) score += 1.5;
    
    return Math.min(Math.floor(score), 4);
  };
  
  // Обработчик изменения в поле пароля для регистрации
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    registerForm.setValue('password', password);
    checkPasswordStrength(password);
  };
  
  // Обработчик отправки формы входа
  const onLoginSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values, {
      onError: (error) => {
        toast({
          title: "Ошибка входа",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };
  
  // Обработчик отправки формы регистрации
  const onRegisterSubmit = (values: RegisterFormValues) => {
    const { confirmPassword, terms, ...registrationData } = values;
    registerMutation.mutate(registrationData, {
      onError: (error) => {
        toast({
          title: "Ошибка регистрации",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };
  
  // Проверка настройки и статуса подключения Telegram бота
  const { data: telegramStatus, isLoading: isLoadingTelegram } = useQuery<TelegramStatus>({
    queryKey: ['/api/telegram/status'],
  });
  
  // Проверка, настроена ли система
  const { data: configurationStatus } = useQuery<{ isConfigured: boolean }>({
    queryKey: ['/api/telegram/is-configured'],
  });
  
  // Telegram bot token form
  const botTokenForm = useForm<{ botToken: string }>({
    defaultValues: {
      botToken: '',
    },
  });
  
  // Connect Telegram bot mutation
  const connectTelegramMutation = useMutation({
    mutationFn: async (data: { botToken: string }) => {
      const res = await apiRequest('POST', '/api/telegram/connect', data);
      if (res === null) throw new Error("Не удалось выполнить запрос");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Telegram бот подключен',
        description: 'Теперь вы можете регистрировать администраторов через Telegram',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/telegram/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/telegram/is-configured'] });
      setShowTelegramForm(false);
      
      // Если мы находимся на экране первоначальной настройки, перезагрузим страницу
      if (configurationStatus && !configurationStatus.isConfigured) {
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка подключения',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/home" />;
  }

  // Показываем страницу первоначальной настройки, если система еще не настроена и бот не подключен
  if (configurationStatus && !configurationStatus.isConfigured && !telegramStatus?.isConnected) {
    return (
      <div className="auth-page-layout flex items-center justify-center px-4 py-6 sm:px-6 lg:px-8 font-sans">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-10">
            <Logo size="lg" withText={false} />
            <h2 className="mt-6 text-5xl font-bold gradient-heading">Ikarus</h2>
            <p className="mt-4 text-lg text-primary/80">
              Первоначальная настройка бизнес-платформы
            </p>
          </div>
          
          <Card className="glass-card hover-card-animation">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">Настройка Telegram бота</CardTitle>
              <CardDescription>
                Подключите Telegram бота для установки системы
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 glass-panel">
              <form 
                className="space-y-6"
                onSubmit={botTokenForm.handleSubmit((data) => connectTelegramMutation.mutate(data))}
              >
                <div className="space-y-2">
                  <Label htmlFor="setup-botToken" className="text-sm font-medium">Токен Telegram бота</Label>
                  <Input 
                    id="setup-botToken" 
                    placeholder="Введите токен бота"
                    className="font-mono text-sm bg-background/50 border-primary/20 focus:border-primary/60"
                    {...botTokenForm.register('botToken', { required: 'Необходимо указать токен бота' })}
                  />
                  <p className="text-xs text-primary/70 pt-1 flex items-center gap-1">
                    <BrandTelegram className="h-3 w-3" />
                    Получите токен бота у @BotFather в Telegram
                  </p>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 h-11 text-white shadow-lg shadow-primary/20"
                  disabled={connectTelegramMutation.isPending}
                >
                  {connectTelegramMutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Настройка...
                    </>
                  ) : (
                    <>
                      <BrandTelegram className="mr-2 h-5 w-5" />
                      Подключить бота
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans">
      <InteractiveBackground />
      
      <div className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8 relative min-h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-5 w-full max-w-6xl gap-8 animate-slide-up">
          <div className="hidden lg:flex flex-col justify-center items-center p-8 col-span-2 relative">
            <div className="mb-8 perspective-container">
              <div className="relative perspective-card animate-float">
                <Logo size="xl" withText={false} />
              </div>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold cosmic-text mb-6 text-center" data-text="IKARUS">IKARUS</h1>
            <p className="text-lg text-primary/80 text-center animate-slide-up">
              Профессиональные видеоконференции для бизнеса
            </p>
            
            <div className="mt-16 relative w-full">
              <div className="cosmic-card overflow-hidden rounded-2xl p-8 relative backdrop-blur-sm bg-background/20 border border-primary/30 animate-slide-up shadow-xl shadow-primary/10">
                {/* Отключена анимация вращения орбитальных частиц */}
                
                <h3 className="text-xl font-bold mb-4 neon-text">Возможности платформы</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center animate-pulse-slow mr-3 mt-0.5">
                      <Video className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm">HD-видеоконференции с низкой задержкой</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center animate-pulse-slow mr-3 mt-0.5" style={{animationDelay: '0.5s'}}>
                      <Group className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm">До 100 участников в Pro-версии</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center animate-pulse-slow mr-3 mt-0.5" style={{animationDelay: '1s'}}>
                      <Save className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm">Запись конференций в облако</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center col-span-3 z-10 perspective-container">
            <div className="text-center lg:hidden mb-8 animate-slide-up relative">
              <div className="relative perspective-card animate-float inline-block">
                <Logo size="lg" withText={false} />
              </div>
              <h2 className="mt-4 text-3xl font-bold cosmic-text" data-text="IKARUS">IKARUS</h2>
              <p className="text-sm text-primary/80 mt-2">Профессиональные видеоконференции для бизнеса</p>
            </div>

            <Tabs defaultValue="user" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 cosmic-card backdrop-blur-sm border border-primary/30 shadow-xl shadow-primary/10 p-1 overflow-hidden rounded-xl">
                <TabsTrigger 
                  value="user" 
                  className="data-[state=active]:bg-primary/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=active]:neon-text transition-all duration-300 z-10 relative backdrop-blur-sm"
                >
                  Участник
                </TabsTrigger>
                <TabsTrigger 
                  value="admin" 
                  className="data-[state=active]:bg-primary/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=active]:neon-text transition-all duration-300 z-10 relative backdrop-blur-sm"
                >
                  Хост
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="user">
                <div className="cosmic-card overflow-hidden rounded-2xl relative backdrop-blur-sm bg-background/20 border border-primary/30 animate-slide-up shadow-xl shadow-primary/10 min-h-[510px]">
                  <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center shadow-lg border border-primary/30">
                    <Video className="h-6 w-6 text-primary opacity-80" />
                  </div>
                  
                  <CardHeader className="text-center pt-24 pb-2">
                    <CardTitle className="text-2xl font-bold neon-text">Вход для участника</CardTitle>
                    <CardDescription className="text-primary/70 mt-2">
                      Введите ваше имя и ID конференции для участия
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-8">
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                          <span className="inline-flex items-center justify-center bg-primary/10 w-6 h-6 rounded-full">
                            <span className="text-primary text-xs">1</span>
                          </span>
                          Ваше имя
                        </Label>
                        <div className="relative">
                          <Input 
                            id="name" 
                            type="text" 
                            placeholder="Введите имя"
                            className="bg-background/50 border-primary/20 focus:border-primary/60 pl-10 h-12"
                            {...loginForm.register('username')}
                          />
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <div className="w-5 h-5 text-primary opacity-70">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                              </svg>
                            </div>
                          </div>
                        </div>
                        {loginForm.formState.errors.username && (
                          <p className="text-sm text-destructive">{loginForm.formState.errors.username.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="conference-id" className="text-sm font-medium flex items-center gap-2">
                          <span className="inline-flex items-center justify-center bg-primary/10 w-6 h-6 rounded-full">
                            <span className="text-primary text-xs">2</span>
                          </span>
                          ID конференции
                        </Label>
                        <div className="relative">
                          <Input 
                            id="conference-id" 
                            type="password" 
                            placeholder="Введите ID конференции"
                            className="bg-background/50 border-primary/20 focus:border-primary/60 pl-10 h-12"
                            {...loginForm.register('password')}
                          />
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <div className="w-5 h-5 text-primary opacity-70">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                              </svg>
                            </div>
                          </div>
                        </div>
                        {loginForm.formState.errors.password && (
                          <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                        )}
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-primary hover:bg-primary/90 h-12 text-white shadow-lg shadow-primary/20 mt-4"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Подключение...
                          </>
                        ) : 'Подключиться к конференции'}
                      </Button>
                    </form>
                  </CardContent>
                </div>
              </TabsContent>
              
              <TabsContent value="admin">
                <div className="cosmic-card overflow-hidden rounded-2xl relative backdrop-blur-sm bg-background/20 border border-primary/30 animate-slide-up shadow-xl shadow-primary/10 min-h-[510px]">
                  <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center shadow-lg border border-primary/30">
                    <Group className="h-6 w-6 text-primary opacity-80" />
                  </div>
                  
                  <CardHeader className="text-center pt-24 pb-2">
                    <CardTitle className="text-2xl font-bold neon-text">
                      {isRegistering ? 'Регистрация нового хоста' : 'Вход для хоста'}
                    </CardTitle>
                    <CardDescription className="text-primary/70 mt-2">
                      {isRegistering 
                        ? 'Создайте учетную запись для управления конференциями' 
                        : 'Войдите в систему для управления конференциями'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-8">
                    {!isRegistering ? (
                      <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                        <div className="space-y-2">
                          <Label htmlFor="admin-username" className="text-sm font-medium flex items-center gap-2">
                            <span className="inline-flex items-center justify-center bg-primary/10 w-6 h-6 rounded-full">
                              <span className="text-primary text-xs">1</span>
                            </span>
                            Имя пользователя
                          </Label>
                          <div className="relative">
                            <Input 
                              id="admin-username" 
                              type="text" 
                              placeholder="Введите имя пользователя"
                              className="bg-background/50 border-primary/20 focus:border-primary/60 pl-10 h-12"
                              {...loginForm.register('username')}
                            />
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                              <div className="w-5 h-5 text-primary opacity-70">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                                  <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                              </div>
                            </div>
                          </div>
                          {loginForm.formState.errors.username && (
                            <p className="text-sm text-destructive">{loginForm.formState.errors.username.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="admin-password" className="text-sm font-medium flex items-center gap-2">
                            <span className="inline-flex items-center justify-center bg-primary/10 w-6 h-6 rounded-full">
                              <span className="text-primary text-xs">2</span>
                            </span>
                            Пароль
                          </Label>
                          <div className="relative">
                            <Input
                              id="admin-password"
                              type="password"
                              placeholder="Введите пароль"
                              className="bg-background/50 border-primary/20 focus:border-primary/60 pl-10 h-12"
                              {...loginForm.register('password')}
                            />
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                              <div className="w-5 h-5 text-primary opacity-70">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                              </div>
                            </div>
                          </div>
                          {loginForm.formState.errors.password && (
                            <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                          )}
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full bg-primary hover:bg-primary/90 h-12 text-white shadow-lg shadow-primary/20 mt-4"
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Выполняется вход...
                            </>
                          ) : 'Войти как хост'}
                        </Button>
                        

                        
                        <div className="pt-2 text-center">
                          <Button 
                            type="button" 
                            variant="link" 
                            className="text-xs text-primary/70 hover:text-primary"
                            onClick={() => setIsRegistering(true)}
                          >
                            Нет аккаунта? Зарегистрироваться
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                        <div className="space-y-1">
                          <Label htmlFor="register-username" className="text-sm font-medium flex items-center gap-2">
                            <span className="inline-flex items-center justify-center bg-primary/10 w-6 h-6 rounded-full">
                              <span className="text-primary text-xs">1</span>
                            </span>
                            Имя пользователя
                          </Label>
                          <div className="relative">
                            <Input 
                              id="register-username" 
                              type="text" 
                              placeholder="Введите имя пользователя"
                              className="bg-background/50 border-primary/20 focus:border-primary/60 pl-10 h-11"
                              {...registerForm.register('username')}
                            />
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                              <div className="w-5 h-5 text-primary opacity-70">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                                  <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                              </div>
                            </div>
                          </div>
                          {registerForm.formState.errors.username && (
                            <p className="text-xs text-destructive">{registerForm.formState.errors.username.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="register-email" className="text-sm font-medium flex items-center gap-2">
                            <span className="inline-flex items-center justify-center bg-primary/10 w-6 h-6 rounded-full">
                              <span className="text-primary text-xs">2</span>
                            </span>
                            Email
                          </Label>
                          <div className="relative">
                            <Input 
                              id="register-email" 
                              type="email" 
                              placeholder="Введите email"
                              className="bg-background/50 border-primary/20 focus:border-primary/60 pl-10 h-11"
                              {...registerForm.register('email')}
                            />
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                              <div className="w-5 h-5 text-primary opacity-70">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                  <polyline points="22,6 12,13 2,6"></polyline>
                                </svg>
                              </div>
                            </div>
                          </div>
                          {registerForm.formState.errors.email && (
                            <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="register-password" className="text-sm font-medium flex items-center gap-2">
                            <span className="inline-flex items-center justify-center bg-primary/10 w-6 h-6 rounded-full">
                              <span className="text-primary text-xs">3</span>
                            </span>
                            Пароль
                          </Label>
                          <div className="relative">
                            <Input 
                              id="register-password" 
                              type="password" 
                              placeholder="Введите пароль"
                              className="bg-background/50 border-primary/20 focus:border-primary/60 pl-10 h-11"
                              {...registerForm.register('password', { 
                                onChange: handlePasswordChange 
                              })}
                            />
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                              <div className="w-5 h-5 text-primary opacity-70">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                              </div>
                            </div>
                          </div>
                          
                          {/* Индикатор надежности пароля */}
                          <div className="mt-1 mb-2">
                            <div className="w-full h-1 bg-background/70 rounded-full overflow-hidden flex">
                              {[...Array(4)].map((_, index) => (
                                <div 
                                  key={index}
                                  className={`h-full flex-1 ${
                                    index < passwordStrength.score 
                                      ? index === 0 
                                        ? 'bg-destructive' 
                                        : index === 1 
                                          ? 'bg-orange-500' 
                                          : index === 2 
                                            ? 'bg-yellow-500' 
                                            : 'bg-green-500'
                                      : 'bg-transparent'
                                  } mx-px`}
                                />
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <div className={`text-xs ${passwordStrength.hasMinLength ? 'text-green-500' : 'text-muted-foreground'} flex items-center`}>
                                <span className="mr-1">{passwordStrength.hasMinLength ? '✓' : '○'}</span>
                                <span>8+ символов</span>
                              </div>
                              <div className={`text-xs ${passwordStrength.hasUppercase ? 'text-green-500' : 'text-muted-foreground'} flex items-center ml-2`}>
                                <span className="mr-1">{passwordStrength.hasUppercase ? '✓' : '○'}</span>
                                <span>Заглавные</span>
                              </div>
                              <div className={`text-xs ${passwordStrength.hasNumber ? 'text-green-500' : 'text-muted-foreground'} flex items-center ml-2`}>
                                <span className="mr-1">{passwordStrength.hasNumber ? '✓' : '○'}</span>
                                <span>Цифры</span>
                              </div>
                              <div className={`text-xs ${passwordStrength.hasSpecialChar ? 'text-green-500' : 'text-muted-foreground'} flex items-center ml-2`}>
                                <span className="mr-1">{passwordStrength.hasSpecialChar ? '✓' : '○'}</span>
                                <span>Спецсимволы</span>
                              </div>
                            </div>
                          </div>
                          
                          {registerForm.formState.errors.password && (
                            <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="register-confirm-password" className="text-sm font-medium flex items-center gap-2">
                            <span className="inline-flex items-center justify-center bg-primary/10 w-6 h-6 rounded-full">
                              <span className="text-primary text-xs">4</span>
                            </span>
                            Подтверждение пароля
                          </Label>
                          <div className="relative">
                            <Input 
                              id="register-confirm-password" 
                              type="password" 
                              placeholder="Повторите пароль"
                              className="bg-background/50 border-primary/20 focus:border-primary/60 pl-10 h-11"
                              {...registerForm.register('confirmPassword')}
                            />
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                              <div className="w-5 h-5 text-primary opacity-70">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                </svg>
                              </div>
                            </div>
                          </div>
                          {registerForm.formState.errors.confirmPassword && (
                            <p className="text-xs text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-4">
                          <input
                            type="checkbox"
                            id="terms"
                            className="rounded border-primary/30 text-primary focus:ring-primary/30"
                            {...registerForm.register('terms')}
                          />
                          <Label 
                            htmlFor="terms" 
                            className="text-xs text-primary/80 leading-tight cursor-pointer"
                          >
                            Я соглашаюсь с условиями использования сервиса и политикой конфиденциальности
                          </Label>
                        </div>
                        {registerForm.formState.errors.terms && (
                          <p className="text-xs text-destructive mt-1">{registerForm.formState.errors.terms.message}</p>
                        )}
                        
                        <Button 
                          type="submit" 
                          className="w-full bg-primary hover:bg-primary/90 h-11 text-white shadow-lg shadow-primary/20 mt-2"
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Регистрация...
                            </>
                          ) : 'Зарегистрироваться'}
                        </Button>
                        
                        <div className="pt-2 text-center">
                          <Button 
                            type="button" 
                            variant="link" 
                            className="text-xs text-primary/70 hover:text-primary"
                            onClick={() => setIsRegistering(false)}
                          >
                            Уже есть аккаунт? Войти
                          </Button>
                        </div>
                      </form>
                    )}
                  </CardContent>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}