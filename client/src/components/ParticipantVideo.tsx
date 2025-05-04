import { memo, useRef, useEffect, useState, useCallback } from 'react';
import { MicOff, VideoOff, User, Volume2, VolumeX, Maximize, Minimize, PictureInPicture } from 'lucide-react';
import { useWebRTC } from '@/contexts/WebRTCContext';
import useMobile from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Participant } from '@/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ParticipantVideoProps {
  participant: Participant;
  stream?: MediaStream;
  screenShareStream?: MediaStream;
  showPictureInPicture?: boolean;
  isSpeaking?: boolean;
  isFocused?: boolean;
  isRaised?: boolean;
  isDetached?: boolean;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  priority?: boolean;
  onClick?: () => void;
  onDetach?: (participantId: string) => void;
  onReattach?: (participantId: string) => void;
  onVolumeChange?: (participantId: string, volume: number) => void;
  onPictureInPicture?: (participantId: string) => void;
  onToggleFullscreen?: (participantId: string) => void;
  muted?: boolean;
  volumeLevel?: number;
  zIndex?: number;
  isFullscreen?: boolean;
  connectionQuality?: 'poor' | 'average' | 'good';
}

/**
 * Оптимизированный компонент для отображения видео участника конференции
 * с автоматической адаптацией к возможностям устройства
 */
