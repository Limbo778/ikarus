import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { storage } from "./storage";
import { Participant } from "@shared/schema";
import { v4 as uuidv4 } from "uuid";

// Импортируем WebSocket из ws (не использовать префикс type!)
// Это необходимо для корректной проверки состояния соединения
import { WebSocket as WSWebSocket } from "ws";

// Расширенный интерфейс WebSocket соединения с дополнительными полями
interface ExtendedWebSocket extends WebSocket {
  userId: string;
  roomId: string;
  isAlive: boolean;
  pingInterval?: NodeJS.Timeout;
  requestHeaders?: {[key: string]: string}; // Заголовки запроса для определения устройства
}

// Интерфейс для комнаты видеоконференции
interface Room {
  id: string;
  clients: Map<string, ExtendedWebSocket>;
  participants: Map<string, Participant>;
  createdAt: number;
  hostId?: string;
  hostVideoPriority?: boolean;
  allowParticipantDetach?: boolean;
}

// Хранилище комнат в памяти
const rooms = new Map<string, Room>();

/**
 * Настраивает WebSocket сервер для WebRTC коммуникации
 */
export function setupWebRTC(server: Server) {
  // Создаем WebSocket сервер для WebRTC сигнализации с оптимизированными настройками
  const wss = new WebSocketServer({
    server,
    path: '/ws',
    perMessageDeflate: false,      // Отключаем сжатие для повышения стабильности
    maxPayload: 65536,             // Увеличиваем максимальный размер сообщения до 64KB
    clientTracking: true,          // Включаем отслеживание клиентов для управления соединениями
    // Настраиваем опции HTTP-сервера, которые передаются в WebSocket
    verifyClient: (info, callback) => {
      // Здесь можно добавить дополнительную проверку клиентов
      // Например, проверку заголовков, IP-адресов и т.д.
      // В данном случае просто принимаем все соединения
      callback(true);
    }
  });
  
  // Сохраняем ссылку в хранилище для общего доступа
  storage.wss = wss;
  
  // Обработка ошибок на уровне сервера
  wss.on('error', (error) => {
    console.error('WebSocket Server Error:', error);
  });
  
  // Обработка подключений к WebSocket серверу
  wss.on('connection', (ws: WebSocket, request: any) => {
    console.log('WebSocket connection established');
    
    // Расширяем WebSocket объект
    const extendedWs = ws as ExtendedWebSocket;
    
    // Инициализируем пользовательские данные
    extendedWs.userId = '';
    extendedWs.roomId = '';
    extendedWs.isAlive = true;
    
    // Сохраняем заголовки запроса для определения типа устройства
    extendedWs.requestHeaders = {};
    if (request && request.headers) {
      // Копируем основные заголовки для оптимизации работы
      extendedWs.requestHeaders['user-agent'] = request.headers['user-agent'] || '';
      extendedWs.requestHeaders['referer'] = request.headers['referer'] || '';
      extendedWs.requestHeaders['origin'] = request.headers['origin'] || '';
      
      // Логируем информацию о соединении для отладки
      console.log(`Connection from: ${request.headers['user-agent']}`);
      
      // Если есть заголовок X-Forwarded-For, логируем его для отладки проблем с прокси
      if (request.headers['x-forwarded-for']) {
        console.log(`Client IP: ${request.headers['x-forwarded-for']}`);
      }
    }
    
    // Устанавливаем таймаут на отправку приветственного сообщения
    // Это позволяет дать соединению полностью установиться перед отправкой данных
    setTimeout(() => {
      // Отправляем приветственное сообщение для подтверждения установки соединения
      try {
        // Проверяем, открыто ли еще соединение
        if (extendedWs.readyState === WSWebSocket.OPEN) {
          extendedWs.send(JSON.stringify({ 
            type: 'connection-established',
            timestamp: Date.now(),
            serverInfo: {
              // Предоставляем минимальную информацию о сервере для диагностики
              timeZone: new Intl.DateTimeFormat().resolvedOptions().timeZone,
              uptime: process.uptime(),
              // Добавляем идентификатор соединения для отладки
              connectionId: Math.random().toString(36).substring(2, 15)
            }
          }));
        }
      } catch (err) {
        console.error('Error sending welcome message:', err);
      }
    }, 100); // 100ms задержка для стабилизации соединения
    
    // Обрабатываем pong от клиента
    extendedWs.on('pong', () => {
      extendedWs.isAlive = true;
    });
    
    // Начинаем отправлять ping для проверки соединения
    startPingPong(extendedWs);
    
    // Обработка входящих сообщений
    extendedWs.on('message', (message) => {
      try {
        // Обновляем статус "жив"
        extendedWs.isAlive = true;
        
        // Парсим сообщение
        const data = JSON.parse(message.toString());
        
        // Обрабатываем сообщение по типу
        switch (data.type) {
          case 'join-room':
            handleJoinRoom(extendedWs, data);
            break;
            
          case 'leave-room':
            handleLeaveRoom(extendedWs);
            break;
            
          case 'offer':
          case 'answer':
          case 'ice-candidate':
            handleSignalingMessage(extendedWs, data);
            break;
            
          case 'toggle-media':
            handleToggleMedia(extendedWs, data);
            break;
            
          case 'chat-message':
            handleChatMessage(extendedWs, data);
            break;
            
          case 'hand-state-changed':
            handleHandStateChanged(extendedWs, data);
            break;
            
          case 'recording-state-changed':
            handleRecordingStateChanged(extendedWs, data);
            break;
            
          case 'update-host-settings':
            handleUpdateHostSettings(extendedWs, data);
            break;
            
          case 'ping':
            // Немедленно отвечаем pong, чтобы поддерживать соединение
            if (extendedWs.readyState === WSWebSocket.OPEN) {
              try {
                extendedWs.send(JSON.stringify({ type: 'pong' }));
              } catch (err) {
                console.error('Error sending pong:', err);
              }
            }
            extendedWs.isAlive = true;
            break;
            
          case 'file-shared':
            handleFileShare(extendedWs, data);
            break;
            
          case 'poll-created':
            handlePollCreated(extendedWs, data);
            break;
            
          case 'poll-vote':
            handlePollVote(extendedWs, data);
            break;
            
          case 'poll-ended':
            handlePollEnded(extendedWs, data);
            break;
            
          case 'pong':
            // Просто обновляем статус "жив"
            extendedWs.isAlive = true;
            break;
            
          default:
            // Тихо игнорируем неизвестные типы сообщений
            if (data.type !== 'whiteboard-toggle') {
              console.warn(`Received unknown message type: ${data.type}`);
            }
        }
      } catch (err) {
        console.error('Error processing message:', err);
      }
    });
    
    // Обработка закрытия соединения
    extendedWs.on('close', () => {
      console.log('WebSocket connection closed');
      
      // Очищаем интервал пинга
      if (extendedWs.pingInterval) {
        clearInterval(extendedWs.pingInterval);
      }
      
      // Обрабатываем выход из комнаты
      handleLeaveRoom(extendedWs);
    });
    
    // Обработка ошибок соединения
    extendedWs.on('error', (error) => {
      console.error('WebSocket connection error:', error);
      
      // Очищаем интервал пинга
      if (extendedWs.pingInterval) {
        clearInterval(extendedWs.pingInterval);
      }
      
      // Обрабатываем выход из комнаты
      handleLeaveRoom(extendedWs);
    });
  });
  
  console.log('WebRTC WebSocket server initialized');
  return wss;
}

