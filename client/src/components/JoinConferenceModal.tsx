import React, { useEffect, useState, useRef } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Conference } from '@shared/schema';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useWebRTC } from '@/contexts/WebRTCContext';
import useMobile from '@/hooks/use-mobile';
import { Spinner } from '@/components/Spinner';

// Схема для валидации формы с меньшими ограничениями для мобильных устройств
const joinSchema = z.object({
  name: z.string()
    .min(1, 'Имя не может быть пустым')
    .max(50, 'Имя слишком длинное'),
});

type JoinFormValues = z.infer<typeof joinSchema>;

interface JoinConferenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conferenceId: string;
  onJoinSuccess: (conference: Conference) => void;
}

export default function JoinConferenceModal({
  open,
  onOpenChange,
  conferenceId,
  onJoinSuccess
}: JoinConferenceModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const webRTC = useWebRTC();
  const { isMobile } = useMobile();
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  // Состояния для улучшения UX на мобильных устройствах
  const [joinButtonClicked, setJoinButtonClicked] = useState(false);
  const [mediaPermissionRequested, setMediaPermissionRequested] = useState(false);
  const [loadingConference, setLoadingConference] = useState(true);
  
  // Настраиваем форму с валидацией
  const form = useForm<JoinFormValues>({
    resolver: zodResolver(joinSchema),
    defaultValues: {
      name: user?.name || user?.username || '',
    },
    mode: 'onChange' // Более быстрая валидация при вводе
  });

  // Автофокус на поле ввода имени при открытии модального окна
  useEffect(() => {
    if (open && nameInputRef.current) {
      // Для мобильных устройств добавляем небольшую задержку,
      // чтобы виртуальная клавиатура успела появиться
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, isMobile ? 300 : 50);
    }
  }, [open, isMobile]);

  // Более эффективный предварительный запрос медиа для мобильных устройств
  useEffect(() => {
    if (open && !mediaPermissionRequested) {
      setMediaPermissionRequested(true);
      
      // На мобильных устройствах сначала пробуем только аудио для ускорения
      if (isMobile) {
        // Сильно упрощенные ограничения для мобильных для быстрого запуска
        const audioOnlyConstraints: MediaStreamConstraints = { 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false 
        };
        
        // Запрашиваем только аудио сначала для ускорения соединения
        navigator.mediaDevices.getUserMedia(audioOnlyConstraints)
          .catch(error => {
            console.warn("Не удалось запросить аудио:", error);
          });
      } else {
        // Для десктопов используем ультра-низкие параметры для максимально быстрого подключения
        // и минимальной нагрузки на систему
        const constraints: MediaStreamConstraints = { 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: {
            // Значительно уменьшенное разрешение для экономии ресурсов
            width: { ideal: 320, max: 480 },
            height: { ideal: 180, max: 270 },
            // Сильно сниженная частота кадров
            frameRate: { ideal: 12, max: 18 }
          }
        };
        
        navigator.mediaDevices.getUserMedia(constraints)
          .then(stream => {
            // Останавливаем треки после получения разрешения
            stream.getTracks().forEach(track => track.stop());
          })
          .catch(error => {
            console.warn("Предварительный запрос медиа не удался:", error);
          });
      }
    }
  }, [open, isMobile, mediaPermissionRequested]);

  // Используем стандартную функцию запроса из queryClient в правильном формате
  const { data: conferenceData, isError: conferenceError, isLoading: isLoadingConferenceData } = useQuery<{ conference: Conference }>({
    queryKey: ['/api/conferences', conferenceId],
    retry: 2, // Увеличиваем число повторных попыток для надежности
    enabled: !!conferenceId && open,
    staleTime: 15000,
    gcTime: 30000
  });
  
  // Обновляем состояние загрузки и проверяем активность конференции
  useEffect(() => {
    setLoadingConference(isLoadingConferenceData);
    
    // Проверяем, активна ли конференция
    if (conferenceData && !conferenceData.conference?.active) {
      toast({
        title: 'Конференция завершена',
        description: 'Эта конференция была завершена',
        variant: 'destructive',
      });
      onOpenChange(false);
    }
  }, [isLoadingConferenceData, conferenceData, toast, onOpenChange]);

  // Выводим ошибку, если конференция не найдена
  useEffect(() => {
    if (conferenceError) {
      toast({
        title: 'Ошибка',
        description: 'Конференция не найдена или была завершена',
        variant: 'destructive',
      });
      onOpenChange(false);
    }
  }, [conferenceError, toast, onOpenChange]);

  // Мутация для присоединения к конференции
  const joinMutation = useMutation({
    mutationFn: async (formData: JoinFormValues) => {
      try {
        // Убедимся, что имя не пустое (дополнительная проверка)
        const name = formData.name.trim();
        if (!name) {
          throw new Error('Пожалуйста, введите ваше имя');
        }
        
        // Проверяем, что конференция существует
        if (!conferenceData?.conference) {
          throw new Error('Конференция не найдена или была завершена');
        }
        
        // Отправляем запрос на присоединение к конференции
        // Используем более простой fetch для мобильных устройств вместо apiRequest
        // для минимизации накладных расходов
        const requestOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include' as RequestCredentials,
          body: JSON.stringify({
            name: name,
            deviceInfo: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              hasMediaDevices: 'mediaDevices' in navigator,
              isMobile
            }
          })
        };
        
        const response = await fetch(`/api/conferences/${conferenceId}/join`, requestOptions);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Ошибка при присоединении к конференции');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Join request error:', error);
        throw error;
      }
    },
    onSuccess: async (data) => {
      // Проверяем, является ли пользователь администратором по роли
      const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || false;
      const userName = form.getValues().name.trim();
      
      // Подключаемся к WebRTC сессии с прогрессивной стратегией на мобильных устройствах
      try {
        if (!webRTC) {
          throw new Error('WebRTC контекст не доступен');
        }
        
        // На мобильных устройствах используем таймаут для ограничения времени подключения
        if (isMobile) {
          // Создаем Promise с таймаутом для предотвращения зависания
          const joinWithTimeout = async () => {
            const timeoutPromise = new Promise<void>((_, reject) => {
              // Если подключение занимает более 8 секунд, продолжаем без ожидания
              setTimeout(() => reject(new Error('timeout')), 8000);
            });
            
            try {
              // Пытаемся подключиться с ограничением по времени
              await Promise.race([
                webRTC.joinConference(conferenceId, userName, isAdmin),
                timeoutPromise
              ]);
              // Успешное подключение
              onJoinSuccess(data.conference);
              onOpenChange(false);
            } catch (err) {
              if (err instanceof Error && err.message === 'timeout') {
                // Если вышло время, все равно переходим на экран конференции
                // WebRTC продолжит подключение в фоне
                console.warn('WebRTC connection timeout, proceeding anyway');
                onJoinSuccess(data.conference);
                onOpenChange(false);
              } else {
                // Другие ошибки обрабатываем обычным способом
                throw err;
              }
            }
          };
          
          await joinWithTimeout();
        } else {
          // На десктопе обычное подключение
          await webRTC.joinConference(conferenceId, userName, isAdmin);
          onJoinSuccess(data.conference);
          onOpenChange(false);
        }
      } catch (error) {
        console.error('Ошибка при подключении к WebRTC:', error);
        toast({
          title: 'Ошибка подключения',
          description: 'Не удалось подключиться к видео-конференции. Проверьте доступ к микрофону и камере.',
          variant: 'destructive',
        });
        
        // Сбрасываем состояние кнопки
        setJoinButtonClicked(false);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось присоединиться к конференции',
        variant: 'destructive',
      });
      
      // Сбрасываем состояние кнопки
      setJoinButtonClicked(false);
    },
  });

  // Оптимизированный обработчик отправки формы с улучшенной обработкой тачскрин событий
  const onSubmit = (data: JoinFormValues) => {
    // Предотвращаем повторные клики и отправки
    if (joinButtonClicked || joinMutation.isPending) {
      return;
    }
    
    // Устанавливаем флаг нажатия
    setJoinButtonClicked(true);
    
    // Оптимизированная обработка для мобильных устройств
    if (isMobile) {
      // Активно скрываем клавиатуру
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      
      // Добавляем вибрацию для тактильной обратной связи (если поддерживается)
      try {
        if (navigator.vibrate) {
          navigator.vibrate(50); // Короткая вибрация для тактильной обратной связи
        }
      } catch (e) {
        // Игнорируем ошибки, связанные с вибрацией
      }
      
      // Улучшенная последовательность для стабильного соединения на мобильных
      // 1. Кнопка сразу показывает индикатор загрузки
      // 2. Небольшая задержка для завершения анимаций и отображения состояния
      // 3. Затем запускаем мутацию
      setTimeout(() => {
        joinMutation.mutate(data);
      }, 150);
    } else {
      // Для десктопов выполняем сразу
      joinMutation.mutate(data);
    }
  };

  // Усовершенствованная отправка формы с предварительной проверкой
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Получаем текущее значение имени
    const currentName = form.getValues().name?.trim();
    
    // Быстрая проверка перед отправкой
    if (!currentName) {
      // Если имя пустое, фокусируемся на поле и показываем ошибку
      nameInputRef.current?.focus();
      form.setError('name', {
        type: 'manual',
        message: 'Пожалуйста, введите ваше имя'
      });
      return;
    }
    
    // Если нет явных ошибок валидации, отправляем форму
    if (!form.formState.errors.name) {
      form.handleSubmit(onSubmit)(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newState) => {
      // Предотвращаем закрытие во время подключения
      if (joinMutation.isPending && newState === false) {
        return;
      }
      onOpenChange(newState);
    }}>
      <DialogContent 
        className={`
          sm:max-w-[450px] 
          bg-background/95 backdrop-blur-lg 
          border-primary/20
          ${isMobile ? 'p-4 rounded-2xl mx-2' : 'p-6'}
          shadow-2xl
        `}
        onPointerDownOutside={(e) => {
          // Предотвращаем закрытие случайным нажатием на мобильных
          if (isMobile || joinButtonClicked || joinMutation.isPending) {
            e.preventDefault();
          }
        }}
      >
        {loadingConference ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Spinner size="lg" className="text-primary" />
            <p className="mt-4 text-muted-foreground animate-pulse">Загрузка конференции...</p>
          </div>
        ) : (
          <>
            <DialogHeader className={isMobile ? 'space-y-3 mb-5' : 'mb-6'}>
              <DialogTitle className={`
                font-bold gradient-heading
                ${isMobile ? 'text-xl text-center' : 'text-2xl'}
              `}>
                Присоединиться к конференции
              </DialogTitle>
              <DialogDescription className={isMobile ? 'text-center' : ''}>
                {conferenceData?.conference?.name ? (
                  <>
                    <span className={`
                      block font-medium
                      ${isMobile ? '' : 'text-lg'}
                    `}>
                      {conferenceData.conference.name}
                    </span>
                    <span className={`
                      block mt-1 
                      ${isMobile ? 'text-sm' : 'text-base text-white/80'}
                    `}>
                      Введите ваше имя для участия
                    </span>
                  </>
                ) : 'Введите ваше имя для участия в конференции'}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form 
                onSubmit={handleFormSubmit} 
                className={`space-y-4 ${isMobile ? 'touch-manipulation' : ''}`}
                autoComplete="on"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={isMobile ? 'text-base' : ''}>Ваше имя</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Введите ваше имя" 
                          {...field}
                          disabled={joinButtonClicked || joinMutation.isPending}
                          ref={nameInputRef}
                          autoComplete="name"
                          autoCapitalize="words"
                          inputMode="text"
                          spellCheck="false"
                          aria-label="Ваше имя для конференции"
                          // Улучшенные стили для каждого типа устройств
                          className={`
                            focus:ring-2 focus:ring-primary/30 
                            transition-all duration-200
                            ${isMobile ? 
                              'text-base py-7 px-4 rounded-xl text-center font-medium' : 
                              'py-5'}
                          `}
                          // При нажатии Enter или кнопки "Готово" сразу отправляем форму
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (form.formState.isValid) {
                                form.handleSubmit(onSubmit)(e);
                              }
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage className={isMobile ? 'text-center mt-2' : ''} />
                    </FormItem>
                  )}
                />
                
                <DialogFooter className={`
                  ${isMobile ? 'mt-8 gap-3 flex-col' : 'mt-6'}
                `}>
                  {isMobile ? (
                    // На мобильных размещаем кнопки в порядке снизу вверх (сначала основное действие)
                    // с увеличенными областями нажатия
                    <>
                      <Button 
                        type="submit" 
                        disabled={joinButtonClicked || joinMutation.isPending}
                        className="w-full py-7 text-base font-semibold rounded-xl shadow-lg active:scale-95 transition-transform"
                      >
                        {(joinButtonClicked || joinMutation.isPending) ? (
                          <>
                            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                            Подключение...
                          </>
                        ) : 'Присоединиться'}
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={joinButtonClicked || joinMutation.isPending}
                        className="w-full py-6 text-base rounded-xl border-2 active:bg-background/90 transition-colors"
                      >
                        Отмена
                      </Button>
                    </>
                  ) : (
                    // На десктопе стандартный порядок с улучшенными взаимодействиями
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={joinButtonClicked || joinMutation.isPending}
                        className="min-w-[100px] py-5 border-2 hover:bg-background/80"
                      >
                        Отмена
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={joinButtonClicked || joinMutation.isPending}
                        className="min-w-[160px] py-5 font-medium shadow-md hover:shadow-lg transition-shadow"
                      >
                        {(joinButtonClicked || joinMutation.isPending) ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Подключение...
                          </>
                        ) : 'Присоединиться'}
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}