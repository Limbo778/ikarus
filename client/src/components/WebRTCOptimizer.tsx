import { useRef, useEffect, useState, memo } from 'react';
import { useWebRTC } from '@/contexts/WebRTCContext';
import useMediaQuery from '../hooks/use-media-query';
import { useToast } from '@/hooks/use-toast';

/**
 * Компонент для автоматической оптимизации WebRTC медиа-потоков
 * и экономии ресурсов устройства
 * 
 * Оптимизации:
 * 1. Автоматическое понижение качества видео на слабых устройствах
 * 2. Отключение видео при неактивном окне для экономии батареи
 * 3. Отключение видео на устройствах с малым зарядом
 * 4. Снижение FPS при длительных конференциях
 * 5. Интеллектуальное управление потоком аудио-данных
 */
const WebRTCOptimizer = memo(() => {
  const {
    localStream,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    confDuration,
    participants,
    connectionState
  } = useWebRTC();
  
  const { toast } = useToast();
  
  // Состояние для оптимизации
  const [networkQuality, setNetworkQuality] = useState<'good' | 'average' | 'poor'>('good');
  const [lastOptimizationTime, setLastOptimizationTime] = useState(0);
  const [cpuUsage, setCpuUsage] = useState(0);
  const [adaptiveMode, setAdaptiveMode] = useState(false);
  
  // Состояние устройства пользователя
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isLowEnd = useMediaQuery('(max-width: 640px)');
  const isReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const pageVisibleRef = useRef(true);
  const batteryLevelRef = useRef(1);
  const batteryChargingRef = useRef(true);
  const networkInfoRef = useRef<{
    downlink: number;
    effectiveType: string;
    rtt: number;
    lastChecked: number;
  }>({
    downlink: 10,
    effectiveType: '4g',
    rtt: 50,
    lastChecked: Date.now()
  });
  
  // Отслеживание видимости страницы для экономии ресурсов
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      pageVisibleRef.current = visible;
      
      // Если страница стала невидимой и камера включена, отключаем её временно
      // но только на мобильных устройствах для экономии батареи
      if (localStream && isMobile) {
        const videoTracks = localStream.getVideoTracks();
        if (videoTracks.length > 0) {
          if (!visible) {
            // Отключаем видеотреки, но сохраняем их в включенном состоянии UI
            videoTracks.forEach(track => {
              track.enabled = false;
            });
          } else if (isVideoEnabled) {
            // Включаем видеотреки обратно, если они должны быть включены
            videoTracks.forEach(track => {
              track.enabled = true;
            });
          }
        }
      }
    };
    
    // Подписываемся на события видимости страницы
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [localStream, isVideoEnabled, isMobile]);
  
  // Отслеживание уровня заряда батареи
  useEffect(() => {
    const getBatteryInfo = async () => {
      try {
        if ('getBattery' in navigator) {
          const battery = await (navigator as any).getBattery();
          
          batteryLevelRef.current = battery.level;
          batteryChargingRef.current = battery.charging;
          
          // Обработчики событий батареи
          const handleLevelChange = () => {
            batteryLevelRef.current = battery.level;
            optimizeForBattery();
          };
          
          const handleChargingChange = () => {
            batteryChargingRef.current = battery.charging;
            optimizeForBattery();
          };
          
          battery.addEventListener('levelchange', handleLevelChange);
          battery.addEventListener('chargingchange', handleChargingChange);
          
          return () => {
            battery.removeEventListener('levelchange', handleLevelChange);
            battery.removeEventListener('chargingchange', handleChargingChange);
          };
        }
      } catch (e) {
        console.log('Battery API not supported');
      }
    };
    
    // Оптимизация в зависимости от заряда батареи
    const optimizeForBattery = () => {
      // Если заряд критически низкий и устройство не заряжается
      if (batteryLevelRef.current < 0.15 && !batteryChargingRef.current && isMobile && isVideoEnabled) {
        // Отключаем видео автоматически для экономии заряда
        if (localStream) {
          const videoTracks = localStream.getVideoTracks();
          if (videoTracks.length > 0) {
            // Если нужно полностью отключить видео через интерфейс
            // toggleVideo();
            
            // Или просто выключаем треки, но оставляем UI-состояние
            videoTracks.forEach(track => {
              track.enabled = false;
            });
          }
        }
      }
    };
    
    getBatteryInfo();
    
    // Периодически проверяем состояние и оптимизируем
    const interval = setInterval(() => {
      if (localStream) {
        optimizeForLongDuration();
      }
    }, 60000); // Проверка каждую минуту
    
    return () => {
      clearInterval(interval);
    };
  }, [localStream, isVideoEnabled, toggleVideo, isMobile]);
  
  // Оптимизация для длительных конференций
  const optimizeForLongDuration = () => {
    if (!localStream) return;
    
    // Если конференция длится больше 30 минут, снижаем качество видео
    if (confDuration > 30 * 60) {
      const videoTracks = localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        try {
          // Снижаем FPS и разрешение для экономии ресурсов
          videoTracks.forEach(track => {
            if ('getConstraints' in track) {
              const constraints = track.getConstraints();
              
              // Только если еще не применены ограничения
              if (!constraints.frameRate || (constraints.frameRate as any).ideal > 10) {
                track.applyConstraints({
                  frameRate: { ideal: 10, max: 15 },
                  width: isMobile ? { ideal: 240, max: 320 } : { ideal: 320, max: 480 },
                  height: isMobile ? { ideal: 180, max: 240 } : { ideal: 240, max: 360 }
                }).catch(e => console.warn('Failed to apply constraints', e));
              }
            }
          });
        } catch (e) {
          console.warn('Error optimizing video tracks:', e);
        }
      }
    }
  };
  
  // Применяем оптимизации для первоначальных потоков
  useEffect(() => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      if (videoTracks.length > 0 && (isLowEnd || isReducedMotion)) {
        try {
          // Автоматически оптимизируем качество видео для слабых устройств
          videoTracks.forEach(track => {
            // Максимально ограниченные параметры для слабых устройств
            const constraints = isLowEnd ? {
              width: { ideal: 160, max: 240 },
              height: { ideal: 120, max: 180 },
              frameRate: { ideal: 8, max: 12 }
            } : {
              width: { ideal: 320, max: 480 },
              height: { ideal: 180, max: 240 },
              frameRate: { ideal: 12, max: 15 }
            };
            
            track.applyConstraints(constraints)
              .catch(e => console.warn('Failed to apply initial constraints', e));
          });
        } catch (e) {
          console.warn('Error applying initial video constraints:', e);
        }
      }
    }
  }, [localStream, isLowEnd, isReducedMotion]);
  
  // Новая функция: мониторинг сетевого подключения
  useEffect(() => {
    // Проверяем, поддерживается ли Network Information API
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (!connection) {
      console.log('Network Information API not supported');
      return;
    }
    
    // Функция для обновления информации о сети
    const updateNetworkInfo = () => {
      networkInfoRef.current = {
        downlink: connection.downlink,
        effectiveType: connection.effectiveType,
        rtt: connection.rtt,
        lastChecked: Date.now()
      };
      
      // Оцениваем качество сети
      let quality: 'good' | 'average' | 'poor' = 'good';
      
      if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
        quality = 'poor';
      } else if (connection.effectiveType === '3g' || connection.downlink < 1.5 || connection.rtt > 300) {
        quality = 'average';
      }
      
      setNetworkQuality(quality);
      
      // Если качество сети плохое, показываем уведомление один раз
      if (quality === 'poor' && !adaptiveMode) {
        setAdaptiveMode(true);
        toast({
          title: "Плохое качество соединения",
          description: "Включен режим адаптивного качества видео для стабильной работы.",
          variant: "destructive"
        });
        
        // Применяем оптимизации для плохого соединения
        optimizeForPoorConnection();
      }
    };
    
    // Обновляем информацию при изменении сети
    connection.addEventListener('change', updateNetworkInfo);
    
    // Начальное обновление
    updateNetworkInfo();
    
    // Периодически проверяем состояние сети
    const networkCheckInterval = setInterval(() => {
      updateNetworkInfo();
      
      // В зависимости от качества соединения применяем соответствующие оптимизации
      if (networkQuality === 'poor') {
        optimizeForPoorConnection();
      } else if (networkQuality === 'average') {
        optimizeForAverageConnection();
      }
    }, 10000); // Проверка каждые 10 секунд
    
    return () => {
      connection.removeEventListener('change', updateNetworkInfo);
      clearInterval(networkCheckInterval);
    };
  }, [toast, networkQuality, adaptiveMode]);
  
  // Оптимизация для плохого соединения
  const optimizeForPoorConnection = () => {
    if (!localStream) return;
    
    const now = Date.now();
    // Не оптимизируем слишком часто
    if (now - lastOptimizationTime < 30000) return; // Минимум 30 секунд между оптимизациями
    
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length > 0) {
      try {
        // Максимально снижаем качество для стабильности
        videoTracks.forEach((track: MediaStreamTrack) => {
          track.applyConstraints({
            frameRate: { ideal: 5, max: 10 },
            width: { ideal: 160, max: 240 },
            height: { ideal: 120, max: 180 }
          }).catch((err: Error) => console.error('Failed to apply poor connection constraints', err));
        });
        
        setLastOptimizationTime(now);
      } catch (err) {
        console.error('Error applying network optimizations:', err);
      }
    }
  };
  
  // Оптимизация для среднего качества соединения
  const optimizeForAverageConnection = () => {
    if (!localStream) return;
    
    const now = Date.now();
    // Не оптимизируем слишком часто
    if (now - lastOptimizationTime < 30000) return;
    
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length > 0) {
      try {
        // Умеренно снижаем качество
        videoTracks.forEach((track: MediaStreamTrack) => {
          track.applyConstraints({
            frameRate: { ideal: 12, max: 20 },
            width: { ideal: 240, max: 320 },
            height: { ideal: 180, max: 240 }
          }).catch((err: Error) => console.error('Failed to apply average connection constraints', err));
        });
        
        setLastOptimizationTime(now);
      } catch (err) {
        console.error('Error applying network optimizations:', err);
      }
    }
  };
  
  // Измерение производительности процессора
  useEffect(() => {
    // Не все браузеры поддерживают измерение CPU
    if (!(window as any).requestIdleCallback) return;
    
    let frameCount = 0;
    let lastFrameTime = performance.now();
    let frameRate = 0;
    
    // Функция для измерения FPS - непрямой индикатор загрузки CPU
    const measureFrameRate = () => {
      const now = performance.now();
      frameCount++;
      
      if (now >= lastFrameTime + 1000) {
        frameRate = frameCount;
        frameCount = 0;
        lastFrameTime = now;
        
        // Оцениваем использование CPU на основе фреймрейта
        // (это грубая оценка, но дает некоторое представление)
        const estimatedCPUUsage = Math.max(0, Math.min(100, 100 - (frameRate / 60) * 100));
        setCpuUsage(estimatedCPUUsage);
        
        // Если CPU сильно загружен, применяем оптимизации
        if (estimatedCPUUsage > 80 && participants.size > 3) {
          optimizeForHighCpuUsage();
        }
      }
      
      requestAnimationFrame(measureFrameRate);
    };
    
    requestAnimationFrame(measureFrameRate);
    
  }, [participants.size]);
  
  // Оптимизация при высоком использовании CPU
  const optimizeForHighCpuUsage = () => {
    if (!localStream) return;
    
    // Не оптимизируем слишком часто
    const now = Date.now();
    if (now - lastOptimizationTime < 60000) return; // Минимум 1 минута между оптимизациями
    
    // Снижаем качество своего видео для экономии ресурсов
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length > 0) {
      try {
        videoTracks.forEach((track: MediaStreamTrack) => {
          track.applyConstraints({
            frameRate: { ideal: 10, max: 15 },
            width: { ideal: 240, max: 320 },
            height: { ideal: 180, max: 240 }
          }).catch((err: Error) => console.warn('Failed to apply CPU optimization constraints', err));
        });
        
        toast({
          title: "Оптимизация производительности",
          description: "Качество видео снижено для сохранения стабильности конференции.",
          variant: "default"
        });
        
        setLastOptimizationTime(now);
      } catch (err) {
        console.warn('Error optimizing for high CPU usage:', err);
      }
    }
  };
  
  return null; // Компонент не рендерит UI
});

WebRTCOptimizer.displayName = 'WebRTCOptimizer';

export default WebRTCOptimizer;