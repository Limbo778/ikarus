import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { WebSocket } from "ws";
import { setupWebRTC } from "./webrtc";
import { insertConferenceSchema, insertTelegramSettingsSchema } from "@shared/schema";
import { z } from "zod";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import session from 'express-session';
import { TelegramService } from "./telegram";
import { registerAdminRoutes } from "./admin";

// Расширяем типы для сессии, чтобы включить guestInfo
declare module 'express-session' {
  interface SessionData {
    guestInfo?: {
      name?: string;
      conferenceId?: string;
    };
  }
}

const scryptAsync = promisify(scrypt);

// Функция для хеширования пароля
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

import { PaymentService } from './payments';

export async function registerRoutes(app: Express): Promise<Server> {
  // set up authentication
  setupAuth(app);
  
  // Register admin routes
  registerAdminRoutes(app);
  
  // API для проверки конфигурации системы
  app.get("/api/system/is-configured", async (req, res) => {
    try {
      // Проверяем наличие хотя бы одного пользователя с ролью admin или superadmin
      const adminUsers = await storage.getAllUsers().then(users => 
        users.filter(user => user.role === 'admin' || user.role === 'superadmin')
      );
      
      // Проверяем настройки Telegram
      const telegramSettings = await storage.getTelegramSettings();
      
      // Система считается настроенной, если:
      // 1. Есть хотя бы один администратор
      // 2. Настроен Telegram бот
      const isConfigured = adminUsers.length > 0 && telegramSettings?.isConnected === true;
      
      res.json({ 
        isConfigured,
        hasAdmins: adminUsers.length > 0,
        hasTelegramBot: telegramSettings?.isConnected === true
      });
    } catch (error) {
      console.error('Ошибка при проверке конфигурации системы:', error);
      res.status(500).json({ error: 'Ошибка при проверке конфигурации системы' });
    }
  });
  
  // API для работы с Telegram ботом
  
  // Статус подключения Telegram бота
  app.get("/api/telegram/status", async (req, res) => {
    try {
      const settings = await storage.getTelegramSettings();
      res.json({
        isConnected: settings?.isConnected || false,
        connectedAt: settings?.connectedAt || null
      });
    } catch (error) {
      console.error('Ошибка при получении статуса Telegram бота:', error);
      res.status(500).json({ error: 'Ошибка при получении статуса Telegram бота' });
    }
  });
  
  // Подключение Telegram бота
  app.post("/api/telegram/connect", async (req, res) => {
    try {
      const { botToken, adminPassword } = req.body;
      
      if (!botToken) {
        return res.status(400).json({ error: 'Не указан токен бота' });
      }
      
      // Проверяем, авторизован ли пользователь
      const isAuthed = req.isAuthenticated();
      const isSuperAdmin = isAuthed && req.user.role === 'superadmin';
      
      // Инициализируем сервис с новым токеном
      const telegramService = await TelegramService.getInstance();
      const connected = await telegramService.init(botToken);
      
      if (!connected) {
        return res.status(400).json({ error: 'Не удалось подключиться к API Telegram' });
      }
      
      // Сохраняем настройки в базе данных
      const updateData: any = {
        botToken,
        isConnected: true,
        connectedAt: new Date()
      };
      
      // Если передан пароль администратора, сохраняем его
      if (adminPassword) {
        updateData.adminPassword = await hashPassword(adminPassword);
      }
      
      // Если пользователь суперадмин, назначаем его superAdminId
      if (isSuperAdmin) {
        updateData.superAdminId = req.user.telegramId || null;
      }
      
      try {
        // Получаем существующие настройки
        const existingSettings = await storage.getTelegramSettings();
        
        let settings;
        if (existingSettings) {
          settings = await storage.updateTelegramSettings(updateData);
        } else {
          settings = await storage.saveTelegramSettings(updateData);
        }
        
        // Отправляем статус подключения
        res.json({
          success: true,
          isConnected: settings?.isConnected || true,
          connectedAt: settings?.connectedAt || new Date()
        });
      } catch (error) {
        console.error("Ошибка при сохранении настроек Telegram:", error);
        res.status(500).json({ 
          error: "Ошибка при сохранении настроек Telegram", 
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error('Ошибка при подключении Telegram бота:', error);
      res.status(500).json({ error: 'Ошибка при подключении Telegram бота' });
    }
  });
  
  // Проверка, настроен ли Telegram бот
  app.get("/api/telegram/is-configured", async (req, res) => {
    try {
      const settings = await storage.getTelegramSettings();
      res.json({
        isConfigured: settings?.isConnected === true
      });
    } catch (error) {
      console.error('Ошибка при проверке настройки Telegram бота:', error);
      res.status(500).json({ error: 'Ошибка при проверке настройки Telegram бота' });
    }
  });
  
  // Получение статуса Telegram бота
  app.get("/api/telegram/status", async (req, res) => {
    try {
      const settings = await storage.getTelegramSettings();
      res.json({
        isConnected: settings?.isConnected === true,
        connectedAt: settings?.connectedAt
      });
    } catch (error) {
      console.error('Ошибка при получении статуса Telegram бота:', error);
      res.status(500).json({ error: 'Ошибка при получении статуса Telegram бота' });
    }
  });
  
  // API для отправки тестового уведомления пользователю через Telegram
  app.post("/api/admin/telegram/send-test", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    
    try {
      const { userId, message, type } = req.body;
      
      if (!userId || !message) {
        return res.status(400).json({ error: 'Требуется указать ID пользователя и текст сообщения' });
      }
      
      // Проверяем существование пользователя
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      
      // Проверяем, привязан ли Telegram к пользователю
      if (!user.telegramId) {
        return res.status(400).json({ error: 'Пользователь не привязал Telegram аккаунт' });
      }
      
      const telegramService = await TelegramService.getInstance();
      const result = await telegramService.sendSystemNotification(
        user.id, 
        'Тестовое уведомление', 
        message, 
        type || 'info'
      );
      
      if (result) {
        res.json({ success: true, message: 'Уведомление успешно отправлено' });
      } else {
        res.status(500).json({ error: 'Не удалось отправить уведомление' });
      }
    } catch (error) {
      console.error('Ошибка при отправке тестового уведомления:', error);
      res.status(500).json({ error: 'Ошибка при отправке тестового уведомления' });
    }
  });
  
  // API для отправки массового уведомления всем пользователям через Telegram
  app.post("/api/admin/telegram/broadcast", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    
    try {
      const { message, onlyAdmins, silent } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Требуется указать текст сообщения' });
      }
      
      const telegramService = await TelegramService.getInstance();
      const successCount = await telegramService.sendBroadcastMessage(message, {
        onlyAdmins: onlyAdmins === true,
        parseMode: 'HTML',
        silent: silent === true
      });
      
      res.json({ 
        success: true, 
        message: `Уведомление успешно отправлено ${successCount} пользователям` 
      });
    } catch (error) {
      console.error('Ошибка при отправке массового уведомления:', error);
      res.status(500).json({ error: 'Ошибка при отправке массового уведомления' });
    }
  });
  
  // Маршруты для работы с платежами через ЮKassa
  app.post("/api/create-payment-intent", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const { amount, plan, months } = req.body;
      
      const paymentData = {
        amount: parseFloat(amount),
        plan,
        months: parseInt(months, 10),
        userId: req.user.id,
        description: `Подписка на план "${plan}" на ${months} мес.`
      };
      
      const payment = await PaymentService.createPayment(paymentData);
      
      res.json({ 
        paymentId: payment.paymentId,
        confirmation_url: payment.confirmation_url,
        status: payment.status
      });
    } catch (error: any) {
      console.error("Error creating payment:", error);
      res.status(500).json({ 
        error: "Error creating payment", 
        details: error.message 
      });
    }
  });
  
  // Маршрут для продления существующей подписки
  app.post("/api/renew-subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const { amount, plan, months } = req.body;
      
      const paymentData = {
        amount: parseFloat(amount),
        plan,
        months: parseInt(months, 10),
        userId: req.user.id,
        isRenewal: true,
        description: `Продление подписки "${plan}" на ${months} мес.`
      };
      
      const payment = await PaymentService.createPayment(paymentData);
      
      res.json({ 
        paymentId: payment.paymentId,
        confirmation_url: payment.confirmation_url,
        status: payment.status
      });
    } catch (error: any) {
      console.error("Error creating renewal payment:", error);
      res.status(500).json({ 
        error: "Error creating renewal payment", 
        details: error.message 
      });
    }
  });
  
  // Webhook для обработки уведомлений от ЮKassa
  app.post("/api/webhook/youkassa", async (req, res) => {
    try {
      const result = await PaymentService.handleWebhookNotification(req.body);
      res.json(result);
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // API для получения статуса платежа
  app.get("/api/payment/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const paymentId = req.params.id;
      const payment = await PaymentService.getPaymentInfo(paymentId);
      
      // Проверяем, принадлежит ли платеж пользователю
      const dbPayment = await storage.getPaymentByExternalId(paymentId);
      
      if (dbPayment && dbPayment.userId !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      res.json({
        status: payment.status,
        paid: payment.paid,
        amount: payment.amount,
        created_at: payment.created_at,
        metadata: payment.metadata
      });
    } catch (error: any) {
      console.error("Error getting payment status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Routes
  app.get("/api/conferences", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    
    const conferences = await storage.getConferencesByUserId(req.user.id);
    res.json({ conferences });
  });

  app.get("/api/conferences/active", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    
    const conferences = await storage.getAllActiveConferences();
    res.json({ conferences });
  });

  app.get("/api/conferences/:id", async (req, res) => {
    console.log(`Запрос конференции ID: ${req.params.id}`);
    const conference = await storage.getConference(req.params.id);
    console.log('Результат запроса конференции:', conference ? 'найдена' : 'не найдена');
    if (!conference) {
      return res.status(404).json({ message: "Конференция не найдена" });
    }
    
    // Если пользователь авторизован, добавляем информацию о подписке
    let userSubscriptionType = 'free';
    let subscriptionRestrictions = null;
    let isCreator = false;
    let timeLimitExceeded = false;
    
    if (req.isAuthenticated()) {
      userSubscriptionType = req.user.subscriptionType || 'free';
      isCreator = conference.creatorId === req.user.id;
      
      // Проверяем, не истекла ли подписка PRO
      if (userSubscriptionType === 'pro' && req.user.subscriptionExpiresAt) {
        const now = new Date();
        if (new Date(req.user.subscriptionExpiresAt) < now) {
          userSubscriptionType = 'free';
        }
      }
    }
    
    // Для бесплатных пользователей проверяем время конференции
    if (userSubscriptionType === 'free' && !isCreator && conference.active && conference.startedAt) {
      const now = new Date();
      const durationMin = Math.floor((now.getTime() - conference.startedAt.getTime()) / (60 * 1000));
      
      if (durationMin >= 15) {
        timeLimitExceeded = true;
        subscriptionRestrictions = {
          timeLimit: 15 * 60, // 15 минут в секундах
          participantsLimit: 5,
          noRecording: true,
          lowResolution: true,
          timeLimitExceeded: true,
          currentDuration: durationMin
        };
      } else {
        subscriptionRestrictions = {
          timeLimit: 15 * 60, // 15 минут в секундах
          participantsLimit: 5,
          noRecording: true,
          lowResolution: true,
          timeLimitExceeded: false,
          currentDuration: durationMin,
          remainingTime: 15 - durationMin
        };
      }
    }
    
    res.json({
      conference,
      userSubscriptionType,
      subscriptionRestrictions,
      isCreator,
      timeLimitExceeded
    });
  });

  app.post("/api/conferences", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    
    try {
      // Определяем ограничения по типу подписки
      let maxParticipants = 5; // Стандартное значение для бесплатной подписки
      let hasScreenShare = false;
      
      // Получаем тип подписки пользователя
      const userSubscriptionType = req.user.subscriptionType || 'free';
      
      // Проверяем, не истекла ли PRO подписка
      if (userSubscriptionType === 'pro' && req.user.subscriptionExpiresAt) {
        const now = new Date();
        const expiresAt = new Date(req.user.subscriptionExpiresAt);
        
        if (expiresAt < now) {
          // Подписка истекла, понижаем до бесплатного плана
          await storage.updateUser(req.user.id, {
            subscriptionType: 'free',
            subscriptionExpiresAt: null
          });
        } else {
          // PRO подписка активна
          maxParticipants = req.body.maxParticipants || 50; // Для PRO по умолчанию до 50
          hasScreenShare = req.body.hasScreenShare !== undefined ? req.body.hasScreenShare : true;
        }
      } else if (userSubscriptionType === 'pro') {
        // У активных PRO пользователей можно переопределить ограничения
        maxParticipants = req.body.maxParticipants || 50; // По умолчанию для PRO - 50 участников
        hasScreenShare = req.body.hasScreenShare !== undefined ? req.body.hasScreenShare : true;
      }
      
      // Создаем конференцию с учетом ограничений подписки
      const conferenceData = insertConferenceSchema.parse({
        ...req.body,
        creatorId: req.user.id,
        maxParticipants: userSubscriptionType === 'pro' ? (req.body.maxParticipants || 50) : 5,
        hasScreenShare: userSubscriptionType === 'pro' ? (req.body.hasScreenShare !== undefined ? req.body.hasScreenShare : true) : false
      });
      
      const conference = await storage.createConference(conferenceData);
      
      res.status(201).json({ 
        conference,
        subscriptionType: userSubscriptionType,
        restrictions: userSubscriptionType === 'free' ? {
          maxParticipants: 5,
          timeLimit: 15 * 60, // 15 минут в секундах
          noScreenShare: true,
          lowResolution: true
        } : null
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Ошибка валидации", errors: error.errors });
      }
      console.error('Error creating conference:', error);
      res.status(500).json({ message: "Ошибка создания конференции" });
    }
  });

  app.post("/api/conferences/:id/end", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    
    const conference = await storage.getConference(req.params.id);
    if (!conference) {
      return res.status(404).json({ message: "Конференция не найдена" });
    }
    
    if (conference.creatorId !== req.user.id) {
      return res.status(403).json({ message: "Вы не являетесь создателем конференции" });
    }
    
    const updatedConference = await storage.updateConference(req.params.id, {
      active: false,
      // В будущем сохранение ссылки на запись должно быть добавлено в схему
      // пока этого поля нет, закомментируем
      // recordingUrl: `/recordings/${req.params.id}.mp4`
    });
    
    res.json({ conference: updatedConference });
  });
  
  // Обновление настроек конференции хостом
  app.patch("/api/conferences/:id/host-settings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    
    const conference = await storage.getConference(req.params.id);
    if (!conference) {
      return res.status(404).json({ message: "Конференция не найдена" });
    }
    
    // Проверяем, является ли пользователь создателем конференции
    if (conference.creatorId !== req.user.id) {
      return res.status(403).json({ message: "Только создатель конференции может изменять настройки" });
    }
    
    // Валидируем полученные настройки
    const { hostVideoPriority, allowParticipantDetach } = req.body;
    
    // Импортируем тип из schema.ts
    const updates: Partial<import('@shared/schema').Conference> = {};
    
    if (hostVideoPriority !== undefined) {
      updates.hostVideoPriority = hostVideoPriority;
    }
    
    if (allowParticipantDetach !== undefined) {
      updates.allowParticipantDetach = allowParticipantDetach;
    }
    
    try {
      const updatedConference = await storage.updateConference(req.params.id, updates);
      
      if (!updatedConference) {
        return res.status(500).json({ message: "Не удалось обновить настройки конференции" });
      }
      
      res.json({ 
        success: true, 
        conference: updatedConference,
        settings: {
          hostVideoPriority: updatedConference.hostVideoPriority,
          allowParticipantDetach: updatedConference.allowParticipantDetach
        }
      });
    } catch (error) {
      console.error('Ошибка при обновлении настроек конференции:', error);
      res.status(500).json({ 
        success: false, 
        message: "Произошла ошибка при обновлении настроек конференции"
      });
    }
  });
  
  // Блокировка/разблокировка конференции (запрет новых подключений)
  app.patch("/api/conferences/:id/lock", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    
    const conference = await storage.getConference(req.params.id);
    if (!conference) {
      return res.status(404).json({ message: "Конференция не найдена" });
    }
    
    // Проверяем, является ли пользователь создателем конференции или хостом
    if (conference.creatorId !== req.user.id && conference.hostId !== req.user.id.toString()) {
      return res.status(403).json({ message: "У вас нет прав на блокировку этой конференции" });
    }
    
    const { isLocked } = req.body;
    
    try {
      const updatedConference = await storage.updateConference(req.params.id, {
        isLocked: isLocked === true
      });
      
      if (!updatedConference) {
        return res.status(500).json({ message: "Не удалось обновить статус блокировки конференции" });
      }
      
      // Уведомляем всех клиентов через WebSocket о блокировке/разблокировке
      if (storage.wss) {
        const clients = Array.from(storage.wss.clients);
        
        for (const client of clients) {
          if (client.readyState === WebSocket.OPEN) {
            try {
              client.send(JSON.stringify({
                type: 'conference_lock_status',
                conferenceId: req.params.id,
                isLocked: isLocked
              }));
            } catch (err) {
              console.error('Ошибка при отправке сообщения через WebSocket:', err);
            }
          }
        }
      }
      
      res.json({
        success: true,
        conference: updatedConference,
        isLocked: updatedConference.isLocked
      });
    } catch (error) {
      console.error('Ошибка при обновлении статуса блокировки конференции:', error);
      res.status(500).json({
        success: false,
        message: "Произошла ошибка при обновлении статуса блокировки конференции"
      });
    }
  });
  
  // Завершение конференции
  app.post("/api/conferences/:id/end", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    
    const conference = await storage.getConference(req.params.id);
    if (!conference) {
      return res.status(404).json({ message: "Конференция не найдена" });
    }
    
    // Проверяем, является ли пользователь создателем конференции или хостом
    if (conference.creatorId !== req.user.id && (!conference.hostId || conference.hostId !== req.user.id.toString())) {
      return res.status(403).json({ message: "Вы не являетесь создателем конференции" });
    }
    
    try {
      // Устанавливаем endedAt и active=false
      const now = new Date();
      const updatedConference = await storage.updateConference(req.params.id, {
        endedAt: now,
        active: false
      });
      
      if (!updatedConference) {
        return res.status(500).json({ message: "Не удалось завершить конференцию" });
      }
      
      // Уведомляем всех клиентов через WebSocket о завершении конференции
      if (storage.wss) {
        const clients = Array.from(storage.wss.clients);
        
        for (const client of clients) {
          if (client.readyState === 1) { // WebSocket.OPEN has value 1
            try {
              client.send(JSON.stringify({
                type: 'conference_ended',
                conferenceId: req.params.id,
                endedBy: req.user.name || req.user.username || 'Хост'
              }));
            } catch (err) {
              console.error('Ошибка при отправке сообщения через WebSocket:', err);
            }
          }
        }
      }
      
      res.json({
        success: true,
        conference: updatedConference,
        message: "Конференция успешно завершена"
      });
    } catch (error) {
      console.error('Ошибка при завершении конференции:', error);
      res.status(500).json({
        success: false,
        message: "Произошла ошибка при завершении конференции"
      });
    }
  });

  app.post("/api/conferences/:id/join", async (req, res) => {
    try {
      const conference = await storage.getConference(req.params.id);
      if (!conference) {
        return res.status(404).json({ 
          success: false, 
          message: "Конференция не найдена",
          error: "CONFERENCE_NOT_FOUND"
        });
      }
      
      if (!conference.active) {
        return res.status(400).json({ 
          success: false, 
          message: "Конференция завершена",
          error: "CONFERENCE_ENDED"
        });
      }
      
      // Проверяем, не заблокирована ли конференция
      if (conference.isLocked) {
        // Проверяем, не является ли пользователь создателем или хостом
        const isCreatorOrHost = req.isAuthenticated() && 
          (conference.creatorId === req.user.id || 
           conference.hostId === req.user.id.toString());
           
        if (!isCreatorOrHost) {
          return res.status(403).json({ 
            success: false, 
            message: "Конференция заблокирована. Новые участники не могут присоединиться",
            error: "CONFERENCE_LOCKED"
          });
        }
      }
      
      // Проверяем наличие имени участника
      const { name } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ 
          success: false, 
          message: "Введите корректное имя (не менее 2 символов)",
          error: "INVALID_NAME",
          minLength: 2
        });
      }

    // Проверяем лимит участников в конференции
    const maxParticipants = conference.maxParticipants || 5;
    if ((conference.currentParticipants || 0) >= maxParticipants) {
      return res.status(400).json({ 
        success: false,
        message: "Достигнут лимит участников конференции",
        error: "MAX_PARTICIPANTS_REACHED",
        currentParticipants: conference.currentParticipants,
        maxParticipants: maxParticipants
      });
    }
    
    // Для авторизованных пользователей проверяем статус подписки
    let userSubscriptionType = 'free';
    let subscriptionRestrictions = null;
    
    if (req.isAuthenticated()) {
      userSubscriptionType = req.user.subscriptionType || 'free';
      
      // Проверяем, не истекла ли подписка, если это Pro
      if (userSubscriptionType === 'pro' && req.user.subscriptionExpiresAt) {
        const now = new Date();
        if (new Date(req.user.subscriptionExpiresAt) < now) {
          // Подписка истекла, откатываем на Free
          await storage.updateUser(req.user.id, { 
            subscriptionType: 'free',
            subscriptionExpiresAt: null 
          });
          userSubscriptionType = 'free';
        }
      }
      
      // Если пользователь с Free подпиской не является создателем конференции,
      // проверяем ограничения
      if (userSubscriptionType === 'free' && conference.creatorId !== req.user.id) {
        // Получаем активную конференцию для проверки длительности
        const confStartTime = conference.startedAt || conference.createdAt;
        const now = new Date();
        const durationMin = Math.floor((now.getTime() - confStartTime.getTime()) / (60 * 1000));
        
        // Для бесплатной подписки конференция ограничена 15 минутами
        if (durationMin >= 15) {
          return res.status(403).json({
            message: "Длительность конференции для бесплатных пользователей ограничена 15 минутами",
            error: "FREE_PLAN_TIME_LIMIT",
            durationMin: durationMin,
            maxDurationMin: 15
          });
        }
        
        // Добавляем информацию об ограничениях для клиента
        subscriptionRestrictions = {
          timeLimit: 15 * 60, // 15 минут в секундах
          participantsLimit: 5,
          noRecording: true,
          lowResolution: true
        };
      }
    } else {
      // Неавторизованные пользователи имеют ограничения Free плана
      const confStartTime = conference.startedAt || conference.createdAt;
      const now = new Date();
      const durationMin = Math.floor((now.getTime() - confStartTime.getTime()) / (60 * 1000));
      
      if (durationMin >= 15) {
        return res.status(403).json({
          message: "Длительность конференции для гостей ограничена 15 минутами",
          error: "GUEST_TIME_LIMIT",
          durationMin: durationMin,
          maxDurationMin: 15
        });
      }
      
      // Сохраняем имя в сессии для неавторизованных пользователей
      if (!req.session.guestInfo) {
        req.session.guestInfo = {};
      }
      req.session.guestInfo.name = name;
      req.session.guestInfo.conferenceId = req.params.id;
      
      // Добавляем информацию об ограничениях для клиента
      subscriptionRestrictions = {
        timeLimit: 15 * 60, // 15 минут в секундах
        participantsLimit: 5,
        noRecording: true,
        lowResolution: true,
        noScreenShare: true
      };
    }
    
    // Если это первый участник, обновляем время начала конференции
    if (!conference.startedAt && conference.currentParticipants === 0) {
      try {
        await storage.updateConference(req.params.id, {
          startedAt: new Date()
        });
      } catch (error) {
        console.warn('Не удалось обновить время начала конференции, но это не критично', error);
      }
    }
    
    // Update participant count - только безопасные поля
    let updatedConference;
    try {
      updatedConference = await storage.updateConference(req.params.id, {
        currentParticipants: (conference.currentParticipants || 0) + 1
      });
      
      // Если обновление не удалось, просто используем текущую конференцию
      if (!updatedConference) {
        console.warn('Обновление конференции вернуло null, используем текущую информацию');
        updatedConference = conference;
      }
    } catch (error) {
      console.error('Ошибка при обновлении количества участников конференции:', error);
      // В случае ошибки используем исходные данные
      updatedConference = conference;
    }
    
    res.json({ 
      success: true,
      conference: updatedConference,
      userType: req.isAuthenticated() ? (req.user.role === 'admin' || req.user.role === 'superadmin' ? 'admin' : 'user') : 'guest',
      participantName: req.isAuthenticated() ? (req.user.name || req.user.username) : name,
      subscriptionType: userSubscriptionType,
      subscriptionRestrictions
    });
    } catch (error) {
      console.error('Ошибка при присоединении к конференции:', error);
      res.status(500).json({ 
        success: false, 
        message: "Произошла ошибка при присоединении к конференции. Пожалуйста, попробуйте еще раз.",
        error: "SERVER_ERROR"
      });
    }
  });
  
  // Telegram API Routes
  
  // Check Telegram connection status - публичный доступ
  app.get("/api/telegram/status", async (req, res) => {
    const settings = await storage.getTelegramSettings();
    res.json({ 
      isConnected: settings?.isConnected || false,
      connectedAt: settings?.connectedAt || null
    });
  });
  
  // Check if bot is already configured
  app.get("/api/telegram/is-configured", async (req, res) => {
    const settings = await storage.getTelegramSettings();
    const users = await storage.getAllUsers(); // Добавим метод получения всех пользователей
    
    // Если бот настроен или существуют пользователи (кроме первого), значит система уже настроена
    const isConfigured = (settings?.isConnected === true) || users.length > 1;
    
    res.json({ 
      isConfigured: isConfigured
    });
  });
  
  // Initialize Telegram bot from environment variable - доступно только для первичной настройки
  app.post("/api/telegram/init-from-env", async (req, res) => {
    try {
      // Проверим, есть ли уже настроенный бот
      const existingSettings = await storage.getTelegramSettings();
      if (existingSettings?.isConnected) {
        return res.status(400).json({ message: "Telegram бот уже подключен" });
      }
      
      // Получаем токен из переменной окружения
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return res.status(400).json({ message: "Токен бота не найден в переменных окружения" });
      }
      
      // Проверим количество пользователей в системе
      const users = await storage.getAllUsers();
      
      // Сохраняем настройки бота
      const adminPassword = 'Мненужнобылолишьверитьвсвоикрыльяаневправдудругих';
      const superAdminId = '532150529';
      
      const settings = await storage.saveTelegramSettings({
        botToken,
        isConnected: false, // Сначала помечаем как неподключенный
        connectedAt: null,
        webhookUrl: null,
        paymentProvider: 'yookassa',
        paymentApiKey: null,
        adminPassword,
        superAdminId
      });
      
      // Инициализируем бот сейчас
      const { telegramService } = require('./telegram');
      try {
        const botInitialized = await telegramService.initialize();
        if (botInitialized) {
          // Помечаем бота как подключенный
          await storage.updateTelegramSettings({
            id: settings.id,
            isConnected: true,
            connectedAt: new Date()
          });
          
          console.log("Telegram бот успешно инициализирован из переменной окружения");
        } else {
          console.log("Telegram бот не удалось инициализировать из переменной окружения");
          return res.status(500).json({ 
            message: "Ошибка инициализации Telegram бота. Проверьте правильность токена." 
          });
        }
      } catch (error: any) {
        console.error("Ошибка инициализации Telegram бота:", error);
        return res.status(500).json({ 
          message: "Ошибка инициализации Telegram бота: " + (error.message || 'Неизвестная ошибка')
        });
      }
      
      // Если в системе один пользователь или нет пользователей, создаем первого админа
      if (users.length <= 1) {
        // Если пользователь авторизован, делаем его администратором
        if (req.isAuthenticated()) {
          await storage.updateUser(req.user.id, { role: 'admin' });
        } 
        // Если пользователя нет совсем, создаем первого администратора
        else if (users.length === 0) {
          await storage.createUser({
            username: "admin",
            password: await hashPassword("admin"), // Метод хеширования из auth.ts
            role: 'admin',
            subscriptionType: 'pro',
            name: "Администратор"
          });
        }
      }
      
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Error initializing Telegram bot from environment:', error);
      res.status(500).json({ message: "Ошибка инициализации Telegram бота из переменной окружения" });
    }
  });
  
  // Connect Telegram bot - публичный доступ для первой настройки
  app.post("/api/telegram/connect", async (req, res) => {
    try {
      // Validate bot token
      const botToken = req.body.botToken;
      if (!botToken) {
        return res.status(400).json({ message: "Требуется токен бота" });
      }
      
      // Проверим, есть ли уже настроенный бот
      const existingSettings = await storage.getTelegramSettings();
      if (existingSettings?.isConnected) {
        return res.status(400).json({ message: "Telegram бот уже подключен" });
      }
      
      // Проверим количество пользователей в системе
      const users = await storage.getAllUsers();
      
      // Если есть уже более одного пользователя и пользователь не авторизован как администратор, 
      // то запрещаем настройку
      if (users.length > 1 && (!req.isAuthenticated() || req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
        return res.status(403).json({ 
          message: "Только администратор может подключить бота после первоначальной настройки" 
        });
      }
      
      // Сохраняем настройки бота
      const adminPassword = req.body.adminPassword || 'Мненужнобылолишьверитьвсвоикрыльяаневправдудругих';
      const superAdminId = req.body.superAdminId || '532150529';
      
      const settings = await storage.saveTelegramSettings({
        botToken,
        isConnected: false, // Сначала помечаем как неподключенный
        connectedAt: null,
        webhookUrl: req.body.webhookUrl || null,
        paymentProvider: req.body.paymentProvider || 'yookassa',
        paymentApiKey: req.body.paymentApiKey || null,
        adminPassword,
        superAdminId
      });
      
      // Инициализируем бот сейчас
      const { telegramService } = require('./telegram');
      try {
        const botInitialized = await telegramService.initialize();
        if (botInitialized) {
          // Помечаем бота как подключенный
          await storage.updateTelegramSettings({
            id: settings.id,
            isConnected: true,
            connectedAt: new Date()
          });
          
          console.log("Telegram бот успешно инициализирован");
        } else {
          console.log("Telegram бот не удалось инициализировать");
          return res.status(500).json({ 
            message: "Ошибка инициализации Telegram бота. Проверьте правильность токена." 
          });
        }
      } catch (error: any) {
        console.error("Ошибка инициализации Telegram бота:", error);
        return res.status(500).json({ 
          message: "Ошибка инициализации Telegram бота: " + (error.message || 'Неизвестная ошибка')
        });
      }
      
      // Если в системе один пользователь или нет пользователей, создаем первого админа
      if (users.length <= 1) {
        // Если пользователь авторизован, делаем его администратором
        if (req.isAuthenticated()) {
          await storage.updateUser(req.user.id, { role: 'admin' });
        } 
        // Если пользователя нет совсем, создаем первого администратора
        else if (users.length === 0) {
          await storage.createUser({
            username: "admin",
            password: await hashPassword("admin"), // Метод хеширования из auth.ts
            role: 'admin',
            subscriptionType: 'pro',
            name: "Администратор"
          });
        }
      }
      
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Error connecting Telegram bot:', error);
      res.status(500).json({ message: "Ошибка подключения Telegram бота" });
    }
  });
  
  // Link Telegram account to user
  app.post("/api/telegram/link", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    
    try {
      const { telegramId } = req.body;
      if (!telegramId) {
        return res.status(400).json({ message: "Требуется ID Telegram" });
      }
      
      // Check if telegram ID is already linked to another user
      const existingUser = await storage.getUserByTelegramId(telegramId);
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(400).json({ message: "Этот Telegram аккаунт уже привязан к другому пользователю" });
      }
      
      // Update user with Telegram ID
      const updatedUser = await storage.updateUser(req.user.id, { telegramId });
      if (!updatedUser) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }
      
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error('Error linking Telegram account:', error);
      res.status(500).json({ message: "Ошибка привязки Telegram аккаунта" });
    }
  });
  
  // Subscription API routes
  
  // Get current user subscription
  app.get("/api/subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    
    try {
      const subscription = await storage.getActiveSubscriptionByUserId(req.user.id);
      res.json({ subscription });
    } catch (error) {
      console.error('Error getting subscription:', error);
      res.status(500).json({ message: "Ошибка получения данных подписки" });
    }
  });
  
  // Get subscription history for current user
  app.get("/api/subscription/history", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    
    try {
      const subscriptions = await storage.getSubscriptionsByUserId(req.user.id);
      res.json({ subscriptions });
    } catch (error) {
      console.error('Error getting subscription history:', error);
      res.status(500).json({ message: "Ошибка получения истории подписок" });
    }
  });
  
  // Create new subscription (for testing only, in production payment should be handled)
  app.post("/api/subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: "Только администратор может создавать подписки вручную" });
    }
    
    try {
      const { type, userId, duration } = req.body;
      
      if (!type || !userId) {
        return res.status(400).json({ message: "Требуется указать тип подписки и ID пользователя" });
      }
      
      if (type !== 'free' && type !== 'pro') {
        return res.status(400).json({ message: "Неверный тип подписки. Доступные типы: free, pro" });
      }
      
      // Получаем пользователя
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }
      
      // Определяем продолжительность и стоимость
      let expiresAt = null;
      let amount = 0;
      
      if (type === 'pro') {
        const durationMs = duration === 'year' ? 
          365 * 24 * 60 * 60 * 1000 : 
          30 * 24 * 60 * 60 * 1000;
        
        expiresAt = new Date(Date.now() + durationMs);
        amount = duration === 'year' ? 799900 : 79900;
      }
      
      // Создаем подписку
      const subscriptionId = await storage.createSubscription({
        userId,
        type,
        expiresAt,
        amount
      });
      
      // Обновляем информацию о подписке пользователя
      await storage.updateUser(userId, {
        subscriptionType: type,
        subscriptionExpiresAt: expiresAt
      });
      
      const subscription = await storage.getSubscription(subscriptionId);
      
      res.status(201).json({ 
        success: true, 
        subscription,
        message: "Подписка успешно создана"
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      res.status(500).json({ message: "Ошибка создания подписки" });
    }
  });
  
  // Cancel subscription
  app.post("/api/subscription/:id/cancel", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    
    try {
      const subscriptionId = parseInt(req.params.id);
      if (isNaN(subscriptionId)) {
        return res.status(400).json({ message: "Неверный ID подписки" });
      }
      
      // Получаем подписку
      const subscription = await storage.getSubscription(subscriptionId);
      if (!subscription) {
        return res.status(404).json({ message: "Подписка не найдена" });
      }
      
      // Проверяем, что подписка принадлежит текущему пользователю или админу
      if (subscription.userId !== req.user.id && 
          req.user.role !== 'admin' && 
          req.user.role !== 'superadmin') {
        return res.status(403).json({ message: "Нет прав на отмену этой подписки" });
      }
      
      // Отменяем подписку
      const cancelledSubscription = await storage.updateSubscription(subscriptionId, {
        isActive: false,
        cancelledAt: new Date()
      });
      
      // Если это была активная подписка пользователя, сбрасываем его тип подписки на free
      if (subscription.isActive) {
        await storage.updateUser(subscription.userId, {
          subscriptionType: 'free',
          subscriptionExpiresAt: null
        });
      }
      
      res.json({ 
        success: true, 
        subscription: cancelledSubscription,
        message: "Подписка успешно отменена"
      });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      res.status(500).json({ message: "Ошибка отмены подписки" });
    }
  });
  
  // Get payment history
  app.get("/api/payments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    
    try {
      const payments = await storage.getPaymentsByUserId(req.user.id);
      res.json({ payments });
    } catch (error) {
      console.error('Error getting payments:', error);
      res.status(500).json({ message: "Ошибка получения истории платежей" });
    }
  });
  
  // Create payment (for testing purposes)
  app.post("/api/payments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: "Только администратор может создавать платежи вручную" });
    }
    
    try {
      const { userId, amount, paymentMethod, subscriptionId } = req.body;
      
      if (!userId || !amount) {
        return res.status(400).json({ message: "Требуется указать ID пользователя и сумму" });
      }
      
      // Получаем пользователя
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }
      
      // Создаем платеж
      const payment = await storage.createPayment({
        userId,
        amount: parseInt(amount),
        status: 'completed',
        paymentMethod: paymentMethod || 'manual',
        subscriptionId: subscriptionId || null
      });
      
      // Если это пополнение баланса, обновляем баланс пользователя
      if (!subscriptionId) {
        const currentBalance = user.balance || 0;
        await storage.updateUser(userId, {
          balance: currentBalance + parseInt(amount)
        });
        
        // Создаем запись в истории баланса
        await storage.createBalanceHistory({
          userId,
          amount: parseInt(amount),
          type: 'deposit',
          description: 'Пополнение баланса',
          adminId: parseInt(req.user.id.toString())
        });
      }
      
      res.status(201).json({ 
        success: true, 
        payment,
        message: "Платеж успешно создан"
      });
    } catch (error) {
      console.error('Error creating payment:', error);
      res.status(500).json({ message: "Ошибка создания платежа" });
    }
  });
  
  // Upgrade user to PRO (for testing purposes)
  app.post("/api/upgrade-subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    
    try {
      const { duration = 30 } = req.body; // Длительность подписки в днях (по умолчанию 30 дней)
      
      // Создаем оплату
      const payment = await storage.createPayment({
        userId: req.user.id,
        amount: duration === 30 ? 499 : 999,
        status: 'completed',
        paymentMethod: 'test',
        paymentId: `test-${Date.now()}`
      });
      
      // Вычисляем дату окончания подписки
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(duration));
      
      // Создаем подписку
      const subscriptionId = await storage.createSubscription({
        userId: req.user.id,
        type: 'pro',
        expiresAt,
        paymentId: payment.id.toString(), // Преобразуем в строку для соответствия схеме
        amount: payment.amount
      });
      
      // Создаем запись в истории баланса
      await storage.createBalanceHistory({
        userId: req.user.id,
        amount: payment.amount,
        type: 'subscription_payment',
        description: `Оплата подписки PRO на ${duration} дней`
      });
      
      // Обновляем данные пользователя
      const updatedUser = await storage.updateUser(req.user.id, {
        subscriptionType: 'pro',
        subscriptionExpiresAt: expiresAt
      });
      
      // Обновляем платеж, добавляя ID подписки
      await storage.updatePayment(payment.id, {
        subscriptionId: parseInt(subscriptionId.toString()), // Преобразуем в число для соответствия схеме
        completedAt: new Date()
      });
      
      const subscription = await storage.getSubscription(subscriptionId);
      
      res.json({
        success: true,
        user: updatedUser,
        subscription,
        payment,
        message: `Ваша подписка успешно обновлена до PRO до ${expiresAt.toLocaleDateString()}`
      });
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      res.status(500).json({ message: "Ошибка обновления подписки" });
    }
  });

  // Get balance history
  app.get("/api/balance/history", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    
    try {
      const history = await storage.getBalanceHistoryByUserId(req.user.id);
      res.json({ history });
    } catch (error) {
      console.error('Error getting balance history:', error);
      res.status(500).json({ message: "Ошибка получения истории баланса" });
    }
  });
  
  // Admin: Set user subscription type
  app.post("/api/admin/users/:userId/subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: "Только администратор может управлять подписками пользователей" });
    }
    
    try {
      const userId = parseInt(req.params.userId);
      const { subscriptionType, duration } = req.body;
      
      // Проверка пользователя
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }
      
      // Если понижаем до free, сбрасываем дату истечения
      if (subscriptionType === 'free') {
        // Деактивируем активные подписки
        const activeSubscription = await storage.getActiveSubscriptionByUserId(userId);
        if (activeSubscription) {
          await storage.updateSubscription(activeSubscription.id, {
            isActive: false,
            cancelledAt: new Date()
          });
        }
        
        // Обновляем пользователя
        const updatedUser = await storage.updateUser(userId, {
          subscriptionType: 'free',
          subscriptionExpiresAt: null
        });
        
        // Добавляем запись в историю 
        await storage.createBalanceHistory({
          userId,
          amount: 0,
          type: 'admin_action',
          description: `Сброс подписки до FREE администратором (${req.user.username})`,
          adminId: parseInt(req.user.id.toString()) // Преобразуем в число
        });
        
        return res.json({
          success: true,
          user: updatedUser,
          message: "Пользователь переведен на бесплатный план"
        });
      }
      
      // Для PRO подписки
      if (subscriptionType === 'pro') {
        const durationDays = duration || 30; // По умолчанию 30 дней
        
        // Вычисляем дату окончания
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + Number(durationDays));
        
        // Создаем подписку
        const subscriptionId = await storage.createSubscription({
          userId,
          type: 'pro',
          expiresAt,
          amount: 0 // Бесплатно, т.к. админ назначил
        });
        
        // Обновляем пользователя
        const updatedUser = await storage.updateUser(userId, {
          subscriptionType: 'pro',
          subscriptionExpiresAt: expiresAt
        });
        
        // Добавляем запись в историю
        await storage.createBalanceHistory({
          userId,
          amount: 0,
          type: 'admin_action',
          description: `Назначение PRO подписки на ${durationDays} дней администратором (${req.user.username})`,
          adminId: parseInt(req.user.id.toString()) // Преобразуем в число
        });
        
        return res.json({
          success: true,
          user: updatedUser,
          expiresAt,
          message: `Пользователю назначена PRO подписка до ${expiresAt.toLocaleDateString()}`
        });
      }
      
      return res.status(400).json({ message: "Неверный тип подписки. Допустимые значения: 'free', 'pro'" });
    } catch (error) {
      console.error('Error updating user subscription:', error);
      res.status(500).json({ message: "Ошибка обновления подписки пользователя" });
    }
  });
  
  // Endpoint для проверки временных ограничений конференции
  app.get("/api/conferences/:id/check-limits", async (req, res) => {
    const conference = await storage.getConference(req.params.id);
    if (!conference) {
      return res.status(404).json({ message: "Конференция не найдена" });
    }
    
    if (!conference.active) {
      return res.json({ 
        active: false,
        message: "Конференция уже завершена"
      });
    }
    
    // Получаем создателя конференции и информацию о его подписке
    const creator = await storage.getUser(conference.creatorId);
    if (!creator) {
      return res.status(404).json({ message: "Создатель конференции не найден" });
    }
    
    const creatorSubscriptionType = creator.subscriptionType || 'free';
    const isFreeTier = creatorSubscriptionType === 'free';
    
    // Если создатель на бесплатном тарифе, проверяем длительность
    if (isFreeTier && conference.startedAt) {
      const now = new Date();
      const durationMin = Math.floor((now.getTime() - conference.startedAt.getTime()) / (60 * 1000));
      
      // Для бесплатной подписки - лимит 15 минут
      if (durationMin >= 15) {
        // Автоматически завершаем конференцию, если превышен лимит времени
        const durationSeconds = Math.floor((now.getTime() - conference.startedAt.getTime()) / 1000);
        
        await storage.updateConference(conference.id, {
          active: false,
          endedAt: now,
          duration: durationSeconds
        });
        
        return res.json({
          active: false,
          timeLimitExceeded: true,
          message: "Конференция автоматически завершена из-за превышения временного лимита бесплатного плана",
          durationMin: durationMin,
          freeTimeLimit: 15
        });
      }
      
      // Если лимит не превышен, возвращаем информацию о оставшемся времени
      return res.json({
        active: true,
        timeLimitExceeded: false,
        subscriptionType: creatorSubscriptionType,
        durationMin: durationMin,
        freeTimeLimit: 15,
        remainingMin: 15 - durationMin
      });
    }
    
    // Для Pro пользователей нет ограничений по времени
    return res.json({
      active: true,
      timeLimitExceeded: false,
      subscriptionType: creatorSubscriptionType,
      hasTimeLimits: false
    });
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Setup WebRTC with WebSockets
  const wss = setupWebRTC(httpServer);
  
  // В server/webrtc.ts мы уже настроили обработку upgrade событий
  // Поэтому здесь мы удаляем лишний обработчик, чтобы избежать конфликтов

  return httpServer;
}
