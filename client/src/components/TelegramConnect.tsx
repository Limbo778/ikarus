import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Check } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { BrandTelegram } from "@/components/ui/brand-telegram";

interface TelegramConnectProps {
  className?: string;
}

interface FormValues {
  botToken: string;
}

interface TelegramStatus {
  isConnected: boolean;
  connectedAt: string | null;
}

export default function TelegramConnect({ className }: TelegramConnectProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  
  const { data, isLoading } = useQuery<TelegramStatus>({
    queryKey: ["/api/telegram/status"],
    enabled: !!user?.isAdmin,
  });
  
  const connectMutation = useMutation({
    mutationFn: async (formData: FormValues) => {
      const res = await apiRequest("POST", "/api/telegram/connect", formData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешное подключение",
        description: "Telegram бот успешно подключен",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/telegram/status"] });
      setShowForm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка подключения",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      botToken: "",
    },
  });
  
  const onSubmit = (data: FormValues) => {
    connectMutation.mutate(data);
  };
  
  // Only admins can connect Telegram
  if (!user?.isAdmin) return null;
  
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6 flex justify-center items-center min-h-[180px]">
          <div role="status">
            <svg aria-hidden="true" className="w-8 h-8 text-primary/30 animate-spin fill-primary" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
              <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
            </svg>
            <span className="sr-only">Загрузка...</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (data?.isConnected) {
    const connectedDate = data.connectedAt ? new Date(data.connectedAt).toLocaleString('ru-RU') : 'неизвестно';
    
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-[#0088cc]/10">
              <BrandTelegram className="h-5 w-5 text-[#0088cc]" />
            </div>
            <div>
              <CardTitle>Telegram интеграция</CardTitle>
              <CardDescription>
                Telegram бот уже подключен
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-500 bg-green-500/10 p-3 rounded-md">
            <Check className="h-5 w-5" />
            <span className="font-medium">Активен с {connectedDate}</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-[#0088cc]/10">
            <BrandTelegram className="h-5 w-5 text-[#0088cc]" />
          </div>
          <div>
            <CardTitle>Telegram интеграция</CardTitle>
            <CardDescription>
              Подключите Telegram бота, чтобы пользователи могли регистрироваться через Telegram
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      {!showForm ? (
        <CardContent>
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 mb-4 text-sm">
            <p className="mb-2 font-medium">Как создать Telegram бота?</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Откройте BotFather (@BotFather) в Telegram</li>
              <li>Отправьте команду /newbot</li>
              <li>Следуйте инструкциям и получите токен бота</li>
              <li>Скопируйте токен и вставьте его в форму ниже</li>
            </ol>
          </div>
          <Button onClick={() => setShowForm(true)} className="w-full" variant="outline">
            <BrandTelegram className="mr-2 h-4 w-4 text-[#0088cc]" />
            Подключить Telegram бота
          </Button>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="botToken">Токен бота</Label>
              <Input 
                id="botToken"
                {...register("botToken", { required: "Токен бота обязателен" })}
                placeholder="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                className="font-mono text-sm"
              />
              {errors.botToken && (
                <p className="text-sm text-destructive">{errors.botToken.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowForm(false)} 
              className="flex-1"
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-[#0088cc] hover:bg-[#0088cc]/90"
              disabled={connectMutation.isPending}
            >
              {connectMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Подключение...
                </>
              ) : (
                <>
                  <BrandTelegram className="mr-2 h-4 w-4" />
                  Подключить
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}