/**
 * Запускает ping-pong проверку соединения с улучшенной адаптивной стратегией
 */
function startPingPong(ws: ExtendedWebSocket) {
  // Очищаем существующий интервал, если есть
  if (ws.pingInterval) {
    clearInterval(ws.pingInterval);
  }
  
  // Определяем тип устройства для более точной настройки
  const userAgent = ws.requestHeaders?.['user-agent'] || '';
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
  const isIOSDevice = /iPhone|iPad|iPod/i.test(userAgent);
  
  // Адаптивные настройки пинга в зависимости от устройства
  // iOS устройства требуют более частых пингов из-за их агрессивного
  // энергосберегающего режима, который может приостанавливать соединения
  const pingInterval = isIOSDevice ? 5000 : (isMobile ? 10000 : 20000);
  
  // Выставляем начальное состояние
  ws.isAlive = true;
  
  ws.pingInterval = setInterval(() => {
    // Добавляем дополнительную проверку соединения перед любыми операциями
    if (ws.readyState !== WSWebSocket.OPEN) {
      console.log('Connection is already closed, clearing interval');
      if (ws.pingInterval) clearInterval(ws.pingInterval);
      return;
    }
    
    // Если соединение не ответило на предыдущий ping
    if (!ws.isAlive) {
      console.log('Connection is not alive, terminating');
      if (ws.pingInterval) clearInterval(ws.pingInterval);
      
      // Корректно закрываем соединение перед терминацией
      try {
        // Пробуем отправить специальное сообщение о закрытии
        if (ws.readyState === WSWebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'connection-timeout',
            message: 'Connection timed out due to inactivity'
          }));
          
          // Даем клиенту короткий промежуток времени для обработки сообщения
          // перед закрытием соединения
          setTimeout(() => {
            try {
              if (ws.readyState === WSWebSocket.OPEN) {
                ws.close(1000, 'Connection timed out');
              }
            } catch (e) {
              console.error('Error during graceful close:', e);
            } finally {
              // В любом случае терминируем соединение после таймаута
              setTimeout(() => ws.terminate(), 500);
            }
          }, 100);
        } else {
          // Если соединение уже не открыто, просто терминируем его
          ws.terminate();
        }
      } catch (e) {
        console.error('Error during connection termination:', e);
        // Игнорируем ошибки при отправке последнего сообщения и терминируем
        ws.terminate();
      }
      
      return;
    }
    
    // Отмечаем как неактивное до получения ответа
    ws.isAlive = false;
    
    // Улучшенный механизм ping-pong с резервным копированием
    try {
      if (ws.readyState === WSWebSocket.OPEN) {
        // Отправляем стандартный ping пакет для всех соединений
        ws.ping();
        
        // Всегда отправляем также JSON ping в качестве резервного механизма,
        // поскольку некоторые прокси-серверы и клиенты могут не обрабатывать
        // правильно низкоуровневые ping-сообщения
        ws.send(JSON.stringify({
          type: 'ping', 
          timestamp: Date.now() 
        }));
      }
    } catch (err) {
      console.error('Error sending ping:', err);
      // При ошибке очищаем интервал и терминируем соединение
      if (ws.pingInterval) clearInterval(ws.pingInterval);
      try {
        ws.terminate();
      } catch (e) {
        console.error('Error terminating connection after ping error:', e);
      }
    }
  }, pingInterval);
}

