import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Eye,
  EyeOff,
  Loader2, Settings, Users, Video as VideoIcon, CreditCard, Activity, Server, 
  LineChart as LineChartIcon, BarChart as BarChartIcon, Search, Edit, Save, Ban, 
  CheckCircle, X, Trash, CircleDollarSign, Mail, User, Shield, AlertTriangle, Crown,
  Star, TrendingUp, BellRing, SendIcon, MessageCircle, MessageSquare
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User as UserType } from "@shared/schema";
import { ChangeEvent, FormEvent } from "react";
// Импорты для графиков
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, LineChart, Line, BarChart, Bar
} from 'recharts';
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

// Определяем типы для данных с сервера
interface AdminStats {
  userCount: { count: number };
  newUsers: { count: number };
  totalRevenue: { sum: number };
  revenueToday: { sum: number };
  activeConferences: { count: number };
  conferenceCount: { count: number };
  proUsers: { count: number };
  recentPayments: Array<{
    id: number;
    username: string;
    amount: number;
    createdAt: string;
  }>;
  recentUsers: Array<{
    id: number;
    username: string;
    email: string;
    createdAt: string;
  }>;
}

interface TelegramStatus {
  isConnected: boolean;
  connectedAt: string | null;
}

interface TelegramConfigureParams {
  botToken: string;
  adminPassword?: string;
}

