import { 
  createContext, 
  ReactNode, 
  useContext, 
  useState, 
  useEffect,
  useCallback,
  useRef
} from "react";
import type { 
  Participant,
  ChatMessage,
  Poll,
  PollOption
} from "@shared/schema";
import type { 
  WebRTCContextType,
  WebRTCState,
  FileShare,
  WhiteboardAction,
  DrawElement
} from "@/types";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';

/**
 * Начальное состояние для WebRTC контекста
 */
const initialState: WebRTCState = {
  localStream: undefined,
  screenStream: undefined, // Stream для демонстрации экрана
  remoteStreams: new Map(),
  participants: [],
  isAudioEnabled: true,
  isVideoEnabled: true,
  isScreenSharing: false,
  isHandRaised: false,
  isRecording: false,
  confDuration: 0,
  chatMessages: [],
  raisedHands: [],
  focusedParticipantId: null,
  isConnected: false,
  fileShares: [],
  activePolls: [],
  endedPolls: [],
  whiteboardActions: [],
  isWhiteboardActive: false,
  sharedWebPage: undefined,
  isHost: false,
  hostSettings: {
    hostVideoPriority: true,
    allowParticipantDetach: false
  }
};

/**
 * Константы для WebRTC
 */
const CONFIG = {
  // Оптимизированные настройки для лучшей производительности
  ICE_SERVERS: [
    // Приоритет отдаем наиболее быстрым STUN серверам
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Публичный TURN сервер только для случаев, когда STUN не работает
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  RECONNECT_ATTEMPTS: 8, // Увеличиваем число попыток переподключения
  RECONNECT_DELAY: 1000, // Уменьшаем начальную задержку для быстрого восстановления
  CONNECTION_TIMEOUT: 15000, // Увеличиваем таймаут соединения
  HEARTBEAT_INTERVAL: 10000 // Уменьшаем интервал пингов
};

// Создаем контекст
export const WebRTCContext = createContext<WebRTCContextType | null>(null);

/**
 * WebRTC провайдер для управления видеоконференцией
 */
export function WebRTCProvider({ children }: { children: ReactNode }) {
  // Состояние
  const [state, setState] = useState<WebRTCState>(initialState);
  const { toast } = useToast();

  // Ссылки на объекты, которые нужно сохранять между рендерами
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceCandidatesQueueRef = useRef<Map<string, RTCIceCandidate[]>>(new Map());
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const conferenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Данные пользователя и конференции
  const userRef = useRef<{
    id: string | null;
    name: string | null;
    isAdmin: boolean;
    isHost: boolean;
  }>({
    id: null,
    name: null,
    isAdmin: false,
    isHost: false
  });
  
  const roomIdRef = useRef<string | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Создание WebSocket соединения
   */
  const setupWebSocket = useCallback((): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      try {
        // Очистка старых таймеров
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        
        // Закрытие существующего соединения
        if (wsRef.current) {
          try {
            // Удаляем обработчики перед закрытием
            wsRef.current.onclose = null;
            wsRef.current.onerror = null;
            wsRef.current.onmessage = null;
            wsRef.current.onopen = null;
            
            if (wsRef.current.readyState !== WebSocket.CLOSED) {
              wsRef.current.close();
            }
          } catch (e) {
            console.error("Error closing existing WebSocket:", e);
          }
          wsRef.current = null;
        }
        
        // Создаем новое соединение
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Используем текущий хост и порт, которые обрабатываются Replit автоматически
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        console.log("Connecting to WebSocket URL:", wsUrl);
        
        console.log(`Creating WebSocket connection to ${wsUrl}`);
        const ws = new WebSocket(wsUrl);
        
        // Настройка бинарных данных
        ws.binaryType = "arraybuffer";
        
        // Таймаут соединения
        const connectionTimeout = setTimeout(() => {
          console.error("WebSocket connection timeout");
          if (ws.readyState !== WebSocket.OPEN) {
            reject(new Error("WebSocket connection timeout"));
          }
        }, CONFIG.CONNECTION_TIMEOUT);
        
        // Обработчик успешного соединения
        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log("WebSocket connection established");
          
          // Сброс счетчика попыток переподключения
          reconnectAttemptsRef.current = 0;
          
          // Обновление состояния
          setState(prev => ({ ...prev, isConnected: true }));
          
          // Настройка heartbeat для поддержания соединения 
          heartbeatIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, CONFIG.HEARTBEAT_INTERVAL);
          
          // Автоматическое переподключение к комнате
          if (roomIdRef.current && userRef.current.id && userRef.current.name) {
            ws.send(JSON.stringify({
              type: 'join-room',
              roomId: roomIdRef.current,
              payload: {
                userId: userRef.current.id,
                name: userRef.current.name,
                isAdmin: userRef.current.isAdmin,
                isHost: userRef.current.isHost
              }
            }));
          }
          
          wsRef.current = ws;
          resolve(ws);
        };
        
        // Сервер самостоятельно обрабатывает пинг-понг для поддержания соединения
        
        // Обработчик сообщений
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message);
          } catch (error) {
            console.error("Error processing WebSocket message:", error);
          }
        };
        
        // Обработчик ошибок
        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          if (connectionTimeout) clearTimeout(connectionTimeout);
          
          toast({
            title: "Проблема с подключением",
            description: "Произошла ошибка соединения. Пытаемся переподключиться...",
            variant: "destructive",
          });
          
          reject(error);
        };
        
        // Обработчик закрытия соединения с улучшенной устойчивостью
        ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
          
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
          }
          
          // Обновляем состояние подключения
          setState(prev => ({ ...prev, isConnected: false }));
          
          // Анализируем причину закрытия соединения
          // Код 1000 означает нормальное закрытие, 1006 - аномальное закрытие
          // Полный список кодов: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
          
          // Улучшенная логика переподключения
          const shouldReconnect = (
            // Для кодов, которые почти всегда требуют переподключения
            [1001, 1006, 1011, 1012, 1013, 1014, 1015].includes(event.code) || 
            // Или любой код 4xxx (приложение-зависимый)
            (event.code >= 4000) ||
            // Или если мы находимся в комнате и соединение должно быть активным
            (!!roomIdRef.current && event.code !== 1000)
          );
          
          if (shouldReconnect) {
            console.log(`Connection closed with code ${event.code}. Attempting to reconnect...`);
            // Пытаемся восстановить соединение. Для кода 1006 (необъяснимое закрытие)
            // начинаем переподключение немедленно
            if (event.code === 1006) {
              // Немедленное переподключение для необъяснимых разрывов
              setTimeout(() => handleReconnect(), 100);
            } else {
              handleReconnect();
            }
          } else {
            console.log(`Connection closed normally with code ${event.code}. Not reconnecting.`);
          }
          
          // Не отклоняем Promise при коде 1006, это может быть временная ошибка
          if (event.code === 1006) {
            // Для кода 1006 мы просто игнорируем ошибку, так как начнем переподключение
            console.log("Ignoring code 1006 error as reconnection will be attempted");
          } else {
            reject(new Error(`WebSocket closed: ${event.code}`));
          }
        };
      } catch (error) {
        console.error("Error creating WebSocket:", error);
        reject(error);
      }
    });
  }, [toast]);

  /**
   * Отправка сообщения через WebSocket с поддержкой автоматического переподключения
   * @param message Сообщение для отправки
   * @returns Promise, который резолвится true если сообщение отправлено успешно
   */
  const sendWebSocketMessage = useCallback(async (message: any): Promise<boolean> => {
    // Если соединение открыто, отправляем сообщение
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error("Error sending WebSocket message:", error);
        return false;
      }
    } 
    
    // Если соединение не открыто, пытаемся переподключиться
    console.warn("WebSocket not connected. Attempting to reconnect...");
    
    try {
      await setupWebSocket();
      
      // После подключения пробуем отправить снова
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
        return true;
      }
    } catch (error) {
      console.error("Failed to reconnect WebSocket:", error);
    }
    
    return false;
  }, [setupWebSocket]);

  /**
   * Функция для обработки переподключения WebSocket
   * с улучшенной стратегией для различных ситуаций
   */
  const handleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= CONFIG.RECONNECT_ATTEMPTS) {
      console.log("Maximum reconnection attempts reached");
      toast({
        title: "Не удалось подключиться",
        description: "Превышено максимальное количество попыток подключения. Перезагрузите страницу.",
        variant: "destructive",
      });
      return;
    }
    
    reconnectAttemptsRef.current++;
    
    console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${CONFIG.RECONNECT_ATTEMPTS})`);
    
    // Адаптивная стратегия задержки:
    // - Для первых попыток используем короткие задержки для быстрого восстановления
    // - Для последующих попыток увеличиваем задержку экспоненциально до определенного предела
    let delay: number;
    
    if (reconnectAttemptsRef.current <= 2) {
      // Быстрые первые попытки
      delay = CONFIG.RECONNECT_DELAY;
    } else if (reconnectAttemptsRef.current <= 5) {
      // Экспоненциальное увеличение для следующих попыток
      delay = CONFIG.RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current - 2);
    } else {
      // Фиксированная задержка для последних попыток
      delay = CONFIG.RECONNECT_DELAY * 8;
    }
    
    console.log(`Reconnecting in ${delay}ms`);
    
    // Очистка ресурсов перед повторной попыткой
    // Используем разные стратегии в зависимости от количества попыток
    if (reconnectAttemptsRef.current > 1) {
      // Стратегия 1: Мягкий сброс (попытки 2-3)
      // Очищаем только проблемные соединения
      if (reconnectAttemptsRef.current <= 3) {
        // Находим и закрываем только проблемные peer connections
        peerConnectionsRef.current.forEach((pc, peerId) => {
          if (pc.iceConnectionState === 'disconnected' || 
              pc.iceConnectionState === 'failed' ||
              pc.connectionState === 'disconnected' ||
              pc.connectionState === 'failed') {
            try {
              console.log(`Closing problematic connection to peer: ${peerId}`);
              pc.close();
              peerConnectionsRef.current.delete(peerId);
            } catch (e) {
              console.warn(`Error closing connection to peer ${peerId}:`, e);
            }
          }
        });
      } 
      // Стратегия 2: Полный сброс (попытки 4+)
      // Закрываем все соединения и очищаем все данные
      else {
        console.log("Performing full reset of all connections");
        // Закрываем все peer connections
        peerConnectionsRef.current.forEach((pc, peerId) => {
          try {
            console.log(`Closing connection to peer: ${peerId}`);
            pc.close();
          } catch (e) {
            console.warn(`Error closing connection to peer ${peerId}:`, e);
          }
        });
        peerConnectionsRef.current.clear();
        
        // Очищаем все буферы и очереди
        iceCandidatesQueueRef.current.clear();
        
        // Сбрасываем состояние удаленных потоков
        setState(prev => ({
          ...prev,
          remoteStreams: new Map(),
          participants: prev.participants.map(p => ({
            ...p,
            connected: false,
          }))
        }));
      }
    }
    
    // Используем таймаут для попытки переподключения
    reconnectTimerRef.current = setTimeout(() => {
      // Добавляем трай-кэтч для дополнительной надежности
      try {
        setupWebSocket()
          .then(() => {
            console.log('Reconnected successfully');
            
            // Сброс счетчика попыток при успешном переподключении
            reconnectAttemptsRef.current = 0;
            
            // Если мы были в комнате, автоматически пытаемся переподключиться к ней
            if (roomIdRef.current && userRef.current.id && userRef.current.name) {
              console.log(`Automatically rejoining room ${roomIdRef.current}`);
              sendWebSocketMessage({
                type: 'join-room',
                roomId: roomIdRef.current,
                payload: {
                  userId: userRef.current.id,
                  name: userRef.current.name,
                  isAdmin: userRef.current.isAdmin,
                  isHost: userRef.current.isHost
                }
              });
            }
          })
          .catch(error => {
            console.error("Reconnection failed:", error);
            
            // Автоматически пытаемся еще раз при определенных ошибках
            if (error.message && (
                error.message.includes('timeout') || 
                error.message.includes('WebSocket closed: 1006'))) {
              handleReconnect();
            }
          });
      } catch (error) {
        console.error("Unexpected error during reconnection setup:", error);
        // Пытаемся еще раз через увеличенную задержку
        setTimeout(handleReconnect, delay * 2);
      }
    }, delay);
  }, [setupWebSocket, toast, sendWebSocketMessage]);

  /**
   * Создание RTCPeerConnection для соединения с участником
   */
  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    console.log(`Creating RTCPeerConnection for peer: ${peerId}`);
    
    // Закрываем существующее соединение, если есть
    const existingPC = peerConnectionsRef.current.get(peerId);
    if (existingPC) {
      console.log(`Closing existing RTCPeerConnection for peer: ${peerId}`);
      existingPC.close();
      peerConnectionsRef.current.delete(peerId);
    }
    
    // Создаем оптимизированное соединение с балансом производительности и совместимости
    const pc = new RTCPeerConnection({
      iceServers: CONFIG.ICE_SERVERS,
      iceCandidatePoolSize: 5, 
      bundlePolicy: 'max-bundle', // Группируем потоки для снижения нагрузки
      rtcpMuxPolicy: 'require',   // Требуем мультиплексирование для уменьшения кол-ва портов
    });
    
    // Логирование изменения состояний RTCPeerConnection
    pc.onconnectionstatechange = () => {
      console.log(`Connection state for ${peerId}: ${pc.connectionState}`);
    };
    
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state for ${peerId}: ${pc.iceConnectionState}`);
      
      // Автоматический перезапуск ICE при проблемах соединения
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        console.log(`Attempting to restart ICE for peer ${peerId}`);
        
        // Ждем немного перед повторной попыткой
        setTimeout(() => {
          try {
            if (pc.signalingState !== 'closed') {
              // Создаем предложение с флагом перезапуска ICE
              pc.createOffer({ iceRestart: true })
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                  sendWebSocketMessage({
                    type: "offer",
                    to: peerId,
                    payload: pc.localDescription
                  });
                })
                .catch(err => console.error('Error during ICE restart:', err));
            }
          } catch (e) {
            console.error('Error trying to restart ICE connection:', e);
          }
        }, 1000);
      }
    };
    
    pc.onicegatheringstatechange = () => {
      console.log(`ICE gathering state for ${peerId}: ${pc.iceGatheringState}`);
    };
    
    pc.onsignalingstatechange = () => {
      console.log(`Signaling state for ${peerId}: ${pc.signalingState}`);
    };
    
    // Отправка ICE-кандидатов через WebSocket
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendWebSocketMessage({
          type: "ice-candidate",
          to: peerId,
          payload: event.candidate
        });
      }
    };
    
    // Добавление локальных медиа потоков в соединение
    if (state.localStream) {
      const videoTracks = state.localStream.getVideoTracks();
      const audioTracks = state.localStream.getAudioTracks();
      
      // Оптимизация видео для мобильных устройств
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && videoTracks.length > 0) {
        videoTracks.forEach(track => {
          track.applyConstraints({
            width: { ideal: 640, max: 854 },
            height: { ideal: 360, max: 480 },
            frameRate: { ideal: 15, max: 24 }
          }).catch(e => console.warn('Error applying video constraints:', e));
        });
      }
      
      // Добавляем треки в соединение
      [...videoTracks, ...audioTracks].forEach(track => {
        console.log(`Adding ${track.kind} track to peer connection: ${track.label}`);
        pc.addTrack(track, state.localStream!);
      });
    }
    
    // Обработка входящих медиа потоков
    pc.ontrack = (event) => {
      console.log(`Received ${event.track.kind} track from peer: ${peerId}`);
      
      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        
        // Настройка обработчиков событий для трека
        event.track.onmute = () => console.log(`Track ${event.track.kind} muted`);
        event.track.onunmute = () => console.log(`Track ${event.track.kind} unmuted`);
        event.track.onended = () => console.log(`Track ${event.track.kind} ended`);
        
        setState(prev => {
          const newRemoteStreams = new Map(prev.remoteStreams);
          
          // Если уже есть поток от этого пира
          const existingStream = newRemoteStreams.get(peerId);
          if (existingStream) {
            // Проверяем, есть ли уже такой трек
            const trackExists = existingStream.getTracks().some(
              t => t.kind === event.track.kind
            );
            
            // Если трека такого типа нет, добавляем его
            if (!trackExists) {
              existingStream.addTrack(event.track);
            }
          } else {
            // Если это новый поток, добавляем его целиком
            newRemoteStreams.set(peerId, stream);
          }
          
          return { ...prev, remoteStreams: newRemoteStreams };
        });
      }
    };
    
    // Сохраняем созданное соединение
    peerConnectionsRef.current.set(peerId, pc);
    return pc;
  }, [state.localStream, sendWebSocketMessage]);

  /**
   * Отправка WebRTC предложения (offer) участнику
   */
  const sendOffer = useCallback(async (peerId: string) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (!pc) {
      console.error(`Cannot send offer: No RTCPeerConnection for peer ${peerId}`);
      return;
    }
    
    try {
      console.log(`Creating offer for peer: ${peerId}`);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      console.log(`Sending offer to peer: ${peerId}`);
      sendWebSocketMessage({
        type: "offer",
        to: peerId,
        payload: offer
      });
    } catch (error) {
      console.error(`Error creating/sending offer to peer ${peerId}:`, error);
    }
  }, [sendWebSocketMessage]);

  /**
   * Обработка сообщений, полученных через WebSocket
   * Оптимизировано для стабильности работы и обработки множественных подключений с одного аккаунта
   */
  const handleWebSocketMessage = useCallback((message: any) => {
    // Защита от некорректных сообщений
    if (!message || typeof message !== 'object') {
      console.warn('Received invalid WebSocket message:', message);
      return;
    }
    
    // Особая обработка для мобильных устройств (делаем сообщения менее приоритетными)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const processingDelay = isMobile ? 50 : 0;
    
    // Расшифровываем сокращенные форматы сообщений для оптимизированного протокола
    const type = message.t || message.type; // Поддерживаем сокращенный формат (t вместо type)
    
    // Обработка ультра-компактного формата ICE-кандидатов
    if (type === 'i') {
      // Преобразуем в стандартный формат для дальнейшей обработки
      message = {
        type: 'ice-candidate',
        from: message.f,
        payload: {
          candidate: message.p?.c,
          sdpMid: message.p?.m,
          sdpMLineIndex: message.p?.l
        }
      };
    } 
    // Обработка компактного формата SDP сообщений
    else if (type === 'o' || type === 'a') {
      message = {
        type: type === 'o' ? 'offer' : 'answer',
        from: message.f,
        payload: message.p
      };
    }
    
    // Используем setTimeout для обработки сообщений, но с приоритизацией важных сообщений
    const delay = 
      // Критические сообщения обрабатываем немедленно
      message.r === 'critical' || message.priority === 'critical' ? 0 :
      // offer/answer отложенно, но с высоким приоритетом
      message.type === 'offer' || message.type === 'answer' ? 
        (isMobile ? 10 : 0) : 
      // ICE кандидаты с наименьшим приоритетом
      message.type === 'ice-candidate' ? 
        (isMobile ? 50 : 20) : 
      // Все остальные сообщения со стандартной задержкой
      isMobile ? 50 : 0;
    
    setTimeout(() => {
      try {
        switch (message.type) {
          // Информация о пользователях в комнате
          case "room-users":
            if (message.payload?.participants) {
              // Фильтруем участников, исключая возможные дубликаты (если это мы сами с другого устройства)
              const filteredParticipants = message.payload.participants.filter(
                (p: Participant) => p.id !== userRef.current.id
              );
              
              // Обновляем список участников
              setState(prev => ({
                ...prev,
                participants: filteredParticipants
              }));
              
              // Инициализируем peer-соединение с каждым участником
              filteredParticipants.forEach((participant: Participant) => {
                if (!peerConnectionsRef.current.has(participant.id)) {
                  createPeerConnection(participant.id);
                  sendOffer(participant.id);
                }
              });
            }
            break;
          
          // Новый пользователь присоединился
          case "user-joined":
            if (message.payload?.userId && message.payload?.participant) {
              // Проверяем, не мы ли это сами с другого устройства
              const isOurSecondDevice = message.payload.userId === userRef.current.id;
              
              // Если это не мы сами с другого устройства, добавляем участника
              if (!isOurSecondDevice) {
                setState(prev => {
                  const newParticipants = [...prev.participants];
                  const existingIndex = newParticipants.findIndex(p => p.id === message.payload.userId);
                  
                  if (existingIndex === -1) {
                    newParticipants.push(message.payload.participant);
                  } else {
                    newParticipants[existingIndex] = message.payload.participant;
                  }
                  
                  return {
                    ...prev,
                    participants: newParticipants
                  };
                });
                
                // Устанавливаем соединение с новым участником
                if (!peerConnectionsRef.current.has(message.payload.userId)) {
                  createPeerConnection(message.payload.userId);
                  sendOffer(message.payload.userId);
                }
              }
            }
            break;
          
          // Пользователь покинул комнату
          case "user-left":
            if (message.payload?.userId) {
              // Закрываем соединение с этим пользователем
              const pc = peerConnectionsRef.current.get(message.payload.userId);
              if (pc) {
                pc.close();
                peerConnectionsRef.current.delete(message.payload.userId);
              }
          
              // Обновляем состояние
              setState(prev => {
                // Удаляем медиапоток пользователя
                const newRemoteStreams = new Map(prev.remoteStreams);
                newRemoteStreams.delete(message.payload.userId);
                
                // Удаляем пользователя из списка участников
                const newParticipants = prev.participants.filter(p => p.id !== message.payload.userId);
                
                // Удаляем из списка поднятых рук
                const newRaisedHands = prev.raisedHands.filter(id => id !== message.payload.userId);
                
                // Сбрасываем фокус, если он был на этом пользователе
                let newFocusedId = prev.focusedParticipantId;
                if (newFocusedId === message.payload.userId) {
                  newFocusedId = null;
                }
                
                return {
                  ...prev,
                  remoteStreams: newRemoteStreams,
                  participants: newParticipants,
                  raisedHands: newRaisedHands,
                  focusedParticipantId: newFocusedId
                };
              });
            }
            break;
      
      // Получили предложение WebRTC
      case "offer":
        if (!message.from || !message.payload) return;
        
        // Получаем или создаем peer-соединение
        const pc = peerConnectionsRef.current.get(message.from) || createPeerConnection(message.from);
        
        // Обрабатываем предложение асинхронно
        (async () => {
          try {
            // Устанавливаем удаленное описание
            await pc.setRemoteDescription(new RTCSessionDescription(message.payload));
            
            // Применяем сохраненные ICE-кандидаты, если есть
            const iceCandidates = iceCandidatesQueueRef.current.get(message.from) || [];
            for (const candidate of iceCandidates) {
              await pc.addIceCandidate(candidate);
            }
            iceCandidatesQueueRef.current.delete(message.from);
            
            // Создаем и отправляем ответ
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendWebSocketMessage({
              type: "answer",
              to: message.from,
              payload: answer
            });
          } catch (error) {
            console.error("Error handling WebRTC offer:", error);
          }
        })();
        break;
      
      // Получили ответ на наше предложение WebRTC
      case "answer":
        if (!message.from || !message.payload) return;
        
        const peerConnection = peerConnectionsRef.current.get(message.from);
        if (peerConnection) {
          (async () => {
            try {
              // Устанавливаем удаленное описание
              await peerConnection.setRemoteDescription(new RTCSessionDescription(message.payload));
              
              // Применяем сохраненные ICE-кандидаты, если есть
              const iceCandidates = iceCandidatesQueueRef.current.get(message.from) || [];
              for (const candidate of iceCandidates) {
                await peerConnection.addIceCandidate(candidate);
              }
              iceCandidatesQueueRef.current.delete(message.from);
            } catch (error) {
              console.error("Error handling WebRTC answer:", error);
            }
          })();
        }
        break;
      
      // Получили ICE-кандидата
      case "ice-candidate":
        if (!message.from || !message.payload) return;
        
        const peerConn = peerConnectionsRef.current.get(message.from);
        
        // Создаем объект кандидата
        const candidate = new RTCIceCandidate(message.payload);
        
        if (peerConn && peerConn.remoteDescription) {
          // Если соединение уже настроено, добавляем кандидата сразу
          peerConn.addIceCandidate(candidate).catch(error => {
            console.error("Error adding ICE candidate:", error);
          });
        } else {
          // Иначе сохраняем кандидата для последующего применения
          const candidates = iceCandidatesQueueRef.current.get(message.from) || [];
          candidates.push(candidate);
          iceCandidatesQueueRef.current.set(message.from, candidates);
        }
        break;
      
      // Изменение состояния медиа у участника
      case "media-state-changed":
        if (!message.payload?.userId) return;
        
        setState(prev => {
          const newParticipants = [...prev.participants];
          const index = newParticipants.findIndex(p => p.id === message.payload.userId);
          
          if (index !== -1) {
            // Создаем копию для иммутабельного обновления
            const updatedParticipant = { ...newParticipants[index] };
            
            // Обновляем соответствующее свойство
            if (message.payload.mediaType === 'audio') {
              // Обновляем аудио состояние
              updatedParticipant.isMuted = !message.payload.enabled;
            } else if (message.payload.mediaType === 'video') {
              // Обновляем видео состояние
              updatedParticipant.isCameraOff = !message.payload.enabled;
            }
            
            newParticipants[index] = updatedParticipant;
          }
          
          return {
            ...prev,
            participants: newParticipants
          };
        });
        break;
      
      // Сообщение в чате
      case "chat-message":
        if (!message.payload) return;
        
        const chatMessage: ChatMessage = {
          id: message.payload.id,
          senderId: message.payload.senderId,
          senderName: message.payload.senderName,
          text: message.payload.text,
          timestamp: message.payload.timestamp,
          isAdmin: message.payload.isAdmin
        };
        
        setState(prev => ({
          ...prev,
          chatMessages: [...prev.chatMessages, chatMessage]
        }));
        break;
      
      // Изменение состояния поднятой руки
      case "hand-state-changed":
        if (!message.payload?.userId) return;
        
        setState(prev => {
          const userId = message.payload.userId;
          const raised = message.payload.raised;
          
          // Обновляем список поднятых рук
          let newRaisedHands = [...prev.raisedHands];
          
          if (raised && !newRaisedHands.includes(userId)) {
            // Добавляем ID в список поднятых рук
            newRaisedHands.push(userId);
          } else if (!raised) {
            // Удаляем ID из списка поднятых рук
            newRaisedHands = newRaisedHands.filter(id => id !== userId);
          }
          
          return {
            ...prev,
            raisedHands: newRaisedHands
          };
        });
        break;
      
      // Изменение состояния записи
      case "recording-state-changed":
        if (message.payload?.isRecording !== undefined) {
          setState(prev => ({
            ...prev,
            isRecording: message.payload.isRecording
          }));
        }
        break;
      
      // Ping от сервера
      case "ping":
        // Отправляем ответ на ping
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "pong" }));
        }
        break;
      
      // Уведомление о замене соединения
      case "connection-replaced":
        toast({
          title: "Соединение заменено",
          description: "Ваше соединение было заменено новым. Возможно, вы подключились с другого устройства.",
          variant: "destructive",
        });
        break;
      
      // Сообщение об ошибке от сервера
      case "error":
        if (message.payload?.message) {
          console.error("Server error:", message.payload.message);
          toast({
            title: "Ошибка сервера",
            description: message.payload.message,
            variant: "destructive",
          });
        }
        break;
      
      // Обмен файлами
      case "file-shared":
        if (message.payload) {
          setState(prev => ({
            ...prev,
            fileShares: [...prev.fileShares, message.payload]
          }));
        }
        break;
      
      // Создание опроса
      case "poll-created":
        if (message.payload) {
          setState(prev => ({
            ...prev,
            activePolls: [...prev.activePolls, message.payload]
          }));
        }
        break;
      
      // Голосование в опросе
      case "poll-vote":
        if (message.payload?.pollId && message.payload?.optionId && message.payload?.userId) {
          setState(prev => ({
            ...prev,
            activePolls: prev.activePolls.map(poll => 
              poll.id === message.payload.pollId
                ? {
                    ...poll,
                    options: poll.options.map(option => 
                      option.id === message.payload.optionId
                        ? { ...option, votes: [...option.votes, message.payload.userId] }
                        : option
                    )
                  }
                : poll
            )
          }));
        }
        break;
      
      // Завершение опроса
      case "poll-ended":
        if (message.payload?.pollId) {
          setState(prev => {
            // Находим опрос для завершения
            const pollToEnd = prev.activePolls.find(p => p.id === message.payload.pollId);
            
            if (pollToEnd) {
              // Перемещаем из активных в завершенные опросы
              return {
                ...prev,
                activePolls: prev.activePolls.filter(p => p.id !== message.payload.pollId),
                endedPolls: [...prev.endedPolls, {
                  ...pollToEnd,
                  endedAt: message.payload.endedAt || new Date().toISOString()
                }]
              };
            }
            
            return prev;
          });
        }
        break;
    }
    
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    }, delay);
  }, [toast, createPeerConnection, sendOffer, sendWebSocketMessage]);

  /**
   * Запрос медиапотоков (камера и микрофон)
   */
  /**
   * Запрашивает доступ к медиа-устройствам пользователя (камера, микрофон)
   * Оптимизирован для различных устройств и обработки ошибок
   * @param withAudio Включать ли аудио. По умолчанию true
   * @param withVideo Включать ли видео. По умолчанию true
   */
  const getMediaStream = useCallback(async (
    withAudio: boolean = true, 
    withVideo: boolean = true
  ): Promise<MediaStream> => {
    try {
      // Защита от ошибок в Safari и старых браузерах
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("getUserMedia не поддерживается в этом браузере");
        toast({
          title: "Браузер не поддерживается",
          description: "Ваш браузер не поддерживает видеоконференции. Попробуйте использовать Chrome, Firefox или Safari.",
          variant: "destructive",
        });
        return new MediaStream();
      }
      
      // Пытаемся получить разрешения от пользователя
      let permissions: PermissionStatus | null = null;
      try {
        if (navigator.permissions && navigator.permissions.query) {
          permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
        }
      } catch (e) {
        console.log("Permissions API not supported, continuing without permission check");
      }
      
      // Перечисляем доступные устройства, делаем несколько попыток
      let devices: MediaDeviceInfo[] = [];
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          devices = await navigator.mediaDevices.enumerateDevices();
          // Если получили устройства, выходим из цикла
          if (devices.length > 0) break;
        } catch (e) {
          console.warn(`Error enumerating devices (attempt ${attempt + 1}):`, e);
        }
        
        // Для некоторых браузеров нужно сначала запросить разрешение
        if (attempt === 0 && devices.length === 0) {
          try {
            const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            // Сразу освобождаем ресурсы
            tempStream.getTracks().forEach(track => track.stop());
          } catch (e) {
            console.warn("Failed to get permission for device enumeration:", e);
          }
        }
      }
      
      // Проверяем наличие устройств
      const hasAudio = devices.some(device => device.kind === 'audioinput');
      const hasVideo = devices.some(device => device.kind === 'videoinput') && 
                      (permissions === null || permissions.state !== 'denied');
      
      console.log(`Device detection: audio=${hasAudio}, video=${hasVideo}`);
      
      // Определяем, на мобильном ли устройстве пользователь
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // Создаем оптимальные настройки для запроса
      const constraints: MediaStreamConstraints = {
        // Настройки аудио - учитываем параметр withAudio и наличие устройства
        audio: (withAudio && hasAudio) ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false,
        
        // Ещё более оптимизированные параметры для всех устройств 
        // для меньшей нагрузки и более быстрого установления соединений
        // Учитываем параметр withVideo и наличие устройства
        video: (withVideo && hasVideo) ? (isMobile ? {
          // Ультра-низкое разрешение для мобильных устройств для снижения энергопотребления
          width: { ideal: 180, max: 240 },
          height: { ideal: 120, max: 180 },
          facingMode: 'user',
          frameRate: { ideal: 8, max: 12 } // Очень низкий FPS для экономии батареи
        } : {
          // Сниженное разрешение для настольных устройств
          width: { ideal: 320, max: 640 },
          height: { ideal: 180, max: 360 },
          frameRate: { ideal: 15, max: 20 } // Ограничиваем FPS для снижения нагрузки на CPU
        }) : false
      };
      
      console.log("Requesting media access with constraints:", JSON.stringify(constraints));
      let stream: MediaStream = new MediaStream(); // Инициализируем пустым потоком по умолчанию
      
      // Пошаговый подход к получению медиа
      if (constraints.video && constraints.audio) {
        // 1. Пробуем сначала полноценный поток с аудио и видео
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: constraints.video,
            audio: constraints.audio
          });
          console.log("Successfully acquired full media stream (audio + video)");
        } catch (fullMediaError) {
          console.warn("Error getting full media:", fullMediaError);
          
          // 2. Если не удалось получить полный поток, пробуем только аудио
          try {
            toast({
              title: "Камера недоступна",
              description: "Не удалось получить доступ к камере. Вы будете участвовать только с аудио.",
              variant: "destructive",
            });
            
            stream = await navigator.mediaDevices.getUserMedia({
              audio: constraints.audio,
              video: false
            });
            console.log("Successfully acquired audio-only stream");
          } catch (audioOnlyError) {
            console.warn("Error getting audio-only stream:", audioOnlyError);
            
            // 3. Если и аудио не получилось, создаем пустой поток
            toast({
              title: "Устройства недоступны",
              description: "Не удалось получить доступ к микрофону и камере. Вы будете видеть и слышать других участников, но они не будут видеть и слышать вас.",
              variant: "destructive",
            });
          }
        }
      } else if (constraints.audio && !constraints.video) {
        // Если только аудио доступно
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: constraints.audio,
            video: false
          });
          console.log("Successfully acquired audio-only stream (no video devices)");
          
          toast({
            title: "Только аудио",
            description: "Камера не обнаружена. Вы будете участвовать только с аудио.",
            variant: "destructive",
          });
        } catch (audioError) {
          console.warn("Error getting audio stream:", audioError);
          
          toast({
            title: "Микрофон недоступен",
            description: "Не удалось получить доступ к микрофону. Другие участники не будут вас слышать.",
            variant: "destructive",
          });
        }
      } else if (constraints.video && !constraints.audio) {
        // В маловероятном случае, если есть только видео без аудио
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: constraints.video,
            audio: false
          });
          console.log("Successfully acquired video-only stream (no audio devices)");
          
          toast({
            title: "Только видео",
            description: "Микрофон не обнаружен. Другие участники не будут вас слышать.",
            variant: "destructive",
          });
        } catch (videoError) {
          console.warn("Error getting video-only stream:", videoError);
          
          toast({
            title: "Камера недоступна",
            description: "Не удалось получить доступ к камере. Вы будете присутствовать без видео и аудио.",
            variant: "destructive",
          });
        }
      } else {
        // Если ни аудио, ни видео не доступны, просто уведомляем пользователя
        console.log("No media devices available, using empty stream");
        
        toast({
          title: "Устройства не обнаружены",
          description: "Микрофон и камера не обнаружены. Вы сможете только наблюдать за конференцией.",
          variant: "destructive",
        });
      }
      
      // Обновляем состояния на основе полученного потока
      const hasVideoTrack = stream.getVideoTracks().length > 0;
      const hasAudioTrack = stream.getAudioTracks().length > 0;
      
      console.log(`Final stream state: videoTracks=${hasVideoTrack}, audioTracks=${hasAudioTrack}`);
      
      // Оптимизация использования видеопотоков для снижения нагрузки на CPU
      if (hasVideoTrack) {
        stream.getVideoTracks().forEach(track => {
          // Задаем ультра-оптимизированные параметры для максимального снижения нагрузки на CPU
          try {
            // Отслеживаем, на мобильном ли устройстве пользователь
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            
            track.applyConstraints({
              // Ещё больше снижаем разрешение для экономии ресурсов
              width: isMobile ? { ideal: 180, max: 240 } : { ideal: 320, max: 480 },
              height: isMobile ? { ideal: 120, max: 180 } : { ideal: 180, max: 270 },
              // Значительно ограничиваем частоту кадров
              frameRate: isMobile ? { ideal: 8, max: 12 } : { ideal: 12, max: 18 },
              // Дополнительные параметры для разных браузеров
              ...(typeof navigator !== 'undefined' && {
                // Для Chrome - оптимизация использования процессора
                ...(/Chrome/.test(navigator.userAgent) && {
                  // @ts-ignore - Дополнительные параметры для Chrome
                  contentHint: 'detail', // 'detail' вместо 'motion' для более агрессивного сжатия
                  // @ts-ignore
                  networkPriority: 'low',
                  // @ts-ignore - Предотвращаем адаптивное увеличение качества
                  adaptiveStreamingEnabled: false
                }),
                // Для Firefox - специфичные оптимизации
                ...(/Firefox/.test(navigator.userAgent) && {
                  // @ts-ignore
                  mozMinBitrate: 100000, // Ограничиваем минимальный битрейт
                  // @ts-ignore
                  mozMaxBitrate: 500000  // Ограничиваем максимальный битрейт
                })
              })
            });
          } catch (e) {
            console.warn('Could not apply optimized video constraints:', e);
          }
        });
      }
      
      // Даже если треки отсутствуют, мы всё равно обновляем состояние
      setState(prev => ({
        ...prev,
        localStream: stream,
        isVideoEnabled: hasVideoTrack,
        isAudioEnabled: hasAudioTrack
      }));
      
      return stream;
    } catch (error) {
      console.error("Fatal error getting any media stream:", error);
      toast({
        title: "Ошибка доступа к медиа",
        description: "Возникла критическая ошибка при попытке доступа к медиа-устройствам. Вы будете присутствовать без аудио и видео.",
        variant: "destructive",
      });
      
      // В крайнем случае возвращаем пустой поток
      const emptyStream = new MediaStream();
      
      setState(prev => ({
        ...prev,
        localStream: emptyStream,
        isVideoEnabled: false,
        isAudioEnabled: false
      }));
      
      return emptyStream;
    }
  }, [toast]);

  /**
   * Запуск таймера конференции
   */
  const startConferenceTimer = useCallback(() => {
    // Очищаем существующий таймер, если есть
    if (conferenceTimerRef.current) {
      clearInterval(conferenceTimerRef.current);
    }
    
    // Создаем новый таймер, который увеличивает счетчик каждую секунду
    conferenceTimerRef.current = setInterval(() => {
      setState(prev => ({ ...prev, confDuration: prev.confDuration + 1 }));
    }, 1000);
  }, []);

  /**
   * Подключение к видеоконференции
   * Немедленно запрашивает доступ к медиа-устройствам и устанавливает соединение
   */
  const joinConference = useCallback(async (
    conferenceId: string, 
    userName: string,
    options?: {
      isAdmin?: boolean;
      isHost?: boolean;
      hostVideoPriority?: boolean;
      allowParticipantDetach?: boolean;
      withAudio?: boolean;
      withVideo?: boolean;
    }
  ) => {
    try {
      const isAdmin = options?.isAdmin || false;
      const isHost = options?.isHost || false;
      const hostVideoPriority = options?.hostVideoPriority !== undefined ? options.hostVideoPriority : true;
      const allowParticipantDetach = options?.allowParticipantDetach || false;
      
      console.log(`Joining conference: ${conferenceId} as ${userName} (admin: ${isAdmin}, host: ${isHost})`);
      
      // Сбрасываем состояние
      setState({
        ...initialState,
        isHost, 
        hostSettings: {
          hostVideoPriority,
          allowParticipantDetach
        }
      });
      
      // Генерируем уникальный ID пользователя (прозрачный для кэширования)
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Сохраняем данные пользователя и конференции
      userRef.current = {
        id: userId,
        name: userName,
        isAdmin
      };
      roomIdRef.current = conferenceId;
      
      // В первую очередь получаем доступ к медиа устройствам
      // Это сразу вызовет запрос разрешений браузера
      console.log("Requesting media access...");
      const withAudio = options?.withAudio !== undefined ? options.withAudio : true;
      const withVideo = options?.withVideo !== undefined ? options.withVideo : true;
      const stream = await getMediaStream(withAudio, withVideo);
      setState(prev => ({ 
        ...prev, 
        localStream: stream,
        isAudioEnabled: withAudio,
        isVideoEnabled: withVideo
      }));
      
      // Подключаемся к WebSocket серверу только после получения медиа
      console.log("Connecting to WebSocket server...");
      await setupWebSocket();
      
      // Присоединяемся к комнате
      console.log("Joining WebRTC room...");
      await sendWebSocketMessage({
        type: "join-room",
        roomId: conferenceId,
        payload: {
          userId,
          name: userName,
          isAdmin,
          isHost,
          hostSettings: {
            hostVideoPriority,
            allowParticipantDetach
          }
        }
      });
      
      // Запускаем таймер конференции
      startConferenceTimer();
      
      // Обновляем информацию о подключении на сервере
      try {
        await fetch(`/api/conferences/${conferenceId}/join`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: userName })
        });
      } catch (error) {
        console.error("Error updating participant count:", error);
      }
      
      // Отправляем активное состояние медиа
      if (stream) {
        // Проверяем начальное состояние микрофона
        const hasAudioTracks = stream.getAudioTracks().length > 0;
        const hasVideoTracks = stream.getVideoTracks().length > 0;
        
        // Уведомляем других участников о нашем состоянии медиа
        sendWebSocketMessage({
          type: "toggle-media",
          roomId: conferenceId,
          payload: {
            type: 'audio',
            enabled: hasAudioTracks
          }
        });
        
        sendWebSocketMessage({
          type: "toggle-media",
          roomId: conferenceId,
          payload: {
            type: 'video',
            enabled: hasVideoTracks
          }
        });
      }
      
      console.log("Successfully joined conference");
    } catch (error) {
      console.error("Error joining conference:", error);
      
      // Уведомляем пользователя об ошибке
      toast({
        title: "Ошибка подключения",
        description: "Не удалось присоединиться к конференции. Проверьте подключение к интернету и доступ к устройствам.",
        variant: "destructive",
      });
      
      // Очищаем ресурсы
      if (state.localStream) {
        state.localStream.getTracks().forEach(track => {
          track.stop();
          console.log(`Stopped track: ${track.kind}`);
        });
      }
      
      throw error;
    }
  }, [getMediaStream, setupWebSocket, sendWebSocketMessage, startConferenceTimer, toast, state.localStream]);

  /**
   * Выход из видеоконференции
   * Оптимизированная версия с улучшенной очисткой ресурсов и обработкой состояний
   */
  const leaveConference = useCallback(() => {
    console.log("Leaving conference");
    
    try {
      // Отправляем уведомление о выходе
      if (roomIdRef.current && userRef.current.id && wsRef.current?.readyState === WebSocket.OPEN) {
        sendWebSocketMessage({
          type: "leave-room",
          roomId: roomIdRef.current,
          payload: { userId: userRef.current.id }
        });
      }
      
      // Останавливаем все медиа-треки
      if (state.localStream) {
        state.localStream.getTracks().forEach(track => {
          try {
            track.stop();
            console.log(`Stopped track: ${track.kind}`);
          } catch (e) {
            console.warn(`Error stopping ${track.kind} track:`, e);
          }
        });
      }
      
      // Останавливаем поток демонстрации экрана, если он есть
      if (state.screenStream) {
        state.screenStream.getTracks().forEach(track => {
          try {
            track.stop();
            console.log(`Stopped screen track: ${track.kind}`);
          } catch (e) {
            console.warn(`Error stopping screen ${track.kind} track:`, e);
          }
        });
      }
      
      // Закрываем все peer-соединения
      peerConnectionsRef.current.forEach((pc, peerId) => {
        try {
          // Удаляем обработчики событий
          pc.ontrack = null;
          pc.onicecandidate = null;
          pc.oniceconnectionstatechange = null;
          pc.onsignalingstatechange = null;
          pc.onicegatheringstatechange = null;
          pc.onconnectionstatechange = null;
          
          // Закрываем соединение
          pc.close();
          console.log(`Closed peer connection with: ${peerId}`);
        } catch (e) {
          console.warn(`Error closing peer connection with: ${peerId}`, e);
        }
      });
      peerConnectionsRef.current.clear();
      
      // Очищаем очередь ICE кандидатов
      iceCandidatesQueueRef.current.clear();
      
      // Безопасно закрываем WebSocket
      if (wsRef.current) {
        try {
          // Удаляем обработчики перед закрытием
          wsRef.current.onclose = null;
          wsRef.current.onerror = null;
          wsRef.current.onmessage = null;
          wsRef.current.onopen = null;
          
          if (wsRef.current.readyState !== WebSocket.CLOSED) {
            wsRef.current.close();
          }
        } catch (e) {
          console.warn("Error closing WebSocket:", e);
        }
        wsRef.current = null;
      }
      
      // Очищаем все таймеры
      if (conferenceTimerRef.current) {
        clearInterval(conferenceTimerRef.current);
        conferenceTimerRef.current = null;
      }
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    } catch (error) {
      console.error("Error during conference cleanup:", error);
    } finally {
      // Сбрасываем состояние комнаты и пользователя
      roomIdRef.current = null;
      
      // Сбрасываем состояния
      setState(initialState);
      userRef.current = { id: null, name: null, isAdmin: false };
      reconnectAttemptsRef.current = 0;
    }
    
    console.log("Successfully left conference");
  }, [state.localStream, sendWebSocketMessage]);

  /**
   * Включение/выключение микрофона
   */
  const toggleAudio = useCallback(() => {
    setState(prev => {
      if (prev.localStream) {
        // Включаем/выключаем все аудио треки
        prev.localStream.getAudioTracks().forEach(track => {
          track.enabled = !prev.isAudioEnabled;
        });
      }
      
      // Отправляем уведомление другим участникам
      if (roomIdRef.current && userRef.current.id) {
        sendWebSocketMessage({
          type: "toggle-media",
          roomId: roomIdRef.current,
          payload: {
            type: 'audio',
            enabled: !prev.isAudioEnabled
          }
        });
      }
      
      return { ...prev, isAudioEnabled: !prev.isAudioEnabled };
    });
  }, [sendWebSocketMessage]);

  /**
   * Включение/выключение камеры
   */
  const toggleVideo = useCallback(() => {
    setState(prev => {
      if (prev.localStream) {
        // Включаем/выключаем все видео треки
        prev.localStream.getVideoTracks().forEach(track => {
          track.enabled = !prev.isVideoEnabled;
        });
      }
      
      // Отправляем уведомление другим участникам
      if (roomIdRef.current && userRef.current.id) {
        sendWebSocketMessage({
          type: "toggle-media",
          roomId: roomIdRef.current,
          payload: {
            type: 'video',
            enabled: !prev.isVideoEnabled
          }
        });
      }
      
      return { ...prev, isVideoEnabled: !prev.isVideoEnabled };
    });
  }, [sendWebSocketMessage]);

  /**
   * Включение/выключение демонстрации экрана
   */
  const toggleScreenShare = useCallback(async () => {
    try {
      if (state.isScreenSharing) {
        // Если уже демонстрируем экран, останавливаем экранные треки
        console.log("Stopping screen sharing");
        
        // Останавливаем треки демонстрации экрана
        if (state.screenStream) {
          state.screenStream.getTracks().forEach(track => track.stop());
        }
        
        // Удаляем треки демонстрации экрана из всех соединений
        peerConnectionsRef.current.forEach(pc => {
          pc.getSenders().forEach(sender => {
            if (sender.track && sender.track.kind === 'video' && 
                (sender.track.label.includes('screen') || sender.track.label.includes('display'))) {
              pc.removeTrack(sender);
            }
          });
        });
        
        // Уведомляем участников конференции об окончании демонстрации экрана
        sendWebSocketMessage({
          type: "toggle-media",
          roomId: roomIdRef.current,
          payload: {
            userId: userRef.current.id,
            isScreenSharing: false
          }
        });
        
        // Обновляем состояние
        setState(prev => ({
          ...prev,
          screenStream: undefined,
          isScreenSharing: false
        }));
        
        toast({
          title: "Демонстрация экрана завершена",
          description: "Участники конференции больше не видят ваш экран",
        });
      } else {
        // Включаем демонстрацию экрана
        console.log("Starting screen sharing");
        
        // Запрашиваем доступ к экрану
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            // @ts-ignore - cursor и displaySurface существуют в спецификации, но не определены в TypeScript
            cursor: "always",
            // @ts-ignore
            displaySurface: "monitor"
          },
          audio: false // Для аудио используем основной микрофон
        });
        
        // Настраиваем обработчик окончания демонстрации
        screenStream.getVideoTracks()[0].onended = () => {
          console.log("Screen sharing ended by user");
          toggleScreenShare();
        };
        
        // Добавляем треки демонстрации экрана во все соединения как дополнительные треки
        peerConnectionsRef.current.forEach(pc => {
          screenStream.getVideoTracks().forEach(track => {
            pc.addTrack(track, screenStream);
          });
        });
        
        // Обновляем состояние
        setState(prev => ({
          ...prev,
          screenStream: screenStream,
          isScreenSharing: true
        }));
        
        // Уведомляем участников конференции о начале демонстрации экрана
        sendWebSocketMessage({
          type: "toggle-media",
          roomId: roomIdRef.current,
          payload: {
            userId: userRef.current.id,
            isScreenSharing: true
          }
        });
        
        toast({
          title: "Демонстрация экрана включена",
          description: "Участники видят ваш экран вместе с камерой в режиме PiP",
        });
      }
    } catch (error) {
      console.error("Error toggling screen share:", error);
      
      toast({
        title: "Ошибка",
        description: "Не удалось включить демонстрацию экрана: " + (error instanceof Error ? error.message : "Неизвестная ошибка"),
        variant: "destructive",
      });
    }
  }, [state.isScreenSharing, state.screenStream, sendWebSocketMessage, toast]);

  /**
   * Включение/выключение поднятия руки
   */
  const toggleHand = useCallback(() => {
    if (!roomIdRef.current || !userRef.current.id) {
      console.error("Cannot toggle hand - not in a room");
      return;
    }
    
    setState(prev => {
      const newHandRaised = !prev.isHandRaised;
      
      // Отправляем уведомление другим участникам
      sendWebSocketMessage({
        type: "hand-state-changed",
        roomId: roomIdRef.current!,
        payload: { raised: newHandRaised }
      });
      
      return { ...prev, isHandRaised: newHandRaised };
    });
  }, [sendWebSocketMessage]);

  /**
   * Включение/выключение записи (только для администраторов)
   */
  const toggleRecording = useCallback((isAdmin: boolean) => {
    if (!isAdmin) {
      toast({
        title: "Ошибка",
        description: "Только администратор может управлять записью.",
        variant: "destructive",
      });
      return;
    }
    
    if (!roomIdRef.current) {
      console.error("Cannot toggle recording - not in a room");
      return;
    }
    
    setState(prev => {
      const newIsRecording = !prev.isRecording;
      
      // Отправляем уведомление всем участникам
      sendWebSocketMessage({
        type: "recording-state-changed",
        roomId: roomIdRef.current!,
        payload: { isRecording: newIsRecording }
      });
      
      return { ...prev, isRecording: newIsRecording };
    });
  }, [sendWebSocketMessage, toast]);

  /**
   * Отправка сообщения в чат
   */
  const sendChatMessage = useCallback((message: string) => {
    if (!message.trim() || !roomIdRef.current || !userRef.current.id) {
      return;
    }
    
    // Отправляем сообщение в чат
    sendWebSocketMessage({
      type: "chat-message",
      roomId: roomIdRef.current,
      payload: {
        message: message.trim(),
        timestamp: new Date().toISOString()
      }
    });
  }, [sendWebSocketMessage]);

  /**
   * Установка фокуса на участнике (для полноэкранного режима)
   */
  const setFocusedParticipant = useCallback((participantId: string | null) => {
    setState(prev => ({ ...prev, focusedParticipantId: participantId }));
  }, []);

  /**
   * Удаление участника (только для администраторов)
   */
  const kickParticipant = useCallback((participantId: string) => {
    if (!roomIdRef.current || !userRef.current.id || !userRef.current.isAdmin) {
      console.error("Cannot kick participant - not admin or not in room");
      return;
    }
    
    // Отправляем команду удаления участника
    sendWebSocketMessage({
      type: "kick-participant",
      roomId: roomIdRef.current,
      payload: { userId: participantId }
    });
  }, [sendWebSocketMessage]);

  /**
   * Отключение звука у участника (только для администраторов)
   */
  const muteParticipant = useCallback((participantId: string) => {
    if (!roomIdRef.current || !userRef.current.id || !userRef.current.isAdmin) {
      console.error("Cannot mute participant - not admin or not in room");
      return;
    }
    
    // Отправляем команду отключения звука участника
    sendWebSocketMessage({
      type: "mute-participant",
      roomId: roomIdRef.current,
      payload: { userId: participantId }
    });
  }, [sendWebSocketMessage]);

  /**
   * Отправка файла другим участникам
   */
  const shareFile = useCallback((file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!roomIdRef.current || !userRef.current.id || !userRef.current.name) {
        console.error("Cannot share file - not in a room");
        reject(new Error("Не подключен к конференции"));
        return;
      }
      
      try {
        // Ограничение размера файла (максимум 10 МБ)
        if (file.size > 10 * 1024 * 1024) {
          reject(new Error("Файл слишком большой. Максимальный размер - 10 МБ"));
          return;
        }
        
        // Создаем объект FileReader для чтения файла
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            // Создаем объект с информацией о файле
            const fileShare: FileShare = {
              id: uuidv4(),
              senderId: userRef.current.id!,
              senderName: userRef.current.name!,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              fileUrl: e.target?.result as string,
              timestamp: new Date().toISOString()
            };
            
            // Отправляем информацию о файле другим участникам
            sendWebSocketMessage({
              type: "file-shared",
              roomId: roomIdRef.current!,
              payload: fileShare
            });
            
            resolve();
          } catch (error) {
            console.error("Error processing file:", error);
            reject(error);
          }
        };
        
        reader.onerror = (error) => {
          console.error("Error reading file:", error);
          reject(new Error("Ошибка чтения файла"));
        };
        
        // Читаем файл как Data URL (base64)
        reader.readAsDataURL(file);
      } catch (error) {
        console.error("Error sharing file:", error);
        reject(error);
        
        toast({
          title: "Ошибка",
          description: "Не удалось отправить файл.",
          variant: "destructive",
        });
      }
    });
  }, [sendWebSocketMessage, toast]);

  /**
   * Создание опроса
   */
  const createPoll = useCallback((question: string, options: string[], multiple: boolean) => {
    if (!roomIdRef.current || !userRef.current.id || !userRef.current.name) {
      console.error("Cannot create poll - not in a room");
      return;
    }
    
    // Создаем объект опроса
    const poll: Poll = {
      id: uuidv4(),
      creatorId: userRef.current.id!,
      creatorName: userRef.current.name!,
      question,
      options: options.map(option => ({
        id: uuidv4(),
        text: option,
        votes: []
      })),
      multiple,
      createdAt: new Date().toISOString()
    };
    
    // Отправляем опрос всем участникам
    sendWebSocketMessage({
      type: "poll-created",
      roomId: roomIdRef.current,
      payload: poll
    });
  }, [sendWebSocketMessage]);

  /**
   * Голосование в опросе
   */
  const votePoll = useCallback((pollId: string, optionId: string) => {
    if (!roomIdRef.current || !userRef.current.id) {
      console.error("Cannot vote in poll - not in a room");
      return;
    }
    
    // Отправляем голос
    sendWebSocketMessage({
      type: "poll-vote",
      roomId: roomIdRef.current,
      payload: {
        pollId,
        optionId
      }
    });
  }, [sendWebSocketMessage]);

  /**
   * Завершение опроса (только для создателя опроса или администраторов)
   */
  const endPoll = useCallback((pollId: string) => {
    if (!roomIdRef.current || !userRef.current.id) {
      console.error("Cannot end poll - not in a room");
      return;
    }
    
    // Найдем опрос
    const poll = state.activePolls.find(p => p.id === pollId);
    
    // Проверим права доступа
    if (poll && poll.creatorId !== userRef.current.id && !userRef.current.isAdmin) {
      toast({
        title: "Ошибка",
        description: "Только создатель опроса или администратор может завершить опрос.",
        variant: "destructive",
      });
      return;
    }
    
    // Отправляем команду завершения опроса
    sendWebSocketMessage({
      type: "poll-ended",
      roomId: roomIdRef.current,
      payload: {
        pollId
      }
    });
  }, [state.activePolls, sendWebSocketMessage, toast]);

  /**
   * Настройка WebSocket при загрузке компонента
   */
  useEffect(() => {
    // Подключаемся к WebSocket при загрузке компонента
    setupWebSocket().catch(error => {
      console.error("Initial WebSocket setup failed:", error);
    });
    
    // Очистка ресурсов при размонтировании компонента
    return () => {
      // Закрываем WebSocket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      // Останавливаем локальный медиа поток
      if (state.localStream) {
        state.localStream.getTracks().forEach(track => track.stop());
      }
      
      // Останавливаем поток демонстрации экрана
      if (state.screenStream) {
        state.screenStream.getTracks().forEach(track => track.stop());
      }
      
      // Закрываем все peer-соединения
      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();
      
      // Очищаем все таймеры
      if (conferenceTimerRef.current) {
        clearInterval(conferenceTimerRef.current);
      }
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [setupWebSocket, state.localStream, state.screenStream]);

  /**
   * Обновление информации о продолжительности конференции
   */
  useEffect(() => {
    // Обновляем информацию о продолжительности каждые 10 секунд
    if (roomIdRef.current && state.confDuration > 0 && state.confDuration % 10 === 0) {
      fetch(`/api/conferences/${roomIdRef.current}/duration`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: state.confDuration })
      }).catch(error => {
        console.error("Error updating conference duration:", error);
      });
    }
  }, [state.confDuration]);

  /**
   * Экспортируемое значение контекста
   */
  /**
   * Включение/выключение интерактивной доски
   */
  const toggleWhiteboard = useCallback(() => {
    setState(prev => ({ ...prev, isWhiteboardActive: !prev.isWhiteboardActive }));
    
    // Отправка сообщения другим участникам о состоянии доски
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendWebSocketMessage({
        type: "whiteboard-toggle",
        roomId: roomIdRef.current,
        payload: {
          active: !state.isWhiteboardActive,
          userId: userRef.current.id
        }
      });
    }
  }, [state.isWhiteboardActive, sendWebSocketMessage]);
  
  /**
   * Отправка действия на интерактивной доске
   */
  const sendWhiteboardAction = useCallback((action: WhiteboardAction) => {
    // Адаптируем действие к формату сервера, если нужно
    const serverAction: WhiteboardAction = {
      ...action, 
      id: action.id || uuidv4(),
      userId: userRef.current.id || 'unknown',
      timestamp: Date.now()
    };
    
    // Добавление действия в локальное состояние
    setState(prev => ({
      ...prev,
      whiteboardActions: [...prev.whiteboardActions, serverAction]
    }));
    
    // Отправка действия другим участникам
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendWebSocketMessage({
        type: "whiteboard-action",
        roomId: roomIdRef.current,
        payload: serverAction
      });
    }
  }, [sendWebSocketMessage]);
  
  /**
   * Поделиться веб-страницей с другими участниками
   */
  const shareWebPage = useCallback((url: string) => {
    setState(prev => ({ ...prev, sharedWebPage: url }));
    
    // Отправка URL веб-страницы другим участникам
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendWebSocketMessage({
        type: "share-webpage",
        roomId: roomIdRef.current,
        payload: {
          url,
          userId: userRef.current.id
        }
      });
    }
  }, [sendWebSocketMessage]);
  
  /**
   * Навигация по общей веб-странице
   */
  const navigateSharedWebPage = useCallback((action: 'back' | 'forward' | 'refresh' | 'goto', url?: string) => {
    // Отправка команды навигации другим участникам
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendWebSocketMessage({
        type: "webpage-navigation",
        roomId: roomIdRef.current,
        payload: {
          action,
          url,
          userId: userRef.current.id
        }
      });
    }
    
    // Обновление URL в локальном состоянии для действия "goto"
    if (action === 'goto' && url) {
      setState(prev => ({ ...prev, sharedWebPage: url }));
    }
  }, [sendWebSocketMessage]);
  
  /**
   * Прекращение общего доступа к веб-странице
   */
  const stopSharingWebPage = useCallback(() => {
    setState(prev => ({ ...prev, sharedWebPage: undefined }));
    
    // Отправка сообщения о прекращении показа веб-страницы
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendWebSocketMessage({
        type: "stop-webpage-sharing",
        roomId: roomIdRef.current,
        payload: {
          userId: userRef.current.id
        }
      });
    }
  }, [sendWebSocketMessage]);

  /**
   * Обновление настроек хоста конференции
   */
  const updateHostSettings = useCallback((settings: { 
    hostVideoPriority?: boolean, 
    allowParticipantDetach?: boolean 
  }) => {
    // Проверяем, что пользователь является хостом
    if (!state.isHost) {
      console.warn("Attempted to update host settings without host privileges");
      toast({
        title: "Ошибка доступа",
        description: "Только создатель конференции может изменять настройки",
        variant: "destructive",
      });
      return;
    }

    // Обновляем локальные настройки
    const newSettings = {
      hostVideoPriority: settings.hostVideoPriority !== undefined 
        ? settings.hostVideoPriority 
        : state.hostSettings.hostVideoPriority,
      allowParticipantDetach: settings.allowParticipantDetach !== undefined
        ? settings.allowParticipantDetach
        : state.hostSettings.allowParticipantDetach
    };

    // Обновляем состояние
    setState(prev => ({
      ...prev,
      hostSettings: newSettings
    }));

    // Отправляем изменения на сервер
    if (roomIdRef.current) {
      sendWebSocketMessage({
        type: "update-host-settings",
        roomId: roomIdRef.current,
        payload: newSettings
      });
    }
  }, [state.isHost, state.hostSettings, toast, sendWebSocketMessage]);

  /**
   * Проверка, является ли текущий пользователь хостом
   */
  const isUserHost = useCallback((): boolean => {
    return state.isHost;
  }, [state.isHost]);

  const contextValue: WebRTCContextType = {
    ...state,
    joinConference,
    leaveConference,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    toggleHand,
    toggleRecording,
    sendChatMessage,
    setFocusedParticipant,
    kickParticipant,
    muteParticipant,
    shareFile,
    createPoll,
    votePoll,
    endPoll,
    // Новые функции для работы с интерактивной доской и веб-страницами
    toggleWhiteboard,
    sendWhiteboardAction,
    shareWebPage,
    navigateSharedWebPage,
    stopSharingWebPage,
    // Функции для работы с настройками хоста
    updateHostSettings,
    isUserHost
  };

  return (
    <WebRTCContext.Provider value={contextValue}>
      {children}
    </WebRTCContext.Provider>
  );
}

/**
 * Хук для использования WebRTC контекста
 */
export function useWebRTC() {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error("useWebRTC must be used within a WebRTCProvider");
  }
  return context;
}