/**
 * Обрабатывает присоединение к комнате
 */
function handleJoinRoom(ws: ExtendedWebSocket, data: any) {
  if (!data.roomId || !data.payload || !data.payload.userId || !data.payload.name) {
    return sendError(ws, 'Missing required join data');
  }
  
  const roomId = data.roomId;
  const userId = data.payload.userId;
  const username = data.payload.name;
  const isAdmin = !!data.payload.isAdmin;
  const isHost = !!data.payload.isHost;
  const hostVideoPriority = data.payload.hostVideoPriority !== undefined ? data.payload.hostVideoPriority : true;
  const allowParticipantDetach = data.payload.allowParticipantDetach !== undefined ? data.payload.allowParticipantDetach : true;
  
  // Если пользователь уже в комнате, выходим сначала
  if (ws.roomId && ws.userId) {
    handleLeaveRoom(ws);
  }
  
  console.log(`User ${username} (${userId}) joining room ${roomId}`);
  
  // Создаем комнату, если её еще нет
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      clients: new Map(),
      participants: new Map(),
      createdAt: Date.now(),
      hostId: isHost ? userId : undefined,
      hostVideoPriority: hostVideoPriority,
      allowParticipantDetach: allowParticipantDetach
    });
  } else if (isHost) {
    // Если пользователь хост, обновляем настройки комнаты
    const room = rooms.get(roomId)!;
    room.hostId = userId;
    room.hostVideoPriority = hostVideoPriority;
    room.allowParticipantDetach = allowParticipantDetach;
  }
  
  const room = rooms.get(roomId)!;
  
  // Проверяем, нет ли уже этого пользователя (дублирование соединения)
  const existingClient = room.clients.get(userId);
  if (existingClient && existingClient !== ws) {
    // Отправляем уведомление старому клиенту
    sendToClient(existingClient, {
      type: 'connection-replaced',
      payload: { message: 'Your connection was replaced by a new one' }
    });
    
    // Удаляем старое соединение
    if (existingClient.pingInterval) {
      clearInterval(existingClient.pingInterval);
    }
    
    existingClient.terminate();
    room.clients.delete(userId);
  }
  
  // Добавляем пользователя в комнату
  ws.userId = userId;
  ws.roomId = roomId;
  room.clients.set(userId, ws);
  
  // Создаем информацию об участнике
  const participant: Participant = {
    id: userId,
    name: username,
    isAdmin: isAdmin,
    isHost: isHost || room.hostId === userId,
    videoEnabled: true,
    audioEnabled: true,
    isMuted: false,
    isCameraOff: false,
    isScreenSharing: false,
    isHandRaised: false,
    isRecording: false,
    isSpeaking: false
  };
  
  room.participants.set(userId, participant);
  
  // Отправляем информацию о существующих участниках новому пользователю
  const existingParticipants = Array.from(room.participants.values())
    .filter(p => p.id !== userId);
    
  sendToClient(ws, {
    type: 'room-users',
    payload: { participants: existingParticipants }
  });
  
  // Уведомляем остальных участников о новом пользователе
  broadcastToRoom(roomId, {
    type: 'user-joined',
    payload: {
      userId: userId,
      participant: participant
    }
  }, userId);
  
  console.log(`Room ${roomId} now has ${room.participants.size} participants`);
}