const ParticipantVideo = memo(({
  participant,
  stream,
  screenShareStream,
  showPictureInPicture = false,
  isSpeaking = false,
  isFocused = false,
  isRaised = false,
  isDetached = false,
  className,
  size = 'md',
  priority = false,
  onClick,
  onDetach,
  onReattach,
  onVolumeChange,
  onPictureInPicture,
  onToggleFullscreen,
  muted = false,
  volumeLevel = 1.0,
  zIndex,
  isFullscreen = false,
  connectionQuality = 'good',
}: ParticipantVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const { isLowPerformance } = useMobile();
  
  // Состояния для полноэкранного режима и управления громкостью
  const [isInPiP, setIsInPiP] = useState(false);
  const [localVolumeLevel, setLocalVolumeLevel] = useState(volumeLevel);
  const [localMuted, setLocalMuted] = useState(muted);
  
  // Обработка медиапотока
  useEffect(() => {
    if (videoRef.current && stream) {
      // Если это низкопроизводительное устройство, а медиапоток не имеет приоритет,
      // применяем оптимизации
      if (isLowPerformance && !priority) {
        // На слабых устройствах отключаем автовоспроизведение видео неактивных участников
        videoRef.current.autoplay = isSpeaking;
        
        // Устанавливаем пониженное качество воспроизведения
        try {
          videoRef.current.srcObject = stream;
          
          // Снижаем частоту обновления для экономии ресурсов
          if ('playsInline' in videoRef.current) {
            // @ts-ignore - Нестандартное свойство для оптимизации мобильных устройств
            videoRef.current.playsInline = true;
          }
          
          if ('disablePictureInPicture' in videoRef.current) {
            // @ts-ignore - Нестандартное свойство для оптимизации
            videoRef.current.disablePictureInPicture = !showPictureInPicture;
          }
        } catch (err) {
          console.warn('Ошибка при установке оптимизированного видеопотока:', err);
          setError(true);
        }
      } else {
        // Стандартная настройка для мощных устройств
        try {
          videoRef.current.srcObject = stream;
          videoRef.current.autoplay = true;
        } catch (err) {
          console.warn('Ошибка при установке видеопотока:', err);
          setError(true);
        }
      }
    }
  }, [stream, isLowPerformance, priority, isSpeaking, showPictureInPicture]);
  
  // Обновляем громкость и состояние отключения звука
  useEffect(() => {
    if (videoRef.current && participant.id !== 'local') {
      videoRef.current.volume = localMuted ? 0 : localVolumeLevel;
      videoRef.current.muted = localMuted;
    }
  }, [localVolumeLevel, localMuted, participant.id]);
  
  // Отслеживаем изменения громкости через пропсы
  useEffect(() => {
    setLocalVolumeLevel(volumeLevel);
  }, [volumeLevel]);
  
  // Отслеживаем изменения состояния отключения звука через пропсы
  useEffect(() => {
    setLocalMuted(muted);
  }, [muted]);
  
  // Обработчик успешной загрузки видео
  const handleLoadedMetadata = () => {
    setLoaded(true);
    setError(false);
    
    // Запускаем воспроизведение после загрузки метаданных
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        console.warn('Автозапуск видео не удался:', err);
      });
    }
  };
  
  // Обработчик ошибки загрузки видео
  const handleError = () => {
    setError(true);
    setLoaded(false);
  };
  
  // Размеры контейнера видео
  const sizeClasses = {
    xs: 'w-12 h-12',
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48',
    full: 'w-full h-full'
  };
  
  // CSS-классы для видео
  const videoClasses = cn(
    'rounded-lg object-cover w-full h-full transition-opacity duration-300',
    !participant.videoEnabled && 'hidden',
    loaded ? 'opacity-100' : 'opacity-0',
    className
  );
  
  // CSS-классы для контейнера
  const containerClasses = cn(
    'relative bg-zinc-800/80 rounded-lg overflow-hidden',
    isSpeaking && 'ring-2 ring-primary',
    isFocused && 'ring-2 ring-blue-500',
    isRaised && 'ring-2 ring-amber-500',
    isDetached && 'shadow-lg',
    sizeClasses[size],
    onClick && 'cursor-pointer'
  );
  
  // Рендер аватара при выключенном видео или ошибке
  const renderPlaceholder = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
      <User 
        className={cn(
          "text-zinc-400", 
          size === 'xs' ? 'h-6 w-6' :
          size === 'sm' ? 'h-8 w-8' :
          size === 'md' ? 'h-10 w-10' :
          size === 'lg' ? 'h-12 w-12' :
          size === 'xl' ? 'h-16 w-16' : 'h-20 w-20'
        )} 
      />
    </div>
  );
  
  // Обработчики отцепления/присоединения видео
  const handleDetach = () => {
    if (onDetach) onDetach(participant.id);
  };

  const handleReattach = () => {
    if (onReattach) onReattach(participant.id);
  };

  // Обработчик для изменения громкости
  const handleVolumeChange = useCallback((newVolume: number) => {
    setLocalVolumeLevel(newVolume);
    if (onVolumeChange) {
      onVolumeChange(participant.id, newVolume);
    }
  }, [participant.id, onVolumeChange]);

  // Обработчик для включения/выключения звука
  const handleToggleMute = useCallback(() => {
    setLocalMuted(!localMuted);
  }, [localMuted]);

  // Обработчик для режима "картинка в картинке"
  const handlePictureInPicture = useCallback(() => {
    if (!videoRef.current) return;
    
    try {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture()
          .then(() => setIsInPiP(false))
          .catch(err => console.error('Ошибка при выходе из PiP:', err));
      } else if (videoRef.current) {
        videoRef.current.requestPictureInPicture()
          .then(() => setIsInPiP(true))
          .catch(err => console.error('Ошибка при запросе PiP:', err));
      }
      
      if (onPictureInPicture) {
        onPictureInPicture(participant.id);
      }
    } catch (err) {
      console.error('PiP не поддерживается:', err);
    }
  }, [participant.id, onPictureInPicture]);

  // Обработчик для полноэкранного режима
  const handleToggleFullscreen = useCallback(() => {
    if (!videoRef.current) return;
    
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen()
          .catch(err => console.error('Ошибка при выходе из полноэкранного режима:', err));
      } else {
        const videoElement = videoRef.current;
        if (videoElement.requestFullscreen) {
          videoElement.requestFullscreen()
            .catch(err => console.error('Ошибка при запросе полноэкранного режима:', err));
        }
      }
      
      if (onToggleFullscreen) {
        onToggleFullscreen(participant.id);
      }
    } catch (err) {
      console.error('Полноэкранный режим не поддерживается:', err);
    }
  }, [participant.id, onToggleFullscreen]);

  // Стиль для отцепленного видео
  const detachedStyle = isDetached && zIndex ? { 
    position: 'fixed',
    zIndex,
    top: '20%',
    left: '20%'
  } as React.CSSProperties : undefined;

  return (
    <div 
      className={containerClasses} 
      onClick={onClick}
      style={detachedStyle}
    >
      {/* Основное видео */}
      {stream && participant.videoEnabled && !error && (
        <video
          ref={videoRef}
          className={videoClasses}
          autoPlay
          playsInline
          muted={participant.id === 'local'}
          onLoadedMetadata={handleLoadedMetadata}
          onError={handleError}
        />
      )}
      
      {/* Видео демонстрации экрана с режимом PiP */}
      {screenShareStream && showPictureInPicture && (
        <div className="absolute top-2 right-2 w-1/4 h-1/4 rounded-lg overflow-hidden border-2 border-primary/50 shadow-lg transition-all duration-300 hover:scale-105 hover:border-primary">
          <video
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
            ref={(el) => {
              if (el && screenShareStream) {
                el.srcObject = screenShareStream;
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end justify-center">
            <button
              className="mb-2 p-1 bg-primary/80 rounded-full text-white hover:bg-primary transition-colors duration-200"
              onClick={(e) => {
                e.stopPropagation();
                if (onPictureInPicture) onPictureInPicture(participant.id);
              }}
              title="Открыть в режиме Картинка-в-картинке"
            >
              <PictureInPicture className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
      
      {/* Плейсхолдер при выключенной камере или ошибке */}
      {(!participant.videoEnabled || error) && renderPlaceholder()}
      
      {/* Имя участника */}
      <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/60 text-white text-xs truncate">
        {participant.name}
        {participant.isAdmin && ' (админ)'}
        {isRaised && ' 🖐️'}
      </div>
      
      {/* Индикаторы состояния */}
      <div className="absolute top-1 right-1 flex gap-1">
        {!participant.audioEnabled && (
          <div className="bg-red-600 rounded-full p-0.5">
            <MicOff className="h-3 w-3 text-white" />
          </div>
        )}
        
        {!participant.videoEnabled && (
          <div className="bg-red-600 rounded-full p-0.5">
            <VideoOff className="h-3 w-3 text-white" />
          </div>
        )}
      </div>
      
      {/* Кнопки управления для отцепления и возврата видео */}
      {!isDetached && onDetach && (
        <button 
          className="absolute top-1 left-1 p-1 bg-black/40 rounded-full hover:bg-black/60 transition-colors duration-200"
          onClick={(e) => { e.stopPropagation(); handleDetach(); }}
          title="Отцепить видео"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="3" x2="9" y2="21"></line>
          </svg>
        </button>
      )}
      
      {isDetached && onReattach && (
        <button 
          className="absolute top-1 left-1 p-1 bg-black/40 rounded-full hover:bg-black/60 transition-colors duration-200"
          onClick={(e) => { e.stopPropagation(); handleReattach(); }}
          title="Вернуть видео"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
          </svg>
        </button>
      )}
      
      {/* Элементы управления видео (появляются при наведении) */}
      {(size === 'lg' || size === 'xl' || size === 'full') && participant.id !== 'local' && stream && (
        <div className="absolute inset-0 flex flex-col justify-end opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="bg-black/60 p-2 flex justify-center space-x-2">
            {/* Кнопка управления звуком */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className="p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
                    onClick={(e) => { e.stopPropagation(); handleToggleMute(); }}
                  >
                    {localMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {localMuted ? 'Включить звук' : 'Выключить звук'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Кнопка полноэкранного режима */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className="p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
                    onClick={(e) => { e.stopPropagation(); handleToggleFullscreen(); }}
                  >
                    {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Кнопка картинка-в-картинке */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className="p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
                    onClick={(e) => { e.stopPropagation(); handlePictureInPicture(); }}
                  >
                    <PictureInPicture className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {isInPiP ? 'Выйти из режима PiP' : 'Картинка в картинке'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Слайдер громкости */}
          {!localMuted && (
            <div className="bg-black/60 pt-0 pb-2 px-4">
              <input 
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={localVolumeLevel}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full h-1 accent-primary bg-white/20 rounded-full"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </div>
      )}
      
      {/* Индикатор качества соединения */}
      {connectionQuality && connectionQuality !== 'good' && (
        <div className={cn(
          "absolute bottom-6 right-2 p-1 rounded-full",
          connectionQuality === 'poor' ? 'bg-red-500' : 'bg-yellow-500'
        )}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
            {connectionQuality === 'average' && <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>}
          </svg>
        </div>
      )}
    </div>
  );
});

ParticipantVideo.displayName = 'ParticipantVideo';

export default ParticipantVideo;