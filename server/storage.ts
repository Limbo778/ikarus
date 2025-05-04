import {
  conferences, users, telegramSettings, subscriptions, payments, balanceHistory,
  type User, type InsertUser,
  type Conference, type InsertConference,
  type TelegramSettings, type InsertTelegramSettings,
  type Subscription, type InsertSubscription,
  type Payment, type InsertPayment,
  type BalanceHistory, type InsertBalanceHistory
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { WebSocketServer } from "ws";
import { db } from "./db";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { pool } from "./db";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// Интерфейс хранилища с методами CRUD для всех сущностей
export interface IStorage {
  // Методы для работы с пользователями
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Методы для работы с конференциями
  getConference(id: string): Promise<Conference | undefined>;
  getConferencesByUserId(userId: number): Promise<Conference[]>;
  createConference(conference: InsertConference): Promise<Conference>;
  updateConference(id: string, updates: Partial<Conference>): Promise<Conference | undefined>;
  getAllActiveConferences(): Promise<Conference[]>;
  
  // Методы для работы с настройками Telegram бота
  getTelegramSettings(): Promise<TelegramSettings | null>;
  saveTelegramSettings(settings: InsertTelegramSettings): Promise<TelegramSettings>;
  updateTelegramSettings(updates: Partial<TelegramSettings>): Promise<TelegramSettings | null>;
  
  // Методы для работы с подписками
  getSubscription(id: number): Promise<Subscription | undefined>;
  getActiveSubscriptionByUserId(userId: number): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<number>; // Возвращает ID подписки
  updateSubscription(id: number, updates: Partial<Subscription>): Promise<Subscription | undefined>;
  getSubscriptionsByUserId(userId: number): Promise<Subscription[]>;
  
  // Методы для работы с платежами
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentByExternalId(externalId: string): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, updates: Partial<Payment>): Promise<Payment | undefined>;
  getPaymentsByUserId(userId: number): Promise<Payment[]>;
  getAllPayments(): Promise<Payment[]>;
  
  // Методы для работы с историей баланса
  getBalanceHistory(id: number): Promise<BalanceHistory | undefined>;
  createBalanceHistory(history: InsertBalanceHistory): Promise<BalanceHistory>;
  getBalanceHistoryByUserId(userId: number): Promise<BalanceHistory[]>;
  
  sessionStore: session.Store;
  wss: WebSocketServer | null;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private confs: Map<string, Conference>;
  private telegramConfig: TelegramSettings | undefined;
  private subs: Map<number, Subscription>;
  private pays: Map<number, Payment>;
  private balanceHist: Map<number, BalanceHistory>;
  
  currentId: number;
  currentConferenceId: number;
  currentSubId: number;
  currentPaymentId: number;
  currentBalanceHistoryId: number;
  
  sessionStore: session.Store;
  wss: WebSocketServer | null;

  constructor() {
    this.users = new Map();
    this.confs = new Map();
    this.subs = new Map();
    this.pays = new Map();
    this.balanceHist = new Map();
    
    this.currentId = 1;
    this.currentConferenceId = 10000;
    this.currentSubId = 1;
    this.currentPaymentId = 1;
    this.currentBalanceHistoryId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    this.wss = null;
  }

  // Методы для работы с пользователями
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.telegramId === telegramId,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
      id,
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email || null,
      name: insertUser.name || null,
      avatar: insertUser.avatar || null,
      role: insertUser.role || 'user',
      subscriptionType: insertUser.subscriptionType || 'free',
      subscriptionExpiresAt: null,
      telegramId: insertUser.telegramId || null,
      isBanned: false,
      banReason: null,
      balance: 0,
      createdAt: new Date(),
      lastLoginAt: null
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Методы для работы с конференциями
  async getConference(id: string): Promise<Conference | undefined> {
    return this.confs.get(id);
  }

  async getConferencesByUserId(userId: number): Promise<Conference[]> {
    return Array.from(this.confs.values()).filter(
      (conf) => conf.creatorId === userId
    );
  }

  async createConference(conference: InsertConference): Promise<Conference> {
    const id = `CONF-${this.currentConferenceId++}`;
    const newConference: Conference = {
      id,
      name: conference.name,
      description: conference.description || null,
      creatorId: conference.creatorId,
      creatorName: conference.creatorName || null,
      hostId: conference.hostId || null,
      active: true,
      maxParticipants: conference.maxParticipants || 5,
      currentParticipants: 0,
      startedAt: null,
      endedAt: null,
      duration: 0,
      hasScreenShare: conference.hasScreenShare || false,
      hasChat: conference.hasChat || true,
      hasVideoEnabled: conference.hasVideoEnabled || true,
      hostVideoPriority: conference.hostVideoPriority || true,
      allowParticipantDetach: conference.allowParticipantDetach || true,
      isLocked: conference.isLocked || false,
      createdAt: new Date()
    };
    this.confs.set(id, newConference);
    return newConference;
  }

  async updateConference(id: string, updates: Partial<Conference>): Promise<Conference | undefined> {
    const conference = await this.getConference(id);
    if (!conference) return undefined;

    const updatedConference = { ...conference, ...updates };
    this.confs.set(id, updatedConference);
    return updatedConference;
  }

  async getAllActiveConferences(): Promise<Conference[]> {
    return Array.from(this.confs.values()).filter(conf => conf.active);
  }
  
  // Методы для работы с настройками Telegram бота
  async getTelegramSettings(): Promise<TelegramSettings | null> {
    return this.telegramConfig || null;
  }
  
  async saveTelegramSettings(settings: InsertTelegramSettings): Promise<TelegramSettings> {
    const tgSettings: TelegramSettings = {
      id: 1,
      botToken: settings.botToken || null,
      isConnected: false,
      connectedAt: null,
      webhookUrl: settings.webhookUrl || null,
      paymentProvider: settings.paymentProvider || 'yookassa',
      paymentApiKey: settings.paymentApiKey || null,
      adminPassword: settings.adminPassword || null,
      superAdminId: settings.superAdminId || null
    };
    this.telegramConfig = tgSettings;
    return tgSettings;
  }
  
  async updateTelegramSettings(updates: Partial<TelegramSettings>): Promise<TelegramSettings | null> {
    if (!this.telegramConfig) return null;
    
    const updatedSettings = { ...this.telegramConfig, ...updates };
    this.telegramConfig = updatedSettings;
    return updatedSettings;
  }

  // Методы для работы с подписками
  async getSubscription(id: number): Promise<Subscription | undefined> {
    return this.subs.get(id);
  }

  async getActiveSubscriptionByUserId(userId: number): Promise<Subscription | undefined> {
    const now = new Date();
    return Array.from(this.subs.values()).find(
      sub => sub.userId === userId && 
             sub.isActive && 
             (!sub.expiresAt || sub.expiresAt > now)
    );
  }

  async createSubscription(subscription: InsertSubscription): Promise<number> {
    const id = this.currentSubId++;
    const newSubscription: Subscription = {
      id,
      userId: subscription.userId,
      type: subscription.type,
      startedAt: new Date(),
      expiresAt: subscription.expiresAt || null,
      isActive: true,
      cancelledAt: null,
      paymentId: subscription.paymentId || null,
      amount: subscription.amount || null,
      createdAt: new Date()
    };
    this.subs.set(id, newSubscription);
    return id;
  }

  async updateSubscription(id: number, updates: Partial<Subscription>): Promise<Subscription | undefined> {
    const subscription = await this.getSubscription(id);
    if (!subscription) return undefined;

    const updatedSubscription = { ...subscription, ...updates };
    this.subs.set(id, updatedSubscription);
    return updatedSubscription;
  }

  async getSubscriptionsByUserId(userId: number): Promise<Subscription[]> {
    return Array.from(this.subs.values()).filter(
      sub => sub.userId === userId
    ).sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  // Методы для работы с платежами
  async getPayment(id: number): Promise<Payment | undefined> {
    return this.pays.get(id);
  }

  async getPaymentByExternalId(externalId: string): Promise<Payment | undefined> {
    return Array.from(this.pays.values()).find(
      payment => payment.externalId === externalId
    );
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.currentPaymentId++;
    const newPayment: Payment = {
      id,
      userId: payment.userId,
      amount: payment.amount,
      status: payment.status,
      paymentMethod: payment.paymentMethod || null,
      paymentId: payment.paymentId || null,
      externalId: payment.externalId || null,
      type: payment.type || null,
      details: payment.details || null,
      subscriptionId: payment.subscriptionId || null,
      createdAt: new Date(),
      completedAt: null,
      updatedAt: null
    };
    this.pays.set(id, newPayment);
    return newPayment;
  }

  async updatePayment(id: number, updates: Partial<Payment>): Promise<Payment | undefined> {
    const payment = await this.getPayment(id);
    if (!payment) return undefined;

    const updatedPayment = { ...payment, ...updates };
    this.pays.set(id, updatedPayment);
    return updatedPayment;
  }

  async getPaymentsByUserId(userId: number): Promise<Payment[]> {
    return Array.from(this.pays.values()).filter(
      payment => payment.userId === userId
    ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getAllPayments(): Promise<Payment[]> {
    return Array.from(this.pays.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Методы для работы с историей баланса
  async getBalanceHistory(id: number): Promise<BalanceHistory | undefined> {
    return this.balanceHist.get(id);
  }

  async createBalanceHistory(history: InsertBalanceHistory): Promise<BalanceHistory> {
    const id = this.currentBalanceHistoryId++;
    const newHistory: BalanceHistory = {
      id,
      userId: history.userId,
      amount: history.amount,
      type: history.type,
      description: history.description || null,
      adminId: history.adminId || null,
      createdAt: new Date()
    };
    this.balanceHist.set(id, newHistory);
    return newHistory;
  }

  async getBalanceHistoryByUserId(userId: number): Promise<BalanceHistory[]> {
    return Array.from(this.balanceHist.values()).filter(
      history => history.userId === userId
    ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  wss: WebSocketServer | null;

  constructor() {
    // Улучшенная конфигурация сессионного хранилища PostgreSQL
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
      tableName: 'session', // Указываем явно имя таблицы
      pruneSessionInterval: 60 * 15, // Очистка неиспользуемых сессий каждые 15 минут
      errorLog: (err) => console.error('PostgreSQL session store error:', err),
      conObject: {
        connectionTimeoutMillis: 20000, // Увеличенный таймаут для сессионных операций
        query_timeout: 20000, // Таймаут запросов для сессионной БД
      },
    });
    
    // Обработка ошибок сессионного хранилища
    (this.sessionStore as any).on('error', (err: Error) => {
      console.error('Session store error:', err);
    });
    
    this.wss = null;
  }

  // Методы для работы с пользователями
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    if (!telegramId) return undefined;
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email || null,
      name: insertUser.name || null,
      avatar: insertUser.avatar || null,
      role: insertUser.role || 'user',
      subscriptionType: insertUser.subscriptionType || 'free',
      telegramId: insertUser.telegramId || null
    }).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Методы для работы с конференциями
  async getConference(id: string): Promise<Conference | undefined> {
    try {
      console.log(`[storage] Запрос конференции с ID: "${id}"`);
      
      // Используем SQL запрос напрямую для избежания проблем с типами
      const result = await pool.query(
        `SELECT * FROM conferences WHERE id = $1`,
        [id]
      );
      
      if (result.rows.length > 0) {
        console.log(`[storage] Конференция найдена: ${result.rows[0].name}`);
        return result.rows[0] as Conference;
      }
      
      console.log(`[storage] Конференция с ID "${id}" не найдена`);
      return undefined;
    } catch (error) {
      console.error('[storage] Ошибка при получении конференции:', error);
      return undefined;
    }
  }

  async getConferencesByUserId(userId: number): Promise<Conference[]> {
    try {
      // Используем прямой SQL запрос для избежания проблем с типами
      const result = await pool.query(
        `SELECT * FROM conferences 
         WHERE creator_id = $1 
         ORDER BY created_at DESC`,
        [userId]
      );
      return result.rows as Conference[];
    } catch (error) {
      console.error('Ошибка при получении конференций пользователя:', error);
      return [];
    }
  }

  async createConference(conference: InsertConference): Promise<Conference> {
    try {
      const id = `CONF-${Date.now()}`;
      
      // Получаем имя создателя для сохранения
      let creatorName = null;
      if (conference.creatorId) {
        const creator = await this.getUser(conference.creatorId);
        if (creator) {
          creatorName = creator.name || creator.username;
        }
      }
      
      // Выполняем SQL запрос напрямую для избежания проблем с типами
      const result = await pool.query(
        `INSERT INTO conferences 
        (id, name, description, creator_id, creator_name, host_id, max_participants, 
        has_screen_share, has_chat, has_video_enabled, active, current_participants, 
        duration, host_video_priority, allow_participant_detach, is_locked) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
        RETURNING *`,
        [
          id, 
          conference.name, 
          conference.description || null, 
          conference.creatorId, 
          conference.creatorName || creatorName, 
          conference.hostId || null, 
          conference.maxParticipants || 5, 
          conference.hasScreenShare || false, 
          conference.hasChat !== undefined ? conference.hasChat : true, 
          conference.hasVideoEnabled !== undefined ? conference.hasVideoEnabled : true, 
          true, // active
          0, // currentParticipants
          0, // duration
          conference.hostVideoPriority !== undefined ? conference.hostVideoPriority : true,
          conference.allowParticipantDetach !== undefined ? conference.allowParticipantDetach : true,
          conference.isLocked || false
        ]
      );
      
      if (result.rows.length > 0) {
        return result.rows[0] as Conference;
      }
      
      throw new Error('Не удалось создать конференцию');
    } catch (error) {
      console.error('Ошибка при создании конференции:', error);
      throw error;
    }
  }

  async updateConference(id: string, updates: Partial<Conference>): Promise<Conference | undefined> {
    try {
      // Создаем безопасный набор обновлений
      const safeUpdates: Record<string, any> = {};
      
      // Копируем только поля, которые существуют в схеме
      if ('name' in updates) safeUpdates.name = updates.name;
      if ('description' in updates) safeUpdates.description = updates.description;
      if ('active' in updates) safeUpdates.active = updates.active;
      if ('maxParticipants' in updates) safeUpdates.maxParticipants = updates.maxParticipants;
      if ('currentParticipants' in updates) safeUpdates.currentParticipants = updates.currentParticipants;
      if ('startedAt' in updates) safeUpdates.startedAt = updates.startedAt;
      if ('endedAt' in updates) safeUpdates.endedAt = updates.endedAt;
      if ('duration' in updates) safeUpdates.duration = updates.duration;
      if ('hasScreenShare' in updates) safeUpdates.hasScreenShare = updates.hasScreenShare;
      if ('hasChat' in updates) safeUpdates.hasChat = updates.hasChat;
      if ('hasVideoEnabled' in updates) safeUpdates.hasVideoEnabled = updates.hasVideoEnabled;
      if ('hostId' in updates) safeUpdates.hostId = updates.hostId;
      if ('hostVideoPriority' in updates) safeUpdates.hostVideoPriority = updates.hostVideoPriority;
      if ('allowParticipantDetach' in updates) safeUpdates.allowParticipantDetach = updates.allowParticipantDetach;
      if ('isLocked' in updates) safeUpdates.isLocked = updates.isLocked;
      
      // Если нет полей для обновления, возвращаем существующую конференцию
      if (Object.keys(safeUpdates).length === 0) {
        return await this.getConference(id);
      }
            
      // Выполняем прямой SQL запрос
      const fields = [];
      const values = [];
      let paramIndex = 1;
      
      for (const [key, value] of Object.entries(safeUpdates)) {
        fields.push(`"${key}" = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
      
      const sql = `
        UPDATE conferences 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      values.push(id);
      
      const result = await pool.query(sql, values);
      
      if (result.rows.length > 0) {
        return result.rows[0] as Conference;
      }
      
      return undefined;
    } catch (error) {
      console.error('Ошибка при обновлении конференции:', error);
      throw error;
    }
  }

  async getAllActiveConferences(): Promise<Conference[]> {
    try {
      // Используем прямой SQL запрос для избежания проблем с типами
      const result = await pool.query(
        `SELECT * FROM conferences 
         WHERE active = true 
         ORDER BY created_at DESC`
      );
      return result.rows as Conference[];
    } catch (error) {
      console.error('Ошибка при получении активных конференций:', error);
      return [];
    }
  }

  // Методы для работы с настройками Telegram бота
  async getTelegramSettings(): Promise<TelegramSettings | null> {
    const [settings] = await db.select().from(telegramSettings).limit(1);
    return settings || null;
  }

  async saveTelegramSettings(settings: InsertTelegramSettings): Promise<TelegramSettings> {
    // Проверяем существующие настройки
    const existingSettings = await this.getTelegramSettings();
    
    if (existingSettings) {
      // Обновляем существующие настройки
      const [updatedSettings] = await db.update(telegramSettings)
        .set({
          botToken: settings.botToken || null,
          webhookUrl: settings.webhookUrl || null,
          paymentProvider: settings.paymentProvider || 'yookassa',
          paymentApiKey: settings.paymentApiKey || null,
          adminPassword: settings.adminPassword || null,
          superAdminId: settings.superAdminId || null
        })
        .where(eq(telegramSettings.id, existingSettings.id))
        .returning();
      return updatedSettings;
    } else {
      // Создаем новые настройки
      const [newSettings] = await db.insert(telegramSettings)
        .values({
          botToken: settings.botToken || null,
          webhookUrl: settings.webhookUrl || null,
          paymentProvider: settings.paymentProvider || 'yookassa',
          paymentApiKey: settings.paymentApiKey || null,
          adminPassword: settings.adminPassword || null,
          superAdminId: settings.superAdminId || null
        })
        .returning();
      return newSettings;
    }
  }

  async updateTelegramSettings(updates: Partial<TelegramSettings>): Promise<TelegramSettings | null> {
    const existingSettings = await this.getTelegramSettings();
    if (!existingSettings) return null;

    const [updatedSettings] = await db.update(telegramSettings)
      .set(updates)
      .where(eq(telegramSettings.id, existingSettings.id))
      .returning();
    return updatedSettings || null;
  }

  // Методы для работы с подписками
  async getSubscription(id: number): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return subscription;
  }

  async getActiveSubscriptionByUserId(userId: number): Promise<Subscription | undefined> {
    const now = new Date();
    
    // Получаем все активные подписки пользователя
    const activeSubscriptions = await db.select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.isActive, true)
        )
      )
      .orderBy(desc(subscriptions.startedAt));
    
    // Сначала ищем бессрочные подписки
    const permanentSubscription = activeSubscriptions.find(sub => !sub.expiresAt);
    if (permanentSubscription) {
      return permanentSubscription;
    }
    
    // Если бессрочной подписки нет, проверяем действующие с датой окончания
    const validSubscription = activeSubscriptions.find(sub => 
      sub.expiresAt && sub.expiresAt >= now
    );
    
    return validSubscription;
  }

  async createSubscription(subscription: InsertSubscription): Promise<number> {
    const [newSubscription] = await db.insert(subscriptions)
      .values({
        userId: subscription.userId,
        type: subscription.type,
        expiresAt: subscription.expiresAt || null,
        paymentId: subscription.paymentId || null,
        amount: subscription.amount || null
      })
      .returning({ id: subscriptions.id });
    
    return newSubscription.id;
  }

  async updateSubscription(id: number, updates: Partial<Subscription>): Promise<Subscription | undefined> {
    const [subscription] = await db.update(subscriptions)
      .set(updates)
      .where(eq(subscriptions.id, id))
      .returning();
    return subscription;
  }

  async getSubscriptionsByUserId(userId: number): Promise<Subscription[]> {
    return await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.startedAt));
  }

  // Методы для работы с платежами
  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async getPaymentByExternalId(externalId: string): Promise<Payment | undefined> {
    if (!externalId) return undefined;
    const [payment] = await db.select().from(payments).where(eq(payments.externalId, externalId));
    return payment;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments)
      .values({
        userId: payment.userId,
        amount: payment.amount,
        status: payment.status,
        paymentMethod: payment.paymentMethod || null,
        paymentId: payment.paymentId || null,
        externalId: payment.externalId || null,
        type: payment.type || null,
        details: payment.details || null,
        subscriptionId: payment.subscriptionId || null,
        updatedAt: payment.updatedAt || null
      })
      .returning();
    return newPayment;
  }

  async updatePayment(id: number, updates: Partial<Payment>): Promise<Payment | undefined> {
    const [payment] = await db.update(payments)
      .set(updates)
      .where(eq(payments.id, id))
      .returning();
    return payment;
  }

  async getPaymentsByUserId(userId: number): Promise<Payment[]> {
    return await db.select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db.select()
      .from(payments)
      .orderBy(desc(payments.createdAt));
  }

  // Методы для работы с историей баланса
  async getBalanceHistory(id: number): Promise<BalanceHistory | undefined> {
    const [history] = await db.select().from(balanceHistory).where(eq(balanceHistory.id, id));
    return history;
  }

  async createBalanceHistory(history: InsertBalanceHistory): Promise<BalanceHistory> {
    const [newHistory] = await db.insert(balanceHistory)
      .values({
        userId: history.userId,
        amount: history.amount,
        type: history.type,
        description: history.description || null,
        adminId: history.adminId || null
      })
      .returning();
    return newHistory;
  }

  async getBalanceHistoryByUserId(userId: number): Promise<BalanceHistory[]> {
    return await db.select()
      .from(balanceHistory)
      .where(eq(balanceHistory.userId, userId))
      .orderBy(desc(balanceHistory.createdAt));
  }
}

export const storage = new DatabaseStorage();