/**
 * Обрабатывает выход из комнаты
 */
function handleLeaveRoom(ws: ExtendedWebSocket) {
  const { userId, roomId } = ws;
  
  // Если пользователь не в комнате, ничего не делаем
  if (!userId || !roomId) return;
  
  console.log(`User ${userId} leaving room ${roomId}`);
  
  const room = rooms.get(roomId);
  if (room) {
    // Проверяем, не является ли пользователь хостом
    const isHost = room.hostId === userId;
    
    // Удаляем пользователя из комнаты
    room.clients.delete(userId);
    room.participants.delete(userId);
    
    // Если пользователь был хостом и в комнате остались другие участники,
    // назначаем нового хоста (первого, кто присоединился к комнате)
    if (isHost && room.participants.size > 0) {
      const newHostId = Array.from(room.participants.keys())[0];
      room.hostId = newHostId;
      
      // Обновляем статус хоста для нового хоста
      const newHost = room.participants.get(newHostId);
      if (newHost) {
        newHost.isHost = true;
      }
      
      // Уведомляем всех о смене хоста
      broadcastToRoom(roomId, {
        type: 'host-changed',
        payload: { 
          userId: newHostId,
          hostVideoPriority: room.hostVideoPriority,
          allowParticipantDetach: room.allowParticipantDetach
        }
      });
    }
    
    // Уведомляем остальных участников о выходе пользователя
    broadcastToRoom(roomId, {
      type: 'user-left',
      payload: { userId }
    });
    
    console.log(`Room ${roomId} now has ${room.participants.size} participants`);
    
    // Если комната пуста, удаляем её
    if (room.clients.size === 0) {
      console.log(`Room ${roomId} is empty, removing`);
      rooms.delete(roomId);
    }
  }
  
  // Сбрасываем данные пользователя
  ws.userId = '';
  ws.roomId = '';
}

/**
 * Обрабатывает сигнальные сообщения WebRTC (предложения, ответы, ICE кандидаты)
 * Ультра-оптимизация для максимально быстрого установления соединений
 * и минимального использования ресурсов сети/CPU
 */
