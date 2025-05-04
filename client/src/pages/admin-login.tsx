import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, KeyRound, Eye, EyeOff, CrownIcon } from "lucide-react";
import { Wings } from "@/components/icons/wings-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

export default function AdminLogin() {
  const { user, loginMutation } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [loginType, setLoginType] = useState<"admin" | "superadmin">("admin");
  
  // Проверка, настроена ли система
  const { data: configurationStatus } = useQuery<{ isConfigured: boolean }>({
    queryKey: ['/api/system/is-configured'],
  });
  
  // Перенаправляем на админ-панель, если пользователь уже авторизован
  useEffect(() => {
    if (user) {
      if (user.role === "superadmin") {
        setLocation("/admin");
      } else if (user.role === "admin" && loginType === "admin") {
        setLocation("/admin");
      }
    }
  }, [user, setLocation, loginType]);

  // Анимация движения крыльев
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(prev => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast({
        title: "Ошибка ввода",
        description: "Необходимо указать имя пользователя",
        variant: "destructive",
      });
      return;
    }
    
    setLoginAttempts(prev => prev + 1);
    
    try {
      // Пытаемся авторизоваться
      await loginMutation.mutateAsync({ username, password });
      
      // Проверяем роль пользователя
      if (user?.role === "superadmin" || (user?.role === "admin" && loginType === "admin")) {
        toast({
          title: `Добро пожаловать, ${loginType === "admin" ? "администратор" : "суперадминистратор"}`,
          description: "Вы успешно вошли в систему",
        });
        // Перенаправляем на админ-панель после успешного входа
        setLocation("/admin");
      } else {
        toast({
          title: "Недостаточно прав",
          description: `У вас нет прав ${loginType === "admin" ? "администратора" : "суперадминистратора"}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      // Ошибки уже обрабатываются в хуке useAuth
    }
  };

  // Для анимации небольшой тряски при неверном пароле
  const inputClassName = loginMutation.isError 
    ? "border-destructive focus:ring-destructive shake-animation" 
    : "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-background/90 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Shield className="h-20 w-20 text-primary" />
              <div 
                className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-500 ${
                  isAnimating ? 'scale-110' : 'scale-100'
                }`}
              >
                <Wings className="h-10 w-10 text-secondary-foreground" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Ikarus Admin</h1>
          <p className="text-muted-foreground mt-1">
            Доступ к центру управления
          </p>
        </div>
        
        <Tabs 
          defaultValue="admin" 
          value={loginType} 
          onValueChange={(value) => setLoginType(value as "admin" | "superadmin")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="admin" className="flex items-center justify-center">
              <Shield className="mr-2 h-4 w-4" />
              <span>Администратор</span>
            </TabsTrigger>
            <TabsTrigger value="superadmin" className="flex items-center justify-center">
              <CrownIcon className="mr-2 h-4 w-4" />
              <span>Супер-админ</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="admin">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>Вход администратора</CardTitle>
                <CardDescription>
                  Этот доступ предназначен для хостов и модераторов.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="admin-username" className="text-sm font-medium">
                      Имя пользователя
                    </label>
                    <div className="relative">
                      <Input
                        id="admin-username"
                        type="text"
                        placeholder="Введите имя пользователя"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className={`pl-10 ${inputClassName}`}
                        required
                      />
                      <Shield className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="admin-password" className="text-sm font-medium">
                      Пароль
                    </label>
                    <div className="relative">
                      <Input
                        id="admin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Введите пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`pl-10 ${inputClassName}`}
                        required
                        onFocus={() => setIsAnimating(true)}
                        onBlur={() => setIsAnimating(false)}
                      />
                      <KeyRound className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Eye className="h-5 w-5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {loginMutation.isError && (
                      <p className="text-destructive text-sm">
                        Неверные учетные данные. Пожалуйста, попробуйте снова.
                      </p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full mt-2" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Проверка доступа...
                      </>
                    ) : (
                      "Войти как администратор"
                    )}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="flex flex-col">
                <p className="text-xs text-center text-muted-foreground">
                  «Управляй мудро и справедливо»
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="superadmin">
            <Card className="border-primary/20 shadow-md">
              <CardHeader>
                <CardTitle>Вход суперадминистратора</CardTitle>
                <CardDescription>
                  Этот доступ предназначен только для владельцев системы
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="superadmin-username" className="text-sm font-medium">
                      Имя пользователя
                    </label>
                    <div className="relative">
                      <Input
                        id="superadmin-username"
                        type="text"
                        placeholder="Введите имя пользователя"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className={`pl-10 ${inputClassName}`}
                        required
                      />
                      <CrownIcon className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="superadmin-password" className="text-sm font-medium">
                      Пароль
                    </label>
                    <div className="relative">
                      <Input
                        id="superadmin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Введите мастер-пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`pl-10 ${inputClassName}`}
                        required
                        onFocus={() => setIsAnimating(true)}
                        onBlur={() => setIsAnimating(false)}
                      />
                      <KeyRound className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Eye className="h-5 w-5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {loginMutation.isError && (
                      <p className="text-destructive text-sm">
                        Неверные учетные данные. Пожалуйста, попробуйте снова.
                      </p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    variant="default"
                    className="w-full mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Проверка доступа...
                      </>
                    ) : (
                      "Войти как суперадминистратор"
                    )}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="flex flex-col">
                <p className="text-xs text-center text-muted-foreground">
                  «Мне нужно было лишь верить в свои крылья, а не в правду других»
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Эффекты с крыльями, появляющиеся при попытках входа */}
        {loginAttempts > 0 && (
          <div className="mt-6 text-center">
            <div className="relative inline-block">
              <Wings 
                className={`h-6 w-6 text-primary ${
                  isAnimating ? 'animate-float-slow' : ''
                }`} 
              />
              <span className="ml-2 text-sm text-muted-foreground">
                {loginAttempts === 1 
                  ? "Поражение приходит не тогда, когда ты пал, а когда решил не подниматься" 
                  : loginAttempts === 2 
                  ? "Человек с волей сломает законы системы" 
                  : "Икарус ждет своего повелителя..."}
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* CSS для анимаций находится в глобальных стилях */}
    </div>
  );
}