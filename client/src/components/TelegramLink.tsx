import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Link, Check } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { BrandTelegram } from "@/components/ui/brand-telegram";

interface TelegramLinkProps {
  className?: string;
}

interface FormValues {
  telegramId: string;
}

export default function TelegramLink({ className }: TelegramLinkProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  
  const linkMutation = useMutation({
    mutationFn: async (formData: FormValues) => {
      const res = await apiRequest("POST", "/api/telegram/link", formData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Аккаунт привязан",
        description: "Ваш Telegram аккаунт успешно привязан",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setShowForm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка привязки",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      telegramId: "",
    },
  });
  
  const onSubmit = (data: FormValues) => {
    linkMutation.mutate(data);
  };
  
  if (!user) return null;
  
  // If already linked
  if (user.telegramId) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-[#0088cc]/10">
              <BrandTelegram className="h-5 w-5 text-[#0088cc]" />
            </div>
            <div>
              <CardTitle>Telegram аккаунт</CardTitle>
              <CardDescription>
                Ваш Telegram аккаунт привязан к профилю
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-500 bg-green-500/10 p-3 rounded-md">
            <Check className="h-5 w-5" />
            <span className="font-medium">{user.telegramId}</span>
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
            <CardTitle>Telegram аккаунт</CardTitle>
            <CardDescription>
              Привяжите свой Telegram аккаунт для получения уведомлений
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      {!showForm ? (
        <CardContent>
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 mb-4 text-sm">
            <p className="mb-2 font-medium">Преимущества привязки Telegram</p>
            <ul className="space-y-1 text-muted-foreground">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Получайте мгновенные уведомления о конференциях</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Подключайтесь к конференциям через бота</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Управляйте своими конференциями через Telegram</span>
              </li>
            </ul>
          </div>
          <Button onClick={() => setShowForm(true)} className="w-full" variant="outline">
            <BrandTelegram className="mr-2 h-4 w-4 text-[#0088cc]" />
            Привязать Telegram аккаунт
          </Button>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="telegramId">Telegram ID</Label>
              <Input 
                id="telegramId"
                {...register("telegramId", { required: "Telegram ID обязателен" })}
                placeholder="123456789"
                className="font-mono text-sm"
              />
              {errors.telegramId && (
                <p className="text-sm text-destructive">{errors.telegramId.message}</p>
              )}
              <div className="p-3 rounded-md bg-muted/50 text-xs text-muted-foreground space-y-2">
                <p className="font-medium">Как получить ваш Telegram ID:</p>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>Найдите бота Ikarus в Telegram</li>
                  <li>Отправьте команду /start</li>
                  <li>Бот пришлет ваш ID для привязки аккаунта</li>
                </ol>
              </div>
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
              disabled={linkMutation.isPending}
            >
              {linkMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Привязка...
                </>
              ) : (
                <>
                  <BrandTelegram className="mr-2 h-4 w-4" />
                  Привязать
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}