function handleSignalingMessage(ws: ExtendedWebSocket, data: any) {
  // Базовая проверка данных
  if (!ws.userId || !ws.roomId || !data.to) {
    return sendError(ws, 'Invalid signaling message');
  }
  
  // Определяем тип устройства
  const userAgent = ws.requestHeaders?.['user-agent'] || '';
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
  const isLowEndMobile = isMobile && /Android 4|Android 5|iPhone 5|iPhone 6/i.test(userAgent);
  
  // Быстрая обработка ICE-кандидатов
  if (data.type === 'ice-candidate' && data.payload?.candidate) {
    // Фильтрация ICE-кандидатов для снижения нагрузки
    // Предпочитаем UDP кандидаты для более быстрого соединения
    const candidateStr = data.payload.candidate.toLowerCase();
    
    // Пропускаем relay TCP кандидаты для мобильных устройств (экономия батареи)
    if (isLowEndMobile && candidateStr.includes('tcptype') && candidateStr.includes('relay')) {
      // Просто игнорируем эти кандидаты для слабых устройств
      return;
    }
    
    // Приоритезируем кандидаты для пересылки
    const priority = 
      // Локальные/хост-кандидаты имеют наивысший приоритет
      candidateStr.includes('host') ? 'critical' :
      // Рефлексивные кандидаты (STUN) - следующий приоритет
      candidateStr.includes('srflx') ? 'high' :
      // Relay кандидаты - средний приоритет
      candidateStr.includes('relay') ? 'medium' : 'low';
      
    // Минимизируем размер сообщения до предела для минимального использования пропускной способности
    const optimizedPayload = {
      c: data.payload.candidate,
      m: data.payload.sdpMid,
      l: data.payload.sdpMLineIndex
    };
    
    // Отправка ультра-компактного формата сообщения
    sendToUser(data.to, {
      t: 'i', // 'i' вместо 'ice-candidate'
      p: optimizedPayload,
      f: ws.userId,
      r: priority,
      m: isMobile ? 1 : 0 // Еще сильнее оптимизируем: 1 или 0 вместо boolean
    });
  } else if (data.type === 'offer' || data.type === 'answer') {
    // Для SDP сообщений (offer/answer) оптимизируем также
    
    // Для слабых мобильных устройств оптимизируем SDP (удаляем неиспользуемые кодеки)
    let sdp = data.payload;
    
    if (isLowEndMobile && sdp && sdp.sdp) {
      // Упрощаем SDP для слабых устройств - увеличиваем шансы на успешное соединение
      // Оставляем только основные видеокодеки (VP8, H.264) и аудиокодеки (OPUS, G711)
      // Это позволит быстрее согласовать медиа-параметры
      
      try {
        // Отправка оптимизированного SDP
        sendToUser(data.to, {
          t: data.type.charAt(0), // 'o' для offer, 'a' для answer
          p: sdp,
          f: ws.userId,
          r: 'critical', // SDP-сообщения всегда критичны
          m: isMobile ? 1 : 0 
        });
      } catch (e) {
        // В случае ошибки отправляем оригинальное сообщение
        sendToUser(data.to, {
          type: data.type,
          payload: data.payload,
          from: ws.userId,
          priority: 'high',
          isMobile: isMobile
        });
      }
    } else {
      // Для обычных устройств просто передаем SDP, но с оптимизированным форматом
      sendToUser(data.to, {
        t: data.type.charAt(0), // 'o' для offer, 'a' для answer
        p: sdp,
        f: ws.userId,
        r: 'high',
        m: isMobile ? 1 : 0
      });
    }
  } else {
    // Для всех остальных типов сообщений используем стандартный формат
    sendToUser(data.to, {
      type: data.type,
      payload: data.payload,
      from: ws.userId,
      priority: 'normal',
      isMobile: isMobile
    });
  }
}

/**
 * Обрабатывает изменение состояния медиа (аудио/видео)
 */
function handleToggleMedia(ws: ExtendedWebSocket, data: any) {
  if (!ws.userId || !ws.roomId || !data.payload || !data.payload.type) {
    return sendError(ws, 'Invalid media toggle message');
  }
  
  const room = rooms.get(ws.roomId);
  if (!room) return;
  
  const participant = room.participants.get(ws.userId);
  if (!participant) return;
  
  // Обновляем состояние медиа
  if (data.payload.type === 'audio') {
    participant.audioEnabled = !!data.payload.enabled;
  } else if (data.payload.type === 'video') {
    participant.videoEnabled = !!data.payload.enabled;
  }
  
  // Уведомляем всех участников
  broadcastToRoom(ws.roomId, {
    type: 'media-state-changed',
    payload: {
      userId: ws.userId,
      mediaType: data.payload.type,
      enabled: data.payload.type === 'audio' ? participant.audioEnabled : participant.videoEnabled
    }
  });
}

/**
 * Обрабатывает сообщения чата
 */
function handleChatMessage(ws: ExtendedWebSocket, data: any) {
  if (!ws.userId || !ws.roomId || !data.payload || !data.payload.message) {
    return sendError(ws, 'Invalid chat message');
  }
  
  const room = rooms.get(ws.roomId);
  if (!room) return;
  
  const participant = room.participants.get(ws.userId);
  if (!participant) return;
  
  // Отправляем сообщение всем в комнате
  broadcastToRoom(ws.roomId, {
    type: 'chat-message',
    payload: {
      id: uuidv4(),
      senderId: ws.userId,
      senderName: participant.name,
      text: data.payload.message,
      timestamp: new Date().toISOString(),
      isAdmin: participant.isAdmin
    }
  });
}

