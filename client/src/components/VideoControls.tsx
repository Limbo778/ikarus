import React, { useState, useEffect, memo } from 'react';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  HandIcon, 
  ScreenShare, 
  Settings, 
  MessageSquare, 
  PhoneOff,
  CircleDot,
  Users,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Volume2,
  VolumeX,
  Share2,
  Download,
  Upload,
  Maximize,
  Minimize,
  PanelRightClose,
  PanelRightOpen,
  FileUp
} from 'lucide-react';
import { useWebRTC } from '@/contexts/WebRTCContext';
import { useAuth } from '@/hooks/use-auth';
import useMobile from '@/hooks/use-mobile';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VideoControlsProps {
  onOpenChat: () => void;
  onLeave: () => void;
  onToggleParticipantsList?: () => void;
  participantsListOpen?: boolean;
  conferenceId?: string;
}

export default memo(function VideoControls({ 
  onOpenChat, 
  onLeave,
  onToggleParticipantsList,
  participantsListOpen,
  conferenceId
}: VideoControlsProps) {
  const {
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isHandRaised,
    isRecording,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    toggleHand,
    toggleRecording,
    participants,
    raisedHands,
    shareFile
  } = useWebRTC();

  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  const [showTooltips, setShowTooltips] = useState(true);
  
  // Подсчитываем количество участников, поднявших руку
  const raisedHandsCount = raisedHands.length;
  
  const { toast } = useToast();
  const { isMobile } = useMobile();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);
  
  // Функция для копирования ссылки для приглашения
  const shareLink = () => {
    if (conferenceId) {
      const url = `${window.location.origin}/conference/${conferenceId}`;
      navigator.clipboard.writeText(url)
        .then(() => {
          toast({
            title: "Успех",
            description: "Ссылка скопирована в буфер обмена",
            variant: "default"
          });
        })
        .catch(err => {
          console.error('Не удалось скопировать ссылку:', err);
          toast({
            title: "Ошибка",
            description: "Не удалось скопировать ссылку",
            variant: "destructive"
          });
        });
    }
  };
  
  // Функция для переключения полноэкранного режима
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullScreen(true);
      }).catch(err => {
        toast({
          title: "Ошибка",
          description: "Не удалось перейти в полноэкранный режим",
          variant: "destructive"
        });
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullScreen(false);
        });
      }
    }
  };
  
  // Функция для обработки загрузки файла
  const handleFileShare = () => {
    if (fileInputRef) {
      fileInputRef.click();
    }
  };

  // Отслеживаем изменения полноэкранного режима
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  // Скрыть подсказки через 10 секунд после первого рендера
  useEffect(() => {
    const timer = setTimeout(() => setShowTooltips(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  const fileInputId = `file-input-${conferenceId}`;

  // Обработка выбранного файла
  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Проверяем размер файла (максимум 10 МБ)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Ошибка",
          description: "Файл слишком большой. Максимальный размер - 10 МБ",
          variant: "destructive"
        });
        return;
      }
      
      // Используем функцию shareFile из контекста для отправки файла
      if (shareFile) {
        shareFile(file)
          .then(() => {
            toast({
              title: "Успех",
              description: `Файл ${file.name} отправлен`,
              variant: "default"
            });
          })
          .catch(error => {
            console.error('Ошибка при отправке файла:', error);
            toast({
              title: "Ошибка",
              description: "Не удалось отправить файл",
              variant: "destructive"
            });
          });
      } else {
        toast({
          title: "Ошибка",
          description: "Функция отправки файлов недоступна",
          variant: "destructive"
        });
      }
      
      // Сбрасываем значение поля ввода, чтобы можно было загрузить тот же файл снова
      e.target.value = '';
    }
  };

  return (
    <div className="relative bg-gradient-to-r from-zinc-900/90 via-zinc-800/90 to-zinc-900/90 p-2 sm:p-4 border-t border-zinc-700/50 backdrop-blur-lg flex justify-center z-10">
      {/* Скрытое поле ввода файла */}
      <input 
        type="file" 
        id={fileInputId}
        className="hidden" 
        onChange={onFileSelected}
        ref={(input) => setFileInputRef(input)}
      />
      
      <TooltipProvider delayDuration={300}>
        {/* Мобильная версия (компактная) */}
        <div className="md:hidden grid grid-cols-4 gap-2">
          <div className="col-span-4 flex justify-center gap-2 mb-2">
            {/* Основные элементы управления в мобильной версии */}
            <Tooltip open={showTooltips}>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleAudio}
                  className={`flex items-center justify-center h-10 w-10 rounded-full transition-all shadow-lg ${
                    isAudioEnabled 
                      ? 'bg-primary hover:bg-primary/80' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isAudioEnabled ? (
                    <Mic className="h-4 w-4 text-white" />
                  ) : (
                    <MicOff className="h-4 w-4 text-white" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{isAudioEnabled ? 'Выключить микрофон' : 'Включить микрофон'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleVideo}
                  className={`flex items-center justify-center h-10 w-10 rounded-full transition-all shadow-lg ${
                    isVideoEnabled 
                      ? 'bg-primary hover:bg-primary/80' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isVideoEnabled ? (
                    <Video className="h-4 w-4 text-white" />
                  ) : (
                    <VideoOff className="h-4 w-4 text-white" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{isVideoEnabled ? 'Выключить камеру' : 'Включить камеру'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onOpenChat}
                  className="flex items-center justify-center h-10 w-10 rounded-full bg-zinc-700 hover:bg-zinc-600 transition-all shadow-lg"
                >
                  <MessageSquare className="h-4 w-4 text-white" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Открыть чат</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onLeave}
                  className="flex items-center justify-center h-10 w-10 rounded-full bg-red-600 hover:bg-red-700 transition-all shadow-lg"
                >
                  <PhoneOff className="h-4 w-4 text-white" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Покинуть конференцию</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="col-span-4 flex justify-center gap-2">
            {/* Вторая строка элементов управления в мобильной версии */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleScreenShare}
                  className={`flex items-center justify-center h-10 w-10 rounded-full transition-all shadow-lg ${
                    isScreenSharing 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-zinc-700 hover:bg-zinc-600'
                  }`}
                >
                  <ScreenShare className="h-4 w-4 text-white" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{isScreenSharing ? 'Остановить трансляцию' : 'Транслировать экран'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggleParticipantsList}
                  className="relative flex items-center justify-center h-10 w-10 rounded-full bg-zinc-700 hover:bg-zinc-600 transition-all shadow-lg"
                >
                  <Users className="h-4 w-4 text-white" />
                  {raisedHandsCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-xs bg-amber-500 border-0">
                      {raisedHandsCount}
                    </Badge>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{participantsListOpen ? 'Скрыть участников' : 'Показать участников'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleHand}
                  className={`flex items-center justify-center h-10 w-10 rounded-full transition-all shadow-lg ${
                    isHandRaised ? 'bg-amber-500 hover:bg-amber-600' : 'bg-zinc-700 hover:bg-zinc-600'
                  }`}
                >
                  <HandIcon className="h-4 w-4 text-white" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{isHandRaised ? 'Опустить руку' : 'Поднять руку'}</p>
              </TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center justify-center h-10 w-10 rounded-full bg-zinc-700 hover:bg-zinc-600 transition-all shadow-lg"
                    >
                      <MoreVertical className="h-4 w-4 text-white" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Ещё</p>
                </TooltipContent>
              </Tooltip>
              
              <DropdownMenuContent className="bg-zinc-900 border-zinc-700 text-white">
                <DropdownMenuItem 
                  onClick={shareLink}
                  className="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer text-sm"
                >
                  <Share2 className="mr-2 h-4 w-4 text-primary" />
                  <span>Скопировать ссылку</span>
                </DropdownMenuItem>

                <DropdownMenuItem 
                  onClick={handleFileShare}
                  className="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer text-sm"
                >
                  <FileUp className="mr-2 h-4 w-4 text-blue-400" />
                  <span>Отправить файл</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={toggleFullScreen}
                  className="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer text-sm"
                >
                  {isFullScreen ? (
                    <>
                      <Minimize className="mr-2 h-4 w-4 text-green-400" />
                      <span>Выйти из полноэкранного режима</span>
                    </>
                  ) : (
                    <>
                      <Maximize className="mr-2 h-4 w-4 text-green-400" />
                      <span>Полноэкранный режим</span>
                    </>
                  )}
                </DropdownMenuItem>
                
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator className="bg-zinc-700" />
                    <DropdownMenuItem 
                      onClick={() => toggleRecording(!isRecording)}
                      className="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer text-sm"
                    >
                      <CircleDot className={`mr-2 h-4 w-4 ${isRecording ? 'text-red-500' : 'text-white'}`} />
                      <span>{isRecording ? 'Остановить запись' : 'Начать запись'}</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Десктопная версия (полная) */}
        <div className="hidden md:flex flex-wrap justify-center gap-3 md:gap-4">
          {/* Audio Toggle */}
          <Tooltip open={showTooltips}>
            <TooltipTrigger asChild>
              <button
                onClick={toggleAudio}
                className={`flex items-center justify-center h-12 w-12 rounded-full transition-all duration-300 shadow-lg ${
                  isAudioEnabled 
                    ? 'bg-primary hover:bg-primary/80' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isAudioEnabled ? (
                  <Mic className="h-5 w-5 text-white" />
                ) : (
                  <MicOff className="h-5 w-5 text-white" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{isAudioEnabled ? 'Выключить микрофон' : 'Включить микрофон'}</p>
            </TooltipContent>
          </Tooltip>

          {/* Video Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleVideo}
                className={`flex items-center justify-center h-12 w-12 rounded-full transition-all duration-300 shadow-lg ${
                  isVideoEnabled 
                    ? 'bg-primary hover:bg-primary/80' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isVideoEnabled ? (
                  <Video className="h-5 w-5 text-white" />
                ) : (
                  <VideoOff className="h-5 w-5 text-white" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{isVideoEnabled ? 'Выключить камеру' : 'Включить камеру'}</p>
            </TooltipContent>
          </Tooltip>

          {/* Screen Share */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleScreenShare}
                className={`flex items-center justify-center h-12 w-12 rounded-full transition-all duration-300 shadow-lg ${
                  isScreenSharing 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-zinc-700 hover:bg-zinc-600'
                }`}
              >
                <ScreenShare className="h-5 w-5 text-white" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{isScreenSharing ? 'Остановить трансляцию экрана' : 'Транслировать экран'}</p>
            </TooltipContent>
          </Tooltip>

          {/* File Upload */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleFileShare}
                className="flex items-center justify-center h-12 w-12 rounded-full bg-zinc-700 hover:bg-zinc-600 transition-all duration-300 shadow-lg"
              >
                <FileUp className="h-5 w-5 text-white" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Отправить файл</p>
            </TooltipContent>
          </Tooltip>

          {/* Participants */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleParticipantsList}
                className="relative flex items-center justify-center h-12 w-12 rounded-full bg-zinc-700 hover:bg-zinc-600 transition-all duration-300 shadow-lg"
              >
                <Users className="h-5 w-5 text-white" />
                {participantsListOpen ? (
                  <ChevronDown className="absolute -bottom-0.5 h-3 w-3 text-white" />
                ) : (
                  <ChevronUp className="absolute -bottom-0.5 h-3 w-3 text-white" />
                )}
                
                {raisedHandsCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-amber-500 border-0">
                    {raisedHandsCount}
                  </Badge>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{participantsListOpen ? 'Скрыть участников' : 'Показать участников'}</p>
            </TooltipContent>
          </Tooltip>

          {/* Raise Hand */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleHand}
                className={`flex items-center justify-center h-12 w-12 rounded-full transition-all duration-300 shadow-lg ${
                  isHandRaised ? 'bg-amber-500 hover:bg-amber-600' : 'bg-zinc-700 hover:bg-zinc-600'
                }`}
              >
                <HandIcon className="h-5 w-5 text-white" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{isHandRaised ? 'Опустить руку' : 'Поднять руку'}</p>
            </TooltipContent>
          </Tooltip>

          {/* Chat */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onOpenChat}
                className="flex items-center justify-center h-12 w-12 rounded-full bg-zinc-700 hover:bg-zinc-600 transition-all duration-300 shadow-lg"
              >
                <MessageSquare className="h-5 w-5 text-white" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Открыть чат</p>
            </TooltipContent>
          </Tooltip>

          {/* Fullscreen */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleFullScreen}
                className="flex items-center justify-center h-12 w-12 rounded-full bg-zinc-700 hover:bg-zinc-600 transition-all duration-300 shadow-lg"
              >
                {isFullScreen ? (
                  <Minimize className="h-5 w-5 text-white" />
                ) : (
                  <Maximize className="h-5 w-5 text-white" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{isFullScreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}</p>
            </TooltipContent>
          </Tooltip>
          
          {/* More options dropdown (only for admin) */}
          {isAdmin && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center justify-center h-12 w-12 rounded-full bg-zinc-700 hover:bg-zinc-600 transition-all duration-300 shadow-lg"
                    >
                      <MoreVertical className="h-5 w-5 text-white" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Дополнительные действия администратора</p>
                </TooltipContent>
              </Tooltip>
              
              <DropdownMenuContent className="bg-zinc-900 border-zinc-700 text-white min-w-[240px]">
                <DropdownMenuItem 
                  onClick={shareLink}
                  className="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer"
                >
                  <Share2 className="mr-2 h-4 w-4 text-primary" />
                  <span>Скопировать ссылку-приглашение</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => toggleRecording(!isRecording)}
                  className="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer"
                >
                  <CircleDot className={`mr-2 h-4 w-4 ${isRecording ? 'text-red-500' : 'text-white'}`} />
                  <span>{isRecording ? 'Остановить запись' : 'Начать запись'}</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  className="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer"
                >
                  <Volume2 className="mr-2 h-4 w-4 text-white" />
                  <span>Отключить микрофоны всех участников</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* End Call */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onLeave}
                className="flex items-center justify-center h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 transition-all duration-300 shadow-lg"
              >
                <PhoneOff className="h-5 w-5 text-white" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Покинуть конференцию</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
      
      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 py-1 px-3 bg-red-600 rounded-full flex items-center space-x-1 text-xs font-medium text-white shadow-lg">
          <span className="animate-pulse relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span>Запись</span>
        </div>
      )}
    </div>
  );
})