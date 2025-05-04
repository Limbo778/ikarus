import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useRoute, Redirect } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Conference } from '@/types';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { ParticleBackground } from '@/components';
import JoinConferenceModal from '../components/JoinConferenceModal';
import { Logo } from '@/components/Logo';

export default function JoinConferencePage() {
  const [, params] = useRoute('/join/:id');
  const conferenceId = params?.id;
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  
  // Запрос для получения информации о конференции
  const { data, isLoading, error } = useQuery<{ conference: Conference }>({
    queryKey: ['/api/conferences', conferenceId],
    enabled: !!conferenceId,
    retry: 3 // Увеличиваем количество повторных попыток для стабильности
  });
  
  const conference = data?.conference;
  
  // Проверяем статус загрузки
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ParticleBackground />
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-white/80">Загрузка информации о конференции...</p>
        </div>
      </div>
    );
  }
  
  // Проверяем ошибки
  if (error || !conference) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ParticleBackground />
        <div className="text-center max-w-md p-6 glass-card rounded-xl">
          <h1 className="text-2xl font-bold mb-4 text-white">Конференция не найдена</h1>
          <p className="mb-6 text-white/80">
            Возможно, ссылка неверна или конференция была завершена.
          </p>
          <Button onClick={() => navigate('/')}>Вернуться на главную</Button>
        </div>
      </div>
    );
  }
  
  // Если конференция завершена
  if (!conference.active) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ParticleBackground />
        <div className="text-center max-w-md p-6 glass-card rounded-xl">
          <h1 className="text-2xl font-bold mb-4 text-white">Конференция завершена</h1>
          <p className="mb-6 text-white/80">
            Эта конференция уже завершена и недоступна для подключения.
          </p>
          <Button onClick={() => navigate('/')}>Вернуться на главную</Button>
        </div>
      </div>
    );
  }
  
  // Если пользователь авторизован и является создателем конференции или админом,
  // перенаправляем сразу на страницу конференции
  if (user && (user.id === conference.creatorId || user.role === 'admin' || user.role === 'superadmin')) {
    return <Redirect to={`/conference/${conferenceId}`} />;
  }
  
  // Функция для успешного присоединения
  const handleJoinSuccess = () => {
    navigate(`/conference/${conferenceId}`);
  };
  
  // Определяем, используется ли мобильное устройство
  const isMobile = window.innerWidth <= 768;
  
  return (
    <div className="min-h-screen flex flex-col">
      <ParticleBackground density={isMobile ? 30 : 50} />
      
      {/* Верхняя панель с логотипом - оптимизирована для всех устройств */}
      <header className="bg-background/50 backdrop-blur-md border-b border-primary/10 py-3 sticky top-0 z-10">
        <div className="container flex items-center justify-between">
          <Logo withText size={isMobile ? "sm" : "md"} />
          {user && (
            <Button 
              variant="ghost" 
              className="text-white/80 hover:text-white active:scale-95 transition-transform"
              onClick={() => navigate('/')}
              size={isMobile ? "sm" : "default"}
            >
              Назад
            </Button>
          )}
        </div>
      </header>
      
      {/* Основное содержимое - оптимизировано для всех устройств с улучшенной тактильной отзывчивостью */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className={`
          w-full 
          glass-card 
          rounded-xl 
          animate-fade-in 
          shadow-xl
          ${isMobile ? 'p-5 max-w-[95%]' : 'p-8 max-w-md'}
        `}>
          <h1 className={`
            font-bold 
            gradient-heading 
            ${isMobile ? 'text-xl text-center mb-4' : 'text-2xl md:text-3xl mb-2'}
          `}>
            Присоединиться к конференции
          </h1>
          
          <div className={`
            space-y-4 
            ${isMobile ? 'my-5' : 'my-6'}
          `}>
            <div className={`
              flex 
              items-start 
              gap-3 
              ${isMobile ? 'flex-col items-center text-center' : 'flex-row'}
            `}>
              {!isMobile && (
                <div className="bg-primary/20 p-3 rounded-full">
                  <UserPlus className="h-6 w-6 text-primary" />
                </div>
              )}
              <div>
                <h3 className={`
                  font-semibold 
                  text-white 
                  ${isMobile ? 'text-lg' : 'text-xl'} 
                  mb-1
                `}>
                  {conference.name}
                </h3>
                
                <div className={`flex items-center justify-${isMobile ? 'center' : 'start'} gap-2 mb-2`}>
                  <div className="relative flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="absolute w-2 h-2 bg-green-500 rounded-full animate-pulse-ping"></div>
                  </div>
                  <p className="text-white/70 text-sm">
                    Онлайн: {conference.currentParticipants || 0} {(conference.currentParticipants || 0) === 1 ? 'участник' : 
                    (conference.currentParticipants || 0) > 1 && (conference.currentParticipants || 0) < 5 ? 'участника' : 'участников'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <Button 
            className={`
              w-full 
              relative 
              overflow-hidden 
              shadow-md 
              hover:shadow-lg 
              active:scale-[0.98] 
              transition-all 
              ${isMobile ? 'py-7 text-base rounded-xl font-semibold' : ''}
            `}
            size="lg"
            onClick={() => setJoinModalOpen(true)}
          >
            <span className="relative z-10">Присоединиться сейчас</span>
            <span className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/30 opacity-0 hover:opacity-100 transition-opacity"></span>
          </Button>
          
          {!user && (
            <p className={`
              text-sm 
              text-center 
              text-white/60
              ${isMobile ? 'mt-6' : 'mt-4'}
            `}>
              Вы присоединяетесь как гость. 
              <button
                onClick={() => navigate('/auth')} 
                className="ml-1 text-primary hover:underline active:text-primary/80 transition-colors"
              >
                Войти в аккаунт
              </button>
            </p>
          )}
        </div>
      </main>
      
      {/* Модальное окно для ввода имени и присоединения */}
      <JoinConferenceModal 
        open={joinModalOpen}
        onOpenChange={setJoinModalOpen}
        conferenceId={conferenceId || ''}
        onJoinSuccess={handleJoinSuccess}
      />
    </div>
  );
}