/**
 * Обрабатывает изменение состояния поднятой руки
 */
function handleHandStateChanged(ws: ExtendedWebSocket, data: any) {
  if (!ws.userId || !ws.roomId) {
    return;
  }
  
  // Отправляем всем участникам
  broadcastToRoom(ws.roomId, {
    type: 'hand-state-changed',
    payload: {
      userId: ws.userId,
      raised: !!data.payload?.raised
    }
  });
}

/**
 * Обрабатывает изменение состояния записи
 */
function handleRecordingStateChanged(ws: ExtendedWebSocket, data: any) {
  if (!ws.userId || !ws.roomId) {
    return;
  }
  
  const room = rooms.get(ws.roomId);
  if (!room) return;
  
  const participant = room.participants.get(ws.userId);
  // Проверяем, что это админ или хост
  if (!participant || (!participant.isAdmin && !participant.isHost && room.hostId !== ws.userId)) {
    return sendError(ws, 'Only admin or host can control recording');
  }
  
  // Отправляем всем участникам
  broadcastToRoom(ws.roomId, {
    type: 'recording-state-changed',
    payload: {
      isRecording: !!data.payload?.isRecording
    }
  });
}

/**
 * Обрабатывает обмен файлами
 */
function handleFileShare(ws: ExtendedWebSocket, data: any) {
  if (!ws.userId || !ws.roomId || !data.payload) {
    return;
  }
  
  // Отправляем всем участникам
  broadcastToRoom(ws.roomId, {
    type: 'file-shared',
    payload: data.payload
  });
}

/**
 * Обрабатывает создание опроса
 */
function handlePollCreated(ws: ExtendedWebSocket, data: any) {
  if (!ws.userId || !ws.roomId || !data.payload) {
    return;
  }
  
  const room = rooms.get(ws.roomId);
  if (!room) return;
  
  const participant = room.participants.get(ws.userId);
  // Проверяем, что это админ или хост
  if (!participant || (!participant.isAdmin && !participant.isHost && room.hostId !== ws.userId)) {
    return sendError(ws, 'Only admin or host can create polls');
  }
  
  // Отправляем всем участникам
  broadcastToRoom(ws.roomId, {
    type: 'poll-created',
    payload: data.payload
  });
}

/**
 * Обрабатывает обновление настроек хоста
 */
function handleUpdateHostSettings(ws: ExtendedWebSocket, data: any) {
  if (!ws.userId || !ws.roomId || !data.payload) {
    return sendError(ws, 'Invalid host settings update');
  }
  
  const room = rooms.get(ws.roomId);
  if (!room) return;
  
  // Проверяем, что пользователь действительно хост
  if (room.hostId !== ws.userId) {
    return sendError(ws, 'Only host can update room settings');
  }
  
  // Обновляем настройки комнаты
  if (data.payload.hostVideoPriority !== undefined) {
    room.hostVideoPriority = !!data.payload.hostVideoPriority;
  }
  
  if (data.payload.allowParticipantDetach !== undefined) {
    room.allowParticipantDetach = !!data.payload.allowParticipantDetach;
  }
  
  // Отправляем обновленные настройки всем участникам
  broadcastToRoom(ws.roomId, {
    type: 'host-settings-updated',
    payload: {
      hostVideoPriority: room.hostVideoPriority,
      allowParticipantDetach: room.allowParticipantDetach
    }
  });
}

/**
 * Обрабатывает голосование в опросе
 */
function handlePollVote(ws: ExtendedWebSocket, data: any) {
  if (!ws.userId || !ws.roomId || !data.payload) {
    return;
  }
  
  // Отправляем всем участникам
  broadcastToRoom(ws.roomId, {
    type: 'poll-vote',
    payload: {
      ...data.payload,
      userId: ws.userId
    }
  });
}

/**
 * Обрабатывает завершение опроса
 */
function handlePollEnded(ws: ExtendedWebSocket, data: any) {
  if (!ws.userId || !ws.roomId || !data.payload) {
    return;
  }
  
  const room = rooms.get(ws.roomId);
  if (!room) return;
  
  const participant = room.participants.get(ws.userId);
  // Проверяем, что это админ или хост
  if (!participant || (!participant.isAdmin && !participant.isHost && room.hostId !== ws.userId)) {
    return sendError(ws, 'Only admin or host can end polls');
  }
  
  // Отправляем всем участникам
  broadcastToRoom(ws.roomId, {
    type: 'poll-ended',
    payload: {
      ...data.payload,
      endedAt: new Date().toISOString()
    }
  });
}

