import React, { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useWebRTC } from '@/contexts/WebRTCContext';
import { useAuth } from '@/hooks/use-auth';
import useMobile from '@/hooks/use-mobile';
import { Conference } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Spinner } from '../components/Spinner';
import JoinConferenceModal from '@/components/JoinConferenceModal';
import ConferenceView from '../components/ConferenceView';

/**
 * Страница конференции с предзагрузкой данных и модальным окном подключения
 */
export default function ConferencePage() {
  // Базовые хуки
  const [, setLocation] = useLocation();
  const [joinModalOpen, setJoinModalOpen] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const { isMobile } = useMobile();
  
  // Получаем ID конференции из URL
  const [, params] = useRoute('/conference/:id');
  const conferenceId = params?.id || '';
  
  // Стандартный запрос данных конференции через queryClient (правильный формат)
  const { data: conferenceData, isLoading, error } = useQuery<{ conference: Conference }>({
    queryKey: ['/api/conferences', conferenceId],
    retry: 3, // Увеличиваем количество попыток для надежности
    staleTime: 15000, // Кэширование в течение 15 секунд
    enabled: !!conferenceId
  });
  
  // Предварительно запрашиваем аудио для мобильных устройств
  useEffect(() => {
    if (isMobile && !isJoining && conferenceId) {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .catch(err => console.warn('Предварительный запрос аудио не удался:', err));
    }
  }, [isMobile, conferenceId, isJoining]);
  
  // Данные WebRTC контекста
  const { leaveConference } = useWebRTC();
  
  // Обработчики событий с оптимизацией для мобильных устройств
  const handleJoinSuccess = () => {
    setIsJoining(true);
    
    // На мобильных устройствах показываем загрузочный экран 
    // для более плавного перехода к интерфейсу конференции
    if (isMobile) {
      // Задержка для завершения анимаций и скрытия клавиатуры
      setTimeout(() => {
        // Закрываем модальное окно присоединения
        setJoinModalOpen(false);
        
        // Сбрасываем флаг присоединения через небольшую задержку
        // после рендеринга конференции
        setTimeout(() => {
          setIsJoining(false);
        }, 500);
      }, 100);
    } else {
      // На десктопе мгновенно показываем интерфейс конференции
      setJoinModalOpen(false);
      setIsJoining(false);
    }
  };
  
  const handleLeave = () => {
    // Показываем загрузочное состояние во время выхода
    setIsJoining(true);
    
    // Покидаем конференцию через WebRTC
    leaveConference();
    
    // Возвращаемся на главную страницу
    setLocation('/');
  };
  
  // Отображение состояния загрузки
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }
  
  // Обработка отсутствия данных конференции
  if (!conferenceData?.conference) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4">
        <h1 className="text-2xl font-bold">Конференция не найдена</h1>
        <p className="text-muted-foreground">Указанная конференция не существует или была завершена</p>
        <Button onClick={() => setLocation('/')}>Вернуться на главную</Button>
      </div>
    );
  }
  
  // Отображение индикатора присоединения к конференции на мобильных
  if (isJoining && isMobile) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
        <Spinner size="lg" />
        <p className="mt-4 text-center text-lg animate-pulse">
          Подключение к конференции...
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground max-w-xs">
          На мобильных устройствах подключение может занять некоторое время. Пожалуйста, подождите.
        </p>
      </div>
    );
  }
  
  return (
    <>
      {/* Модальное окно для подключения к конференции */}
      <JoinConferenceModal
        open={joinModalOpen}
        onOpenChange={setJoinModalOpen}
        conferenceId={conferenceId}
        onJoinSuccess={handleJoinSuccess}
      />
      
      {/* Основной компонент конференции */}
      {!joinModalOpen && (
        <ConferenceView 
          conference={conferenceData.conference}
          onLeave={handleLeave}
        />
      )}
    </>
  );
}
