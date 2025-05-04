import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Calendar, Clock, Group, Save, Video, Plus, Zap, Award, Crown, 
  UserCircle, Settings, LogOut, CreditCard, Lock, Mail, Coins,
  SnowflakeIcon, Download, Eye, UserIcon, PauseCircle, ExternalLink,
  CheckIcon, XIcon, BarChart, GroupIcon, RefreshCw, Info, ShieldCheck,
  Loader2, KeyRound, Key, CheckCircle, Snowflake, CheckCheck, Copy,
  Activity, Fingerprint, ActivitySquare, AlertCircle, Shield, DollarSign,
  AlertTriangle, LockKeyhole
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Logo } from '@/components/Logo';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from "@/hooks/use-toast";
import type { Conference, Participant } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import CreateConferenceModal from '@/components/CreateConferenceModal';
import ConferenceDetailsModal from '@/components/ConferenceDetailsModal';
import { OrbitingParticles } from '@/components/OrbitingParticles';
import InteractiveBackground from '@/components/InteractiveBackground';
import WingsIcon from '@/components/icons/WingsIcon';
import { 
  Area, AreaChart, BarChart as RechartsBarChart, CartesianGrid, 
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [_, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedConference, setSelectedConference] = useState<Conference | null>(null);
  const [freezeCount, setFreezeCount] = useState(3); // Количество оставшихся заморозок
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatar || "");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    isLoading: false
  });
  
  // Состояния для двухфакторной аутентификации
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [secretKey, setSecretKey] = useState("YNC6QW3H2CZ5AA3D");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const { toast } = useToast();

  // Состояние для отслеживания визуальных эффектов
  const [telegramConnected, setTelegramConnected] = useState(user?.telegramId ? true : false);
  const hasSubscription = user?.subscriptionType === 'pro'; // Определяется на основе данных пользователя
  
  // Вычисляем динамический процент прогресса для оставшихся дней подписки (если она есть)
  const subscriptionProgress = useMemo(() => {
    if (!user?.subscriptionExpiresAt) return 100; // Если нет даты истечения, показываем 100%
    
    const now = new Date();
    const expiryDate = new Date(user.subscriptionExpiresAt);
    const totalDurationDays = 30; // Предполагаем что подписка выдается на 30 дней стандартно
    
    const remainingDays = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const progress = Math.min(100, Math.max(0, Math.round((remainingDays / totalDurationDays) * 100)));
    
    return progress;
  }, [user?.subscriptionExpiresAt]);

  // Fetch user's conferences
  const { data, isLoading } = useQuery<{ conferences: Conference[] }>({
    queryKey: ['/api/conferences'],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0] as string, {
        credentials: 'include'
      });
      
      if (!res.ok) {
        throw new Error('Ошибка загрузки конференций');
      }
      
      return res.json();
    }
  });

  // End conference mutation
  const endConferenceMutation = useMutation({
    mutationFn: async (conferenceId: string) => {
      const res = await apiRequest('POST', `/api/conferences/${conferenceId}/end`, {});
      if (res === null) throw new Error("Не удалось выполнить запрос");
      return (await res.json()).conference as Conference;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conferences'] });
    }
  });

  // Handle conference creation success
  const handleConferenceCreated = (conference: Conference) => {
    setSelectedConference(conference);
    setIsDetailsModalOpen(true);
  };

  // Handle joining a conference
  const handleJoinConference = (conferenceId: string) => {
    setLocation(`/conference/${conferenceId}`);
  };
  
  // Handle password form changes
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm({
      ...passwordForm,
      [e.target.name]: e.target.value
    });
  };
  
  // Handle password update
  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Устанавливаем статус загрузки
    setPasswordForm({
      ...passwordForm,
      isLoading: true
    });
    
    // Имитация запроса на сервер
    setTimeout(() => {
      // Логика обновления пароля в будущем
      console.log("Обновление пароля:", passwordForm);
      
      // Успешное обновление
      toast({
        title: "Пароль обновлен",
        description: "Ваш пароль был успешно изменен",
        variant: "default",
      });
      
      // Сброс формы
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        isLoading: false
      });
    }, 1000);
  };
  
  // Функция для обновления аватара
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // В будущем тут должен быть запрос на сервер для загрузки файла
      const fileUrl = URL.createObjectURL(e.target.files[0]);
      setAvatarUrl(fileUrl);
    }
  };
  
  // Функция для привязки Telegram
  const handleConnectTelegram = () => {
    // Показываем QR-код или инструкцию для привязки Telegram
    const botName = 'YancuicBot';
    const command = `/connect ${user?.id}_${Math.floor(Math.random() * 1000000)}`;
    
    alert(`Чтобы привязать Telegram, пожалуйста:\n1. Откройте Telegram и найдите бота @${botName}\n2. Отправьте боту команду: ${command}`);
    
    // В реальном приложении здесь должен быть API запрос, проверяющий статус привязки
    setTelegramConnected(true);
  };
  
  // Функция для заморозки подписки
  const handleFreezeSubscription = () => {
    if (freezeCount > 0) {
      // Запрашиваем подтверждение заморозки
      if (window.confirm("Вы уверены, что хотите заморозить подписку на 14 дней? У вас осталось " + freezeCount + " заморозок.")) {
        setFreezeCount(freezeCount - 1);
        
        // В будущем тут должен быть API-запрос к серверу для заморозки подписки
        // Например: await apiRequest('POST', `/api/subscription/freeze`, {});
        
        // Показываем уведомление об успешной заморозке
        alert("Подписка успешно заморожена на 14 дней. Срок окончания подписки продлен.");
      }
    }
  };
  
  // Копирование текста в буфер обмена
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Скопировано",
        description: "Текст скопирован в буфер обмена",
      });
    }).catch((err) => {
      console.error('Не удалось скопировать текст: ', err);
    });
  };
  
  // Включение/выключение 2FA
  const handleToggle2FA = (checked: boolean) => {
    setTwoFactorEnabled(checked);
    
    // Если включаем 2FA, генерируем новый секретный ключ
    if (checked) {
      // В реальности запрашиваем с сервера новый ключ
      // const response = await apiRequest('POST', '/api/twofa/generate', {});
      // setSecretKey(response.secretKey);
      
      // Имитация
      setSecretKey("YNC6QW3H2CZ5AA3D");
    } else {
      // Отключаем 2FA
      setBackupCodes([]);
      setVerificationCode("");
      
      toast({
        title: "Двухфакторная аутентификация отключена",
        description: "Мы рекомендуем использовать 2FA для дополнительной защиты аккаунта",
        variant: "destructive",
      });
    }
  };
  
  // Верификация кода из приложения
  const handleVerify2FA = () => {
    setIsVerifying(true);
    
    // Имитация проверки на сервере
    setTimeout(() => {
      if (verificationCode === '123456') {
        toast({
          title: "Успешно!",
          description: "Двухфакторная аутентификация активирована",
          variant: "default",
        });
        
        // Генерируем резервные коды
        handleGenerateBackupCodes();
      } else {
        toast({
          title: "Ошибка",
          description: "Неверный код верификации. Попробуйте еще раз",
          variant: "destructive",
        });
      }
      
      setIsVerifying(false);
    }, 1000);
  };
  
  // Генерация резервных кодов
  const handleGenerateBackupCodes = () => {
    // В реальности запрашиваем коды с сервера
    // const response = await apiRequest('POST', '/api/twofa/backup-codes', {});
    // setBackupCodes(response.backupCodes);
    
    // Имитация
    const codes = [];
    for (let i = 0; i < 6; i++) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      codes.push(code.slice(0, 3) + "-" + code.slice(3));
    }
    setBackupCodes(codes);
  };

  // Stats calculations
  const activeConferences = data?.conferences.filter(conf => conf.active === true) || [];
  const totalParticipants = data?.conferences.reduce((sum, conf) => sum + (conf.currentParticipants || 0), 0) || 0;
  const totalHours = data?.conferences.reduce((sum, conf) => {
    const duration = conf.duration || 0;
    return sum + Math.floor(typeof duration === 'number' ? duration / 3600 : 0);
  }, 0) || 0;
  const completedConferences = data?.conferences.filter(conf => conf.active === false) || [];

  // Format duration to hours and minutes
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}ч ${minutes.toString().padStart(2, '0')}м`;
  };

  return (
    <div className="min-h-screen font-sans">
      {/* Интерактивный фон */}
      <InteractiveBackground />
      
      {/* Header */}
      <header className="border-b border-primary/20 backdrop-blur-lg bg-background/30 sticky top-0 z-50 border-glow-effect">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="relative group">
              <Logo className="animate-glow transform transition-transform group-hover:scale-105 duration-500" />
              <div className="absolute -top-1 -left-1 -right-1 -bottom-1 opacity-40 transition-opacity duration-300 group-hover:opacity-70">
                <OrbitingParticles count={3} maxSize={3} />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Навигация для desktop */}
              <div className="hidden md:flex space-x-2">
                <Button 
                  variant="ghost" 
                  className={`font-medium glass-button stardust relative overflow-hidden group ${activeTab === "account" ? "bg-primary/20" : ""}`}
                  onClick={() => setActiveTab("account")}
                >
                  <UserCircle className="h-4 w-4 mr-2 text-primary/70" />
                  <span className="relative z-10">Аккаунт</span>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <OrbitingParticles count={2} maxSize={2} />
                  </div>
                </Button>
                <Button 
                  variant="ghost" 
                  className={`font-medium glass-button stardust relative overflow-hidden group ${activeTab === "dashboard" ? "bg-primary/20" : ""}`}
                  onClick={() => setActiveTab("dashboard")}
                >
                  <Settings className="h-4 w-4 mr-2 text-primary/70" />
                  <span className="relative z-10">Панель управления</span>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <OrbitingParticles count={2} maxSize={2} />
                  </div>
                </Button>
              </div>
              
              {/* Мобильный селект для переключения вкладок */}
              <div className="relative md:hidden">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-primary/30 glass-button flex items-center gap-1"
                  onClick={() => setActiveTab(activeTab === "account" ? "dashboard" : "account")}
                >
                  {activeTab === "account" ? (
                    <>
                      <UserCircle className="h-4 w-4 text-primary/70" />
                      <span>Аккаунт</span>
                    </>
                  ) : (
                    <>
                      <Settings className="h-4 w-4 text-primary/70" />
                      <span>Панель</span>
                    </>
                  )}
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Бейдж статуса подписки */}
                <div className="relative perspective-container">
                  {hasSubscription ? (
                    <Badge 
                      variant="outline" 
                      className="border-primary/40 bg-primary/5 backdrop-blur-md px-3 py-1 stardust animate-pulse-slow hover:border-primary/60 transition-all cursor-pointer"
                      onClick={() => setActiveTab("account")}
                    >
                      <div className="mr-1.5 relative flex items-center">
                        <div className="mr-1">
                          <WingsIcon type="gold" size={16} className="animate-pulse-slow" />
                        </div>
                        <Crown className="h-3.5 w-3.5 text-purple-300" />
                      </div>
                      <span className="hidden sm:inline">Pro</span>
                    </Badge>
                  ) : (
                    <Badge 
                      variant="outline" 
                      className="border-gray-500/40 bg-gray-500/5 backdrop-blur-md px-3 py-1 hover:border-gray-500/60 transition-all cursor-pointer"
                      onClick={() => setActiveTab("account")}
                    >
                      <WingsIcon type="gray" size={16} className="mr-1" />
                      <span className="hidden sm:inline">Free</span>
                    </Badge>
                  )}
                </div>
                
                {/* Аватар пользователя */}
                <div className="relative perspective-container group">
                  <Avatar 
                    className="h-9 w-9 border border-primary/30 shadow-lg overflow-visible cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setActiveTab("account")}
                  >
                    <AvatarImage src={avatarUrl} alt={user?.username || "User"} />
                    <AvatarFallback className="bg-primary/90 text-white">
                      {user?.name?.[0] || user?.username?.[0] || 'У'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -inset-0.5 rounded-full opacity-0 group-hover:opacity-100 bg-primary/10 animate-pulse-slow pointer-events-none"></div>
                </div>
                
                {/* Кнопка выхода */}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => logoutMutation.mutate()}
                  className="rounded-full h-9 w-9 p-0 flex items-center justify-center hover:bg-destructive/10 transition-colors"
                  title="Выйти"
                >
                  <LogOut className="h-5 w-5 text-primary/70" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center md:text-left mb-8 animate-slide-up">
            <h1 className="text-4xl font-bold gradient-heading mb-3 neon-text">
              {activeTab === "account" ? "Профиль и настройки" : "Панель управления"}
            </h1>
            <p className="text-lg text-muted-foreground animate-slide-up" style={{animationDelay: '0.2s'}}>
              Добро пожаловать, <span className="text-primary font-medium">{user?.name || user?.username}</span>
            </p>
          </div>
          
          {/* Основной контент с вкладками */}
          <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="hidden">
              <TabsTrigger value="account">Аккаунт</TabsTrigger>
              <TabsTrigger value="dashboard">Панель управления</TabsTrigger>
            </TabsList>
            
            {/* Вкладка "Аккаунт" */}
            <TabsContent value="account" className="space-y-8">
              {/* Настройки профиля */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                  <Card className="cosmic-card overflow-hidden relative animate-slide-up h-full backdrop-blur-md border-glow-effect group">
                    <CardHeader className="pb-2 relative z-10">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-full bg-primary/10">
                          <UserCircle className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-xl font-bold neon-text transition-all duration-300 group-hover:scale-[1.02]">Профиль</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="relative backdrop-blur-sm bg-background/20 border-t border-border/20 p-6">
                      <div className="flex flex-col items-center space-y-6">
                        <div className="relative group/avatar">
                          <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0 opacity-0 group-hover/avatar:opacity-70 blur-md transition-opacity duration-500"></div>
                          <Avatar className="h-28 w-28 border-2 border-primary/50 shadow-xl shadow-primary/10 relative z-10 transition-transform duration-500 group-hover/avatar:scale-105">
                            <AvatarImage src={avatarUrl} alt={user?.username || "User"} />
                            <AvatarFallback className="bg-primary/90 text-white text-4xl">
                              {user?.name?.[0] || user?.username?.[0] || 'У'}
                            </AvatarFallback>
                          </Avatar>
                          <label 
                            htmlFor="avatar-upload" 
                            className="absolute -bottom-2 -right-2 h-8 w-8 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-lg border border-primary/30 hover:bg-primary/90 transition-all duration-300 hover:scale-110 z-20"
                          >
                            <Plus className="h-4 w-4 text-white" />
                            <input 
                              id="avatar-upload" 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleAvatarChange}
                            />
                          </label>
                          <div className="absolute inset-0 opacity-40 pointer-events-none">
                            <OrbitingParticles count={5} maxSize={3} centerX={50} centerY={50} />
                          </div>
                        </div>

                        <div className="space-y-2 w-full">
                          <div className="text-center">
                            <p className="text-xl font-medium cosmic-text transition-all duration-300 hover:text-primary">{user?.name || user?.username}</p>
                            <p className="text-muted-foreground text-sm hover:text-foreground transition-colors">{user?.email}</p>
                          </div>
                          
                          <div className="pt-4">
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm items-center p-2 rounded-lg hover:bg-primary/10 transition-colors duration-300">
                                <span className="flex items-center">
                                  <Fingerprint className="h-4 w-4 mr-2 text-primary/70" />
                                  ID аккаунта:
                                </span>
                                <Badge variant="outline" className="bg-primary/5 border-primary/30 px-2.5">
                                  {user?.id}
                                </Badge>
                              </div>
                              <Separator className="my-2 bg-primary/20" />
                              <div className="flex justify-between text-sm items-center p-2 rounded-lg hover:bg-primary/10 transition-colors duration-300">
                                <span className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-2 text-primary/70" />
                                  Дата регистрации:
                                </span>
                                <Badge variant="outline" className="bg-primary/5 border-primary/30 px-2.5">
                                  12.04.2025
                                </Badge>
                              </div>
                              <Separator className="my-2 bg-primary/20" />
                              <div className="flex justify-between text-sm items-center p-2 rounded-lg hover:bg-primary/10 transition-colors duration-300">
                                <span className="flex items-center">
                                  <ActivitySquare className="h-4 w-4 mr-2 text-primary/70" />
                                  Статус аккаунта:
                                </span>
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/20 px-2.5">
                                  Активен
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="md:col-span-2 space-y-8">
                  {/* Настройки безопасности */}
                  <Card className="cosmic-card overflow-hidden relative animate-slide-up">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl font-bold neon-text">Безопасность</CardTitle>
                    </CardHeader>
                    <CardContent className="relative backdrop-blur-sm bg-background/20 border-t border-border/20 p-6">
                      <div className="space-y-6">
                        {/* Смена пароля */}
                        <div>
                          <h3 className="text-base font-semibold flex items-center">
                            <Lock className="h-4 w-4 mr-2 text-primary/70" /> Смена пароля
                          </h3>
                          <form className="mt-4 space-y-4" onSubmit={handlePasswordUpdate}>
                            <div className="space-y-2">
                              <Label htmlFor="current-password">Текущий пароль</Label>
                              <Input 
                                id="current-password" 
                                name="currentPassword"
                                type="password" 
                                className="bg-background/50 border-primary/20 focus:border-primary/60"
                                value={passwordForm.currentPassword}
                                onChange={handlePasswordChange}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="new-password">Новый пароль</Label>
                              <Input 
                                id="new-password" 
                                name="newPassword"
                                type="password" 
                                className="bg-background/50 border-primary/20 focus:border-primary/60"
                                value={passwordForm.newPassword}
                                onChange={handlePasswordChange}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="confirm-password">Подтвердите пароль</Label>
                              <Input 
                                id="confirm-password" 
                                name="confirmPassword"
                                type="password" 
                                className="bg-background/50 border-primary/20 focus:border-primary/60"
                                value={passwordForm.confirmPassword}
                                onChange={handlePasswordChange}
                              />
                            </div>
                            <div>
                              <Button 
                                type="submit" 
                                variant="default"
                                className="w-full relative overflow-hidden cosmic-text glass-button"
                                data-text="Обновить пароль"
                              >
                                Обновить пароль
                              </Button>
                            </div>
                          </form>
                        </div>
                        
                        <Separator className="bg-primary/20" />
                        
                        {/* Двухфакторная аутентификация */}
                        <div>
                          <h3 className="text-base font-semibold flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-primary/70" /> Двухфакторная аутентификация
                          </h3>
                          <div className="mt-4 space-y-4">
                            <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-background/30 backdrop-blur-sm border border-primary/10">
                              <div>
                                <p className="font-medium">Статус 2FA</p>
                                <p className="text-sm text-muted-foreground">
                                  Дополнительный уровень защиты для вашего аккаунта
                                </p>
                              </div>
                              <div className="flex items-center">
                                <Badge variant="outline" className={`mr-4 ${twoFactorEnabled ? "bg-green-500/20 text-green-400 border-green-500/20" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/20"}`}>
                                  {twoFactorEnabled ? "Включено" : "Выключено"}
                                </Badge>
                                <Switch 
                                  checked={twoFactorEnabled} 
                                  onCheckedChange={handleToggle2FA}
                                />
                              </div>
                            </div>
                            
                            {twoFactorEnabled && (
                              <div className="p-4 border border-primary/20 rounded-lg bg-background/30 backdrop-blur-sm">
                                <h4 className="text-sm font-medium mb-2">Настройка приложения аутентификации</h4>
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                  <div className="p-2 bg-white rounded-md">
                                    <div className="w-[150px] h-[150px] bg-slate-200 rounded-sm flex items-center justify-center">
                                      <LockKeyhole className="h-10 w-10 text-slate-400" />
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                      1. Установите приложение аутентификации, например Google Authenticator
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      2. Отсканируйте QR-код или введите код вручную
                                    </p>
                                    <div className="relative">
                                      <Input 
                                        value={secretKey} 
                                        readOnly 
                                        className="pr-10 bg-background/50 border-primary/20 focus:border-primary/60 font-mono"
                                      />
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="absolute right-1 top-1 h-7"
                                        onClick={() => copyToClipboard(secretKey)}
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      3. Введите код из приложения для подтверждения
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <Input 
                                        value={verificationCode} 
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                        maxLength={6}
                                        className="w-28 bg-background/50 border-primary/20 focus:border-primary/60 font-mono"
                                      />
                                      <Button 
                                        size="sm" 
                                        onClick={handleVerify2FA}
                                        disabled={verificationCode.length < 6}
                                      >
                                        {isVerifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Подтвердить"}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                                  <p className="text-sm text-yellow-400 flex items-start">
                                    <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
                                    Сохраните резервные коды в надежном месте на случай утери доступа к приложению аутентификации
                                  </p>
                                </div>
                                
                                <div className="mt-4">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="border-primary/20 text-sm"
                                    onClick={handleGenerateBackupCodes}
                                  >
                                    <Key className="h-3.5 w-3.5 mr-2" />
                                    Показать резервные коды
                                  </Button>
                                </div>
                                
                                {backupCodes.length > 0 && (
                                  <div className="mt-4 p-4 border border-border/30 rounded-md bg-background/20">
                                    <div className="flex justify-between items-center mb-2">
                                      <h4 className="text-sm font-medium">Резервные коды</h4>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-7"
                                        onClick={() => copyToClipboard(backupCodes.join('\n'))}
                                      >
                                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                                        <span className="text-xs">Копировать все</span>
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      {backupCodes.map((code, index) => (
                                        <div key={index} className="font-mono text-sm bg-background/40 p-1.5 rounded border border-border/30">
                                          {code}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <Separator className="bg-primary/20" />
                        
                        {/* Привязка Telegram */}
                        <div>
                          <h3 className="text-base font-semibold flex items-center">
                            <div className="h-4 w-4 mr-2 text-primary/70">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512" fill="currentColor">
                                <path d="M248 8C111 8 0 119 0 256S111 504 248 504 496 393 496 256 385 8 248 8zM363 176.7c-3.7 39.2-19.9 134.4-28.1 178.3-3.5 18.6-10.3 24.8-16.9 25.4-14.4 1.3-25.3-9.5-39.3-18.7-21.8-14.3-34.2-23.2-55.3-37.2-24.5-16.1-8.6-25 5.3-39.5 3.7-3.8 67.1-61.5 68.3-66.7 .2-.7 .3-3.1-1.2-4.4s-3.6-.8-5.1-.5q-3.3 .7-104.6 69.1-14.8 10.2-26.9 9.9c-8.9-.2-25.9-5-38.6-9.1-15.5-5-27.9-7.7-26.8-16.3q.8-6.7 18.5-13.7 108.4-47.2 144.6-62.3c68.9-28.6 83.2-33.6 92.5-33.8 2.1 0 6.6 .5 9.6 2.9a10.5 10.5 0 0 1 3.5 6.7A43.8 43.8 0 0 1 363 176.7z"/>
                              </svg>
                            </div>
                            Привязка Telegram
                          </h3>
                          <div className="mt-4">
                            {telegramConnected ? (
                              <Alert className="bg-green-500/10 border-green-500/30">
                                <div className="flex items-center space-x-3">
                                  <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512" fill="currentColor" className="h-5 w-5 text-green-400">
                                      <path d="M248 8C111 8 0 119 0 256S111 504 248 504 496 393 496 256 385 8 248 8zM363 176.7c-3.7 39.2-19.9 134.4-28.1 178.3-3.5 18.6-10.3 24.8-16.9 25.4-14.4 1.3-25.3-9.5-39.3-18.7-21.8-14.3-34.2-23.2-55.3-37.2-24.5-16.1-8.6-25 5.3-39.5 3.7-3.8 67.1-61.5 68.3-66.7 .2-.7 .3-3.1-1.2-4.4s-3.6-.8-5.1-.5q-3.3 .7-104.6 69.1-14.8 10.2-26.9 9.9c-8.9-.2-25.9-5-38.6-9.1-15.5-5-27.9-7.7-26.8-16.3q.8-6.7 18.5-13.7 108.4-47.2 144.6-62.3c68.9-28.6 83.2-33.6 92.5-33.8 2.1 0 6.6 .5 9.6 2.9a10.5 10.5 0 0 1 3.5 6.7A43.8 43.8 0 0 1 363 176.7z"/>
                                    </svg>
                                  </div>
                                  <div>
                                    <AlertDescription>
                                      Telegram привязан к аккаунту. Вы будете получать уведомления о новых конференциях и важных событиях.
                                    </AlertDescription>
                                  </div>
                                </div>
                              </Alert>
                            ) : (
                              <div className="space-y-3">
                                <p className="text-sm text-muted-foreground">
                                  Привяжите Telegram для дополнительной защиты аккаунта и получения уведомлений о конференциях.
                                </p>
                                <Button 
                                  variant="outline" 
                                  className="w-full border-primary/30 relative overflow-hidden stardust"
                                  onClick={handleConnectTelegram}
                                >
                                  <div className="mr-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512" fill="currentColor" className="h-4 w-4 text-primary">
                                      <path d="M248 8C111 8 0 119 0 256S111 504 248 504 496 393 496 256 385 8 248 8zM363 176.7c-3.7 39.2-19.9 134.4-28.1 178.3-3.5 18.6-10.3 24.8-16.9 25.4-14.4 1.3-25.3-9.5-39.3-18.7-21.8-14.3-34.2-23.2-55.3-37.2-24.5-16.1-8.6-25 5.3-39.5 3.7-3.8 67.1-61.5 68.3-66.7 .2-.7 .3-3.1-1.2-4.4s-3.6-.8-5.1-.5q-3.3 .7-104.6 69.1-14.8 10.2-26.9 9.9c-8.9-.2-25.9-5-38.6-9.1-15.5-5-27.9-7.7-26.8-16.3q.8-6.7 18.5-13.7 108.4-47.2 144.6-62.3c68.9-28.6 83.2-33.6 92.5-33.8 2.1 0 6.6 .5 9.6 2.9a10.5 10.5 0 0 1 3.5 6.7A43.8 43.8 0 0 1 363 176.7z"/>
                                    </svg>
                                  </div>
                                  Привязать Telegram
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Аналитика использования */}
                  <Card className="cosmic-card overflow-hidden relative animate-slide-up">
                    <CardHeader className="pb-2">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-full bg-primary/10">
                          <BarChart className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-xl font-bold neon-text">Аналитика использования</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="relative backdrop-blur-sm bg-background/20 border-t border-border/20 p-6">
                      <div className="space-y-6">
                        {/* Графики и статистика */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Карточка общего времени */}
                          <div className="bg-background/30 backdrop-blur-md p-4 rounded-lg border border-primary/20">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-yellow-400" />
                                <span className="text-sm font-medium">Время конференций</span>
                              </div>
                              <Badge variant="outline" className="bg-yellow-500/10 border-yellow-500/30 text-yellow-400 text-xs">
                                {totalHours > 0 ? '+' + Math.round(totalHours * 0.1) : '0'}%
                              </Badge>
                            </div>
                            <div className="text-2xl font-bold">{totalHours}ч</div>
                            <Progress 
                              value={Math.min(100, (totalHours / 20) * 100)} 
                              className="h-1.5 mt-2" 
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              За последние 30 дней
                            </p>
                          </div>
                          
                          {/* Карточка конференций */}
                          <div className="bg-background/30 backdrop-blur-md p-4 rounded-lg border border-primary/20">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <Video className="h-4 w-4 text-blue-400" />
                                <span className="text-sm font-medium">Конференции</span>
                              </div>
                              <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400 text-xs">
                                {data?.conferences?.length && data.conferences.length > 0 ? '+' + Math.round(data.conferences.length * 5) : '0'}%
                              </Badge>
                            </div>
                            <div className="text-2xl font-bold">{data?.conferences?.length || 0}</div>
                            <Progress 
                              value={Math.min(100, ((data?.conferences?.length || 0) / 10) * 100)} 
                              className="h-1.5 mt-2" 
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Всего проведено
                            </p>
                          </div>
                          
                          {/* Карточка участников */}
                          <div className="bg-background/30 backdrop-blur-md p-4 rounded-lg border border-primary/20">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <Group className="h-4 w-4 text-green-400" />
                                <span className="text-sm font-medium">Участники</span>
                              </div>
                              <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400 text-xs">
                                {totalParticipants > 0 ? '+' + Math.round(totalParticipants * 2) : '0'}%
                              </Badge>
                            </div>
                            <div className="text-2xl font-bold">{totalParticipants}</div>
                            <Progress 
                              value={Math.min(100, (totalParticipants / 50) * 100)} 
                              className="h-1.5 mt-2" 
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Общее количество
                            </p>
                          </div>
                        </div>
                        
                        {/* График активности */}
                        <div className="mt-6">
                          <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={[
                                  { day: 'Пн', conferences: 3, participants: 8 },
                                  { day: 'Вт', conferences: 4, participants: 12 },
                                  { day: 'Ср', conferences: 2, participants: 6 },
                                  { day: 'Чт', conferences: 5, participants: 15 },
                                  { day: 'Пт', conferences: 7, participants: 22 },
                                  { day: 'Сб', conferences: 4, participants: 10 },
                                  { day: 'Вс', conferences: 2, participants: 5 },
                                ]}
                                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                              >
                                <defs>
                                  <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.05} />
                                  </linearGradient>
                                  <linearGradient id="colorPart" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#36BFFA" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#36BFFA" stopOpacity={0.05} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.2} />
                                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: 'rgba(30, 30, 35, 0.8)', 
                                    borderColor: 'var(--border)',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                                    backdropFilter: 'blur(8px)'
                                  }} 
                                />
                                <Area type="monotone" dataKey="participants" stroke="#36BFFA" strokeWidth={2} fillOpacity={1} fill="url(#colorPart)" />
                                <Area type="monotone" dataKey="conferences" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorConf)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex justify-center mt-2 space-x-8">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-primary mr-2"></div>
                              <span className="text-xs text-muted-foreground">Конференции</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-blue-400 mr-2"></div>
                              <span className="text-xs text-muted-foreground">Участники</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                {/* Управление подпиской */}
                  <Card className="cosmic-card overflow-hidden relative animate-slide-up">
                    <CardHeader className="pb-2">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-full bg-primary/10">
                          <Crown className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-xl font-bold neon-text">Управление подпиской</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="relative backdrop-blur-sm bg-background/20 border-t border-border/20 p-6">
                      <div className="space-y-6">
                        {/* Статус подписки */}
                        <div className="relative">
                          <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none">
                            <OrbitingParticles count={8} centerX={80} centerY={50} maxSize={4} />
                          </div>
                          
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div className="mb-6 md:mb-0">
                              {hasSubscription ? (
                                <>
                                  <Badge variant="outline" className="mb-2 border-primary/40 bg-primary/5 backdrop-blur-md px-3 py-1 text-xs stardust animate-pulse-slow">
                                    <div className="mr-1.5 relative flex items-center">
                                      <div className="mr-1">
                                        <WingsIcon type="gold" size={16} className="animate-pulse-slow" />
                                      </div>
                                      <Crown className="h-3.5 w-3.5 text-purple-300" />
                                      <div className="absolute inset-0 opacity-75 animate-pulse flex items-center">
                                        <div className="mr-1 opacity-0">
                                          <WingsIcon type="gold" size={16} />
                                        </div>
                                        <Crown className="h-3.5 w-3.5 text-primary" />
                                      </div>
                                    </div>
                                    Pro Подписка
                                  </Badge>
                                  
                                  <h3 className="text-2xl font-bold mb-2 mt-1 cosmic-text" data-text="IKARUS PRO">IKARUS PRO</h3>
                                  <p className="text-muted-foreground max-w-md">
                                    Ваша подписка активна до <span className="text-primary font-medium">
                                      {user?.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).toLocaleDateString('ru-RU') : "Неизвестно"}
                                    </span>
                                  </p>
                                  <div className="mt-2">
                                    <Progress value={subscriptionProgress} className="h-1.5 bg-background/50" />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {user?.subscriptionExpiresAt ? 
                                        `Осталось ${Math.ceil((new Date(user.subscriptionExpiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} дней` : 
                                        "Бессрочная подписка"}
                                    </p>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <Badge variant="outline" className="mb-2 border-gray-500/40 bg-gray-500/5 backdrop-blur-md px-3 py-1 text-xs">
                                    <div className="mr-1.5 relative flex items-center">
                                      <div className="mr-1">
                                        <WingsIcon type="gray" size={16} />
                                      </div>
                                    </div>
                                    Базовый план
                                  </Badge>
                                  
                                  <h3 className="text-2xl font-bold mb-2 mt-1 text-muted-foreground">Базовый аккаунт</h3>
                                  <p className="text-muted-foreground max-w-md">
                                    Расширьте возможности с подпиской PRO и получите доступ к премиум-функциям
                                  </p>
                                </>
                              )}
                            </div>
                            
                            {/* Кнопки управления подпиской */}
                            <div className="flex flex-col space-y-4">
                              {freezeCount > 0 ? (
                                <Button 
                                  onClick={handleFreezeSubscription} 
                                  className="relative overflow-hidden glass-button"
                                >
                                  <SnowflakeIcon className="mr-2 h-4 w-4 text-blue-400" />
                                  Заморозить подписку ({freezeCount})
                                </Button>
                              ) : (
                                <Button 
                                  disabled
                                  className="relative overflow-hidden glass-button opacity-50 cursor-not-allowed"
                                >
                                  <SnowflakeIcon className="mr-2 h-4 w-4 text-blue-400" />
                                  Заморозки исчерпаны (0)
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                className="border-primary/30 relative overflow-hidden stardust group hover:border-primary/60 transition-all"
                                onClick={() => window.location.href = '/checkout?renew=true'}
                              >
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity">
                                  <OrbitingParticles count={8} maxSize={3} />
                                </div>
                                <CreditCard className="mr-2 h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                                <span className="relative z-10 group-hover:text-primary transition-colors">Продлить подписку</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <Separator className="bg-primary/20" />
                        
                        {/* Тарифные планы */}
                        <div>
                          <h3 className="text-base font-semibold flex items-center mb-4">
                            <Coins className="h-4 w-4 mr-2 text-primary/70" /> Доступные тарифы
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Тариф: 1 месяц */}
                            <div className="border border-primary/20 rounded-lg p-4 backdrop-blur-sm bg-background/10 hover:bg-background/20 transition-colors hover:border-primary/40">
                              <div className="text-center mb-3">
                                <h4 className="text-sm font-semibold">Базовый</h4>
                                <p className="text-2xl font-bold text-primary mt-1">659 ₽</p>
                                <p className="text-xs text-muted-foreground">1 месяц</p>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full border-primary/30 hover:bg-primary/10 transition-all group relative overflow-hidden"
                                onClick={() => window.location.href = '/checkout?plan=basic&price=659'}
                              >
                                <span className="relative z-10 group-hover:text-primary transition-colors">Выбрать</span>
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity">
                                  <OrbitingParticles count={3} maxSize={2} />
                                </div>
                              </Button>
                            </div>
                            
                            {/* Тариф: 3 месяца */}
                            <div className="border border-primary/20 rounded-lg p-4 backdrop-blur-sm bg-background/10 hover:bg-background/20 transition-colors hover:border-primary/40 relative overflow-hidden">
                              <div className="absolute -right-6 -top-6 bg-primary/20 h-12 w-32 rotate-45 flex items-end justify-center pb-1">
                                <span className="text-xs font-medium text-primary">Выгодно</span>
                              </div>
                              <div className="text-center mb-3">
                                <h4 className="text-sm font-semibold">Стандарт</h4>
                                <p className="text-2xl font-bold text-primary mt-1">1119 ₽</p>
                                <p className="text-xs text-muted-foreground">3 месяца</p>
                                <div className="my-2 py-1 px-2 bg-primary/5 rounded text-xs">
                                  <span className="text-green-400">Экономия 858 ₽</span>
                                </div>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full border-primary/30 hover:bg-primary/10 transition-all group relative overflow-hidden"
                                onClick={() => window.location.href = '/checkout?plan=standard&price=1119'}
                              >
                                <span className="relative z-10 group-hover:text-primary transition-colors">Выбрать</span>
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity">
                                  <OrbitingParticles count={3} maxSize={2} />
                                </div>
                              </Button>
                            </div>
                            
                            {/* Тариф: 6 месяцев */}
                            <div className="border border-primary/20 rounded-lg p-4 backdrop-blur-sm bg-background/10 hover:bg-background/20 transition-colors hover:border-primary/40">
                              <div className="text-center mb-3">
                                <h4 className="text-sm font-semibold">Премиум</h4>
                                <p className="text-2xl font-bold text-primary mt-1">4359 ₽</p>
                                <p className="text-xs text-muted-foreground">5 месяцев</p>
                                <div className="flex items-center justify-center my-2 space-x-2">
                                  <div className="py-1 px-2 bg-primary/5 rounded text-xs">
                                    <span className="text-green-400">Экономия 2936 ₽</span>
                                  </div>
                                  <div className="py-1 px-2 bg-purple-500/10 rounded text-xs">
                                    <span className="text-purple-400">★ Доп. бонусы</span>
                                  </div>
                                </div>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full border-primary/30 hover:bg-primary/10 transition-all group relative overflow-hidden"
                                onClick={() => window.location.href = '/checkout?plan=premium&price=4359'}
                              >
                                <span className="relative z-10 group-hover:text-primary transition-colors">Выбрать</span>
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity">
                                  <OrbitingParticles count={5} maxSize={2} />
                                </div>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            {/* Вкладка "Панель управления" */}
            <TabsContent value="dashboard" className="space-y-8 animate-slide-up">
              {/* Карточка текущей подписки (сокращенный вариант) */}
              <div className="mb-6">
                <div className="perspective-container">
                  <Card className="cosmic-card overflow-hidden relative animate-slide-up">
                    <CardContent className="p-6 relative backdrop-blur-sm bg-background/20 border-t border-border/20">
                      {/* Pro Features */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 mr-3">
                            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center animate-pulse-slow">
                              <Crown className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                          <div>
                            {hasSubscription ? (
                              <>
                                <Badge variant="outline" className="border-primary/40 bg-primary/5 backdrop-blur-md px-2 py-0.5 text-xs stardust">
                                  <WingsIcon type="gold" size={12} className="mr-1" />
                                  Pro Подписка
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  До {user?.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).toLocaleDateString('ru-RU') : "Бессрочно"}
                                </p>
                              </>
                            ) : (
                              <>
                                <Badge variant="outline" className="border-gray-500/40 bg-gray-500/5 backdrop-blur-md px-2 py-0.5 text-xs">
                                  <WingsIcon type="gray" size={12} className="mr-1" />
                                  Базовый план
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Ограниченный доступ
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="flex-shrink-0 mr-3">
                            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center animate-pulse-slow" style={{animationDelay: '0.5s'}}>
                              <Award className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium">Неограниченное время</h4>
                            <p className="text-xs text-muted-foreground">Без лимитов</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="flex-shrink-0 mr-3">
                            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center animate-pulse-slow" style={{animationDelay: '1s'}}>
                              <Group className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium">До 100 участников</h4>
                            <p className="text-xs text-muted-foreground">На конференцию</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="flex-shrink-0 mr-3">
                            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center animate-pulse-slow" style={{animationDelay: '1.5s'}}>
                              <Save className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium">Запись конференций</h4>
                            <p className="text-xs text-muted-foreground">И аналитика</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {/* Stats Overview */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                {/* Active Conferences */}
                <div className="perspective-container">
                  <Card className="ultra-glass-card hover-card-animation animate-slide-up perspective-card" style={{animationDelay: '0.1s'}}>
                    <CardContent className="p-6 backdrop-blur-sm bg-background/20 border-t border-border/20">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-14 w-14 bg-primary/15 rounded-full flex items-center justify-center animate-pulse-ring border border-primary/30 shadow-lg shadow-primary/10">
                          <Video className="h-7 w-7 text-primary animate-glow" />
                        </div>
                        <div className="ml-5">
                          <div className="text-sm font-medium text-muted-foreground">Активных конференций</div>
                          <div className="text-3xl font-semibold neon-text">{activeConferences.length}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Total Participants */}
                <div className="perspective-container">
                  <Card className="ultra-glass-card hover-card-animation animate-slide-up perspective-card" style={{animationDelay: '0.2s'}}>
                    <CardContent className="p-6 backdrop-blur-sm bg-background/20 border-t border-border/20">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-14 w-14 bg-primary/15 rounded-full flex items-center justify-center animate-pulse-ring border border-primary/30 shadow-lg shadow-primary/10" style={{animationDelay: '0.5s'}}>
                          <Group className="h-7 w-7 text-primary animate-glow" />
                        </div>
                        <div className="ml-5">
                          <div className="text-sm font-medium text-muted-foreground">Всего участников</div>
                          <div className="text-3xl font-semibold neon-text">{totalParticipants}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Conference Hours */}
                <div className="perspective-container">
                  <Card className="ultra-glass-card hover-card-animation animate-slide-up perspective-card" style={{animationDelay: '0.3s'}}>
                    <CardContent className="p-6 backdrop-blur-sm bg-background/20 border-t border-border/20">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-14 w-14 bg-primary/15 rounded-full flex items-center justify-center animate-pulse-ring border border-primary/30 shadow-lg shadow-primary/10" style={{animationDelay: '1s'}}>
                          <Clock className="h-7 w-7 text-primary animate-glow" />
                        </div>
                        <div className="ml-5">
                          <div className="text-sm font-medium text-muted-foreground">Часы конференций</div>
                          <div className="text-3xl font-semibold neon-text">{totalHours}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recordings */}
                <div className="perspective-container">
                  <Card className="ultra-glass-card hover-card-animation animate-slide-up perspective-card" style={{animationDelay: '0.4s'}}>
                    <CardContent className="p-6 backdrop-blur-sm bg-background/20 border-t border-border/20">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-14 w-14 bg-primary/15 rounded-full flex items-center justify-center animate-pulse-ring border border-primary/30 shadow-lg shadow-primary/10" style={{animationDelay: '1.5s'}}>
                          <Save className="h-7 w-7 text-primary animate-glow" />
                        </div>
                        <div className="ml-5">
                          <div className="text-sm font-medium text-muted-foreground">Записи конференций</div>
                          <div className="text-3xl font-semibold neon-text">{completedConferences.length}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Create Conference Button */}
              <div className="mb-8">
                <Button 
                  onClick={() => setIsCreateModalOpen(true)} 
                  className="w-full sm:w-auto relative overflow-hidden glass-button py-6 text-lg text-white font-medium" 
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Создать новую конференцию
                </Button>
              </div>
              
              {/* Conferences List */}
              <div className="space-y-6">
                <Card className="cosmic-card overflow-hidden relative animate-slide-up">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-xl font-bold neon-text">Ваши конференции</CardTitle>
                    <CardDescription>
                      Управляйте вашими конференциями и просматривайте статистику
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {isLoading ? (
                      <div className="flex justify-center py-10">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                      </div>
                    ) : data?.conferences?.length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-muted-foreground">У вас пока нет созданных конференций</p>
                        <Button 
                          onClick={() => setIsCreateModalOpen(true)} 
                          variant="outline" 
                          className="mt-4 border-primary/30"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Создать первую конференцию
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-primary/20">
                              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Название</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Создана</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Участники</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Статус</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Действия</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data?.conferences.map((conference) => (
                              <tr key={conference.id} className="border-b border-primary/10 hover:bg-primary/5">
                                <td className="py-3 px-4 text-sm">
                                  <div className="font-medium">{conference.name}</div>
                                  <div className="text-xs text-muted-foreground mt-1">ID: {conference.id.substring(0, 8)}...</div>
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  <div>{new Date(conference.createdAt || Date.now()).toLocaleDateString()}</div>
                                  <div className="text-xs text-muted-foreground mt-1">{new Date(conference.createdAt || Date.now()).toLocaleTimeString()}</div>
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  <div className="flex items-center">
                                    <UserIcon className="h-4 w-4 mr-1 text-primary/70" />
                                    <span>{conference.currentParticipants || 0}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  {conference.active ? (
                                    <Badge variant="default" className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border-green-500/30">
                                      Активна
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="border-muted-foreground/30">
                                      Завершена
                                    </Badge>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  <div className="flex space-x-2">
                                    {conference.active ? (
                                      <>
                                        <Button 
                                          onClick={() => handleJoinConference(conference.id)} 
                                          size="sm" 
                                          variant="outline"
                                          className="h-8 px-2 bg-primary/20 border-primary/30 hover:bg-primary/30"
                                        >
                                          <Video className="h-3.5 w-3.5 mr-1" />
                                          Присоединиться
                                        </Button>
                                        
                                        <Button 
                                          onClick={() => endConferenceMutation.mutate(conference.id)} 
                                          size="sm" 
                                          variant="outline"
                                          className="h-8 px-2 bg-destructive/10 border-destructive/30 hover:bg-destructive/20 text-destructive"
                                        >
                                          <PauseCircle className="h-3.5 w-3.5" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          className="h-8 px-2 bg-primary/10 border-primary/20 hover:bg-primary/20"
                                        >
                                          <Download className="h-3.5 w-3.5 mr-1" />
                                          Скачать запись
                                        </Button>
                                        
                                        <Button 
                                          onClick={() => {
                                            setSelectedConference(conference);
                                            setIsDetailsModalOpen(true);
                                          }}
                                          size="sm" 
                                          variant="outline"
                                          className="h-8 px-2 border-primary/20 hover:border-primary/40"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      {/* Модальные окна */}
      <CreateConferenceModal 
        open={isCreateModalOpen} 
        onOpenChange={setIsCreateModalOpen} 
        onSuccess={handleConferenceCreated}
      />
      
      <ConferenceDetailsModal 
        open={isDetailsModalOpen} 
        onOpenChange={setIsDetailsModalOpen} 
        conference={selectedConference}
        onJoin={handleJoinConference}
      />
    </div>
  );
}