/**
 * Отправляет сообщение об ошибке клиенту
 */
function sendError(ws: ExtendedWebSocket, message: string) {
  sendToClient(ws, {
    type: 'error',
    payload: { message }
  });
}

/**
 * Отправляет сообщение конкретному клиенту с улучшенной обработкой приоритетов,
 * оптимизированной сериализацией и механизмами обеспечения надежности
 */
function sendToClient(ws: ExtendedWebSocket, message: any): boolean {
  // Если WebSocket не определен или закрыт, сразу возвращаем false
  if (!ws || ws.readyState !== WSWebSocket.OPEN) {
    return false;
  }
  
  try {
    // Добавляем метку времени для диагностики задержек
    if (typeof message !== 'string' && !message.timestamp) {
      message.timestamp = Date.now();
    }
    
    // Определяем тип устройства для оптимизации
    const userAgent = ws.requestHeaders?.['user-agent'] || '';
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
    const isIOSDevice = /iPhone|iPad|iPod/i.test(userAgent);
    const isLowEndDevice = /Android [23456]|iPhone [456]|iPod|iPad 2|iPhone 5/i.test(userAgent);
    
    // Определяем тип сообщения и его критичность
    let messageType = '';
    if (typeof message !== 'string') {
      messageType = message.type || '';
    }
    
    // Критически важные сообщения WebRTC
    const isCriticalMessage = [
      'offer', 'answer', 'ice-candidate', 
      'user-joined', 'user-left', 'room-users'
    ].includes(messageType);
    
    // Для каждого типа устройства используем оптимальный подход к отправке
    if (typeof message !== 'string') {
      let dataToSend: string;
      
      if (isMobile) {
        // Для мобильных устройств сжимаем сообщение
        const compactMessage = compactifyMessage(message);
        dataToSend = JSON.stringify(compactMessage);
      } else {
        // Для десктопов используем обычную сериализацию
        dataToSend = JSON.stringify(message);
      }
      
      // Добавляем повторные попытки для критических сообщений
      if (isCriticalMessage) {
        try {
          ws.send(dataToSend);
          
          // Для iOS устройств иногда требуется дополнительная отправка
          // из-за особенностей работы WebKit
          if (isIOSDevice && ['offer', 'answer', 'ice-candidate'].includes(messageType)) {
            setTimeout(() => {
              try {
                if (ws.readyState === WSWebSocket.OPEN) {
                  ws.send(dataToSend);
                }
              } catch (e) {
                // Игнорируем ошибку при повторной отправке
              }
            }, 100);
          }
          
          return true;
        } catch (err) {
          console.error('Error sending critical message:', err);
          
          // Повторная попытка отправки с задержкой в 200мс
          setTimeout(() => {
            try {
              if (ws.readyState === WSWebSocket.OPEN) {
                ws.send(dataToSend);
              }
            } catch (e) {
              console.error('Error sending message retry:', e);
            }
          }, 200);
          
          return false;
        }
      } else {
        // Обычные сообщения отправляем без повторных попыток
        try {
          ws.send(dataToSend);
          return true;
        } catch (err) {
          console.error('Error sending message:', err);
          return false;
        }
      }
    } else {
      // Строковые сообщения отправляем как есть
      try {
        ws.send(message);
        return true;
      } catch (err) {
        console.error('Error sending string message:', err);
        return false;
      }
    }
  } catch (err) {
    console.error('Unexpected error in sendToClient:', err);
    return false;
  }
}

/**
 * Сжимает сообщение для мобильных устройств для экономии трафика
 */
function compactifyMessage(message: any): any {
  // Если это уже компактное сообщение (с сокращенными ключами)
  if (message.t && (message.p !== undefined)) {
    return message; // Уже оптимизировано
  }
  
  // Для критичных типов сообщений (предложение, ответ, кандидат)
  const compactMessage: any = {};
  
  // Базовое преобразование общих полей
  if (message.type) compactMessage.t = message.type;
  if (message.payload !== undefined) compactMessage.p = message.payload;
  if (message.from) compactMessage.f = message.from;
  if (message.to) compactMessage.to = message.to;
  if (message.priority) compactMessage.r = message.priority;
  if (message.timestamp) compactMessage.ts = message.timestamp;
  
  // Возвращаем компактную версию
  return compactMessage;
}