// Компонент для управления уведомлениями Telegram
function NotificationsAdminSection() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("send");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [userId, setUserId] = useState("");
  const [notificationType, setNotificationType] = useState<"info" | "success" | "warning" | "error">("info");
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Получаем пользователей для выбора
  const { data: users } = useQuery<UserType[]>({
    queryKey: ["/api/admin/users"],
    retry: 1,
  });

  // Мутация для отправки уведомления
  const sendNotificationMutation = useMutation({
    mutationFn: async ({ userId, title, message, type }: { userId: string, title: string, message: string, type: string }) => {
      const res = await apiRequest("POST", "/api/telegram/notification", {
        userId: parseInt(userId),
        title,
        message,
        type
      });
      if (res) {
        return await res.json();
      }
      throw new Error("Не удалось отправить уведомление");
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Уведомление отправлено",
      });
      setMessage("");
      setTitle("");
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось отправить уведомление: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSending(false);
    }
  });

  // Мутация для отправки массового уведомления
  const sendBroadcastMutation = useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      const res = await apiRequest("POST", "/api/telegram/broadcast", { message });
      if (res) {
        return await res.json();
      }
      throw new Error("Не удалось отправить массовое уведомление");
    },
    onSuccess: (data) => {
      toast({
        title: "Успешно",
        description: `Массовое уведомление отправлено ${data.count} пользователям`,
      });
      setMessage("");
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось отправить массовое уведомление: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSending(false);
    }
  });

  const handleSendNotification = (e: FormEvent) => {
    e.preventDefault();
    
    if (isBroadcast) {
      if (!message) {
        toast({
          title: "Ошибка",
          description: "Введите текст сообщения",
          variant: "destructive",
        });
        return;
      }
      
      setIsSending(true);
      sendBroadcastMutation.mutate({ message });
    } else {
      if (!userId || !message) {
        toast({
          title: "Ошибка",
          description: "Выберите пользователя и введите текст сообщения",
          variant: "destructive",
        });
        return;
      }
      
      setIsSending(true);
      sendNotificationMutation.mutate({ 
        userId, 
        title: title || "Уведомление", 
        message, 
        type: notificationType 
      });
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-[400px]">
          <TabsTrigger value="send">
            <SendIcon className="h-4 w-4 mr-2" />
            Отправка уведомлений
          </TabsTrigger>
          <TabsTrigger value="setup">
            <Settings className="h-4 w-4 mr-2" />
            Настройка бота
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="send" className="space-y-4 mt-4">
          <div className="flex items-center space-x-2">
            <Switch 
              id="broadcast" 
              checked={isBroadcast} 
              onCheckedChange={setIsBroadcast}
            />
            <label htmlFor="broadcast" className="text-sm font-medium">
              Массовая рассылка всем пользователям
            </label>
          </div>
          
          <form onSubmit={handleSendNotification} className="space-y-4">
            {!isBroadcast && (
              <>
                <div className="space-y-2">
                  <label htmlFor="user-id" className="text-sm font-medium">
                    Получатель
                  </label>
                  <Select 
                    value={userId} 
                    onValueChange={setUserId}
                  >
                    <SelectTrigger id="user-id">
                      <SelectValue placeholder="Выберите пользователя" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map(user => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.username} {user.email ? `(${user.email})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="notification-title" className="text-sm font-medium">
                    Заголовок уведомления
                  </label>
                  <Input
                    id="notification-title"
                    placeholder="Введите заголовок"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="notification-type" className="text-sm font-medium">
                    Тип уведомления
                  </label>
                  <Select 
                    value={notificationType} 
                    onValueChange={(value: "info" | "success" | "warning" | "error") => setNotificationType(value)}
                  >
                    <SelectTrigger id="notification-type">
                      <SelectValue placeholder="Выберите тип уведомления" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Информация</SelectItem>
                      <SelectItem value="success">Успех</SelectItem>
                      <SelectItem value="warning">Предупреждение</SelectItem>
                      <SelectItem value="error">Ошибка</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium">
                {isBroadcast ? "Текст сообщения для всех пользователей" : "Текст сообщения"}
              </label>
              <Textarea
                id="message"
                placeholder="Введите текст сообщения"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={isSending}
              className="w-full"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Отправка...
                </>
              ) : (
                <>
                  <SendIcon className="mr-2 h-4 w-4" />
                  {isBroadcast ? "Отправить всем" : "Отправить уведомление"}
                </>
              )}
            </Button>
          </form>
        </TabsContent>
        
        <TabsContent value="setup" className="space-y-4 mt-4">
          <TelegramBotSetup />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Компонент для настройки Telegram бота
function TelegramBotSetup() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Запрос статуса Telegram бота
  const { data: telegramStatus } = useQuery<TelegramStatus>({
    queryKey: ['/api/telegram/status'],
    staleTime: 60000, // 1 минута
  });
  
  // Мутация для настройки Telegram бота
  const configureTelegramMutation = useMutation({
    mutationFn: async (params: TelegramConfigureParams) => {
      const res = await apiRequest("POST", "/api/telegram/connect", params);
      if (res) {
        return await res.json();
      }
      throw new Error("Не удалось выполнить запрос");
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Telegram бот успешно подключен",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/telegram/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/system/info'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось подключить Telegram бота: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });
  
  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!botToken) {
      toast({
        title: "Ошибка",
        description: "Введите токен бота",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Отправляем запрос на подключение бота
    configureTelegramMutation.mutate({
      botToken,
      adminPassword: adminPassword || undefined
    });
  };
  
  return (
    <div className="space-y-4 py-2">
      {telegramStatus?.isConnected ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p className="text-sm">Бот уже подключен и работает</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Подключен: {telegramStatus.connectedAt 
              ? new Date(telegramStatus.connectedAt).toLocaleString() 
              : 'неизвестно'}
          </p>
          <p className="text-sm">Вы хотите обновить настройки бота?</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Бот еще не настроен. Создайте бота через @BotFather в Telegram и введите полученный токен.
        </p>
      )}
      
      <form onSubmit={handleConnect} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="bot-token" className="text-sm font-medium">
            Токен бота
          </label>
          <div className="relative">
            <Input
              id="bot-token"
              type={showPassword ? "text" : "password"}
              placeholder="Введите токен бота"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="pr-10"
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="admin-password" className="text-sm font-medium">
            Пароль администратора (необязательно)
          </label>
          <Input
            id="admin-password"
            type="password"
            placeholder="Пароль для авторизации в боте"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Этот пароль будет запрашиваться для доступа к админ-функциям в Telegram боте
          </p>
        </div>
        
        <DialogFooter>
          <Button 
            type="submit" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Подключение...
              </>
            ) : (
              telegramStatus?.isConnected ? "Обновить настройки" : "Подключить бота"
            )}
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
}

interface SystemInfo {
  os: {
    type: string;
    release: string;
  };
  cpu: {
    model: string;
    usage: number;
  };
  memory: {
    used: string;
    total: string;
  };
  database: {
    status: string;
    size: string;
    connections: number;
    uptime: string;
  };
  webrtc: {
    status: string;
    connections: number;
    outgoingTraffic: string;
    incomingTraffic: string;
  };
  telegram?: {
    status: string;
    users: number;
    requests: number;
  };
  logs: Array<{
    timestamp: string;
    level: string;
    message: string;
  }>;
}

interface PaymentSettings {
  yookassa: {
    shopId: string;
    secretKey: string;
  };
  stripe: {
    publicKey: string;
    secretKey: string;
  };
}

// Компонент для управления пользователями
function UsersAdminSection() {
  const { toast } = useToast();
  const [filterText, setFilterText] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editedUser, setEditedUser] = useState<UserType | null>(null);
  
  // Загрузка данных о пользователях
  const { data: users, isLoading: isUsersLoading } = useQuery<UserType[]>({
    queryKey: ["/api/admin/users"],
    retry: 1,
    meta: {
      errorHandler: () => {
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить пользователей",
          variant: "destructive",
        });
      }
    }
  });
  
  // Мутация для обновления пользователя
  const updateUserMutation = useMutation({
    mutationFn: async (userData: Partial<UserType>) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userData.id}`, userData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Пользователь обновлен",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowUserDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось обновить пользователя: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Мутация для блокировки пользователя
  const toggleUserBanMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/toggle-ban`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Статус блокировки пользователя изменен",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось изменить статус блокировки: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const handleEditUser = (user: UserType) => {
    setEditedUser({ ...user });
    setShowUserDialog(true);
  };
  
  const handleUpdateUser = (e: FormEvent) => {
    e.preventDefault();
    if (editedUser) {
      updateUserMutation.mutate(editedUser);
    }
  };
  
  // Фильтрация пользователей
  const filteredUsers = users?.filter(user => 
    user.username.toLowerCase().includes(filterText.toLowerCase()) || 
    (user.email && user.email.toLowerCase().includes(filterText.toLowerCase()))
  );
  
  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Поиск пользователей..." 
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      
      {isUsersLoading ? (
        <div className="flex justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Имя пользователя</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Подписка</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers && filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "superadmin" ? "destructive" : 
                              user.role === "admin" ? "default" : "outline"}>
                        {user.role === "superadmin" ? "Суперадмин" : 
                         user.role === "admin" ? "Админ" : 
                         user.role === "host" ? "Хост" : "Пользователь"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.subscription === "pro" ? "default" : "outline"}>
                        {user.subscription === "pro" ? "Pro" : "Free"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isBanned ? "destructive" : "default"}>
                        {user.isBanned ? "Заблокирован" : "Активен"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => toggleUserBanMutation.mutate(user.id)}
                          disabled={toggleUserBanMutation.isPending}
                        >
                          {user.banned ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    {filterText ? "Пользователи не найдены" : "Нет данных о пользователях"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Редактирование пользователя</DialogTitle>
            <DialogDescription>
              Редактирование данных пользователя {editedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="username" className="text-right text-sm">
                  Имя пользователя
                </label>
                <Input
                  id="username"
                  value={editedUser?.username || ""}
                  onChange={(e) => setEditedUser(prev => prev ? {...prev, username: e.target.value} : null)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="email" className="text-right text-sm">
                  Email
                </label>
                <Input
                  id="email"
                  value={editedUser?.email || ""}
                  onChange={(e) => setEditedUser(prev => prev ? {...prev, email: e.target.value} : null)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="role" className="text-right text-sm">
                  Роль
                </label>
                <Select 
                  value={editedUser?.role || "user"} 
                  onValueChange={(value) => setEditedUser(prev => prev ? {...prev, role: value} : null)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Выберите роль" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Пользователь</SelectItem>
                    <SelectItem value="host">Хост</SelectItem>
                    <SelectItem value="admin">Администратор</SelectItem>
                    <SelectItem value="superadmin">Суперадминистратор</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="subscription" className="text-right text-sm">
                  Подписка
                </label>
                <Select 
                  value={editedUser?.subscription || "free"} 
                  onValueChange={(value) => setEditedUser(prev => prev ? {...prev, subscription: value} : null)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Выберите тип подписки" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="banned" className="text-right text-sm">
                  Статус
                </label>
                <Select 
                  value={editedUser?.banned ? "banned" : "active"} 
                  onValueChange={(value) => setEditedUser(prev => prev ? {...prev, banned: value === "banned"} : null)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Активен</SelectItem>
                    <SelectItem value="banned">Заблокирован</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Сохранить
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatisticsAdminSection() {
  const { toast } = useToast();
  
  // Загрузка статистики
  const { data: stats, isLoading: isStatsLoading } = useQuery<PaymentStats>({
    queryKey: ["/api/admin/payment-stats"],
    retry: 1,
    meta: {
      errorHandler: () => {
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить статистику платежей",
          variant: "destructive",
        });
      }
    }
  });
  
  // Преобразуем данные для графиков
  const revenueData = stats?.revenueByMonth ? 
    Object.entries(stats.revenueByMonth).map(([month, amount]) => ({
      name: month,
      value: amount / 100
    })).sort((a, b) => {
      const [aYear, aMonth] = a.name.split('-').map(Number);
      const [bYear, bMonth] = b.name.split('-').map(Number);
      
      if (aYear !== bYear) return aYear - bYear;
      return aMonth - bMonth;
    }) : [];
    
  const subscriptionData = stats?.subscriptionsByType ?
    Object.entries(stats.subscriptionsByType).map(([type, count]) => ({
      name: type === "1" ? "1 месяц" : type === "2" ? "2 месяца" : "5 месяцев",
      value: count
    })) : [];
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Общий доход</CardTitle>
            <CardDescription>За все время</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isStatsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                `${((stats?.totalAmount || 0) / 100).toFixed(0)} ₽`
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Всего платежей: {stats?.totalPayments || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Средний платеж</CardTitle>
            <CardDescription>Средняя стоимость подписки</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isStatsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                `${((stats?.averagePaymentAmount || 0) / 100).toFixed(0)} ₽`
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              На одного пользователя
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Конверсия</CardTitle>
            <CardDescription>Процент платящих пользователей</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isStatsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                `${(stats?.conversionRate || 0).toFixed(1)}%`
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              От общего числа пользователей
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Доход по месяцам</CardTitle>
            <CardDescription>
              Динамика дохода по месяцам
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <div className="flex justify-center items-center h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : revenueData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} ₽`, 'Доход']} />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      name="Доход"
                      stroke="var(--primary)" 
                      fill="var(--primary)" 
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex justify-center items-center h-[300px] text-muted-foreground">
                Нет данных для отображения
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Распределение подписок</CardTitle>
            <CardDescription>
              По типам подписок
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <div className="flex justify-center items-center h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : subscriptionData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subscriptionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [value, 'Количество']} />
                    <Bar
                      dataKey="value"
                      name="Количество"
                      fill="var(--primary)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex justify-center items-center h-[300px] text-muted-foreground">
                Нет данных для отображения
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Последние платежи</CardTitle>
          <CardDescription>
            Недавние транзакции в системе
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isStatsLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : stats?.latestPayments && stats.latestPayments.length > 0 ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Дата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.latestPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.id}</TableCell>
                      <TableCell>{payment.username}</TableCell>
                      <TableCell>{(payment.amount / 100).toFixed(0)} ₽</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {payment.type === 'subscription' ? 'Подписка' : 
                           payment.type === 'renewal' ? 'Продление' : 'Покупка'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          payment.status === 'succeeded' ? 'success' : 
                          payment.status === 'pending' ? 'warning' : 'destructive'
                        }>
                          {payment.status === 'succeeded' ? 'Выполнен' : 
                           payment.status === 'pending' ? 'В обработке' : 'Ошибка'}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(payment.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Нет данных о платежах
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface PaymentStats {
  totalPayments: number;
  totalAmount: number;
  subscriptionsByType: Record<string, number>;
  revenueByMonth: Record<string, number>;
  latestPayments: Array<any>;
  conversionRate: number;
  averagePaymentAmount: number;
}

// Компонент для управления платежами
function PaymentsAdminSection() {
  const { toast } = useToast();
  const [filterText, setFilterText] = useState("");
  const [dateRange, setDateRange] = useState<{from?: Date; to?: Date}>({});
  
  // Загрузка данных о платежах
  const { data: payments, isLoading: isPaymentsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/payments"],
    retry: 1,
    meta: {
      errorHandler: () => {
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить платежи",
          variant: "destructive",
        });
      }
    }
  });
  
  // Фильтрация платежей
  const filteredPayments = payments?.filter(payment => {
    const textMatch = payment.username?.toLowerCase().includes(filterText.toLowerCase());
    return textMatch;
  });
  
  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Поиск по пользователю..." 
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      
      {isPaymentsLoading ? (
        <div className="flex justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Пользователь</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Метод</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Дата</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments && filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.id}</TableCell>
                    <TableCell>{payment.username}</TableCell>
                    <TableCell>{(payment.amount / 100).toFixed(0)} ₽</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {payment.type === 'subscription' ? 'Подписка' : 
                         payment.type === 'renewal' ? 'Продление' : 'Покупка'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payment.paymentMethod === 'yookassa' ? 'ЮKassa' : 
                       payment.paymentMethod === 'stripe' ? 'Stripe' : 
                       payment.paymentMethod || 'Неизвестно'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        payment.status === 'succeeded' ? 'success' : 
                        payment.status === 'pending' ? 'warning' : 'destructive'
                      }>
                        {payment.status === 'succeeded' ? 'Выполнен' : 
                         payment.status === 'pending' ? 'В обработке' : 
                         payment.status === 'failed' ? 'Ошибка' : payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(payment.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    {filterText ? "Платежи не найдены" : "Нет данных о платежах"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// Компонент для управления конференциями
function ConferencesAdminSection() {
  const { toast } = useToast();
  const [filterText, setFilterText] = useState("");
  const [selectedConference, setSelectedConference] = useState<any | null>(null);
  const [showConferenceDialog, setShowConferenceDialog] = useState(false);
  
  // Загрузка данных о конференциях
  const { data: conferences, isLoading: isConferencesLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/conferences"],
    retry: 1,
    meta: {
      errorHandler: () => {
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить конференции",
          variant: "destructive",
        });
      }
    }
  });
  
  // Мутация для завершения конференции
  const endConferenceMutation = useMutation({
    mutationFn: async (conferenceId: string) => {
      const res = await apiRequest("POST", `/api/admin/conferences/${conferenceId}/end`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Конференция завершена",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/conferences"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось завершить конференцию: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Фильтрация конференций
  const filteredConferences = conferences?.filter(conf => 
    conf.title.toLowerCase().includes(filterText.toLowerCase()) || 
    conf.ownerName.toLowerCase().includes(filterText.toLowerCase())
  );
  
  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Поиск конференций..." 
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      
      {isConferencesLoading ? (
        <div className="flex justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Владелец</TableHead>
                <TableHead>Состояние</TableHead>
                <TableHead>Создана</TableHead>
                <TableHead>Участники</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConferences && filteredConferences.length > 0 ? (
                filteredConferences.map((conference) => (
                  <TableRow key={conference.id}>
                    <TableCell>{conference.id.substring(0, 8)}...</TableCell>
                    <TableCell>{conference.title}</TableCell>
                    <TableCell>{conference.ownerName}</TableCell>
                    <TableCell>
                      <Badge variant={conference.active ? "success" : "outline"}>
                        {conference.active ? "Активна" : "Завершена"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(conference.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{conference.participants || 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setSelectedConference(conference);
                            setShowConferenceDialog(true);
                          }}
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                        {conference.active && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => endConferenceMutation.mutate(conference.id)}
                            disabled={endConferenceMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    {filterText ? "Конференции не найдены" : "Нет данных о конференциях"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      
      <Dialog open={showConferenceDialog} onOpenChange={setShowConferenceDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Детали конференции</DialogTitle>
            <DialogDescription>
              Подробная информация о конференции
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">{selectedConference?.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Создана: {selectedConference?.createdAt ? new Date(selectedConference.createdAt).toLocaleString() : "Неизвестно"}
                </p>
              </div>
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Описание</h4>
              <p className="text-sm">{selectedConference?.description || "Нет описания"}</p>
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Функции</h4>
              <div className="flex gap-2 flex-wrap">
                <Badge variant={selectedConference?.hasScreenShare ? "default" : "outline"}>
                  Демонстрация экрана
                </Badge>
                <Badge variant={selectedConference?.hasChat ? "default" : "outline"}>
                  Чат
                </Badge>
                <Badge variant={selectedConference?.hasVideoEnabled ? "default" : "outline"}>
                  Видео
                </Badge>
              </div>
            </div>
            
            {selectedConference?.active && (
              <div className="flex justify-end pt-4">
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    endConferenceMutation.mutate(selectedConference.id);
                    setShowConferenceDialog(false);
                  }}
                  disabled={endConferenceMutation.isPending}
                >
                  {endConferenceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Завершить конференцию
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminPanel() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Получаем информацию о текущем пользователе
  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ["/api/user"],
    retry: 1,
    meta: {
      errorHandler: () => {
        toast({
          title: "Ошибка доступа",
          description: "У вас нет прав для доступа к панели администратора",
          variant: "destructive",
        });
      }
    }
  });
  
  // Проверяем, является ли пользователь суперадмином (Hitklif)
  const isSuperAdmin = currentUser?.role === "superadmin";
  const isAdmin = currentUser?.role === "admin" || isSuperAdmin;
  
  const { data: stats, isLoading: isStatsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    retry: 1,
    meta: {
      errorHandler: () => {
        toast({
          title: "Ошибка загрузки",
          description: "Не удалось загрузить статистику",
          variant: "destructive",
        });
      }
    }
  });

  const { data: systemInfo, isLoading: isSystemLoading } = useQuery<SystemInfo>({
    queryKey: ["/api/admin/system"],
    retry: 1,
    meta: {
      errorHandler: () => {
        toast({
          title: "Ошибка",
          description: "Не удалось получить системную информацию",
          variant: "destructive",
        });
      }
    }
  });

  const { data: settings, isLoading: isSettingsLoading } = useQuery<PaymentSettings>({
    queryKey: ["/api/admin/payment-settings"],
    retry: 1,
    meta: {
      errorHandler: () => {
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить настройки",
          variant: "destructive",
        });
      }
    }
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold">Панель администратора Ikarus</h1>
          {!isUserLoading && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={isSuperAdmin ? "destructive" : "default"}>
                {isSuperAdmin ? "Суперадмин" : isAdmin ? "Администратор" : "Пользователь"}
              </Badge>
              <span className="text-sm text-muted-foreground">{currentUser?.username}</span>
            </div>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          Версия 1.2.0
        </div>
      </div>

      {/* Если пользователь загружается или нет доступа, показываем загрузку */}
      {isUserLoading ? (
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (isAdmin || isSuperAdmin) ? (
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="space-y-4"
        >
          <TabsList className="grid grid-cols-6 md:grid-cols-7 lg:w-auto">
            <TabsTrigger value="dashboard">
              <Activity className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Дашборд</span>
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Пользователи</span>
            </TabsTrigger>
            <TabsTrigger value="conferences">
              <VideoIcon className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Конференции</span>
            </TabsTrigger>
            <TabsTrigger value="payments">
              <CreditCard className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Платежи</span>
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <BellRing className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Уведомления</span>
            </TabsTrigger>
            
            {/* Только суперадмин (Hitklif) имеет доступ к настройкам */}
            {isSuperAdmin && (
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Настройки</span>
              </TabsTrigger>
            )}
            
            {/* Расширенная статистика только для суперадмина */}
            {isSuperAdmin && (
              <TabsTrigger value="statistics">
                <LineChartIcon className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Статистика</span>
              </TabsTrigger>
            )}
            
            {/* Системная информация только для суперадмина */}
            {isSuperAdmin && (
              <TabsTrigger value="system">
                <Server className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Система</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Дашборд */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Пользователей
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isStatsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      stats?.userCount?.count || 0
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +{isStatsLoading ? "..." : (stats?.newUsers?.count || 0)} за 24ч
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Доход
                  </CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isStatsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      `${((stats?.totalRevenue?.sum || 0) / 100).toFixed(0)} ₽`
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +{isStatsLoading ? "..." : `${((stats?.revenueToday?.sum || 0) / 100).toFixed(0)} ₽`} сегодня
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Активные конференции
                  </CardTitle>
                  <VideoIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isStatsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      stats?.activeConferences?.count || 0
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Всего: {isStatsLoading ? "..." : (stats?.conferenceCount?.count || 0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pro подписки
                  </CardTitle>
                  <BarChartIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isStatsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      stats?.proUsers?.count || 0
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isStatsLoading 
                      ? "..." 
                      : `${((stats?.proUsers?.count || 0) / (stats?.userCount?.count || 1) * 100).toFixed(1)}%`} от всех пользователей
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Последние платежи</CardTitle>
                  <CardDescription>
                    10 последних транзакций в системе
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isStatsLoading ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (stats?.recentPayments && stats.recentPayments.length > 0) ? (
                    <div className="space-y-2">
                      {(stats?.recentPayments || []).map((payment) => (
                        <div key={payment.id} className="flex justify-between items-center border-b pb-2">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{payment.username}</span>
                            <span className="text-xs text-muted-foreground">{new Date(payment.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="text-sm font-bold">
                            {(payment.amount / 100).toFixed(0)} ₽
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      Нет данных о платежах
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Новые пользователи</CardTitle>
                  <CardDescription>
                    10 последних зарегистрированных пользователей
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isStatsLoading ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (stats?.recentUsers && stats.recentUsers.length > 0) ? (
                    <div className="space-y-2">
                      {(stats?.recentUsers || []).map((user) => (
                        <div key={user.id} className="flex justify-between items-center border-b pb-2">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{user.username}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                          <div className="text-xs">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      Нет данных о новых пользователях
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Пользователи */}
          <TabsContent value="users" className="space-y-4">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Управление пользователями</CardTitle>
                <CardDescription>
                  Просмотр и управление пользователями системы
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UsersAdminSection />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Конференции */}
          <TabsContent value="conferences" className="space-y-4">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Управление конференциями</CardTitle>
                <CardDescription>
                  Просмотр и управление видеоконференциями в системе
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConferencesAdminSection />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Платежи */}
          <TabsContent value="payments" className="space-y-4">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Управление платежами</CardTitle>
                <CardDescription>
                  Просмотр и управление финансовыми операциями
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentsAdminSection />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Уведомления */}
          <TabsContent value="notifications" className="space-y-4">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Управление уведомлениями</CardTitle>
                <CardDescription>
                  Отправка и настройка уведомлений через Telegram
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NotificationsAdminSection />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Настройки - только для суперадмина */}
          {isSuperAdmin && (
            <TabsContent value="settings" className="space-y-4">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Настройки системы</CardTitle>
                  <CardDescription>
                    Управление настройками платежных систем и ограничениями
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isSettingsLoading ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">YooKassa API</h3>
                        <div className="grid gap-2">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">ID магазина</span>
                            <span className="text-sm">
                              {settings?.yookassa?.shopId || "Не настроено"}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">Секретный ключ</span>
                            <span className="text-sm">
                              {settings?.yookassa?.secretKey 
                                ? "••••••••" + (settings?.yookassa?.secretKey.substring(settings?.yookassa?.secretKey.length - 4) || "") 
                                : "Не настроено"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Stripe API</h3>
                        <div className="grid gap-2">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">Публичный ключ</span>
                            <span className="text-sm">
                              {settings?.stripe?.publicKey 
                                ? "••••••••" + (settings?.stripe?.publicKey.substring(settings?.stripe?.publicKey.length - 4) || "") 
                                : "Не настроено"}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">Секретный ключ</span>
                            <span className="text-sm">
                              {settings?.stripe?.secretKey 
                                ? "••••••••" + (settings?.stripe?.secretKey.substring(settings?.stripe?.secretKey.length - 4) || "") 
                                : "Не настроено"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Расширенная статистика - только для суперадмина */}
          {isSuperAdmin && (
            <TabsContent value="statistics" className="space-y-4">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Расширенная статистика</CardTitle>
                  <CardDescription>
                    Детальная статистика по платежам и подпискам
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StatisticsAdminSection />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Системная информация - только для суперадмина */}
          {isSuperAdmin && (
            <TabsContent value="system" className="space-y-4">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Системная информация</CardTitle>
                  <CardDescription>
                    Мониторинг системы, логи и диагностика
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isSystemLoading ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Сервер</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">ОС:</span>
                                <span className="text-sm font-medium">
                                  {systemInfo?.os?.type} {systemInfo?.os?.release}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">CPU:</span>
                                <span className="text-sm font-medium">
                                  {systemInfo?.cpu?.usage.toFixed(1)}% ({systemInfo?.cpu?.model})
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Память:</span>
                                <span className="text-sm font-medium">
                                  {systemInfo?.memory?.used} / {systemInfo?.memory?.total}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">База данных</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Статус:</span>
                                <Badge variant={
                                  systemInfo?.database?.status === "online" ? "success" : "destructive"
                                }>
                                  {systemInfo?.database?.status === "online" ? "В сети" : "Офлайн"}
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Размер:</span>
                                <span className="text-sm font-medium">{systemInfo?.database?.size}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Соединения:</span>
                                <span className="text-sm font-medium">{systemInfo?.database?.connections}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">WebRTC</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Статус:</span>
                                <Badge variant={
                                  systemInfo?.webrtc?.status === "online" ? "default" : "destructive"
                                }>
                                  {systemInfo?.webrtc?.status === "online" ? "В сети" : "Офлайн"}
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Соединения:</span>
                                <span className="text-sm font-medium">{systemInfo?.webrtc?.connections}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Трафик:</span>
                                <span className="text-sm font-medium">
                                  ↓{systemInfo?.webrtc?.incomingTraffic} ↑{systemInfo?.webrtc?.outgoingTraffic}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Telegram бот</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Статус:</span>
                                <Badge variant={
                                  systemInfo?.telegram?.status === "online" ? "default" : "destructive"
                                }>
                                  {systemInfo?.telegram?.status === "online" ? "В сети" : "Офлайн"}
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Пользователи:</span>
                                <span className="text-sm font-medium">{systemInfo?.telegram?.users || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Запросы:</span>
                                <span className="text-sm font-medium">{systemInfo?.telegram?.requests || 0}</span>
                              </div>
                              
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full mt-2"
                                  >
                                    Настроить бота
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Настройка Telegram бота</DialogTitle>
                                    <DialogDescription>
                                      Введите токен вашего Telegram бота, чтобы подключить его к системе.
                                      Для создания бота используйте @BotFather в Telegram.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <TelegramBotSetup />
                                </DialogContent>
                              </Dialog>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>Лог событий</CardTitle>
                          <CardDescription>
                            Последние 20 событий системы
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="border rounded-md overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Время</TableHead>
                                  <TableHead>Уровень</TableHead>
                                  <TableHead>Сообщение</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {systemInfo?.logs && systemInfo.logs.length > 0 ? (
                                  systemInfo.logs.map((log, index) => (
                                    <TableRow key={index}>
                                      <TableCell>
                                        {new Date(log.timestamp).toLocaleString()}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant={
                                          log.level === "error" ? "destructive" :
                                          log.level === "warning" ? "destructive" :
                                          log.level === "info" ? "default" : "outline"
                                        }>
                                          {log.level.toUpperCase()}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>{log.message}</TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={3} className="text-center py-4">
                                      Нет данных в логе
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      ) : (
        <div className="flex flex-col items-center justify-center h-[50vh] p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-2xl font-bold mb-2">Доступ запрещен</h2>
          <p className="text-muted-foreground mb-4">
            У вас нет прав для доступа к панели администратора. Эта функция доступна только для администраторов системы.
          </p>
        </div>
      )}
    </div>
  );
}