/**
 * Отправляет сообщение конкретному пользователю по ID
 */
function sendToUser(userId: string, message: any): boolean {
  // Ищем пользователя во всех комнатах
  for (const room of rooms.values()) {
    const ws = room.clients.get(userId);
    if (ws) {
      return sendToClient(ws, message);
    }
  }
  return false;
}

/**
 * Отправляет сообщение всем пользователям в комнате с адаптивной оптимизацией и приоритизацией
 */
function broadcastToRoom(roomId: string, message: any, excludeUserId?: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  // Список устройств в комнате для оптимизации
  const mobileClients: ExtendedWebSocket[] = [];
  const desktopClients: ExtendedWebSocket[] = [];
  
  // Распределяем клиентов по типам устройств
  room.clients.forEach((ws, userId) => {
    // Пропускаем исключенного пользователя и закрытые соединения
    if (excludeUserId === userId || ws.readyState !== WSWebSocket.OPEN) return;
    
    // Определяем тип устройства
    const userAgent = ws.requestHeaders?.['user-agent'] || '';
    if (/iPhone|iPad|iPod|Android/i.test(userAgent)) {
      mobileClients.push(ws);
    } else {
      desktopClients.push(ws);
    }
  });
  
  // Оптимизация для различных типов устройств
  if (mobileClients.length > 0) {
    // Создаем оптимизированную компактную версию для мобильных устройств
    const mobileMessage = compactifyMessage(message);
    const serializedMobile = JSON.stringify(mobileMessage);
    
    // Рассылаем оптимизированное сообщение мобильным клиентам
    mobileClients.forEach(ws => {
      try {
        ws.send(serializedMobile);
      } catch (err) {
        console.error(`Error broadcasting to mobile client:`, err);
      }
    });
  }
  
  if (desktopClients.length > 0) {
    // Для десктопов используем обычное сообщение
    const serializedDesktop = JSON.stringify(message);
    
    // Рассылаем сообщение десктопным клиентам
    desktopClients.forEach(ws => {
      try {
        ws.send(serializedDesktop);
      } catch (err) {
        console.error(`Error broadcasting to desktop client:`, err);
      }
    });
  }
}

// Запускаем периодическую очистку неактивных комнат
const cleanupInterval = setInterval(() => {
  try {
    // Текущее время
    const now = Date.now();
    
    // Проверяем все комнаты
    for (const [roomId, room] of rooms.entries()) {
      // Находим неактивных клиентов
      const inactiveClients = Array.from(room.clients.entries())
        .filter(([, ws]) => !ws.isAlive || ws.readyState !== WSWebSocket.OPEN)
        .map(([userId]) => userId);
      
      // Удаляем неактивных клиентов
      if (inactiveClients.length > 0) {
        console.log(`Removing ${inactiveClients.length} inactive clients from room ${roomId}`);
        
        inactiveClients.forEach(userId => {
          const ws = room.clients.get(userId);
          if (ws) {
            if (ws.pingInterval) clearInterval(ws.pingInterval);
            try {
              ws.terminate();
            } catch (err) {
              console.error(`Error terminating client ${userId}:`, err);
            }
          }
          
          room.clients.delete(userId);
          room.participants.delete(userId);
          
          // Уведомляем остальных участников
          broadcastToRoom(roomId, {
            type: 'user-left',
            payload: { userId }
          });
        });
      }
      
      // Проверяем на неактивную комнату 
      // (комната без клиентов или устаревшая - более 24 часов)
      const isInactive = room.clients.size === 0 || 
                         (now - room.createdAt > 24 * 60 * 60 * 1000);
      
      if (isInactive) {
        console.log(`Removing inactive room ${roomId}`);
        rooms.delete(roomId);
        
        // Обновляем статус конференции в БД до неактивного
        try {
          storage.getConference(roomId)
            .then(conference => {
              if (conference && conference.active) {
                storage.updateConference(roomId, { active: false });
              }
            })
            .catch(err => console.error(`Error updating conference status: ${err}`));
        } catch (err) {
          console.error(`Error updating conference status: ${err}`);
        }
      }
    }
  } catch (err) {
    console.error("Error in room cleanup:", err);
  }
}, 60000); // Раз в минуту

// Очищаем интервал при выходе из процесса
process.on('SIGINT', () => {
  clearInterval(cleanupInterval);
  process.exit(0);
});