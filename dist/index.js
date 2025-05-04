var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc4) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc4 = __getOwnPropDesc(from, key)) || desc4.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  balanceHistory: () => balanceHistory,
  conferences: () => conferences,
  insertBalanceHistorySchema: () => insertBalanceHistorySchema,
  insertConferenceSchema: () => insertConferenceSchema,
  insertPaymentSchema: () => insertPaymentSchema,
  insertSubscriptionSchema: () => insertSubscriptionSchema,
  insertTelegramSettingsSchema: () => insertTelegramSettingsSchema,
  insertUserSchema: () => insertUserSchema,
  payments: () => payments,
  subscriptionTypeEnum: () => subscriptionTypeEnum,
  subscriptions: () => subscriptions,
  telegramSettings: () => telegramSettings,
  userRoleEnum: () => userRoleEnum,
  users: () => users
});
import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var subscriptionTypeEnum, userRoleEnum, users, conferences, telegramSettings, subscriptions, payments, balanceHistory, insertUserSchema, insertConferenceSchema, insertTelegramSettingsSchema, insertSubscriptionSchema, insertPaymentSchema, insertBalanceHistorySchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    subscriptionTypeEnum = pgEnum("subscription_type", ["free", "pro"]);
    userRoleEnum = pgEnum("user_role", ["user", "host", "admin", "superadmin"]);
    users = pgTable("users", {
      id: serial("id").primaryKey(),
      username: text("username").notNull().unique(),
      email: text("email").unique(),
      password: text("password").notNull(),
      name: text("name"),
      avatar: text("avatar"),
      role: userRoleEnum("role").notNull().default("user"),
      subscriptionType: subscriptionTypeEnum("subscription_type").notNull().default("free"),
      subscriptionExpiresAt: timestamp("subscription_expires_at"),
      telegramId: text("telegram_id").unique(),
      isBanned: boolean("is_banned").default(false),
      banReason: text("ban_reason"),
      balance: integer("balance").default(0),
      // баланс в копейках
      createdAt: timestamp("created_at").notNull().defaultNow(),
      lastLoginAt: timestamp("last_login_at")
    });
    conferences = pgTable("conferences", {
      id: text("id").primaryKey(),
      name: text("name").notNull(),
      description: text("description"),
      creatorId: integer("creator_id").notNull(),
      creatorName: text("creator_name"),
      // Имя создателя для быстрого отображения
      hostId: text("host_id"),
      // ID хоста конференции (может быть уникальным ID сессии)
      active: boolean("active").default(true),
      maxParticipants: integer("max_participants").default(5),
      // Лимит участников - 5 для обычной подписки
      currentParticipants: integer("current_participants").default(0),
      startedAt: timestamp("started_at"),
      endedAt: timestamp("ended_at"),
      duration: integer("duration").default(0),
      // в секундах
      hasScreenShare: boolean("has_screen_share").default(false),
      hasChat: boolean("has_chat").default(true),
      hasVideoEnabled: boolean("has_video_enabled").default(true),
      hostVideoPriority: boolean("host_video_priority").default(true),
      // Приоритет видео хоста
      allowParticipantDetach: boolean("allow_participant_detach").default(true),
      // Разрешать ли участникам отцеплять видео
      isLocked: boolean("is_locked").default(false),
      // Заблокирована ли конференция от присоединения новых участников
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    telegramSettings = pgTable("telegram_settings", {
      id: serial("id").primaryKey(),
      botToken: text("bot_token"),
      isConnected: boolean("is_connected").default(false),
      connectedAt: timestamp("connected_at"),
      webhookUrl: text("webhook_url"),
      paymentProvider: text("payment_provider").default("yookassa"),
      paymentApiKey: text("payment_api_key"),
      adminPassword: text("admin_password"),
      // хешированный пароль для админа бота
      superAdminId: text("super_admin_id")
      // Telegram ID суперадмина
    });
    subscriptions = pgTable("subscriptions", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").notNull(),
      type: subscriptionTypeEnum("type").notNull(),
      startedAt: timestamp("started_at").notNull().defaultNow(),
      expiresAt: timestamp("expires_at"),
      isActive: boolean("is_active").default(true),
      cancelledAt: timestamp("cancelled_at"),
      paymentId: text("payment_id"),
      amount: integer("amount"),
      // сумма в копейках
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    payments = pgTable("payments", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").notNull(),
      amount: integer("amount").notNull(),
      // сумма в копейках
      status: text("status").notNull(),
      // pending, completed, failed, refunded, canceled
      paymentMethod: text("payment_method"),
      // telegram, yookassa и т.д.
      paymentId: text("payment_id"),
      // ID платежа в платежной системе
      externalId: text("external_id"),
      // ID платежа во внешней платежной системе
      details: text("details"),
      // JSON строка с дополнительными данными о платеже
      type: text("type"),
      // subscription, extension, donation и т.д.
      subscriptionId: integer("subscription_id"),
      createdAt: timestamp("created_at").notNull().defaultNow(),
      completedAt: timestamp("completed_at"),
      updatedAt: timestamp("updated_at")
    });
    balanceHistory = pgTable("balance_history", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").notNull(),
      amount: integer("amount").notNull(),
      // сумма изменения в копейках
      type: text("type").notNull(),
      // deposit, withdrawal, bonus, subscription
      description: text("description"),
      adminId: integer("admin_id"),
      // ID администратора, который изменил баланс
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    insertUserSchema = createInsertSchema(users).pick({
      username: true,
      email: true,
      password: true,
      name: true,
      avatar: true,
      role: true,
      subscriptionType: true,
      telegramId: true
    });
    insertConferenceSchema = createInsertSchema(conferences).pick({
      name: true,
      description: true,
      creatorId: true,
      creatorName: true,
      hostId: true,
      maxParticipants: true,
      hasScreenShare: true,
      hasChat: true,
      hasVideoEnabled: true,
      hostVideoPriority: true,
      allowParticipantDetach: true,
      isLocked: true
    });
    insertTelegramSettingsSchema = createInsertSchema(telegramSettings).pick({
      botToken: true,
      isConnected: true,
      connectedAt: true,
      webhookUrl: true,
      paymentProvider: true,
      paymentApiKey: true,
      adminPassword: true,
      superAdminId: true
    });
    insertSubscriptionSchema = createInsertSchema(subscriptions).pick({
      userId: true,
      type: true,
      expiresAt: true,
      paymentId: true,
      amount: true
    });
    insertPaymentSchema = createInsertSchema(payments).pick({
      userId: true,
      amount: true,
      status: true,
      paymentMethod: true,
      paymentId: true,
      externalId: true,
      details: true,
      type: true,
      subscriptionId: true,
      updatedAt: true
    });
    insertBalanceHistorySchema = createInsertSchema(balanceHistory).pick({
      userId: true,
      amount: true,
      type: true,
      description: true,
      adminId: true
    });
  }
});

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
async function checkDatabaseConnection() {
  let retries = 3;
  let lastError;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query("SELECT now()");
        console.log("Database connection successful");
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      lastError = error;
      console.error(`Database connection attempt failed (${retries} retries left):`, error);
      retries--;
      if (retries > 0) {
        const delay = (4 - retries) * 1e3;
        console.log(`Waiting ${delay}ms before next connection attempt...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  console.error("All database connection attempts failed. Last error:", lastError);
  return false;
}
var Pool, pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    ({ Pool } = pg);
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      // Максимальное количество соединений в пуле
      idleTimeoutMillis: 6e4,
      // Таймаут неиспользуемого соединения в мс (увеличено)
      connectionTimeoutMillis: 15e3,
      // Таймаут соединения в мс (увеличено)
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      keepAlive: true,
      // Опция для поддержания соединений активными
      query_timeout: 3e4
      // Увеличиваем таймаут для запросов
    });
    pool.on("connect", () => {
      console.log("New PostgreSQL client connected");
    });
    pool.on("error", (err) => {
      console.error("Unexpected PostgreSQL client error:", err);
    });
    db = drizzle(pool, { schema: schema_exports });
  }
});

// server/storage.ts
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { eq, desc, and } from "drizzle-orm";
var MemoryStore, PostgresSessionStore, DatabaseStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    init_db();
    init_db();
    MemoryStore = createMemoryStore(session);
    PostgresSessionStore = connectPg(session);
    DatabaseStorage = class {
      constructor() {
        this.sessionStore = new PostgresSessionStore({
          pool,
          createTableIfMissing: true,
          tableName: "session",
          // Указываем явно имя таблицы
          pruneSessionInterval: 60 * 15,
          // Очистка неиспользуемых сессий каждые 15 минут
          errorLog: (err) => console.error("PostgreSQL session store error:", err),
          conObject: {
            connectionTimeoutMillis: 2e4,
            // Увеличенный таймаут для сессионных операций
            query_timeout: 2e4
            // Таймаут запросов для сессионной БД
          }
        });
        this.sessionStore.on("error", (err) => {
          console.error("Session store error:", err);
        });
        this.wss = null;
      }
      // Методы для работы с пользователями
      async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
      }
      async getUserByUsername(username) {
        const [user] = await db.select().from(users).where(eq(users.username, username));
        return user;
      }
      async getUserByEmail(email) {
        if (!email) return void 0;
        const [user] = await db.select().from(users).where(eq(users.email, email));
        return user;
      }
      async getUserByTelegramId(telegramId) {
        if (!telegramId) return void 0;
        const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
        return user;
      }
      async createUser(insertUser) {
        const [user] = await db.insert(users).values({
          username: insertUser.username,
          password: insertUser.password,
          email: insertUser.email || null,
          name: insertUser.name || null,
          avatar: insertUser.avatar || null,
          role: insertUser.role || "user",
          subscriptionType: insertUser.subscriptionType || "free",
          telegramId: insertUser.telegramId || null
        }).returning();
        return user;
      }
      async updateUser(id, updates) {
        const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
        return user;
      }
      async getAllUsers() {
        return await db.select().from(users);
      }
      // Методы для работы с конференциями
      async getConference(id) {
        try {
          const result = await pool.query(
            `SELECT * FROM conferences WHERE id = $1`,
            [id]
          );
          if (result.rows.length > 0) {
            return result.rows[0];
          }
          return void 0;
        } catch (error) {
          console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438:", error);
          return void 0;
        }
      }
      async getConferencesByUserId(userId) {
        try {
          const result = await pool.query(
            `SELECT * FROM conferences 
         WHERE creator_id = $1 
         ORDER BY created_at DESC`,
            [userId]
          );
          return result.rows;
        } catch (error) {
          console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F:", error);
          return [];
        }
      }
      async createConference(conference) {
        try {
          const id = `CONF-${Date.now()}`;
          let creatorName = null;
          if (conference.creatorId) {
            const creator = await this.getUser(conference.creatorId);
            if (creator) {
              creatorName = creator.name || creator.username;
            }
          }
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
              conference.hasChat !== void 0 ? conference.hasChat : true,
              conference.hasVideoEnabled !== void 0 ? conference.hasVideoEnabled : true,
              true,
              // active
              0,
              // currentParticipants
              0,
              // duration
              conference.hostVideoPriority !== void 0 ? conference.hostVideoPriority : true,
              conference.allowParticipantDetach !== void 0 ? conference.allowParticipantDetach : true,
              conference.isLocked || false
            ]
          );
          if (result.rows.length > 0) {
            return result.rows[0];
          }
          throw new Error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044E");
        } catch (error) {
          console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0438 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438:", error);
          throw error;
        }
      }
      async updateConference(id, updates) {
        try {
          const safeUpdates = {};
          if ("name" in updates) safeUpdates.name = updates.name;
          if ("description" in updates) safeUpdates.description = updates.description;
          if ("active" in updates) safeUpdates.active = updates.active;
          if ("maxParticipants" in updates) safeUpdates.maxParticipants = updates.maxParticipants;
          if ("currentParticipants" in updates) safeUpdates.currentParticipants = updates.currentParticipants;
          if ("startedAt" in updates) safeUpdates.startedAt = updates.startedAt;
          if ("endedAt" in updates) safeUpdates.endedAt = updates.endedAt;
          if ("duration" in updates) safeUpdates.duration = updates.duration;
          if ("hasScreenShare" in updates) safeUpdates.hasScreenShare = updates.hasScreenShare;
          if ("hasChat" in updates) safeUpdates.hasChat = updates.hasChat;
          if ("hasVideoEnabled" in updates) safeUpdates.hasVideoEnabled = updates.hasVideoEnabled;
          if ("hostId" in updates) safeUpdates.hostId = updates.hostId;
          if ("hostVideoPriority" in updates) safeUpdates.hostVideoPriority = updates.hostVideoPriority;
          if ("allowParticipantDetach" in updates) safeUpdates.allowParticipantDetach = updates.allowParticipantDetach;
          if ("isLocked" in updates) safeUpdates.isLocked = updates.isLocked;
          if (Object.keys(safeUpdates).length === 0) {
            return await this.getConference(id);
          }
          const fields = [];
          const values = [];
          let paramIndex = 1;
          for (const [key, value] of Object.entries(safeUpdates)) {
            fields.push(`"${key}" = $${paramIndex}`);
            values.push(value);
            paramIndex++;
          }
          const sql4 = `
        UPDATE conferences 
        SET ${fields.join(", ")}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
          values.push(id);
          const result = await pool.query(sql4, values);
          if (result.rows.length > 0) {
            return result.rows[0];
          }
          return void 0;
        } catch (error) {
          console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0438 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438:", error);
          throw error;
        }
      }
      async getAllActiveConferences() {
        try {
          const result = await pool.query(
            `SELECT * FROM conferences 
         WHERE active = true 
         ORDER BY created_at DESC`
          );
          return result.rows;
        } catch (error) {
          console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439:", error);
          return [];
        }
      }
      // Методы для работы с настройками Telegram бота
      async getTelegramSettings() {
        const [settings] = await db.select().from(telegramSettings).limit(1);
        return settings || null;
      }
      async saveTelegramSettings(settings) {
        const existingSettings = await this.getTelegramSettings();
        if (existingSettings) {
          const [updatedSettings] = await db.update(telegramSettings).set({
            botToken: settings.botToken || null,
            webhookUrl: settings.webhookUrl || null,
            paymentProvider: settings.paymentProvider || "yookassa",
            paymentApiKey: settings.paymentApiKey || null,
            adminPassword: settings.adminPassword || null,
            superAdminId: settings.superAdminId || null
          }).where(eq(telegramSettings.id, existingSettings.id)).returning();
          return updatedSettings;
        } else {
          const [newSettings] = await db.insert(telegramSettings).values({
            botToken: settings.botToken || null,
            webhookUrl: settings.webhookUrl || null,
            paymentProvider: settings.paymentProvider || "yookassa",
            paymentApiKey: settings.paymentApiKey || null,
            adminPassword: settings.adminPassword || null,
            superAdminId: settings.superAdminId || null
          }).returning();
          return newSettings;
        }
      }
      async updateTelegramSettings(updates) {
        const existingSettings = await this.getTelegramSettings();
        if (!existingSettings) return null;
        const [updatedSettings] = await db.update(telegramSettings).set(updates).where(eq(telegramSettings.id, existingSettings.id)).returning();
        return updatedSettings || null;
      }
      // Методы для работы с подписками
      async getSubscription(id) {
        const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
        return subscription;
      }
      async getActiveSubscriptionByUserId(userId) {
        const now = /* @__PURE__ */ new Date();
        const activeSubscriptions = await db.select().from(subscriptions).where(
          and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.isActive, true)
          )
        ).orderBy(desc(subscriptions.startedAt));
        const permanentSubscription = activeSubscriptions.find((sub) => !sub.expiresAt);
        if (permanentSubscription) {
          return permanentSubscription;
        }
        const validSubscription = activeSubscriptions.find(
          (sub) => sub.expiresAt && sub.expiresAt >= now
        );
        return validSubscription;
      }
      async createSubscription(subscription) {
        const [newSubscription] = await db.insert(subscriptions).values({
          userId: subscription.userId,
          type: subscription.type,
          expiresAt: subscription.expiresAt || null,
          paymentId: subscription.paymentId || null,
          amount: subscription.amount || null
        }).returning({ id: subscriptions.id });
        return newSubscription.id;
      }
      async updateSubscription(id, updates) {
        const [subscription] = await db.update(subscriptions).set(updates).where(eq(subscriptions.id, id)).returning();
        return subscription;
      }
      async getSubscriptionsByUserId(userId) {
        return await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.startedAt));
      }
      // Методы для работы с платежами
      async getPayment(id) {
        const [payment] = await db.select().from(payments).where(eq(payments.id, id));
        return payment;
      }
      async getPaymentByExternalId(externalId) {
        if (!externalId) return void 0;
        const [payment] = await db.select().from(payments).where(eq(payments.externalId, externalId));
        return payment;
      }
      async createPayment(payment) {
        const [newPayment] = await db.insert(payments).values({
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
        }).returning();
        return newPayment;
      }
      async updatePayment(id, updates) {
        const [payment] = await db.update(payments).set(updates).where(eq(payments.id, id)).returning();
        return payment;
      }
      async getPaymentsByUserId(userId) {
        return await db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt));
      }
      async getAllPayments() {
        return await db.select().from(payments).orderBy(desc(payments.createdAt));
      }
      // Методы для работы с историей баланса
      async getBalanceHistory(id) {
        const [history] = await db.select().from(balanceHistory).where(eq(balanceHistory.id, id));
        return history;
      }
      async createBalanceHistory(history) {
        const [newHistory] = await db.insert(balanceHistory).values({
          userId: history.userId,
          amount: history.amount,
          type: history.type,
          description: history.description || null,
          adminId: history.adminId || null
        }).returning();
        return newHistory;
      }
      async getBalanceHistoryByUserId(userId) {
        return await db.select().from(balanceHistory).where(eq(balanceHistory.userId, userId)).orderBy(desc(balanceHistory.createdAt));
      }
    };
    storage = new DatabaseStorage();
  }
});

// server/telegram.ts
var telegram_exports = {};
__export(telegram_exports, {
  TelegramService: () => TelegramService,
  telegramService: () => telegramService
});
import TelegramBot from "node-telegram-bot-api";
import { scrypt as scrypt2, randomBytes as randomBytes2, timingSafeEqual as timingSafeEqual2 } from "crypto";
import { promisify as promisify2 } from "util";
import { eq as eq2, desc as desc2, gte as gte2 } from "drizzle-orm";
import { sql as sql2 } from "drizzle-orm/sql";
var scryptAsync2, SUBSCRIPTION_PRICES, SUBSCRIPTION_DURATIONS, TelegramService, telegramService;
var init_telegram = __esm({
  "server/telegram.ts"() {
    "use strict";
    init_storage();
    init_schema();
    init_db();
    scryptAsync2 = promisify2(scrypt2);
    SUBSCRIPTION_PRICES = {
      free: 0,
      pro: {
        month: 79900,
        // 799 рублей в месяц
        year: 799900
        // 7999 рублей в год (экономия 15%)
      }
    };
    SUBSCRIPTION_DURATIONS = {
      month: 30 * 24 * 60 * 60 * 1e3,
      // 30 дней в миллисекундах
      year: 365 * 24 * 60 * 60 * 1e3
      // 365 дней в миллисекундах
    };
    TelegramService = class _TelegramService {
      // Приватный конструктор для Singleton
      constructor() {
        this.bot = null;
        this.settings = null;
        this.isInitialized = false;
        // Хранение состояний пользователей для интерактивных меню
        this.userStates = /* @__PURE__ */ new Map();
      }
      // Метод для получения экземпляра сервиса (Singleton)
      static async getInstance() {
        if (!_TelegramService.instance) {
          _TelegramService.instance = new _TelegramService();
          await _TelegramService.instance.initialize();
        }
        return _TelegramService.instance;
      }
      // Инициализация бота с токеном из базы данных
      async initialize() {
        try {
          this.settings = await storage.getTelegramSettings();
          if (!this.settings || !this.settings.botToken) {
            console.error("Telegram bot token not found in database");
            return false;
          }
          this.bot = new TelegramBot(this.settings.botToken, { polling: true });
          this.setupMessageHandlers();
          this.isInitialized = true;
          return true;
        } catch (error) {
          console.error("Failed to initialize Telegram bot:", error);
          return false;
        }
      }
      // Инициализация бота с новым токеном
      async init(botToken) {
        try {
          if (!botToken) {
            console.error("No Telegram bot token provided");
            return false;
          }
          let settings = await storage.getTelegramSettings();
          if (settings) {
            settings = await storage.updateTelegramSettings({
              botToken,
              isConnected: true,
              connectedAt: /* @__PURE__ */ new Date()
            });
          } else {
            settings = await storage.saveTelegramSettings({
              botToken,
              isConnected: true,
              connectedAt: /* @__PURE__ */ new Date()
            });
          }
          this.settings = settings;
          if (this.bot) {
            try {
              this.bot.stopPolling();
            } catch (e) {
              console.log("Error stopping existing bot", e);
            }
          }
          this.bot = new TelegramBot(botToken, { polling: true });
          this.setupMessageHandlers();
          this.isInitialized = true;
          console.log("Telegram bot initialized successfully with new token");
          return true;
        } catch (error) {
          console.error("Failed to initialize Telegram bot with new token:", error);
          return false;
        }
      }
      // Получение состояния пользователя с инициализацией при необходимости
      getUserState(chatId) {
        if (!this.userStates.has(chatId)) {
          this.userStates.set(chatId, {});
        }
        return this.userStates.get(chatId);
      }
      // Создание инлайн-кнопки с правильным форматированием данных обратного вызова
      createButton(text2, namespace, action, param = "") {
        return {
          text: text2,
          callback_data: `${namespace}:${action}${param ? `:${param}` : ""}`
        };
      }
      // Создание клавиатуры главного меню
      async createMainMenuKeyboard(user) {
        const keyboard = [
          [
            this.createButton("\u{1F5D3} \u041C\u043E\u0438 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438", "menu" /* MENU */, "confs" /* CONFERENCES */),
            this.createButton("\u{1F464} \u041C\u043E\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C", "menu" /* MENU */, "profile" /* PROFILE */)
          ],
          [
            this.createButton("\u2795 \u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044E", "create" /* CREATE */, "start"),
            this.createButton("\u{1F50D} \u041F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0442\u044C\u0441\u044F", "join" /* JOIN */, "start")
          ],
          [
            this.createButton("\u{1F4B3} \u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0430", "menu" /* MENU */, "subs" /* SUBSCRIPTION */)
          ]
        ];
        if (user.role === "admin" || user.role === "superadmin") {
          keyboard.push([
            this.createButton("\u2699\uFE0F \u0410\u0434\u043C\u0438\u043D \u043F\u0430\u043D\u0435\u043B\u044C", "menu" /* MENU */, "admin" /* ADMIN */)
          ]);
        }
        return keyboard;
      }
      // Отправка основного меню пользователю
      async sendMainMenu(chatId, user) {
        if (!this.bot) return;
        const state = this.getUserState(chatId);
        const subIcon = user.subscriptionType === "pro" ? "\u{1F31F}" : "\u{1F319}";
        const subName = user.subscriptionType === "pro" ? "Pro" : "Free";
        const welcomeMessage = `
\u{1F680} <b>Ikarus</b> - \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430 \u0432\u0438\u0434\u0435\u043E\u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439
    
\u{1F44B} \u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435, <b>${user.name || user.username}</b>!
${subIcon} \u0412\u0430\u0448\u0430 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430: <b>${subName}</b>${user.subscriptionExpiresAt ? ` (\u0434\u043E ${user.subscriptionExpiresAt.toLocaleDateString()})` : ""}

\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435:
`;
        const keyboard = await this.createMainMenuKeyboard(user);
        try {
          if (state.lastMenuMessageId) {
            try {
              await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
            } catch (e) {
              console.log("Could not delete previous menu message", e);
            }
          }
          const message = await this.bot.sendMessage(chatId, welcomeMessage, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
          state.lastMenuMessageId = message.message_id;
          state.activeMenu = "main" /* MAIN */;
        } catch (error) {
          console.error("Error sending main menu:", error);
        }
      }
      // Настройка обработчиков сообщений
      setupMessageHandlers() {
        if (!this.bot) return;
        this.bot.on("callback_query", async (query) => {
          if (!query.message || !query.data || !query.from) return;
          const chatId = query.message.chat.id;
          const telegramId = query.from.id.toString();
          const [namespace, action, param] = query.data.split(":");
          try {
            if (namespace === "admin") {
              const adminUser = await storage.getUserByTelegramId(telegramId);
              if (!adminUser || adminUser.role !== "admin" && adminUser.role !== "superadmin") {
                await this.bot?.answerCallbackQuery(query.id, {
                  text: "\u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u043F\u0440\u0430\u0432 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430",
                  show_alert: true
                });
                return;
              }
              if (action === "back") {
                await this.showAdminPanel(chatId, adminUser);
              } else {
                await this.handleAdminCallbacks(query.data, query);
              }
              await this.bot?.answerCallbackQuery(query.id);
              return;
            }
            if (namespace === "auth") {
              const state = this.getUserState(chatId);
              switch (action) {
                case "login":
                  if (param === "start") {
                    await this.sendUsernamePrompt(chatId);
                  }
                  break;
                case "help":
                  await this.sendAuthHelp(chatId);
                  break;
                case "back":
                  await this.sendRegistrationInstructions(chatId);
                  break;
                case "cancel":
                  state.authState = void 0;
                  await this.sendRegistrationInstructions(chatId);
                  break;
              }
              await this.bot?.answerCallbackQuery(query.id);
              return;
            }
            const user = await storage.getUserByTelegramId(telegramId);
            if (!user) {
              await this.bot?.sendMessage(
                chatId,
                "\u26A0\uFE0F \u0412\u0430\u0448 Telegram \u043D\u0435 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D \u043A \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0443. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0438 \u0434\u043B\u044F \u0432\u0445\u043E\u0434\u0430."
              );
              await this.sendRegistrationInstructions(chatId);
              return;
            }
            if (namespace === "menu" /* MENU */) {
              switch (action) {
                case "main" /* MAIN */:
                  await this.sendMainMenu(chatId, user);
                  break;
                case "confs" /* CONFERENCES */:
                  await this.sendConferencesMenu(chatId, user);
                  break;
                case "profile" /* PROFILE */:
                  await this.sendProfileMenu(chatId, user);
                  break;
                case "subs" /* SUBSCRIPTION */:
                  await this.sendSubscriptionMenu(chatId, user);
                  break;
                case "admin" /* ADMIN */:
                  if (user.role === "admin" || user.role === "superadmin") {
                    await this.showAdminPanel(chatId, user);
                  } else {
                    await this.bot.sendMessage(chatId, "\u26D4\uFE0F \u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u043F\u0440\u0430\u0432 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430");
                  }
                  break;
              }
            } else if (namespace === "create" /* CREATE */) {
              if (action === "start") {
                const state = this.getUserState(chatId);
                if (state.lastMenuMessageId) {
                  try {
                    await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
                  } catch (e) {
                    console.log("Could not delete previous menu message", e);
                  }
                }
                state.createConferenceState = {
                  stage: "name",
                  timestamp: Date.now()
                };
                const message = await this.bot.sendMessage(
                  chatId,
                  "\u270F\uFE0F \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0434\u043B\u044F \u043D\u043E\u0432\u043E\u0439 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438 (\u043D\u0435 \u043C\u0435\u043D\u0435\u0435 3 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432):",
                  {
                    reply_markup: {
                      inline_keyboard: [[
                        this.createButton("\xAB \u041E\u0442\u043C\u0435\u043D\u0430", "menu" /* MENU */, "main" /* MAIN */)
                      ]]
                    }
                  }
                );
                state.lastMenuMessageId = message.message_id;
              }
            } else if (namespace === "join" /* JOIN */) {
              if (action === "start") {
                const state = this.getUserState(chatId);
                if (state.lastMenuMessageId) {
                  try {
                    await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
                  } catch (e) {
                    console.log("Could not delete previous menu message", e);
                  }
                }
                state.joinConferenceState = {
                  stage: "id",
                  timestamp: Date.now()
                };
                const message = await this.bot.sendMessage(
                  chatId,
                  "\u{1F194} \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0432\u0432\u0435\u0434\u0438\u0442\u0435 ID \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438, \u043A \u043A\u043E\u0442\u043E\u0440\u043E\u0439 \u0445\u043E\u0442\u0438\u0442\u0435 \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0442\u044C\u0441\u044F:",
                  {
                    reply_markup: {
                      inline_keyboard: [[
                        this.createButton("\xAB \u041E\u0442\u043C\u0435\u043D\u0430", "menu" /* MENU */, "main" /* MAIN */)
                      ]]
                    }
                  }
                );
                state.lastMenuMessageId = message.message_id;
              }
            } else if (namespace === "sub" /* SUB */) {
              if (action === "month") {
                await this.subscribeUser(chatId, telegramId, "pro-month");
                await this.sendProfileMenu(chatId, await storage.getUserByTelegramId(telegramId));
              } else if (action === "year") {
                await this.subscribeUser(chatId, telegramId, "pro-year");
                await this.sendProfileMenu(chatId, await storage.getUserByTelegramId(telegramId));
              } else if (action === "topup") {
                await this.bot.sendMessage(
                  chatId,
                  "\u{1F4B3} \u0414\u043B\u044F \u043F\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F \u0431\u0430\u043B\u0430\u043D\u0441\u0430 \u043F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u043D\u0430 \u043D\u0430\u0448 \u0441\u0430\u0439\u0442 https://ikarus.app/payments \u0438\u043B\u0438 \u0441\u0432\u044F\u0436\u0438\u0442\u0435\u0441\u044C \u0441 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u043E\u043C."
                );
              }
            }
            await this.bot.answerCallbackQuery(query.id);
          } catch (error) {
            console.error("Error handling callback query:", error);
            await this.bot.sendMessage(
              chatId,
              "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0435 \u0437\u0430\u043F\u0440\u043E\u0441\u0430. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435."
            );
          }
        });
        this.bot.onText(/\/start/, async (msg) => {
          const chatId = msg.chat.id;
          const telegramId = msg.from?.id.toString();
          if (!telegramId) return;
          const user = await storage.getUserByTelegramId(telegramId);
          if (user) {
            await this.sendWelcomeBackMessage(chatId, user);
          } else {
            await this.sendRegistrationInstructions(chatId);
          }
        });
        this.bot.onText(/\/help/, async (msg) => {
          const chatId = msg.chat.id;
          await this.sendHelpMessage(chatId);
        });
        this.bot.onText(/\/conferences/, async (msg) => {
          const chatId = msg.chat.id;
          const telegramId = msg.from?.id.toString();
          if (!telegramId) return;
          await this.sendUserConferences(chatId, telegramId);
        });
        this.bot.onText(/\/join (.+)/, async (msg, match) => {
          const chatId = msg.chat.id;
          const telegramId = msg.from?.id.toString();
          if (!telegramId || !match || !match[1]) return;
          const conferenceId = match[1].trim();
          await this.joinConference(chatId, telegramId, conferenceId);
        });
        this.bot.onText(/\/create (.+)/, async (msg, match) => {
          const chatId = msg.chat.id;
          const telegramId = msg.from?.id.toString();
          if (!telegramId || !match || !match[1]) return;
          const conferenceName = match[1].trim();
          await this.createConference(chatId, telegramId, conferenceName);
        });
        this.bot.onText(/\/register (.+)/, async (msg, match) => {
          const chatId = msg.chat.id;
          const telegramId = msg.from?.id.toString();
          if (!telegramId || !match || !match[1]) return;
          const credentials = match[1].split(" ");
          if (credentials.length < 2) {
            await this.bot?.sendMessage(
              chatId,
              "\u26A0\uFE0F \u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u043A\u043E\u043C\u0430\u043D\u0434\u044B. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435: /register username password"
            );
            return;
          }
          const username = credentials[0];
          const password = credentials.slice(1).join(" ");
          await this.registerUser(chatId, telegramId, username, password);
        });
        this.bot.onText(/\/status/, async (msg) => {
          const chatId = msg.chat.id;
          const telegramId = msg.from?.id.toString();
          if (!telegramId) return;
          await this.sendUserStatus(chatId, telegramId);
        });
        this.bot.onText(/\/subscribe (.+)/, async (msg, match) => {
          const chatId = msg.chat.id;
          const telegramId = msg.from?.id.toString();
          if (!telegramId || !match || !match[1]) return;
          const plan = match[1].toLowerCase();
          if (plan !== "pro-month" && plan !== "pro-year") {
            await this.bot?.sendMessage(
              chatId,
              "\u26A0\uFE0F \u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043F\u043B\u0430\u043D \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u043F\u043B\u0430\u043D\u044B: pro-month, pro-year"
            );
            return;
          }
          await this.subscribeUser(chatId, telegramId, plan);
        });
        this.bot.onText(/\/admin (.+)/, async (msg, match) => {
          const chatId = msg.chat.id;
          const telegramId = msg.from?.id.toString();
          if (!telegramId || !match || !match[1]) return;
          const password = match[1];
          await this.handleAdminAuth(chatId, telegramId, password);
        });
        this.bot.onText(/\/user (.+)/, async (msg, match) => {
          const chatId = msg.chat.id;
          const telegramId = msg.from?.id.toString();
          if (!telegramId || !match || !match[1]) return;
          const user = await storage.getUserByTelegramId(telegramId);
          if (!user || user.role !== "admin" && user.role !== "superadmin") {
            await this.bot?.sendMessage(chatId, "\u26D4\uFE0F \u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u043F\u0440\u0430\u0432 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430");
            return;
          }
          const args = match[1].split(" ");
          const command = args[0].toLowerCase();
          switch (command) {
            case "list":
              await this.listUsers(chatId);
              break;
            case "info":
              if (args.length < 2) {
                await this.bot?.sendMessage(chatId, "\u26A0\uFE0F \u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0438\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F: /user info username");
                return;
              }
              await this.getUserInfo(chatId, args[1]);
              break;
            case "ban":
              if (args.length < 2) {
                await this.bot?.sendMessage(chatId, "\u26A0\uFE0F \u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0438\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F: /user ban username \u043F\u0440\u0438\u0447\u0438\u043D\u0430");
                return;
              }
              const reason = args.length > 2 ? args.slice(2).join(" ") : "\u041D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0435 \u043F\u0440\u0430\u0432\u0438\u043B";
              await this.banUser(chatId, args[1], reason);
              break;
            case "unban":
              if (args.length < 2) {
                await this.bot?.sendMessage(chatId, "\u26A0\uFE0F \u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0438\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F: /user unban username");
                return;
              }
              await this.unbanUser(chatId, args[1]);
              break;
            case "upgrade":
              if (args.length < 3) {
                await this.bot?.sendMessage(chatId, "\u26A0\uFE0F \u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0438\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0438 \u0442\u0438\u043F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438: /user upgrade username pro");
                return;
              }
              await this.upgradeUserSubscription(chatId, args[1], args[2]);
              break;
            default:
              await this.bot?.sendMessage(
                chatId,
                "\u26A0\uFE0F \u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043A\u043E\u043C\u0430\u043D\u0434\u0430. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B:\n/user list - \u0441\u043F\u0438\u0441\u043E\u043A \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439\n/user info username - \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\n/user ban username \u043F\u0440\u0438\u0447\u0438\u043D\u0430 - \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F\n/user unban username - \u0440\u0430\u0437\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F\n/user upgrade username \u0442\u0438\u043F - \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0442\u0438\u043F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F"
              );
          }
        });
        this.bot.on("message", async (msg) => {
          if (!msg.text || msg.text.startsWith("/")) return;
          const chatId = msg.chat.id;
          const telegramId = msg.from?.id.toString();
          const messageText = msg.text;
          if (!telegramId) return;
          try {
            const state = this.getUserState(chatId);
            if (state.authState) {
              if (state.authState.stage === "username") {
                const username = messageText.trim();
                if (username.length < 3) {
                  const errorMsg = await this.bot?.sendMessage(
                    chatId,
                    "\u26A0\uFE0F \u0418\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0434\u043E\u043B\u0436\u043D\u043E \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043D\u0435 \u043C\u0435\u043D\u0435\u0435 3 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0435 \u0440\u0430\u0437:",
                    {
                      reply_markup: {
                        inline_keyboard: [[
                          { text: "\xAB \u041E\u0442\u043C\u0435\u043D\u0430", callback_data: "auth:cancel" }
                        ]]
                      }
                    }
                  );
                  if (errorMsg) {
                    state.lastMenuMessageId = errorMsg.message_id;
                  }
                  return;
                }
                const existingUser = await storage.getUserByUsername(username);
                if (!existingUser) {
                  const errorMsg = await this.bot?.sendMessage(
                    chatId,
                    "\u26A0\uFE0F \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0441 \u0442\u0430\u043A\u0438\u043C \u0438\u043C\u0435\u043D\u0435\u043C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u0432\u0432\u043E\u0434\u0430 \u0438\u043B\u0438 \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0443\u0439\u0442\u0435\u0441\u044C \u043D\u0430 \u0441\u0430\u0439\u0442\u0435.",
                    {
                      reply_markup: {
                        inline_keyboard: [[
                          { text: "\xAB \u041E\u0442\u043C\u0435\u043D\u0430", callback_data: "auth:cancel" }
                        ]]
                      }
                    }
                  );
                  if (errorMsg) {
                    state.lastMenuMessageId = errorMsg.message_id;
                  }
                  return;
                }
                await this.sendPasswordPrompt(chatId, username);
                return;
              } else if (state.authState.stage === "password") {
                const password = messageText;
                const username = state.authState.username;
                if (!username) {
                  await this.sendRegistrationInstructions(chatId);
                  return;
                }
                await this.registerUser(chatId, telegramId, username, password);
                state.authState = void 0;
                const user2 = await storage.getUserByTelegramId(telegramId);
                if (user2) {
                  await this.sendMainMenu(chatId, user2);
                }
                return;
              }
            }
            const user = await storage.getUserByTelegramId(telegramId);
            if (!user) {
              await this.sendRegistrationInstructions(chatId);
              return;
            }
            if (state.createConferenceState && state.createConferenceState.stage === "name") {
              if (state.lastMenuMessageId) {
                try {
                  await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
                } catch (e) {
                  console.log("Could not delete previous message", e);
                }
              }
              if (messageText.length < 3) {
                const errorMsg = await this.bot.sendMessage(
                  chatId,
                  "\u26A0\uFE0F \u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438 \u0434\u043E\u043B\u0436\u043D\u043E \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043D\u0435 \u043C\u0435\u043D\u0435\u0435 3 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0435 \u0440\u0430\u0437:",
                  {
                    reply_markup: {
                      inline_keyboard: [[
                        this.createButton("\xAB \u041E\u0442\u043C\u0435\u043D\u0430", "menu" /* MENU */, "main" /* MAIN */)
                      ]]
                    }
                  }
                );
                state.lastMenuMessageId = errorMsg.message_id;
                return;
              }
              await this.createConference(chatId, telegramId, messageText);
              state.createConferenceState = void 0;
              await this.sendConferencesMenu(chatId, user);
              return;
            }
            if (state.joinConferenceState && state.joinConferenceState.stage === "id") {
              if (state.lastMenuMessageId) {
                try {
                  await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
                } catch (e) {
                  console.log("Could not delete previous message", e);
                }
              }
              await this.joinConference(chatId, telegramId, messageText);
              state.joinConferenceState = void 0;
              setTimeout(async () => {
                await this.sendMainMenu(chatId, user);
              }, 2e3);
              return;
            }
            if (user.role === "admin" || user.role === "superadmin") {
              await this.sendMainMenu(chatId, user);
            } else {
              await this.sendMainMenu(chatId, user);
            }
          } catch (error) {
            console.error("Error handling message:", error);
            await this.bot.sendMessage(
              chatId,
              "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435."
            );
          }
        });
      }
      // Отправка приветственного сообщения
      async sendWelcomeBackMessage(chatId, user) {
        if (!this.bot) return;
        await this.sendMainMenu(chatId, user);
      }
      // Отправка меню конференций
      async sendConferencesMenu(chatId, user) {
        if (!this.bot) return;
        const state = this.getUserState(chatId);
        try {
          const conferences3 = await storage.getConferencesByUserId(user.id);
          const activeConferences = conferences3.filter((conf) => conf.active);
          const endedConferences = conferences3.filter((conf) => !conf.active).sort(
            (a, b) => (b.endedAt?.getTime() || 0) - (a.endedAt?.getTime() || 0)
          ).slice(0, 5);
          let message = `<b>\u{1F5D3} \u0412\u0430\u0448\u0438 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438</b>

`;
          if (activeConferences.length === 0 && endedConferences.length === 0) {
            message += '\u0423 \u0432\u0430\u0441 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439.\n\u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043D\u043E\u0432\u0443\u044E \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044E \u0441 \u043F\u043E\u043C\u043E\u0449\u044C\u044E \u043A\u043D\u043E\u043F\u043A\u0438 "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044E"';
          } else {
            if (activeConferences.length > 0) {
              message += `<b>\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0435 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438:</b>
`;
              activeConferences.forEach((conf, index) => {
                const startedAt = conf.startedAt || conf.createdAt;
                message += `${index + 1}. <b>${conf.name}</b>
`;
                message += `   ID: <code>${conf.id}</code>
`;
                message += `   \u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438: ${conf.currentParticipants || 0}/${conf.maxParticipants || 5}
`;
                message += `   \u041D\u0430\u0447\u0430\u043B\u043E: ${startedAt.toLocaleString()}

`;
              });
            }
            if (endedConferences.length > 0) {
              message += `<b>\u041D\u0435\u0434\u0430\u0432\u043D\u0438\u0435 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438:</b>
`;
              endedConferences.forEach((conf, index) => {
                const endedAt = conf.endedAt || /* @__PURE__ */ new Date();
                message += `${index + 1}. <b>${conf.name}</b>
`;
                message += `   ID: <code>${conf.id}</code>
`;
                message += `   \u041E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0435: ${endedAt.toLocaleString()}
`;
                if (conf.recordingUrl) {
                  message += `   \u0417\u0430\u043F\u0438\u0441\u044C: ${conf.recordingUrl}
`;
                }
                message += `
`;
              });
            }
          }
          const keyboard = [
            [
              this.createButton("\u2795 \u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044E", "create" /* CREATE */, "start")
            ],
            [
              this.createButton("\u{1F50D} \u041F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0442\u044C\u0441\u044F \u043A \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438", "join" /* JOIN */, "start")
            ]
          ];
          if (activeConferences.length > 0) {
            keyboard.push([
              this.createButton("\u{1F4CB} \u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0432\u0441\u0435 \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0435", "conf" /* CONF */, "listActive")
            ]);
          }
          keyboard.push([
            this.createButton("\xAB \u041D\u0430\u0437\u0430\u0434 \u0432 \u043C\u0435\u043D\u044E", "menu" /* MENU */, "main" /* MAIN */)
          ]);
          if (state.lastMenuMessageId) {
            try {
              await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
            } catch (e) {
              console.log("Could not delete previous menu message", e);
            }
          }
          const newMessage = await this.bot.sendMessage(chatId, message, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
          state.lastMenuMessageId = newMessage.message_id;
          state.activeMenu = "confs" /* CONFERENCES */;
        } catch (error) {
          console.error("Error sending conferences menu:", error);
          await this.bot.sendMessage(
            chatId,
            "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u0441\u043F\u0438\u0441\u043A\u0430 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435."
          );
        }
      }
      // Отправка меню профиля
      async sendProfileMenu(chatId, user) {
        if (!this.bot) return;
        const state = this.getUserState(chatId);
        try {
          let message = `<b>\u{1F464} \u0412\u0430\u0448 \u043F\u0440\u043E\u0444\u0438\u043B\u044C</b>

`;
          message += `<b>\u0418\u043C\u044F:</b> ${user.name || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E"}
`;
          message += `<b>\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C:</b> ${user.username}
`;
          message += `<b>Email:</b> ${user.email || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D"}
`;
          message += `<b>\u0420\u043E\u043B\u044C:</b> ${this.translateRole(user.role)}

`;
          const subIcon = user.subscriptionType === "pro" ? "\u{1F31F}" : "\u{1F319}";
          const subName = user.subscriptionType === "pro" ? "Pro" : "Free";
          message += `<b>${subIcon} \u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0430:</b> ${subName}
`;
          if (user.subscriptionExpiresAt) {
            const daysLeft = Math.ceil((user.subscriptionExpiresAt.getTime() - Date.now()) / (1e3 * 60 * 60 * 24));
            message += `<b>\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u0434\u043E:</b> ${user.subscriptionExpiresAt.toLocaleDateString()}
`;
            message += `<b>\u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u0434\u043D\u0435\u0439:</b> ${daysLeft > 0 ? daysLeft : "\u0418\u0441\u0442\u0435\u043A\u043B\u0430"}

`;
          } else if (user.subscriptionType === "pro") {
            message += `<b>\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u0434\u043E:</b> \u0411\u0435\u0441\u0441\u0440\u043E\u0447\u043D\u043E

`;
          } else {
            message += `
`;
          }
          const currentBalance = user.balance || 0;
          message += `<b>\u{1F4B0} \u0411\u0430\u043B\u0430\u043D\u0441:</b> ${(currentBalance / 100).toFixed(2)} \u20BD

`;
          message += `<b>\u{1F4C6} \u0414\u0430\u0442\u0430 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438:</b> ${user.createdAt.toLocaleDateString()}
`;
          if (user.lastLoginAt) {
            message += `<b>\u{1F552} \u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u0432\u0445\u043E\u0434:</b> ${user.lastLoginAt.toLocaleString()}
`;
          }
          const keyboard = [];
          if (user.subscriptionType === "free") {
            keyboard.push([
              this.createButton("\u2B50\uFE0F \u041E\u0444\u043E\u0440\u043C\u0438\u0442\u044C Pro \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443", "menu" /* MENU */, "subs" /* SUBSCRIPTION */)
            ]);
          }
          keyboard.push([
            this.createButton("\xAB \u041D\u0430\u0437\u0430\u0434 \u0432 \u043C\u0435\u043D\u044E", "menu" /* MENU */, "main" /* MAIN */)
          ]);
          if (state.lastMenuMessageId) {
            try {
              await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
            } catch (e) {
              console.log("Could not delete previous menu message", e);
            }
          }
          const newMessage = await this.bot.sendMessage(chatId, message, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
          state.lastMenuMessageId = newMessage.message_id;
          state.activeMenu = "profile" /* PROFILE */;
        } catch (error) {
          console.error("Error sending profile menu:", error);
          await this.bot.sendMessage(
            chatId,
            "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u043F\u0440\u043E\u0444\u0438\u043B\u044F. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435."
          );
        }
      }
      // Отправка меню подписки
      async sendSubscriptionMenu(chatId, user) {
        if (!this.bot) return;
        const state = this.getUserState(chatId);
        try {
          let message = `<b>\u{1F4B3} \u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u043E\u0439</b>

`;
          const subIcon = user.subscriptionType === "pro" ? "\u{1F31F}" : "\u{1F319}";
          const subName = user.subscriptionType === "pro" ? "Pro" : "Free";
          message += `<b>\u0422\u0435\u043A\u0443\u0449\u0430\u044F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430:</b> ${subIcon} ${subName}
`;
          if (user.subscriptionExpiresAt) {
            const daysLeft = Math.ceil((user.subscriptionExpiresAt.getTime() - Date.now()) / (1e3 * 60 * 60 * 24));
            message += `<b>\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u0434\u043E:</b> ${user.subscriptionExpiresAt.toLocaleDateString()}
`;
            message += `<b>\u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u0434\u043D\u0435\u0439:</b> ${daysLeft > 0 ? daysLeft : "\u0418\u0441\u0442\u0435\u043A\u043B\u0430"}

`;
          } else if (user.subscriptionType === "pro") {
            message += `<b>\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u0434\u043E:</b> \u0411\u0435\u0441\u0441\u0440\u043E\u0447\u043D\u043E

`;
          } else {
            message += `
`;
          }
          message += `<b>\u{1F4CA} \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u043F\u043B\u0430\u043D\u044B:</b>

`;
          message += `<b>\u{1F319} Free</b>
`;
          message += `\u2022 \u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439 \u0434\u043E 15 \u043C\u0438\u043D\u0443\u0442
`;
          message += `\u2022 \u0414\u043E 5 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432 \u0432 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438
`;
          message += `\u2022 \u0411\u0430\u0437\u043E\u0432\u044B\u0435 \u0444\u0443\u043D\u043A\u0446\u0438\u0438 \u0432\u0438\u0434\u0435\u043E\u0441\u0432\u044F\u0437\u0438

`;
          message += `<b>\u{1F31F} Pro</b>
`;
          message += `\u2022 \u041D\u0435\u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439
`;
          message += `\u2022 \u0414\u043E 50 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432 \u0432 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438
`;
          message += `\u2022 \u0414\u0435\u043C\u043E\u043D\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u044D\u043A\u0440\u0430\u043D\u0430
`;
          message += `\u2022 \u0417\u0430\u043F\u0438\u0441\u044C \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439
`;
          message += `\u2022 \u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u044B

`;
          message += `<b>\u{1F4B0} \u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C Pro:</b>
`;
          message += `\u2022 \u041C\u0435\u0441\u044F\u0447\u043D\u0430\u044F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430: ${(SUBSCRIPTION_PRICES.pro.month / 100).toFixed(2)} \u20BD/\u043C\u0435\u0441\u044F\u0446
`;
          message += `\u2022 \u0413\u043E\u0434\u043E\u0432\u0430\u044F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430: ${(SUBSCRIPTION_PRICES.pro.year / 100).toFixed(2)} \u20BD/\u0433\u043E\u0434 (\u044D\u043A\u043E\u043D\u043E\u043C\u0438\u044F 15%)

`;
          const currentBalance = user.balance || 0;
          message += `<b>\u{1F4B0} \u0412\u0430\u0448 \u0431\u0430\u043B\u0430\u043D\u0441:</b> ${(currentBalance / 100).toFixed(2)} \u20BD

`;
          const keyboard = [];
          if (user.subscriptionType === "free" || user.subscriptionExpiresAt && user.subscriptionExpiresAt < /* @__PURE__ */ new Date()) {
            if (currentBalance >= SUBSCRIPTION_PRICES.pro.month) {
              keyboard.push([
                this.createButton("\u041E\u0444\u043E\u0440\u043C\u0438\u0442\u044C Pro \u043D\u0430 \u043C\u0435\u0441\u044F\u0446", "sub" /* SUB */, "month")
              ]);
            }
            if (currentBalance >= SUBSCRIPTION_PRICES.pro.year) {
              keyboard.push([
                this.createButton("\u041E\u0444\u043E\u0440\u043C\u0438\u0442\u044C Pro \u043D\u0430 \u0433\u043E\u0434 (\u0432\u044B\u0433\u043E\u0434\u043D\u0435\u0435!)", "sub" /* SUB */, "year")
              ]);
            }
            if (currentBalance < SUBSCRIPTION_PRICES.pro.month) {
              keyboard.push([
                this.createButton("\u041F\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u0431\u0430\u043B\u0430\u043D\u0441", "sub" /* SUB */, "topup")
              ]);
            }
          } else if (user.subscriptionType === "pro") {
            if (user.subscriptionExpiresAt) {
              keyboard.push([
                this.createButton("\u041F\u0440\u043E\u0434\u043B\u0438\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443", "sub" /* SUB */, "extend")
              ]);
            }
          }
          keyboard.push([
            this.createButton("\xAB \u041D\u0430\u0437\u0430\u0434 \u0432 \u043C\u0435\u043D\u044E", "menu" /* MENU */, "main" /* MAIN */)
          ]);
          if (state.lastMenuMessageId) {
            try {
              await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
            } catch (e) {
              console.log("Could not delete previous menu message", e);
            }
          }
          const newMessage = await this.bot.sendMessage(chatId, message, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
          state.lastMenuMessageId = newMessage.message_id;
          state.activeMenu = "subs" /* SUBSCRIPTION */;
        } catch (error) {
          console.error("Error sending subscription menu:", error);
          await this.bot.sendMessage(
            chatId,
            "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0438 \u043E \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0435. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435."
          );
        }
      }
      // Отправка меню регистрации и входа
      async sendRegistrationInstructions(chatId) {
        if (!this.bot) return;
        const state = this.getUserState(chatId);
        if (state.lastMenuMessageId) {
          try {
            await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
          } catch (e) {
            console.log("Could not delete previous menu message", e);
          }
        }
        const welcomeMessage = `
\u{1F680} <b>\u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C \u0432 Ikarus!</b>

Ikarus - \u044D\u0442\u043E \u0441\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u0430\u044F \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430 \u0434\u043B\u044F \u0432\u0438\u0434\u0435\u043E\u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439 \u0441 \u043C\u043D\u043E\u0436\u0435\u0441\u0442\u0432\u043E\u043C \u043F\u043E\u043B\u0435\u0437\u043D\u044B\u0445 \u0444\u0443\u043D\u043A\u0446\u0438\u0439.

\u0414\u043B\u044F \u043D\u0430\u0447\u0430\u043B\u0430 \u0440\u0430\u0431\u043E\u0442\u044B \u0432\u0430\u043C \u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E \u0432\u043E\u0439\u0442\u0438 \u0432 \u0441\u0432\u043E\u0439 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u0438\u043B\u0438 \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F.
    `;
        const keyboard = [
          [
            { text: "\u{1F511} \u0412\u043E\u0439\u0442\u0438 \u0441 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u043C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u043E\u043C", callback_data: "auth:login:start" }
          ],
          [
            { text: "\u{1F4DD} \u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F \u043D\u0430 \u0441\u0430\u0439\u0442\u0435", url: "https://ikarus.app/register" }
          ],
          [
            { text: "\u2753 \u041F\u043E\u043C\u043E\u0449\u044C", callback_data: "auth:help" }
          ]
        ];
        const message = await this.bot.sendMessage(chatId, welcomeMessage, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
        state.lastMenuMessageId = message.message_id;
      }
      // Отправка меню для ввода логина
      async sendUsernamePrompt(chatId) {
        if (!this.bot) return;
        const state = this.getUserState(chatId);
        if (state.lastMenuMessageId) {
          try {
            await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
          } catch (e) {
            console.log("Could not delete previous menu message", e);
          }
        }
        const message = await this.bot.sendMessage(
          chatId,
          "\u{1F464} <b>\u0412\u0445\u043E\u0434 \u0432 \u0430\u043A\u043A\u0430\u0443\u043D\u0442</b>\n\n\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u0432\u0430\u0448\u0435 \u0438\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F:",
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[
                { text: "\xAB \u041E\u0442\u043C\u0435\u043D\u0430", callback_data: "auth:cancel" }
              ]]
            }
          }
        );
        state.lastMenuMessageId = message.message_id;
        state.authState = {
          stage: "username",
          timestamp: Date.now()
        };
      }
      // Отправка меню для ввода пароля
      async sendPasswordPrompt(chatId, username) {
        if (!this.bot) return;
        const state = this.getUserState(chatId);
        if (state.lastMenuMessageId) {
          try {
            await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
          } catch (e) {
            console.log("Could not delete previous menu message", e);
          }
        }
        const message = await this.bot.sendMessage(
          chatId,
          `\u{1F464} <b>\u0412\u0445\u043E\u0434 \u0432 \u0430\u043A\u043A\u0430\u0443\u043D\u0442</b>

\u0418\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F: <b>${username}</b>

\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u0432\u0430\u0448 \u043F\u0430\u0440\u043E\u043B\u044C:`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[
                { text: "\xAB \u041E\u0442\u043C\u0435\u043D\u0430", callback_data: "auth:cancel" }
              ]]
            }
          }
        );
        state.lastMenuMessageId = message.message_id;
        state.authState = {
          stage: "password",
          username,
          timestamp: Date.now()
        };
      }
      // Отправка справки по авторизации
      async sendAuthHelp(chatId) {
        if (!this.bot) return;
        const state = this.getUserState(chatId);
        if (state.lastMenuMessageId) {
          try {
            await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
          } catch (e) {
            console.log("Could not delete previous menu message", e);
          }
        }
        const helpMessage = `
<b>\u2753 \u041F\u043E\u043C\u043E\u0449\u044C \u0441 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0435\u0439</b>

<b>\u041A\u0430\u043A \u0432\u043E\u0439\u0442\u0438 \u0432 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0439 \u0430\u043A\u043A\u0430\u0443\u043D\u0442:</b>
1. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0443 "\u0412\u043E\u0439\u0442\u0438 \u0441 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u043C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u043E\u043C"
2. \u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F (\u043B\u043E\u0433\u0438\u043D)
3. \u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043F\u0430\u0440\u043E\u043B\u044C

<b>\u041A\u0430\u043A \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F:</b>
1. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0443 "\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F \u043D\u0430 \u0441\u0430\u0439\u0442\u0435"
2. \u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0444\u043E\u0440\u043C\u0443 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438 \u043D\u0430 \u043D\u0430\u0448\u0435\u043C \u0441\u0430\u0439\u0442\u0435
3. \u0412\u0435\u0440\u043D\u0438\u0442\u0435\u0441\u044C \u0432 Telegram \u0431\u043E\u0442 \u0438 \u0432\u043E\u0439\u0434\u0438\u0442\u0435 \u0441 \u0441\u043E\u0437\u0434\u0430\u043D\u043D\u044B\u043C\u0438 \u0434\u0430\u043D\u043D\u044B\u043C\u0438

<b>\u041F\u0440\u043E\u0431\u043B\u0435\u043C\u044B \u0441 \u0432\u0445\u043E\u0434\u043E\u043C?</b>
\u2022 \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u0432\u0432\u043E\u0434\u0430 \u0438\u043C\u0435\u043D\u0438 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0438 \u043F\u0430\u0440\u043E\u043B\u044F
\u2022 \u0415\u0441\u043B\u0438 \u0432\u044B \u0437\u0430\u0431\u044B\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C, \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0435 \u0435\u0433\u043E \u043D\u0430 \u0441\u0430\u0439\u0442\u0435
\u2022 \u041F\u043E \u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u043C \u0432\u043E\u043F\u0440\u043E\u0441\u0430\u043C \u043E\u0431\u0440\u0430\u0449\u0430\u0439\u0442\u0435\u0441\u044C \u0432 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443
    `;
        const message = await this.bot.sendMessage(chatId, helpMessage, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[
              { text: "\xAB \u041D\u0430\u0437\u0430\u0434", callback_data: "auth:back" }
            ]]
          }
        });
        state.lastMenuMessageId = message.message_id;
      }
      // Отправка справочного сообщения
      async sendHelpMessage(chatId) {
        if (!this.bot) return;
        await this.bot.sendMessage(
          chatId,
          "\u{1F50D} \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B:\n\n/start - \u043D\u0430\u0447\u0430\u0442\u044C \u0432\u0437\u0430\u0438\u043C\u043E\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0441 \u0431\u043E\u0442\u043E\u043C\n/help - \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0441\u043F\u0440\u0430\u0432\u043A\u0443\n/register \u0438\u043C\u044F_\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u043F\u0430\u0440\u043E\u043B\u044C - \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u0442\u044C \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0439 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\n/status - \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0441\u0442\u0430\u0442\u0443\u0441 \u0432\u0430\u0448\u0435\u0439 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438\n/subscribe \u043F\u043B\u0430\u043D - \u043E\u0444\u043E\u0440\u043C\u0438\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443 (\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u043F\u043B\u0430\u043D\u044B: pro-month, pro-year)\n/conferences - \u0441\u043F\u0438\u0441\u043E\u043A \u0432\u0430\u0448\u0438\u0445 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439\n/create \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 - \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u043D\u043E\u0432\u0443\u044E \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044E\n/join id - \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0442\u044C\u0441\u044F \u043A \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438 \u043F\u043E ID\n\n\u{1F4A1} \u041F\u0440\u0435\u0438\u043C\u0443\u0449\u0435\u0441\u0442\u0432\u0430 Pro-\u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438:\n\u2705 \u041D\u0435\u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439 (\u0432\u043C\u0435\u0441\u0442\u043E 15 \u043C\u0438\u043D\u0443\u0442)\n\u2705 \u0414\u043E 100 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432 \u0432 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438 (\u0432\u043C\u0435\u0441\u0442\u043E 5)\n\u2705 \u0417\u0430\u043F\u0438\u0441\u044C \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439\n\u2705 \u0414\u0435\u043C\u043E\u043D\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u044D\u043A\u0440\u0430\u043D\u0430\n\u2705 \u0412\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u0430\u044F \u0434\u043E\u0441\u043A\u0430\n\u2705 \u041E\u043F\u0440\u043E\u0441\u044B \u0438 \u0433\u043E\u043B\u043E\u0441\u043E\u0432\u0430\u043D\u0438\u044F\n\n\u{1F4B0} \u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C:\nPro-month: 799 \u20BD/\u043C\u0435\u0441\u044F\u0446\nPro-year: 7999 \u20BD/\u0433\u043E\u0434 (\u044D\u043A\u043E\u043D\u043E\u043C\u0438\u044F 15%)"
        );
      }
      // Отправка справки для админов
      async sendAdminHelpMessage(chatId) {
        if (!this.bot) return;
        await this.bot.sendMessage(
          chatId,
          "\u{1F50D} *\u041A\u043E\u043C\u0430\u043D\u0434\u044B \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430:*\n\n/user list - \u0441\u043F\u0438\u0441\u043E\u043A \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439\n/user info username - \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\n/user ban username \u043F\u0440\u0438\u0447\u0438\u043D\u0430 - \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F\n/user unban username - \u0440\u0430\u0437\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F\n/user upgrade username \u0442\u0438\u043F - \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0442\u0438\u043F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F\n\n*\u0410\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u0438\u0432\u043D\u0430\u044F \u043F\u0430\u043D\u0435\u043B\u044C:*\n\u0414\u043B\u044F \u043F\u043E\u043B\u043D\u043E\u0433\u043E \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u0444\u0443\u043D\u043A\u0446\u0438\u044F\u043C \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430 \u043F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u043D\u0430 https://ikarus.app/admin\n\u0422\u0430\u043C \u0432\u044B \u043D\u0430\u0439\u0434\u0435\u0442\u0435 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u0443\u044E \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0443 \u0438 \u043F\u043E\u043B\u043D\u043E\u0435 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0441\u0438\u0441\u0442\u0435\u043C\u043E\u0439.\n\n\u0414\u043B\u044F \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F \u043E\u0431\u044B\u0447\u043D\u043E\u0439 \u0441\u043F\u0440\u0430\u0432\u043A\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 /help",
          { parse_mode: "Markdown" }
        );
      }
      // Регистрация пользователя
      async registerUser(chatId, telegramId, username, password) {
        if (!this.bot) return;
        try {
          const existingUser = await storage.getUserByUsername(username);
          if (!existingUser) {
            await this.bot.sendMessage(
              chatId,
              "\u26A0\uFE0F \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0441 \u0442\u0430\u043A\u0438\u043C \u0438\u043C\u0435\u043D\u0435\u043C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D. \u0423\u0431\u0435\u0434\u0438\u0442\u0435\u0441\u044C, \u0447\u0442\u043E \u0432\u044B \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E \u0432\u0432\u0435\u043B\u0438 \u0438\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F."
            );
            return;
          }
          const isPasswordValid = await this.comparePasswords(password, existingUser.password);
          if (!isPasswordValid) {
            await this.bot.sendMessage(
              chatId,
              "\u26A0\uFE0F \u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043F\u0430\u0440\u043E\u043B\u044C. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430."
            );
            return;
          }
          if (existingUser.telegramId && existingUser.telegramId !== telegramId) {
            await this.bot.sendMessage(
              chatId,
              "\u26A0\uFE0F \u042D\u0442\u043E\u0442 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u0443\u0436\u0435 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D \u043A \u0434\u0440\u0443\u0433\u043E\u043C\u0443 Telegram \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044E."
            );
            return;
          }
          await storage.updateUser(existingUser.id, {
            telegramId,
            lastLoginAt: /* @__PURE__ */ new Date()
          });
          await this.bot.sendMessage(
            chatId,
            `\u2705 \u0410\u043A\u043A\u0430\u0443\u043D\u0442 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D \u043A \u0432\u0430\u0448\u0435\u043C\u0443 Telegram!

\u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C, ${existingUser.name || existingUser.username}.

\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 /status \u0434\u043B\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0441\u0442\u0430\u0442\u0443\u0441\u0430 \u0432\u0430\u0448\u0435\u0439 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438.`
          );
        } catch (error) {
          console.error("Error registering user:", error);
          await this.bot.sendMessage(
            chatId,
            "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435 \u0438\u043B\u0438 \u043E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u0432 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443."
          );
        }
      }
      // Отправка статуса пользователя
      async sendUserStatus(chatId, telegramId) {
        if (!this.bot) return;
        try {
          const user = await storage.getUserByTelegramId(telegramId);
          if (!user) {
            await this.bot.sendMessage(
              chatId,
              "\u26A0\uFE0F \u0412\u0430\u0448 Telegram \u043D\u0435 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D \u043A \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0443. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 /register \u0434\u043B\u044F \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0438."
            );
            return;
          }
          const conferences3 = await storage.getConferencesByUserId(user.id);
          const activeConferences = conferences3.filter((conf) => conf.active);
          const currentBalance = user.balance || 0;
          let statusMessage = `\u{1F464} **\u041F\u0440\u043E\u0444\u0438\u043B\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F**

`;
          statusMessage += `\u0418\u043C\u044F: ${user.name || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E"}
`;
          statusMessage += `\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C: ${user.username}
`;
          statusMessage += `Email: ${user.email || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D"}
`;
          statusMessage += `\u0420\u043E\u043B\u044C: ${this.translateRole(user.role)}
`;
          statusMessage += `\u0411\u0430\u043B\u0430\u043D\u0441: ${(currentBalance / 100).toFixed(2)} \u20BD

`;
          statusMessage += `\u{1F4CA} **\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0430**

`;
          statusMessage += `\u0422\u0438\u043F: ${user.subscriptionType === "pro" ? "\u{1F31F} Pro" : "\u{1F319} Free"}
`;
          if (user.subscriptionExpiresAt) {
            const daysLeft = Math.ceil((user.subscriptionExpiresAt.getTime() - Date.now()) / (1e3 * 60 * 60 * 24));
            statusMessage += `\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u0434\u043E: ${user.subscriptionExpiresAt.toLocaleDateString()}
`;
            statusMessage += `\u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u0434\u043D\u0435\u0439: ${daysLeft > 0 ? daysLeft : "\u0418\u0441\u0442\u0435\u043A\u043B\u0430"}

`;
          } else if (user.subscriptionType === "pro") {
            statusMessage += `\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u0434\u043E: \u0411\u0435\u0441\u0441\u0440\u043E\u0447\u043D\u043E

`;
          } else {
            statusMessage += `
`;
          }
          statusMessage += `\u{1F5D3} **\u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438**

`;
          statusMessage += `\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439: ${activeConferences.length}
`;
          statusMessage += `\u0412\u0441\u0435\u0433\u043E \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439: ${conferences3.length}

`;
          if (user.subscriptionType === "free") {
            statusMessage += `\u2B50\uFE0F \u041E\u0444\u043E\u0440\u043C\u0438\u0442\u0435 Pro \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443, \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0434\u043E\u0441\u0442\u0443\u043F \u043A \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u044B\u043C \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u044F\u043C!
`;
            statusMessage += `\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 /subscribe pro-month \u0438\u043B\u0438 /subscribe pro-year`;
          }
          await this.bot.sendMessage(chatId, statusMessage, { parse_mode: "Markdown" });
        } catch (error) {
          console.error("Error sending user status:", error);
          await this.bot.sendMessage(
            chatId,
            "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u0441\u0442\u0430\u0442\u0443\u0441\u0430. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435."
          );
        }
      }
      // Подписка пользователя на платный план
      async subscribeUser(chatId, telegramId, plan) {
        if (!this.bot) return;
        try {
          const user = await storage.getUserByTelegramId(telegramId);
          if (!user) {
            await this.bot.sendMessage(
              chatId,
              "\u26A0\uFE0F \u0412\u0430\u0448 Telegram \u043D\u0435 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D \u043A \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0443. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 /register \u0434\u043B\u044F \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0438."
            );
            return;
          }
          if (user.isBanned) {
            await this.bot.sendMessage(
              chatId,
              `\u26D4\uFE0F \u0412\u0430\u0448 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D. \u041F\u0440\u0438\u0447\u0438\u043D\u0430: ${user.banReason || "\u041D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0435 \u043F\u0440\u0430\u0432\u0438\u043B \u0441\u0435\u0440\u0432\u0438\u0441\u0430"}`
            );
            return;
          }
          let amount;
          let duration;
          if (plan === "pro-month") {
            amount = SUBSCRIPTION_PRICES.pro.month;
            duration = SUBSCRIPTION_DURATIONS.month;
          } else if (plan === "pro-year") {
            amount = SUBSCRIPTION_PRICES.pro.year;
            duration = SUBSCRIPTION_DURATIONS.year;
          } else {
            await this.bot.sendMessage(
              chatId,
              "\u26A0\uFE0F \u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043F\u043B\u0430\u043D \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u043F\u043B\u0430\u043D\u044B: pro-month, pro-year"
            );
            return;
          }
          const currentBalance = user.balance || 0;
          if (currentBalance < amount) {
            const missingAmount = amount - currentBalance;
            await this.bot.sendMessage(
              chatId,
              `\u26A0\uFE0F \u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0441\u0440\u0435\u0434\u0441\u0442\u0432 \u043D\u0430 \u0431\u0430\u043B\u0430\u043D\u0441\u0435 \u0434\u043B\u044F \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u044F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438.

\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u0431\u0430\u043B\u0430\u043D\u0441: ${(currentBalance / 100).toFixed(2)} \u20BD
\u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438: ${(amount / 100).toFixed(2)} \u20BD
\u041D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442: ${(missingAmount / 100).toFixed(2)} \u20BD

\u0414\u043B\u044F \u043E\u043F\u043B\u0430\u0442\u044B \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043F\u043B\u0430\u0442\u0435\u0436\u043D\u0443\u044E \u0441\u0438\u0441\u0442\u0435\u043C\u0443 \u043D\u0430 \u043D\u0430\u0448\u0435\u043C \u0441\u0430\u0439\u0442\u0435.`
            );
            return;
          }
          const expiresAt = new Date(Date.now() + duration);
          const subscriptionId = await storage.createSubscription({
            userId: user.id,
            type: "pro",
            expiresAt,
            amount
          });
          await storage.updateUser(user.id, {
            subscriptionType: "pro",
            subscriptionExpiresAt: expiresAt,
            balance: currentBalance - amount
          });
          await storage.createPayment({
            userId: user.id,
            amount,
            status: "completed",
            paymentMethod: "balance",
            subscriptionId
          });
          await storage.createBalanceHistory({
            userId: user.id,
            amount: -amount,
            type: "subscription",
            description: `\u041E\u043F\u043B\u0430\u0442\u0430 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 ${plan}`
          });
          await this.bot.sendMessage(
            chatId,
            `\u2705 \u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0430 Pro \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0430!

\u0422\u0438\u043F: ${plan === "pro-month" ? "\u041C\u0435\u0441\u044F\u0447\u043D\u0430\u044F" : "\u0413\u043E\u0434\u043E\u0432\u0430\u044F"}
\u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C: ${(amount / 100).toFixed(2)} \u20BD
\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u0434\u043E: ${expiresAt.toLocaleDateString()}

\u0422\u0435\u043F\u0435\u0440\u044C \u0432\u0430\u043C \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0432\u0441\u0435 \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 Pro-\u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430!
\u2022 \u041D\u0435\u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439
\u2022 \u0414\u043E 100 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432
\u2022 \u0417\u0430\u043F\u0438\u0441\u044C \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439
\u2022 \u0414\u0435\u043C\u043E\u043D\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u044D\u043A\u0440\u0430\u043D\u0430
\u2022 \u0412\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u0430\u044F \u0434\u043E\u0441\u043A\u0430
\u2022 \u041E\u043F\u0440\u043E\u0441\u044B \u0438 \u0433\u043E\u043B\u043E\u0441\u043E\u0432\u0430\u043D\u0438\u044F`
          );
        } catch (error) {
          console.error("Error subscribing user:", error);
          await this.bot.sendMessage(
            chatId,
            "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435 \u0438\u043B\u0438 \u043E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u0432 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443."
          );
        }
      }
      // Обработка авторизации админа
      async handleAdminAuth(chatId, telegramId, password) {
        if (!this.bot || !this.settings) return;
        try {
          const isSuperAdmin = this.settings.superAdminId === telegramId;
          const isPasswordValid = this.settings.adminPassword && await this.comparePasswords(password, this.settings.adminPassword);
          if (!isPasswordValid && !isSuperAdmin) {
            await this.bot.sendMessage(
              chatId,
              "\u26A0\uFE0F \u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043F\u0430\u0440\u043E\u043B\u044C \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430."
            );
            return;
          }
          let user = await storage.getUserByTelegramId(telegramId);
          if (user) {
            if (user.role !== "admin" && user.role !== "superadmin") {
              await storage.updateUser(user.id, {
                role: isSuperAdmin ? "superadmin" : "admin"
              });
              user = await storage.getUserByTelegramId(telegramId);
            }
          } else {
            const username = `admin_${Date.now()}`;
            const hashedPassword = await this.hashPassword(password);
            const newUser = await storage.createUser({
              username,
              password: hashedPassword,
              name: isSuperAdmin ? "Super Administrator" : "Administrator",
              role: isSuperAdmin ? "superadmin" : "admin",
              subscriptionType: "pro",
              telegramId
            });
            user = newUser;
          }
          await this.bot.sendMessage(
            chatId,
            `\u2705 \u0412\u044B \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0430\u0443\u0442\u0435\u043D\u0442\u0438\u0444\u0438\u0446\u0438\u0440\u043E\u0432\u0430\u043D\u044B \u043A\u0430\u043A ${isSuperAdmin ? "\u0441\u0443\u043F\u0435\u0440\u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440" : "\u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440"}!

\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430:
/user list - \u0441\u043F\u0438\u0441\u043E\u043A \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439
/user info username - \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435
/user ban username \u043F\u0440\u0438\u0447\u0438\u043D\u0430 - \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F
/user unban username - \u0440\u0430\u0437\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F
/user upgrade username \u0442\u0438\u043F - \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0442\u0438\u043F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F`
          );
        } catch (error) {
          console.error("Error handling admin auth:", error);
          await this.bot.sendMessage(
            chatId,
            "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435."
          );
        }
      }
      // Вывод списка пользователей
      async listUsers(chatId) {
        if (!this.bot) return;
        try {
          const allUsers = await storage.getAllUsers();
          if (allUsers.length === 0) {
            await this.bot.sendMessage(chatId, "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E.");
            return;
          }
          const usersList = allUsers.map((user, index) => {
            return `${index + 1}. ${user.username} (${this.translateRole(user.role)}) - ${user.subscriptionType === "pro" ? "\u{1F31F} Pro" : "\u{1F319} Free"}${user.isBanned ? " \u26D4\uFE0F \u0417\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D" : ""}`;
          }).join("\n");
          const totalMessage = `\u{1F465} \u0412\u0441\u0435\u0433\u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439: ${allUsers.length}

${usersList}`;
          if (totalMessage.length > 4e3) {
            const chunks = this.splitMessage(totalMessage, 3900);
            for (const chunk of chunks) {
              await this.bot.sendMessage(chatId, chunk);
            }
          } else {
            await this.bot.sendMessage(chatId, totalMessage);
          }
        } catch (error) {
          console.error("Error listing users:", error);
          await this.bot.sendMessage(
            chatId,
            "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u0441\u043F\u0438\u0441\u043A\u0430 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439."
          );
        }
      }
      // Получение информации о пользователе
      async getUserInfo(chatId, username) {
        if (!this.bot) return;
        try {
          const user = await storage.getUserByUsername(username);
          if (!user) {
            await this.bot.sendMessage(
              chatId,
              "\u26A0\uFE0F \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D."
            );
            return;
          }
          const conferences3 = await storage.getConferencesByUserId(user.id);
          const currentBalance = user.balance || 0;
          let message = `\u{1F464} **\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435**

`;
          message += `ID: ${user.id}
`;
          message += `\u0418\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F: ${user.username}
`;
          message += `\u0418\u043C\u044F: ${user.name || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E"}
`;
          message += `Email: ${user.email || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D"}
`;
          message += `\u0420\u043E\u043B\u044C: ${this.translateRole(user.role)}
`;
          message += `\u0422\u0438\u043F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438: ${user.subscriptionType === "pro" ? "\u{1F31F} Pro" : "\u{1F319} Free"}
`;
          if (user.subscriptionExpiresAt) {
            message += `\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0430 \u0434\u043E: ${user.subscriptionExpiresAt.toLocaleDateString()}
`;
          }
          message += `Telegram ID: ${user.telegramId || "\u041D\u0435 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D"}
`;
          message += `\u0411\u0430\u043B\u0430\u043D\u0441: ${(currentBalance / 100).toFixed(2)} \u20BD
`;
          message += `\u0421\u0442\u0430\u0442\u0443\u0441: ${user.isBanned ? "\u26D4\uFE0F \u0417\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D" : "\u2705 \u0410\u043A\u0442\u0438\u0432\u0435\u043D"}
`;
          if (user.isBanned && user.banReason) {
            message += `\u041F\u0440\u0438\u0447\u0438\u043D\u0430 \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438: ${user.banReason}
`;
          }
          message += `\u0414\u0430\u0442\u0430 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438: ${user.createdAt.toLocaleDateString()}
`;
          message += `\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u0432\u0445\u043E\u0434: ${user.lastLoginAt ? user.lastLoginAt.toLocaleDateString() : "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445"}

`;
          message += `\u{1F5D3} **\u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438**

`;
          message += `\u0412\u0441\u0435\u0433\u043E \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439: ${conferences3.length}
`;
          message += `\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439: ${conferences3.filter((c) => c.active).length}
`;
          await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
        } catch (error) {
          console.error("Error getting user info:", error);
          await this.bot.sendMessage(
            chatId,
            "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0438 \u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435."
          );
        }
      }
      // Блокировка пользователя
      async banUser(chatId, username, reason) {
        if (!this.bot) return;
        try {
          const user = await storage.getUserByUsername(username);
          if (!user) {
            await this.bot.sendMessage(
              chatId,
              "\u26A0\uFE0F \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D."
            );
            return;
          }
          if (user.role === "superadmin") {
            await this.bot.sendMessage(
              chatId,
              "\u26A0\uFE0F \u041D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0443\u043F\u0435\u0440\u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430."
            );
            return;
          }
          await storage.updateUser(user.id, {
            isBanned: true,
            banReason: reason
          });
          await this.bot.sendMessage(
            chatId,
            `\u2705 \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C ${user.username} \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D.
\u041F\u0440\u0438\u0447\u0438\u043D\u0430: ${reason}`
          );
          if (user.telegramId) {
            try {
              await this.bot.sendMessage(
                parseInt(user.telegramId),
                `\u26D4\uFE0F \u0412\u0430\u0448 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u0431\u044B\u043B \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D.
\u041F\u0440\u0438\u0447\u0438\u043D\u0430: ${reason}

\u0414\u043B\u044F \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u0430, \u043F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u0432 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443.`
              );
            } catch (e) {
              console.error("Error sending ban notification to user:", e);
            }
          }
        } catch (error) {
          console.error("Error banning user:", error);
          await this.bot.sendMessage(
            chatId,
            "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F."
          );
        }
      }
      // Разблокировка пользователя
      async unbanUser(chatId, username) {
        if (!this.bot) return;
        try {
          const user = await storage.getUserByUsername(username);
          if (!user) {
            await this.bot.sendMessage(
              chatId,
              "\u26A0\uFE0F \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D."
            );
            return;
          }
          if (!user.isBanned) {
            await this.bot.sendMessage(
              chatId,
              "\u26A0\uFE0F \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D."
            );
            return;
          }
          await storage.updateUser(user.id, {
            isBanned: false,
            banReason: null
          });
          await this.bot.sendMessage(
            chatId,
            `\u2705 \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C ${user.username} \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0440\u0430\u0437\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D.`
          );
          if (user.telegramId) {
            try {
              await this.bot.sendMessage(
                parseInt(user.telegramId),
                `\u2705 \u0412\u0430\u0448 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u0431\u044B\u043B \u0440\u0430\u0437\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D.
\u0422\u0435\u043F\u0435\u0440\u044C \u0432\u044B \u0441\u043D\u043E\u0432\u0430 \u043C\u043E\u0436\u0435\u0442\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C\u0441\u044F \u0432\u0441\u0435\u043C\u0438 \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u044F\u043C\u0438 \u0441\u0435\u0440\u0432\u0438\u0441\u0430.`
              );
            } catch (e) {
              console.error("Error sending unban notification to user:", e);
            }
          }
        } catch (error) {
          console.error("Error unbanning user:", error);
          await this.bot.sendMessage(
            chatId,
            "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0440\u0430\u0437\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F."
          );
        }
      }
      // Обновление подписки пользователя
      async upgradeUserSubscription(chatId, username, subscriptionType) {
        if (!this.bot) return;
        try {
          const user = await storage.getUserByUsername(username);
          if (!user) {
            await this.bot.sendMessage(
              chatId,
              "\u26A0\uFE0F \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D."
            );
            return;
          }
          if (subscriptionType !== "free" && subscriptionType !== "pro") {
            await this.bot.sendMessage(
              chatId,
              "\u26A0\uFE0F \u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0442\u0438\u043F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u0442\u0438\u043F\u044B: free, pro"
            );
            return;
          }
          const expiresAt = subscriptionType === "pro" ? new Date(Date.now() + SUBSCRIPTION_DURATIONS.year) : null;
          await storage.updateUser(user.id, {
            subscriptionType,
            subscriptionExpiresAt: expiresAt
          });
          await this.bot.sendMessage(
            chatId,
            `\u2705 \u0422\u0438\u043F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F ${user.username} \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0438\u0437\u043C\u0435\u043D\u0435\u043D \u043D\u0430 ${subscriptionType === "pro" ? "\u{1F31F} Pro" : "\u{1F319} Free"}.` + (expiresAt ? `
\u0421\u0440\u043E\u043A \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F: \u0434\u043E ${expiresAt.toLocaleDateString()}` : "")
          );
          if (user.telegramId) {
            try {
              if (subscriptionType === "pro") {
                await this.bot.sendMessage(
                  parseInt(user.telegramId),
                  `\u{1F31F} \u041F\u043E\u0437\u0434\u0440\u0430\u0432\u043B\u044F\u0435\u043C! \u0412\u0430\u0448\u0430 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430 \u0431\u044B\u043B\u0430 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0430 \u0434\u043E Pro.
\u0421\u0440\u043E\u043A \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F: \u0434\u043E ${expiresAt?.toLocaleDateString()}

\u0422\u0435\u043F\u0435\u0440\u044C \u0432\u0430\u043C \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0432\u0441\u0435 \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 Pro-\u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430!
\u2022 \u041D\u0435\u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439
\u2022 \u0414\u043E 100 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432
\u2022 \u0417\u0430\u043F\u0438\u0441\u044C \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439
\u2022 \u0414\u0435\u043C\u043E\u043D\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u044D\u043A\u0440\u0430\u043D\u0430
\u2022 \u0412\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u0430\u044F \u0434\u043E\u0441\u043A\u0430
\u2022 \u041E\u043F\u0440\u043E\u0441\u044B \u0438 \u0433\u043E\u043B\u043E\u0441\u043E\u0432\u0430\u043D\u0438\u044F`
                );
              } else {
                await this.bot.sendMessage(
                  parseInt(user.telegramId),
                  `\u{1F319} \u0412\u0430\u0448\u0430 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430 \u0431\u044B\u043B\u0430 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0430 \u043D\u0430 \u0431\u0430\u0437\u043E\u0432\u0443\u044E (Free).
\u0422\u0435\u043F\u0435\u0440\u044C \u0443 \u0432\u0430\u0441 \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0442 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E\u0433\u043E \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430:
\u2022 \u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439 \u0434\u043E 15 \u043C\u0438\u043D\u0443\u0442
\u2022 \u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 5 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432
\u2022 \u0411\u0430\u0437\u043E\u0432\u044B\u0439 \u0444\u0443\u043D\u043A\u0446\u0438\u043E\u043D\u0430\u043B \u0431\u0435\u0437 \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0435\u0439

\u0414\u043B\u044F \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F \u043F\u043E\u043B\u043D\u043E\u0433\u043E \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043E\u0444\u043E\u0440\u043C\u0438\u0442\u0435 Pro-\u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443 \u0447\u0435\u0440\u0435\u0437 \u043A\u043E\u043C\u0430\u043D\u0434\u0443 /subscribe`
                );
              }
            } catch (e) {
              console.error("Error sending subscription update notification to user:", e);
            }
          }
        } catch (error) {
          console.error("Error upgrading user subscription:", error);
          await this.bot.sendMessage(
            chatId,
            "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F."
          );
        }
      }
      // Отправка списка конференций пользователя
      async sendUserConferences(chatId, telegramId) {
        if (!this.bot) return;
        try {
          const user = await storage.getUserByTelegramId(telegramId);
          if (!user) {
            await this.bot.sendMessage(
              chatId,
              "\u26A0\uFE0F \u0412\u0430\u0448 Telegram \u043D\u0435 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D \u043A \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0443. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 /register \u0434\u043B\u044F \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0438."
            );
            return;
          }
          const conferences3 = await storage.getConferencesByUserId(user.id);
          if (!conferences3 || conferences3.length === 0) {
            await this.bot.sendMessage(
              chatId,
              "\u0423 \u0432\u0430\u0441 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0441\u043E\u0437\u0434\u0430\u043D\u043D\u044B\u0445 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439.\n\n\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u0443 /create \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0434\u043B\u044F \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u043D\u043E\u0432\u043E\u0439 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438."
            );
            return;
          }
          const activeConferences = conferences3.filter((conf) => conf.active);
          const endedConferences = conferences3.filter((conf) => !conf.active);
          let message = `\u{1F5D3} **\u0412\u0430\u0448\u0438 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438**

`;
          if (activeConferences.length > 0) {
            message += `**\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0435 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438:**

`;
            activeConferences.forEach((conf, index) => {
              const startedAt = conf.startedAt || conf.createdAt;
              const duration = conf.duration ? `${Math.floor(conf.duration / 60)} \u043C\u0438\u043D` : "\u0412 \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u0435";
              message += `${index + 1}. *${conf.name}*
`;
              message += `   ID: \`${conf.id}\`
`;
              message += `   \u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438: ${conf.currentParticipants || 0}/${conf.maxParticipants || 5}
`;
              message += `   \u041D\u0430\u0447\u0430\u043B\u043E: ${startedAt.toLocaleString()}
`;
              message += `   \u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C: ${duration}

`;
            });
          }
          if (endedConferences.length > 0) {
            message += `**\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043D\u044B\u0435 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438:**

`;
            const recentEnded = endedConferences.sort(
              (a, b) => (b.endedAt?.getTime() || 0) - (a.endedAt?.getTime() || 0)
            ).slice(0, 5);
            recentEnded.forEach((conf, index) => {
              const startedAt = conf.startedAt || conf.createdAt;
              const endedAt = conf.endedAt || /* @__PURE__ */ new Date();
              const duration = conf.duration ? `${Math.floor(conf.duration / 60)} \u043C\u0438\u043D` : `${Math.floor((endedAt.getTime() - startedAt.getTime()) / (1e3 * 60))} \u043C\u0438\u043D`;
              message += `${index + 1}. *${conf.name}*
`;
              message += `   ID: \`${conf.id}\`
`;
              message += `   \u041D\u0430\u0447\u0430\u043B\u043E: ${startedAt.toLocaleString()}
`;
              message += `   \u041E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0435: ${endedAt.toLocaleString()}
`;
              message += `   \u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C: ${duration}
`;
              if (conf.recordingUrl) {
                message += `   \u0417\u0430\u043F\u0438\u0441\u044C: ${conf.recordingUrl}
`;
              }
              message += `
`;
            });
            if (endedConferences.length > 5) {
              message += `...\u0438 \u0435\u0449\u0435 ${endedConferences.length - 5} \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043D\u044B\u0445 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439

`;
            }
          }
          message += `\u0414\u043B\u044F \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u043D\u043E\u0432\u043E\u0439 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u0443:
`;
          message += `/create \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435_\u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438

`;
          message += `\u0414\u043B\u044F \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u044F \u043A \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u0443:
`;
          message += `/join ID_\u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438`;
          await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
        } catch (error) {
          console.error("Error sending user conferences:", error);
          await this.bot.sendMessage(
            chatId,
            "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u0441\u043F\u0438\u0441\u043A\u0430 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435."
          );
        }
      }
      // ==================== ПУБЛИЧНЫЕ МЕТОДЫ ДЛЯ ОТПРАВКИ УВЕДОМЛЕНИЙ ====================
      /**
       * Отправляет общее уведомление пользователю
       * @param userId ID пользователя в системе
       * @param message Текст сообщения (поддерживает HTML разметку)
       * @param options Дополнительные опции
       * @returns Успешность отправки
       */
      async sendNotification(userId, message, options) {
        if (!this.bot || !this.isInitialized) return false;
        try {
          const user = await storage.getUser(userId);
          if (!user || !user.telegramId) {
            console.log(`[TelegramBot] Cannot send notification: User ${userId} not found or has no telegramId`);
            return false;
          }
          const messageOptions = {
            parse_mode: options?.parseMode || "HTML",
            disable_notification: options?.silent
          };
          if (options?.keyboard) {
            messageOptions.reply_markup = {
              inline_keyboard: options.keyboard
            };
          }
          await this.bot.sendMessage(parseInt(user.telegramId), message, messageOptions);
          return true;
        } catch (error) {
          console.error("[TelegramBot] Error sending notification:", error);
          return false;
        }
      }
      /**
       * Отправляет уведомление о новой конференции
       * @param userId ID пользователя
       * @param conferenceId ID конференции
       * @param conferenceName Название конференции
       * @param creatorName Имя создателя конференции
       * @returns Успешность отправки
       */
      async sendConferenceInvitation(userId, conferenceId, conferenceName, creatorName) {
        const message = `<b>\u{1F3AF} \u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435 \u043D\u0430 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044E</b>

\u0412\u044B \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u044B \u043D\u0430 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044E <b>${conferenceName}</b>
\u041E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440: <b>${creatorName}</b>

\u041F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u044F\u0439\u0442\u0435\u0441\u044C \u043A \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438 \u043F\u0440\u044F\u043C\u043E \u0441\u0435\u0439\u0447\u0430\u0441!`;
        const keyboard = [
          [{ text: "\u{1F680} \u041F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0442\u044C\u0441\u044F", callback_data: `${"conf" /* CONF */}:join:${conferenceId}` }],
          [{ text: "\u{1F4F1} \u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438", url: `https://yancuic-tlanextia.replit.app/conferences/${conferenceId}` }]
        ];
        return this.sendNotification(userId, message, {
          parseMode: "HTML",
          keyboard
        });
      }
      /**
       * Отправляет системное уведомление пользователю
       * @param userId ID пользователя
       * @param title Заголовок уведомления
       * @param body Текст уведомления
       * @param type Тип уведомления
       * @returns Успешность отправки
       */
      async sendSystemNotification(userId, title, body, type) {
        let icon = "\u{1F4E2}";
        switch (type) {
          case "success":
            icon = "\u2705";
            break;
          case "warning":
            icon = "\u26A0\uFE0F";
            break;
          case "error":
            icon = "\u274C";
            break;
          case "info":
          default:
            icon = "\u2139\uFE0F";
            break;
        }
        const message = `<b>${icon} ${title}</b>

${body}`;
        return this.sendNotification(userId, message, {
          parseMode: "HTML"
        });
      }
      /**
       * Отправляет уведомление о статусе платежа
       * @param userId ID пользователя
       * @param paymentId ID платежа
       * @param status Статус платежа
       * @param amount Сумма платежа в копейках
       * @param plan Тип плана подписки
       * @returns Успешность отправки
       */
      async sendPaymentNotification(userId, paymentId, status, amount, plan) {
        let statusIcon = "\u23F3";
        let statusText = "\u041E\u0436\u0438\u0434\u0430\u0435\u0442 \u043E\u043F\u043B\u0430\u0442\u044B";
        switch (status) {
          case "completed":
            statusIcon = "\u2705";
            statusText = "\u041E\u043F\u043B\u0430\u0447\u0435\u043D";
            break;
          case "failed":
            statusIcon = "\u274C";
            statusText = "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C";
            break;
          case "cancelled":
            statusIcon = "\u{1F6AB}";
            statusText = "\u041E\u0442\u043C\u0435\u043D\u0435\u043D";
            break;
          case "pending":
          default:
            statusIcon = "\u23F3";
            statusText = "\u041E\u0436\u0438\u0434\u0430\u0435\u0442 \u043E\u043F\u043B\u0430\u0442\u044B";
            break;
        }
        const amountRub = (amount / 100).toFixed(2);
        const message = `<b>\u{1F4B3} \u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E \u043F\u043B\u0430\u0442\u0435\u0436\u0435</b>

\u0421\u0442\u0430\u0442\u0443\u0441: ${statusIcon} <b>${statusText}</b>
\u0421\u0443\u043C\u043C\u0430: <b>${amountRub} \u20BD</b>
\u041F\u043B\u0430\u043D: <b>${plan}</b>
ID \u043F\u043B\u0430\u0442\u0435\u0436\u0430: <code>${paymentId}</code>`;
        let keyboard = [];
        if (status === "pending") {
          keyboard = [
            [{ text: "\u{1F4B0} \u041E\u043F\u043B\u0430\u0442\u0438\u0442\u044C", url: `https://yancuic-tlanextia.replit.app/payments/${paymentId}` }]
          ];
        } else if (status === "completed") {
          keyboard = [
            [{ text: "\u{1F464} \u041C\u043E\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C", callback_data: `${"menu" /* MENU */}:${"profile" /* PROFILE */}` }]
          ];
        }
        return this.sendNotification(userId, message, {
          parseMode: "HTML",
          keyboard: keyboard.length > 0 ? keyboard : void 0
        });
      }
      /**
       * Отправляет массовое уведомление всем пользователям с Telegram ID
       * @param message Текст сообщения
       * @param options Опции сообщения
       * @returns Количество пользователей, которым было отправлено сообщение
       */
      async sendBroadcastMessage(message, options) {
        if (!this.bot || !this.isInitialized) return 0;
        try {
          let usersQuery = db.select().from(users).where(sql2`${users.telegramId} IS NOT NULL`);
          if (options?.onlyAdmins) {
            usersQuery = usersQuery.where(sql2`${users.role} IN ('admin', 'superadmin')`);
          }
          const usersWithTelegram = await usersQuery;
          let successCount = 0;
          const messageOptions = {
            parse_mode: options?.parseMode || "HTML",
            disable_notification: options?.silent
          };
          for (const user of usersWithTelegram) {
            try {
              if (user.telegramId) {
                await this.bot.sendMessage(parseInt(user.telegramId), message, messageOptions);
                successCount++;
                await new Promise((resolve) => setTimeout(resolve, 50));
              }
            } catch (error) {
              console.error(`[TelegramBot] Error sending broadcast to user ${user.id}:`, error);
            }
          }
          return successCount;
        } catch (error) {
          console.error("[TelegramBot] Error sending broadcast:", error);
          return 0;
        }
      }
      // ==================== ПРИВАТНЫЕ МЕТОДЫ ====================
      // Присоединение к конференции
      async joinConference(chatId, telegramId, conferenceId) {
        if (!this.bot) return;
        try {
          const user = await storage.getUserByTelegramId(telegramId);
          if (!user) {
            await this.bot.sendMessage(
              chatId,
              "\u26A0\uFE0F \u0412\u0430\u0448 Telegram \u043D\u0435 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D \u043A \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0443. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 /register \u0434\u043B\u044F \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0438."
            );
            return;
          }
          const conference = await storage.getConference(conferenceId);
          if (!conference) {
            await this.bot.sendMessage(
              chatId,
              "\u26A0\uFE0F \u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E\u0441\u0442\u044C ID \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438."
            );
            return;
          }
          if (!conference.active) {
            await this.bot.sendMessage(
              chatId,
              "\u26A0\uFE0F \u042D\u0442\u0430 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044F \u0443\u0436\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430."
            );
            return;
          }
          const maxParticipants = conference.maxParticipants || 5;
          if ((conference.currentParticipants || 0) >= maxParticipants) {
            await this.bot.sendMessage(
              chatId,
              `\u26A0\uFE0F \u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 \u043B\u0438\u043C\u0438\u0442 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438 (${maxParticipants}).`
            );
            return;
          }
          if (user.subscriptionType === "free" && conference.creatorId !== user.id) {
            const confStartTime = conference.startedAt || conference.createdAt;
            const now = /* @__PURE__ */ new Date();
            const durationMin = Math.floor((now.getTime() - confStartTime.getTime()) / (60 * 1e3));
            if (durationMin >= 15) {
              await this.bot.sendMessage(
                chatId,
                "\u26A0\uFE0F \u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438 \u0434\u043B\u044F \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u0445 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0430 15 \u043C\u0438\u043D\u0443\u0442\u0430\u043C\u0438.\n\n\u041E\u0444\u043E\u0440\u043C\u0438\u0442\u0435 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443 Pro, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0442\u044C\u0441\u044F \u043A \u044D\u0442\u043E\u0439 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438."
              );
              return;
            }
          }
          const baseUrl = "https://ikarus.app/conference";
          const joinUrl = `${baseUrl}/${conferenceId}?name=${encodeURIComponent(user.name || user.username)}`;
          await this.bot.sendMessage(
            chatId,
            `\u2705 \u0412\u044B \u043C\u043E\u0436\u0435\u0442\u0435 \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0442\u044C\u0441\u044F \u043A \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438 "${conference.name}".

[\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0437\u0434\u0435\u0441\u044C \u0434\u043B\u044F \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u044F](${joinUrl})

ID: ${conferenceId}
\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438: ${conference.currentParticipants || 0}/${maxParticipants}
\u0421\u043E\u0437\u0434\u0430\u043D\u0430: ${conference.createdAt.toLocaleString()}

\u0415\u0441\u043B\u0438 \u0443 \u0432\u0430\u0441 \u0432\u043E\u0437\u043D\u0438\u043A\u043B\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u044B \u0441 \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435\u043C, \u0441\u043A\u043E\u043F\u0438\u0440\u0443\u0439\u0442\u0435 ID \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438 \u0438 \u043F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u043D\u0430 \u0441\u0430\u0439\u0442 Ikarus.`,
            { parse_mode: "Markdown" }
          );
        } catch (error) {
          console.error("Error joining conference:", error);
          await this.bot.sendMessage(
            chatId,
            "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043F\u044B\u0442\u043A\u0435 \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0442\u044C\u0441\u044F \u043A \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435."
          );
        }
      }
      // Создание новой конференции
      async createConference(chatId, telegramId, conferenceName) {
        if (!this.bot) return;
        try {
          const user = await storage.getUserByTelegramId(telegramId);
          if (!user) {
            await this.bot.sendMessage(
              chatId,
              "\u26A0\uFE0F \u0412\u0430\u0448 Telegram \u043D\u0435 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D \u043A \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0443. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 /register \u0434\u043B\u044F \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0438."
            );
            return;
          }
          if (user.isBanned) {
            await this.bot.sendMessage(
              chatId,
              `\u26D4\uFE0F \u0412\u0430\u0448 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D. \u041F\u0440\u0438\u0447\u0438\u043D\u0430: ${user.banReason || "\u041D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0435 \u043F\u0440\u0430\u0432\u0438\u043B \u0441\u0435\u0440\u0432\u0438\u0441\u0430"}`
            );
            return;
          }
          if (!conferenceName || conferenceName.length < 3) {
            await this.bot.sendMessage(
              chatId,
              "\u26A0\uFE0F \u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438 \u0434\u043E\u043B\u0436\u043D\u043E \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043D\u0435 \u043C\u0435\u043D\u0435\u0435 3 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432."
            );
            return;
          }
          let maxParticipants = 5;
          let hasScreenShare = false;
          if (user.subscriptionType === "pro") {
            if (user.subscriptionExpiresAt) {
              const now = /* @__PURE__ */ new Date();
              if (new Date(user.subscriptionExpiresAt) < now) {
                await storage.updateUser(user.id, {
                  subscriptionType: "free",
                  subscriptionExpiresAt: null
                });
                await this.bot.sendMessage(
                  chatId,
                  "\u26A0\uFE0F \u0412\u0430\u0448\u0430 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430 Pro \u0438\u0441\u0442\u0435\u043A\u043B\u0430. \u0412\u044B \u0431\u0443\u0434\u0435\u0442\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u0439 \u043F\u043B\u0430\u043D \u0441 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F\u043C\u0438."
                );
              } else {
                maxParticipants = 50;
                hasScreenShare = true;
              }
            } else {
              maxParticipants = 50;
              hasScreenShare = true;
            }
          }
          const conferenceId = `conf_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
          const conference = await storage.createConference({
            name: conferenceName,
            description: `\u0421\u043E\u0437\u0434\u0430\u043D\u043E \u0447\u0435\u0440\u0435\u0437 Telegram \u0431\u043E\u0442\u0430 ${(/* @__PURE__ */ new Date()).toLocaleString()}`,
            creatorId: user.id,
            maxParticipants,
            hasScreenShare,
            hasChat: true,
            hasVideoEnabled: true
          });
          const baseUrl = "https://ikarus.app/conference";
          const joinUrl = `${baseUrl}/${conference.id}?name=${encodeURIComponent(user.name || user.username)}`;
          await this.bot.sendMessage(
            chatId,
            `\u2705 \u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044F \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0441\u043E\u0437\u0434\u0430\u043D\u0430!

\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435: ${conference.name}
ID: \`${conference.id}\`
\u0422\u0438\u043F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438: ${user.subscriptionType === "pro" ? "\u{1F31F} Pro" : "\u{1F319} Free"}
\u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432: ${maxParticipants}

[\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0437\u0434\u0435\u0441\u044C, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0442\u044C\u0441\u044F](${joinUrl})

\u0427\u0442\u043E\u0431\u044B \u043F\u0440\u0438\u0433\u043B\u0430\u0441\u0438\u0442\u044C \u0434\u0440\u0443\u0433\u0438\u0445 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432, \u043F\u043E\u0434\u0435\u043B\u0438\u0442\u0435\u0441\u044C ID \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438:
\`${conference.id}\`

\u041E\u043D\u0438 \u043C\u043E\u0433\u0443\u0442 \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0442\u044C\u0441\u044F \u0447\u0435\u0440\u0435\u0437 Telegram \u0431\u043E\u0442 \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439:
/join ${conference.id}`,
            { parse_mode: "Markdown" }
          );
        } catch (error) {
          console.error("Error creating conference:", error);
          await this.bot.sendMessage(
            chatId,
            "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0438 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435."
          );
        }
      }
      // Перевод роли пользователя на русский язык
      translateRole(role) {
        switch (role) {
          case "user":
            return "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C";
          case "host":
            return "\u041E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440";
          case "admin":
            return "\u0410\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440";
          case "superadmin":
            return "\u0421\u0443\u043F\u0435\u0440\u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440";
          default:
            return role;
        }
      }
      // Разделение длинного сообщения на части
      splitMessage(text2, maxLength = 4e3) {
        const result = [];
        let currentText = "";
        const lines = text2.split("\n");
        for (const line of lines) {
          if (currentText.length + line.length + 1 <= maxLength) {
            currentText += (currentText ? "\n" : "") + line;
          } else {
            result.push(currentText);
            currentText = line;
          }
        }
        if (currentText) {
          result.push(currentText);
        }
        return result;
      }
      // Хеширование пароля
      async hashPassword(password) {
        const salt = randomBytes2(16).toString("hex");
        const buf = await scryptAsync2(password, salt, 64);
        return `${buf.toString("hex")}.${salt}`;
      }
      // Сравнение паролей
      async comparePasswords(supplied, stored) {
        const [hashed, salt] = stored.split(".");
        const hashedBuf = Buffer.from(hashed, "hex");
        const suppliedBuf = await scryptAsync2(supplied, salt, 64);
        return timingSafeEqual2(hashedBuf, suppliedBuf);
      }
      // Показать административную панель
      async showAdminPanel(chatId, user) {
        if (!this.bot) return;
        const state = this.getUserState(chatId);
        const userCount = await db.select({ count: sql2`count(*)` }).from(users);
        const conferenceCount = await db.select({ count: sql2`count(*)` }).from(conferences);
        const proUserCount = await db.select({ count: sql2`count(*)` }).from(users).where(eq2(users.subscriptionType, "pro"));
        const totalRevenue = await db.select({
          sum: sql2`COALESCE(SUM(amount), 0)`
        }).from(payments);
        const today = /* @__PURE__ */ new Date();
        today.setHours(0, 0, 0, 0);
        const revenueToday = await db.select({
          sum: sql2`COALESCE(SUM(amount), 0)`
        }).from(payments).where(gte2(payments.createdAt, today));
        const message = `
\u{1F537} <b>\u041F\u0430\u043D\u0435\u043B\u044C \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430 Ikarus</b> \u{1F537}

\u{1F4CA} <b>\u041E\u0431\u0449\u0430\u044F \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430:</b>
\u{1F465} \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439: ${userCount[0].count}
\u{1F451} Pro-\u043F\u043E\u0434\u043F\u0438\u0441\u043E\u043A: ${proUserCount[0].count} (${(Number(proUserCount[0].count) / Number(userCount[0].count) * 100).toFixed(1)}%)
\u{1F3A5} \u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439: ${conferenceCount[0].count}
\u{1F4B0} \u041E\u0431\u0449\u0438\u0439 \u0434\u043E\u0445\u043E\u0434: ${((Number(totalRevenue[0].sum) || 0) / 100).toFixed(0)} \u20BD
\u{1F4C8} \u0414\u043E\u0445\u043E\u0434 \u0441\u0435\u0433\u043E\u0434\u043D\u044F: ${((Number(revenueToday[0].sum) || 0) / 100).toFixed(0)} \u20BD

\u0414\u043B\u044F \u043F\u043E\u0434\u0440\u043E\u0431\u043D\u043E\u0439 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0440\u0430\u0437\u0434\u0435\u043B\u044B \u043D\u0438\u0436\u0435.
${user.role === "superadmin" ? "\n\u26A0\uFE0F \u0423 \u0432\u0430\u0441 \u0435\u0441\u0442\u044C \u043F\u0440\u0430\u0432\u0430 \u0441\u0443\u043F\u0435\u0440\u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430, \u0432\u0430\u043C \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0432\u0441\u0435 \u0444\u0443\u043D\u043A\u0446\u0438\u0438." : ""}
`;
        const adminKeyboard = [
          [
            { text: "\u{1F465} \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438", callback_data: "admin:users" },
            { text: "\u{1F3A5} \u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438", callback_data: "admin:conferences" }
          ],
          [
            { text: "\u{1F4B0} \u041F\u043B\u0430\u0442\u0435\u0436\u0438", callback_data: "admin:payments" },
            { text: "\u2699\uFE0F \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438", callback_data: "admin:settings" }
          ],
          [
            { text: "\u{1F5A5}\uFE0F \u0421\u0438\u0441\u0442\u0435\u043C\u0430", callback_data: "admin:system" },
            { text: "\u{1F4CA} \u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430", callback_data: "admin:stats" }
          ],
          [
            { text: "\u{1F50D} \u041F\u043E\u0438\u0441\u043A", callback_data: "admin:search" },
            { text: "\u{1F504} \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C", callback_data: "admin:refresh" }
          ],
          [
            { text: "\xAB \u0412\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u0432 \u0433\u043B\u0430\u0432\u043D\u043E\u0435 \u043C\u0435\u043D\u044E", callback_data: `${"menu" /* MENU */}:${"main" /* MAIN */}` }
          ]
        ];
        try {
          if (state.lastMenuMessageId) {
            try {
              await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
            } catch (e) {
              console.log("Could not delete previous menu message", e);
            }
          }
          const sentMessage = await this.bot.sendMessage(chatId, message, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: adminKeyboard
            }
          });
          state.lastMenuMessageId = sentMessage.message_id;
          state.activeMenu = "admin" /* ADMIN */;
        } catch (error) {
          console.error("Error sending admin panel:", error);
          await this.bot.sendMessage(chatId, "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0438 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u0438\u0432\u043D\u043E\u0439 \u043F\u0430\u043D\u0435\u043B\u0438");
        }
      }
      // Показать управление пользователями
      async showAdminUsers(chatId, user) {
        if (!this.bot) return;
        const state = this.getUserState(chatId);
        const recentUsers = await db.select({
          id: users.id,
          username: users.username,
          email: users.email,
          subscriptionType: users.subscriptionType,
          createdAt: users.createdAt
        }).from(users).orderBy(desc2(users.createdAt)).limit(5);
        let message = `\u{1F465} <b>\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F\u043C\u0438</b>

`;
        if (recentUsers.length > 0) {
          message += `<b>\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438:</b>
`;
          for (let i = 0; i < recentUsers.length; i++) {
            const u = recentUsers[i];
            const subIcon = u.subscriptionType === "pro" ? "\u{1F451}" : "\u{1F319}";
            const date = new Date(u.createdAt).toLocaleDateString("ru-RU");
            message += `${i + 1}. ${subIcon} <b>${u.username}</b> - ${u.email}
    \u0421\u043E\u0437\u0434\u0430\u043D: ${date}
`;
          }
        } else {
          message += `<i>\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B</i>
`;
        }
        const keyboard = [
          [
            { text: "\u{1F50D} \u041F\u043E\u0438\u0441\u043A \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F", callback_data: "admin:user_search" },
            { text: "\u2795 \u041D\u043E\u0432\u044B\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438", callback_data: "admin:user_new" }
          ],
          [
            { text: "\u{1F451} Pro-\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438", callback_data: "admin:user_pro" },
            { text: "\u26A0\uFE0F \u0417\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435", callback_data: "admin:user_banned" }
          ],
          [
            { text: "\u{1F4CA} \u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430", callback_data: "admin:user_stats" },
            { text: "\u{1F464} \u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0440\u043E\u043B\u044F\u043C\u0438", callback_data: "admin:user_roles" }
          ],
          [
            { text: "\xAB \u041D\u0430\u0437\u0430\u0434 \u0432 \u0430\u0434\u043C\u0438\u043D-\u043F\u0430\u043D\u0435\u043B\u044C", callback_data: "admin:back" }
          ]
        ];
        try {
          if (state.lastMenuMessageId) {
            try {
              await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
            } catch (e) {
              console.log("Could not delete previous menu message", e);
            }
          }
          const sentMessage = await this.bot.sendMessage(chatId, message, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
          state.lastMenuMessageId = sentMessage.message_id;
        } catch (error) {
          console.error("Error sending admin users panel:", error);
          await this.bot.sendMessage(chatId, "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0438 \u043F\u0430\u043D\u0435\u043B\u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F\u043C\u0438");
        }
      }
      // Обработка колбэка для администраторов
      async handleAdminCallbacks(callbackData, query) {
        if (!this.bot || !query.message) return;
        const chatId = query.message.chat.id;
        const telegramId = query.from.id.toString();
        const user = await storage.getUserByTelegramId(telegramId);
        if (!user || user.role !== "admin" && user.role !== "superadmin") {
          await this.bot.answerCallbackQuery(query.id, {
            text: "\u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u043F\u0440\u0430\u0432 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430",
            show_alert: true
          });
          return;
        }
        await this.bot.answerCallbackQuery(query.id);
        const [prefix, action, param] = callbackData.split(":");
        if (prefix !== "admin") return;
        switch (action) {
          case "users":
            await this.showAdminUsers(chatId, user);
            break;
          case "user_view":
            if (param) {
              await this.showUserDetails(chatId, user, parseInt(param, 10));
            } else {
              await this.showAdminUsers(chatId, user);
            }
            break;
          case "user_edit":
            if (param) {
              await this.showUserEditForm(chatId, user, parseInt(param, 10));
            } else {
              await this.showAdminUsers(chatId, user);
            }
            break;
          case "user_delete":
            if (param) {
              await this.showUserDeleteConfirmation(chatId, user, parseInt(param, 10));
            } else {
              await this.showAdminUsers(chatId, user);
            }
            break;
          case "conferences":
            await this.showAdminConferences(chatId, user);
            break;
          case "conf_view":
            if (param) {
              await this.showConferenceDetails(chatId, user, param);
            } else {
              await this.showAdminConferences(chatId, user);
            }
            break;
          case "conf_end":
            if (param) {
              await this.endConferenceConfirmation(chatId, user, param);
            } else {
              await this.showAdminConferences(chatId, user);
            }
            break;
          case "payments":
            await this.showAdminPayments(chatId, user);
            break;
          case "payment_view":
            if (param) {
              await this.showPaymentDetails(chatId, user, parseInt(param, 10));
            } else {
              await this.showAdminPayments(chatId, user);
            }
            break;
          case "stats":
            await this.showAdminStatistics(chatId, user);
            break;
          case "settings":
            await this.showAdminSettings(chatId, user);
            break;
          case "settings_save":
            await this.saveAdminSettings(chatId, user, param || "");
            break;
          case "back":
          case "refresh":
            await this.showAdminPanel(chatId, user);
            break;
          default:
            await this.bot.sendMessage(chatId, `\u26A0\uFE0F \u0424\u0443\u043D\u043A\u0446\u0438\u044F \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u0441\u044F \u0432 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u043A\u0435: ${action}`);
            break;
        }
      }
      // Получение экземпляра бота (для использования в других модулях)
      getBot() {
        return this.bot;
      }
      // Показать админ-панель
      async showAdminPanel(chatId, user) {
        if (!this.bot) return;
        const state = this.getUserState(chatId);
        const userCount = await db.select({ count: sql2`count(*)` }).from(users);
        const conferenceCount = await db.select({ count: sql2`count(*)` }).from(conferences);
        const proUserCount = await db.select({ count: sql2`count(*)` }).from(users).where(eq2(users.subscriptionType, "pro"));
        const message = `
\u{1F537} <b>\u041F\u0430\u043D\u0435\u043B\u044C \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430 Ikarus</b> \u{1F537}

\u{1F4CA} <b>\u041E\u0431\u0449\u0430\u044F \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430:</b>
\u{1F465} \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439: ${userCount[0].count}
\u{1F451} Pro-\u043F\u043E\u0434\u043F\u0438\u0441\u043E\u043A: ${proUserCount[0].count} (${Number(userCount[0].count) > 0 ? (Number(proUserCount[0].count) / Number(userCount[0].count) * 100).toFixed(1) : 0}%)
\u{1F3A5} \u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439: ${conferenceCount[0].count}

${user.role === "superadmin" ? "\n\u26A0\uFE0F \u0423 \u0432\u0430\u0441 \u0435\u0441\u0442\u044C \u043F\u0440\u0430\u0432\u0430 \u0441\u0443\u043F\u0435\u0440\u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430, \u0432\u0430\u043C \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0432\u0441\u0435 \u0444\u0443\u043D\u043A\u0446\u0438\u0438." : ""}
`;
        const adminKeyboard = [
          [
            { text: "\u{1F465} \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438", callback_data: "admin:users" },
            { text: "\u{1F3A5} \u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438", callback_data: "admin:conferences" }
          ],
          [
            { text: "\u{1F4B0} \u041F\u043B\u0430\u0442\u0435\u0436\u0438", callback_data: "admin:payments" },
            { text: "\u2699\uFE0F \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438", callback_data: "admin:settings" }
          ],
          [
            { text: "\u{1F5A5}\uFE0F \u0421\u0438\u0441\u0442\u0435\u043C\u0430", callback_data: "admin:system" },
            { text: "\u{1F4CA} \u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430", callback_data: "admin:stats" }
          ],
          [
            { text: "\xAB \u0412\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u0432 \u0433\u043B\u0430\u0432\u043D\u043E\u0435 \u043C\u0435\u043D\u044E", callback_data: `${"menu" /* MENU */}:${"main" /* MAIN */}` }
          ]
        ];
        try {
          if (state.lastMenuMessageId) {
            try {
              await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
            } catch (e) {
              console.log("Could not delete previous menu message", e);
            }
          }
          const sentMessage = await this.bot.sendMessage(chatId, message, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: adminKeyboard
            }
          });
          state.lastMenuMessageId = sentMessage.message_id;
          state.activeMenu = "admin" /* ADMIN */;
        } catch (error) {
          console.error("Error sending admin panel:", error);
          await this.bot?.sendMessage(chatId, "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0438 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u0438\u0432\u043D\u043E\u0439 \u043F\u0430\u043D\u0435\u043B\u0438");
        }
      }
      // Показать управление пользователями
      async showAdminUsers(chatId, user) {
        if (!this.bot) return;
        const state = this.getUserState(chatId);
        const recentUsers = await db.select({
          id: users.id,
          username: users.username,
          email: users.email,
          subscriptionType: users.subscriptionType,
          createdAt: users.createdAt
        }).from(users).orderBy(desc2(users.createdAt)).limit(5);
        let message = `\u{1F465} <b>\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F\u043C\u0438</b>

`;
        if (recentUsers.length > 0) {
          message += `<b>\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438:</b>
`;
          for (let i = 0; i < recentUsers.length; i++) {
            const u = recentUsers[i];
            const subIcon = u.subscriptionType === "pro" ? "\u{1F451}" : "\u{1F319}";
            const date = new Date(u.createdAt).toLocaleDateString("ru-RU");
            message += `${i + 1}. ${subIcon} <b>${u.username}</b> - ${u.email}
    \u0421\u043E\u0437\u0434\u0430\u043D: ${date}
`;
          }
        } else {
          message += `<i>\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B</i>
`;
        }
        const keyboard = [
          [
            { text: "\u{1F50D} \u041F\u043E\u0438\u0441\u043A \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F", callback_data: "admin:user_search" },
            { text: "\u2795 \u041D\u043E\u0432\u044B\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438", callback_data: "admin:user_new" }
          ],
          [
            { text: "\u{1F451} Pro-\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438", callback_data: "admin:user_pro" },
            { text: "\u26A0\uFE0F \u0417\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435", callback_data: "admin:user_banned" }
          ],
          [
            { text: "\xAB \u041D\u0430\u0437\u0430\u0434 \u0432 \u0430\u0434\u043C\u0438\u043D-\u043F\u0430\u043D\u0435\u043B\u044C", callback_data: "admin:back" }
          ]
        ];
        try {
          if (state.lastMenuMessageId) {
            try {
              await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
            } catch (e) {
              console.log("Could not delete previous menu message", e);
            }
          }
          const sentMessage = await this.bot.sendMessage(chatId, message, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
          state.lastMenuMessageId = sentMessage.message_id;
        } catch (error) {
          console.error("Error sending admin users panel:", error);
          await this.bot?.sendMessage(chatId, "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0438 \u043F\u0430\u043D\u0435\u043B\u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F\u043C\u0438");
        }
      }
      // Показать управление конференциями
      async showAdminConferences(chatId, user) {
        if (!this.bot) return;
        const state = this.getUserState(chatId);
        const activeConferences = await db.select({
          id: conferences.id,
          name: conferences.name,
          hostId: conferences.hostId,
          participantCount: conferences.participantCount,
          startTime: conferences.startTime
        }).from(conferences).where(eq2(conferences.status, "active")).orderBy(desc2(conferences.startTime)).limit(5);
        let message = `\u{1F3A5} <b>\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044F\u043C\u0438</b>

`;
        if (activeConferences.length > 0) {
          message += `<b>\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0435 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438:</b>
`;
          for (let i = 0; i < activeConferences.length; i++) {
            const conf = activeConferences[i];
            const host = await db.select({ username: users.username }).from(users).where(eq2(users.id, conf.hostId)).limit(1);
            const hostName = host.length > 0 ? host[0].username : "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E";
            const startTime = new Date(conf.startTime).toLocaleString("ru-RU");
            message += `${i + 1}. <b>${conf.name}</b>
    \u041E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440: ${hostName}
    \u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432: ${conf.participantCount}
    \u041D\u0430\u0447\u0430\u043B\u043E: ${startTime}
`;
          }
        } else {
          message += `<i>\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439 \u043D\u0435\u0442</i>
`;
        }
        const keyboard = [
          [
            { text: "\u{1F50D} \u041F\u043E\u0438\u0441\u043A \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438", callback_data: "admin:conf_search" },
            { text: "\u{1F4CA} \u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430", callback_data: "admin:conf_stats" }
          ],
          [
            { text: "\u23F1\uFE0F \u041F\u043E \u0434\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u0438", callback_data: "admin:conf_duration" },
            { text: "\u{1F465} \u041F\u043E \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430\u043C", callback_data: "admin:conf_participants" }
          ],
          [
            { text: "\xAB \u041D\u0430\u0437\u0430\u0434 \u0432 \u0430\u0434\u043C\u0438\u043D-\u043F\u0430\u043D\u0435\u043B\u044C", callback_data: "admin:back" }
          ]
        ];
        try {
          if (state.lastMenuMessageId) {
            try {
              await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
            } catch (e) {
              console.log("Could not delete previous menu message", e);
            }
          }
          const sentMessage = await this.bot.sendMessage(chatId, message, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
          state.lastMenuMessageId = sentMessage.message_id;
        } catch (error) {
          console.error("Error sending admin conferences panel:", error);
          await this.bot?.sendMessage(chatId, "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0438 \u043F\u0430\u043D\u0435\u043B\u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044F\u043C\u0438");
        }
      }
      // Показать управление платежами
      async showAdminPayments(chatId, user) {
        if (!this.bot) return;
        const state = this.getUserState(chatId);
        const recentPayments = await db.select({
          id: payments.id,
          userId: payments.userId,
          amount: payments.amount,
          status: payments.status,
          createdAt: payments.createdAt
        }).from(payments).orderBy(desc2(payments.createdAt)).limit(5);
        let message = `\u{1F4B0} <b>\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u043B\u0430\u0442\u0435\u0436\u0430\u043C\u0438</b>

`;
        if (recentPayments.length > 0) {
          message += `<b>\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 \u043F\u043B\u0430\u0442\u0435\u0436\u0438:</b>
`;
          for (let i = 0; i < recentPayments.length; i++) {
            const payment = recentPayments[i];
            const userInfo = await db.select({ username: users.username }).from(users).where(eq2(users.id, payment.userId)).limit(1);
            const username = userInfo.length > 0 ? userInfo[0].username : "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E";
            const amount = (payment.amount / 100).toFixed(0) + " \u20BD";
            const date = new Date(payment.createdAt).toLocaleString("ru-RU");
            const status = payment.status === "succeeded" ? "\u2705" : payment.status === "pending" ? "\u23F3" : "\u274C";
            message += `${i + 1}. ${status} <b>${amount}</b> - ${username}
    \u0414\u0430\u0442\u0430: ${date}
`;
          }
        } else {
          message += `<i>\u041F\u043B\u0430\u0442\u0435\u0436\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B</i>
`;
        }
        const keyboard = [
          [
            { text: "\u{1F4CA} \u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430 \u043F\u043B\u0430\u0442\u0435\u0436\u0435\u0439", callback_data: "admin:payment_stats" },
            { text: "\u{1F50D} \u041F\u043E\u0438\u0441\u043A \u043F\u043B\u0430\u0442\u0435\u0436\u0430", callback_data: "admin:payment_search" }
          ],
          [
            { text: "\u{1F4C5} \u041F\u043E \u043C\u0435\u0441\u044F\u0446\u0430\u043C", callback_data: "admin:payment_monthly" },
            { text: "\u{1F4B3} \u041F\u043E \u043C\u0435\u0442\u043E\u0434\u0430\u043C \u043E\u043F\u043B\u0430\u0442\u044B", callback_data: "admin:payment_methods" }
          ],
          [
            { text: "\xAB \u041D\u0430\u0437\u0430\u0434 \u0432 \u0430\u0434\u043C\u0438\u043D-\u043F\u0430\u043D\u0435\u043B\u044C", callback_data: "admin:back" }
          ]
        ];
        try {
          if (state.lastMenuMessageId) {
            try {
              await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
            } catch (e) {
              console.log("Could not delete previous menu message", e);
            }
          }
          const sentMessage = await this.bot.sendMessage(chatId, message, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
          state.lastMenuMessageId = sentMessage.message_id;
        } catch (error) {
          console.error("Error sending admin payments panel:", error);
          await this.bot?.sendMessage(chatId, "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0438 \u043F\u0430\u043D\u0435\u043B\u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u043F\u043B\u0430\u0442\u0435\u0436\u0430\u043C\u0438");
        }
      }
      // Показать системные настройки
      async showAdminSettings(chatId, user) {
        if (!this.bot) return;
        const state = this.getUserState(chatId);
        let message = `\u2699\uFE0F <b>\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0441\u0438\u0441\u0442\u0435\u043C\u044B</b>

`;
        message += `<b>\u0422\u0435\u043A\u0443\u0449\u0438\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438:</b>
`;
        message += `\u{1F4B0} \u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C Pro-\u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438: <b>799 \u20BD/\u043C\u0435\u0441</b>
`;
        message += `\u23F1\uFE0F \u041B\u0438\u043C\u0438\u0442 \u0432\u0440\u0435\u043C\u0435\u043D\u0438 (Free): <b>15 \u043C\u0438\u043D\u0443\u0442</b>
`;
        message += `\u{1F465} \u041C\u0430\u043A\u0441. \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432 (Free): <b>5 \u0447\u0435\u043B\u043E\u0432\u0435\u043A</b>

`;
        message += `<b>API \u043A\u043B\u044E\u0447\u0438:</b>
`;
        message += `\u{1F1F7}\u{1F1FA} YooKassa: \u2705 \u041D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0430
`;
        message += `\u{1F4B3} Stripe: \u23F3 \u0412 \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438
`;
        const keyboard = [
          [
            { text: "\u{1F4B0} \u0426\u0435\u043D\u044B \u0438 \u043B\u0438\u043C\u0438\u0442\u044B", callback_data: "admin:settings_limits" },
            { text: "\u{1F511} API \u043A\u043B\u044E\u0447\u0438", callback_data: "admin:settings_api" }
          ],
          [
            { text: "\u{1F310} \u0414\u043E\u043C\u0435\u043D\u044B \u0438 URL", callback_data: "admin:settings_domains" },
            { text: "\u{1F510} \u0411\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u044C", callback_data: "admin:settings_security" }
          ],
          [
            { text: "\xAB \u041D\u0430\u0437\u0430\u0434 \u0432 \u0430\u0434\u043C\u0438\u043D-\u043F\u0430\u043D\u0435\u043B\u044C", callback_data: "admin:back" }
          ]
        ];
        try {
          if (state.lastMenuMessageId) {
            try {
              await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
            } catch (e) {
              console.log("Could not delete previous menu message", e);
            }
          }
          const sentMessage = await this.bot.sendMessage(chatId, message, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
          state.lastMenuMessageId = sentMessage.message_id;
        } catch (error) {
          console.error("Error sending admin settings panel:", error);
          await this.bot?.sendMessage(chatId, "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0438 \u043F\u0430\u043D\u0435\u043B\u0438 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A");
        }
      }
      // Показать системную информацию
      async showAdminSystem(chatId, user) {
        if (!this.bot) return;
        const state = this.getUserState(chatId);
        try {
          const os2 = __require("os");
          const uptime = Math.floor(os2.uptime() / 60);
          const uptimeFormatted = uptime >= 60 ? `${Math.floor(uptime / 60)} \u0447 ${uptime % 60} \u043C\u0438\u043D` : `${uptime} \u043C\u0438\u043D`;
          const freeMemoryMB = Math.floor(os2.freemem() / 1024 / 1024);
          const totalMemoryMB = Math.floor(os2.totalmem() / 1024 / 1024);
          const freeMemoryGB = (freeMemoryMB / 1024).toFixed(1);
          const totalMemoryGB = (totalMemoryMB / 1024).toFixed(1);
          const loadAvg = os2.loadavg()[0].toFixed(2);
          const cpuUsage = (loadAvg * 100).toFixed(0) + "%";
          let dbStatus = "\u2753 \u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E";
          try {
            await db.execute(sql2`SELECT 1`);
            dbStatus = "\u2705 \u041E\u043D\u043B\u0430\u0439\u043D";
          } catch (err) {
            dbStatus = "\u274C \u041E\u0444\u043B\u0430\u0439\u043D";
          }
          let message = `\u{1F5A5}\uFE0F <b>\u0421\u0438\u0441\u0442\u0435\u043C\u043D\u0430\u044F \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F</b>

`;
          message += `<b>\u0421\u0435\u0440\u0432\u0435\u0440:</b>
`;
          message += `\u23F1\uFE0F Uptime: <b>${uptimeFormatted}</b>
`;
          message += `\u{1F4BE} \u041F\u0430\u043C\u044F\u0442\u044C: <b>${freeMemoryGB}/${totalMemoryGB} \u0413\u0411</b> \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u043E
`;
          message += `\u26A1 \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 CPU: <b>${cpuUsage}</b>
`;
          message += `\u{1F4BB} \u041E\u0421: <b>${os2.platform()} ${os2.release()}</b>

`;
          message += `<b>\u0411\u0430\u0437\u0430 \u0434\u0430\u043D\u043D\u044B\u0445:</b>
`;
          message += `\u{1F504} \u0421\u0442\u0430\u0442\u0443\u0441: <b>${dbStatus}</b>

`;
          message += `<b>\u0421\u0435\u0440\u0432\u0438\u0441\u044B:</b>
`;
          message += `\u{1F916} Telegram \u0431\u043E\u0442: \u2705 \u0420\u0430\u0431\u043E\u0442\u0430\u0435\u0442
`;
          message += `\u{1F310} \u0412\u0435\u0431-\u0441\u0435\u0440\u0432\u0435\u0440: \u2705 \u0420\u0430\u0431\u043E\u0442\u0430\u0435\u0442
`;
          message += `\u{1F3A5} WebRTC: \u2705 \u0420\u0430\u0431\u043E\u0442\u0430\u0435\u0442
`;
          const keyboard = [
            [
              { text: "\u{1F504} \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C", callback_data: "admin:system_refresh" },
              { text: "\u{1F4CA} \u041F\u043E\u0434\u0440\u043E\u0431\u043D\u0435\u0435", callback_data: "admin:system_details" }
            ],
            [
              { text: "\u{1F4D1} \u041B\u043E\u0433\u0438", callback_data: "admin:system_logs" },
              { text: "\u{1F527} \u041E\u0431\u0441\u043B\u0443\u0436\u0438\u0432\u0430\u043D\u0438\u0435", callback_data: "admin:system_maintenance" }
            ],
            [
              { text: "\xAB \u041D\u0430\u0437\u0430\u0434 \u0432 \u0430\u0434\u043C\u0438\u043D-\u043F\u0430\u043D\u0435\u043B\u044C", callback_data: "admin:back" }
            ]
          ];
          if (state.lastMenuMessageId) {
            try {
              await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
            } catch (e) {
              console.log("Could not delete previous menu message", e);
            }
          }
          const sentMessage = await this.bot.sendMessage(chatId, message, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
          state.lastMenuMessageId = sentMessage.message_id;
        } catch (error) {
          console.error("Error sending admin system panel:", error);
          await this.bot?.sendMessage(chatId, "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u043E\u0439 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0438");
        }
      }
      // Остановка бота
      async stop() {
        if (this.bot) {
          this.bot.stopPolling();
          this.isInitialized = false;
          console.log("Telegram bot stopped");
        }
      }
      // === НОВЫЕ МЕТОДЫ ДЛЯ КАБИНЕТА СУПЕР-АДМИНА ===
      // Показать детали пользователя
      async showUserDetails(chatId, admin, userId) {
        if (!this.bot) return;
        try {
          const state = this.getUserState(chatId);
          const userInfo = await db.select().from(users).where(eq2(users.id, userId)).limit(1);
          if (userInfo.length === 0) {
            await this.bot.sendMessage(chatId, "\u26A0\uFE0F \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.");
            await this.showAdminUsers(chatId, admin);
            return;
          }
          const user = userInfo[0];
          const userConfs = await db.select({ count: sql2`count(*)` }).from(conferences).where(eq2(conferences.userId, user.id));
          const activeSubscription = user.subscriptionType === "pro";
          const message = `
\u{1F464} <b>\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435</b>

<b>ID:</b> ${user.id}
<b>\u0418\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F:</b> ${user.username}
<b>Email:</b> ${user.email || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D"}
<b>\u0422\u0435\u043B\u0435\u0433\u0440\u0430\u043C ID:</b> ${user.telegramId || "\u041D\u0435 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D"}
<b>\u0420\u043E\u043B\u044C:</b> ${this.formatUserRole(user.role)}
<b>\u0422\u0438\u043F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438:</b> ${user.subscriptionType === "pro" ? "\u{1F451} Pro" : "\u{1F319} Free"}
<b>\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0430 \u0434\u043E:</b> ${activeSubscription && user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).toLocaleDateString("ru-RU") : "\u041D\u0435 \u0430\u043A\u0442\u0438\u0432\u043D\u0430"}
<b>\u0411\u0430\u043B\u0430\u043D\u0441:</b> ${user.balance || 0} \u0440\u0443\u0431.

<b>\u0421\u043E\u0437\u0434\u0430\u043D\u043E \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0439:</b> ${userConfs[0].count}
<b>\u0414\u0430\u0442\u0430 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438:</b> ${new Date(user.createdAt).toLocaleDateString("ru-RU")}
      `;
          const keyboard = [
            [
              { text: "\u270F\uFE0F \u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C", callback_data: `admin:user_edit:${user.id}` },
              { text: "\u274C \u0423\u0434\u0430\u043B\u0438\u0442\u044C", callback_data: `admin:user_delete:${user.id}` }
            ],
            [
              { text: admin.role === "superadmin" ? "\u{1F451} \u0421\u0434\u0435\u043B\u0430\u0442\u044C \u0430\u0434\u043C\u0438\u043D\u043E\u043C" : "\u{1F451} \u041F\u043E\u0432\u044B\u0441\u0438\u0442\u044C", callback_data: `admin:user_promote:${user.id}` },
              { text: "\u{1F512} \u0417\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u0442\u044C", callback_data: `admin:user_ban:${user.id}` }
            ],
            [
              { text: "\u{1F4B0} \u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0431\u0430\u043B\u0430\u043D\u0441", callback_data: `admin:user_balance:${user.id}` },
              { text: "\u{1F31F} \u0412\u044B\u0434\u0430\u0442\u044C Pro-\u0441\u0442\u0430\u0442\u0443\u0441", callback_data: `admin:user_give_pro:${user.id}` }
            ],
            [
              { text: "\xAB \u041D\u0430\u0437\u0430\u0434 \u043A \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F\u043C", callback_data: "admin:users" }
            ]
          ];
          if (state.lastMenuMessageId) {
            try {
              await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
            } catch (e) {
              console.log("Could not delete previous menu message", e);
            }
          }
          const sentMessage = await this.bot.sendMessage(chatId, message, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
          state.lastMenuMessageId = sentMessage.message_id;
        } catch (error) {
          console.error("Error showing user details:", error);
          await this.bot.sendMessage(chatId, "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0438 \u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435.");
          await this.showAdminUsers(chatId, admin);
        }
      }
      // Показать форму редактирования пользователя
      async showUserEditForm(chatId, admin, userId) {
        if (!this.bot) return;
        try {
          const state = this.getUserState(chatId);
          const userInfo = await db.select().from(users).where(eq2(users.id, userId)).limit(1);
          if (userInfo.length === 0) {
            await this.bot.sendMessage(chatId, "\u26A0\uFE0F \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.");
            await this.showAdminUsers(chatId, admin);
            return;
          }
          const user = userInfo[0];
          const message = `
\u270F\uFE0F <b>\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F</b>

<b>ID:</b> ${user.id}
<b>\u0418\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F:</b> ${user.username}
<b>Email:</b> ${user.email || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D"}

\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u043E\u043B\u0435 \u0434\u043B\u044F \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F:
      `;
          const keyboard = [
            [
              { text: "\u{1F464} \u0418\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F", callback_data: `admin:user_edit_username:${user.id}` },
              { text: "\u{1F4E7} Email", callback_data: `admin:user_edit_email:${user.id}` }
            ],
            [
              { text: "\u{1F511} \u041F\u0430\u0440\u043E\u043B\u044C", callback_data: `admin:user_edit_password:${user.id}` },
              { text: "\u{1F451} \u0420\u043E\u043B\u044C", callback_data: `admin:user_edit_role:${user.id}` }
            ],
            [
              { text: "\u{1F4B0} \u0411\u0430\u043B\u0430\u043D\u0441", callback_data: `admin:user_edit_balance:${user.id}` },
              { text: "\u{1F31F} \u0422\u0438\u043F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438", callback_data: `admin:user_edit_subscription:${user.id}` }
            ],
            [
              { text: "\xAB \u0412\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F", callback_data: `admin:user_view:${user.id}` }
            ]
          ];
          if (state.lastMenuMessageId) {
            try {
              await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
            } catch (e) {
              console.log("Could not delete previous menu message", e);
            }
          }
          const sentMessage = await this.bot.sendMessage(chatId, message, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
          state.lastMenuMessageId = sentMessage.message_id;
        } catch (error) {
          console.error("Error showing user edit form:", error);
          await this.bot.sendMessage(chatId, "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0438 \u0444\u043E\u0440\u043C\u044B \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F.");
          await this.showAdminUsers(chatId, admin);
        }
      }
      // Показать подтверждение удаления пользователя
      async showUserDeleteConfirmation(chatId, admin, userId) {
        if (!this.bot) return;
        try {
          const state = this.getUserState(chatId);
          const userInfo = await db.select().from(users).where(eq2(users.id, userId)).limit(1);
          if (userInfo.length === 0) {
            await this.bot.sendMessage(chatId, "\u26A0\uFE0F \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.");
            await this.showAdminUsers(chatId, admin);
            return;
          }
          const user = userInfo[0];
          const message = `
\u26A0\uFE0F <b>\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F</b>

\u0412\u044B \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u0445\u043E\u0442\u0438\u0442\u0435 \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F?

<b>ID:</b> ${user.id}
<b>\u0418\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F:</b> ${user.username}
<b>Email:</b> ${user.email || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D"}

\u042D\u0442\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u044C.
      `;
          const keyboard = [
            [
              { text: "\u2705 \u0414\u0430, \u0443\u0434\u0430\u043B\u0438\u0442\u044C", callback_data: `admin:user_delete_confirm:${user.id}` },
              { text: "\u274C \u041E\u0442\u043C\u0435\u043D\u0430", callback_data: `admin:user_view:${user.id}` }
            ]
          ];
          if (state.lastMenuMessageId) {
            try {
              await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
            } catch (e) {
              console.log("Could not delete previous menu message", e);
            }
          }
          const sentMessage = await this.bot.sendMessage(chatId, message, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
          state.lastMenuMessageId = sentMessage.message_id;
        } catch (error) {
          console.error("Error showing user delete confirmation:", error);
          await this.bot.sendMessage(chatId, "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0438 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F.");
          await this.showAdminUsers(chatId, admin);
        }
      }
      // Показать административную статистику
      async showAdminStatistics(chatId, admin) {
        if (!this.bot) return;
        try {
          const state = this.getUserState(chatId);
          const userCount = await db.select({ count: sql2`count(*)` }).from(users);
          const newUsersToday = await db.select({ count: sql2`count(*)` }).from(users).where(sql2`DATE(${users.createdAt}) = CURRENT_DATE`);
          const proUserCount = await db.select({ count: sql2`count(*)` }).from(users).where(eq2(users.subscriptionType, "pro"));
          const confCount = await db.select({ count: sql2`count(*)` }).from(conferences);
          const activeConfCount = await db.select({ count: sql2`count(*)` }).from(conferences).where(eq2(conferences.active, true));
          const paymentCount = await db.select({ count: sql2`count(*)` }).from(payments);
          const successPaymentCount = await db.select({ count: sql2`count(*)` }).from(payments).where(eq2(payments.status, "completed"));
          const totalRevenue = await db.select({ total: sql2`sum(${payments.amount})` }).from(payments).where(eq2(payments.status, "completed"));
          const message = `
\u{1F4CA} <b>\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430 \u0441\u0438\u0441\u0442\u0435\u043C\u044B</b>

\u{1F465} <b>\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438:</b>
\u2022 \u0412\u0441\u0435\u0433\u043E: ${userCount[0].count}
\u2022 \u041D\u043E\u0432\u044B\u0445 \u0441\u0435\u0433\u043E\u0434\u043D\u044F: ${newUsersToday[0].count}
\u2022 Pro-\u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438: ${proUserCount[0].count} (${Number(userCount[0].count) > 0 ? (Number(proUserCount[0].count) / Number(userCount[0].count) * 100).toFixed(1) : 0}%)

\u{1F3A5} <b>\u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438:</b>
\u2022 \u0412\u0441\u0435\u0433\u043E: ${confCount[0].count}
\u2022 \u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0445: ${activeConfCount[0].count}

\u{1F4B0} <b>\u0424\u0438\u043D\u0430\u043D\u0441\u044B:</b>
\u2022 \u0412\u0441\u0435\u0433\u043E \u043F\u043B\u0430\u0442\u0435\u0436\u0435\u0439: ${paymentCount[0].count}
\u2022 \u0423\u0441\u043F\u0435\u0448\u043D\u044B\u0445: ${successPaymentCount[0].count}
\u2022 \u041E\u0431\u0449\u0430\u044F \u0432\u044B\u0440\u0443\u0447\u043A\u0430: ${totalRevenue[0].total || 0} \u0440\u0443\u0431.
      `;
          const keyboard = [
            [
              { text: "\u{1F4C5} \u041F\u043E \u0434\u043D\u044F\u043C", callback_data: "admin:stats_daily" },
              { text: "\u{1F4C8} \u0413\u0440\u0430\u0444\u0438\u043A\u0438", callback_data: "admin:stats_charts" }
            ],
            [
              { text: "\u{1F4B2} \u0414\u043E\u0445\u043E\u0434\u044B", callback_data: "admin:stats_revenue" },
              { text: "\u{1F5E3}\uFE0F \u041A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u044F", callback_data: "admin:stats_conversion" }
            ],
            [
              { text: "\xAB \u041D\u0430\u0437\u0430\u0434 \u0432 \u0430\u0434\u043C\u0438\u043D-\u043F\u0430\u043D\u0435\u043B\u044C", callback_data: "admin:back" }
            ]
          ];
          if (state.lastMenuMessageId) {
            try {
              await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
            } catch (e) {
              console.log("Could not delete previous menu message", e);
            }
          }
          const sentMessage = await this.bot.sendMessage(chatId, message, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
          state.lastMenuMessageId = sentMessage.message_id;
        } catch (error) {
          console.error("Error showing admin statistics:", error);
          await this.bot.sendMessage(chatId, "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0438.");
          await this.showAdminPanel(chatId, admin);
        }
      }
      // Показать настройки администратора
      async showAdminSettings(chatId, admin) {
        if (!this.bot) return;
        try {
          const state = this.getUserState(chatId);
          const settings = {
            welcomeMessage: "\u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C \u0432 Ikarus!",
            notificationEnabled: true,
            maxFreeDuration: 15,
            maxFreeParticipants: 5
          };
          const message = `
\u2699\uFE0F <b>\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0441\u0438\u0441\u0442\u0435\u043C\u044B</b>

<b>\u041F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435:</b>
${settings.welcomeMessage}

<b>\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F:</b> ${settings.notificationEnabled ? "\u2705 \u0412\u043A\u043B\u044E\u0447\u0435\u043D\u044B" : "\u274C \u0412\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u044B"}

<b>\u041E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E\u0433\u043E \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430:</b>
\u2022 \u041C\u0430\u043A\u0441. \u0434\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438: ${settings.maxFreeDuration} \u043C\u0438\u043D.
\u2022 \u041C\u0430\u043A\u0441. \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432: ${settings.maxFreeParticipants}

<b>\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0443 \u0434\u043B\u044F \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F:</b>
      `;
          const keyboard = [
            [
              { text: "\u270F\uFE0F \u041F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435", callback_data: "admin:settings_welcome" },
              {
                text: settings.notificationEnabled ? "\u{1F515} \u0412\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F" : "\u{1F514} \u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F",
                callback_data: `admin:settings_toggle_notifications:${!settings.notificationEnabled}`
              }
            ],
            [
              { text: "\u23F1\uFE0F \u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C (Free)", callback_data: "admin:settings_free_duration" },
              { text: "\u{1F465} \u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438 (Free)", callback_data: "admin:settings_free_participants" }
            ],
            [
              { text: "\u{1F504} \u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438", callback_data: "admin:settings_reset" }
            ],
            [
              { text: "\xAB \u041D\u0430\u0437\u0430\u0434 \u0432 \u0430\u0434\u043C\u0438\u043D-\u043F\u0430\u043D\u0435\u043B\u044C", callback_data: "admin:back" }
            ]
          ];
          if (state.lastMenuMessageId) {
            try {
              await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
            } catch (e) {
              console.log("Could not delete previous menu message", e);
            }
          }
          const sentMessage = await this.bot.sendMessage(chatId, message, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
          state.lastMenuMessageId = sentMessage.message_id;
        } catch (error) {
          console.error("Error showing admin settings:", error);
          await this.bot.sendMessage(chatId, "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A.");
          await this.showAdminPanel(chatId, admin);
        }
      }
      // Сохранить настройки администратора
      async saveAdminSettings(chatId, admin, param) {
        if (!this.bot) return;
        try {
          await this.bot.sendMessage(chatId, "\u2705 \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B.");
          await this.showAdminSettings(chatId, admin);
        } catch (error) {
          console.error("Error saving admin settings:", error);
          await this.bot.sendMessage(chatId, "\u26A0\uFE0F \u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0438 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A.");
          await this.showAdminSettings(chatId, admin);
        }
      }
      // Форматирование роли пользователя
      formatUserRole(role) {
        switch (role) {
          case "user":
            return "\u{1F464} \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C";
          case "host":
            return "\u{1F399}\uFE0F \u041E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440";
          case "admin":
            return "\u{1F6E1}\uFE0F \u0410\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440";
          case "superadmin":
            return "\u{1F451} \u0421\u0443\u043F\u0435\u0440-\u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440";
          default:
            return role;
        }
      }
    };
    telegramService = new TelegramService();
  }
});

// server/index.ts
import express2 from "express";

// server/routes.ts
init_storage();
import { createServer } from "http";

// server/auth.ts
init_storage();
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app2) {
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "yancuic-tlanextia-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !await comparePasswords(password, user.password)) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({
          error: "validation_error",
          message: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0441 \u0442\u0430\u043A\u0438\u043C \u0438\u043C\u0435\u043D\u0435\u043C \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442",
          field: "username"
        });
      }
      if (req.body.email) {
        const existingEmail = await storage.getUserByEmail(req.body.email);
        if (existingEmail) {
          return res.status(400).json({
            error: "validation_error",
            message: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0441 \u0442\u0430\u043A\u0438\u043C email \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442",
            field: "email"
          });
        }
      }
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password)
      });
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438:", error);
      return res.status(500).json({
        error: "server_error",
        message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F"
      });
    }
  });
  app2.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0430\u0443\u0442\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u0438:", err);
        return next(err);
      }
      if (!user) {
        console.log("\u041D\u0435\u0443\u0434\u0430\u0447\u043D\u0430\u044F \u043F\u043E\u043F\u044B\u0442\u043A\u0430 \u0432\u0445\u043E\u0434\u0430, \u0438\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F:", req.body.username);
        return res.status(401).json({
          error: "auth_failed",
          message: "\u041D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0438\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C"
        });
      }
      req.login(user, (err2) => {
        if (err2) {
          console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0432\u0445\u043E\u0434\u0430 \u0432 \u0441\u0438\u0441\u0442\u0435\u043C\u0443:", err2);
          return next(err2);
        }
        console.log("\u0423\u0441\u043F\u0435\u0448\u043D\u044B\u0439 \u0432\u0445\u043E\u0434 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F:", user.username);
        return res.status(200).json(user);
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}

// server/routes.ts
import { WebSocket as WebSocket2 } from "ws";

// server/webrtc.ts
init_storage();
import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
var rooms = /* @__PURE__ */ new Map();
function setupWebRTC(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    perMessageDeflate: false,
    // Отключаем сжатие для повышения стабильности
    maxPayload: 65536,
    // Увеличиваем максимальный размер сообщения до 64KB для надежности
    clientTracking: true
  });
  storage.wss = wss;
  wss.on("connection", (ws, request) => {
    console.log("WebSocket connection established");
    const extendedWs = ws;
    extendedWs.userId = "";
    extendedWs.roomId = "";
    extendedWs.isAlive = true;
    extendedWs.requestHeaders = {};
    if (request && request.headers) {
      extendedWs.requestHeaders["user-agent"] = request.headers["user-agent"] || "";
      extendedWs.requestHeaders["referer"] = request.headers["referer"] || "";
      extendedWs.requestHeaders["origin"] = request.headers["origin"] || "";
    }
    try {
      extendedWs.send(JSON.stringify({
        type: "connection-established",
        timestamp: Date.now(),
        serverInfo: {
          // Предоставляем минимальную информацию о сервере для диагностики
          timeZone: new Intl.DateTimeFormat().resolvedOptions().timeZone,
          uptime: process.uptime()
        }
      }));
    } catch (err) {
      console.error("Error sending welcome message:", err);
    }
    extendedWs.on("pong", () => {
      extendedWs.isAlive = true;
    });
    startPingPong(extendedWs);
    extendedWs.on("message", (message) => {
      try {
        extendedWs.isAlive = true;
        const data = JSON.parse(message.toString());
        switch (data.type) {
          case "join-room":
            handleJoinRoom(extendedWs, data);
            break;
          case "leave-room":
            handleLeaveRoom(extendedWs);
            break;
          case "offer":
          case "answer":
          case "ice-candidate":
            handleSignalingMessage(extendedWs, data);
            break;
          case "toggle-media":
            handleToggleMedia(extendedWs, data);
            break;
          case "chat-message":
            handleChatMessage(extendedWs, data);
            break;
          case "hand-state-changed":
            handleHandStateChanged(extendedWs, data);
            break;
          case "recording-state-changed":
            handleRecordingStateChanged(extendedWs, data);
            break;
          case "update-host-settings":
            handleUpdateHostSettings(extendedWs, data);
            break;
          case "ping":
            if (extendedWs.readyState === WebSocket.OPEN) {
              try {
                extendedWs.send(JSON.stringify({ type: "pong" }));
              } catch (err) {
                console.error("Error sending pong:", err);
              }
            }
            extendedWs.isAlive = true;
            break;
          case "file-shared":
            handleFileShare(extendedWs, data);
            break;
          case "poll-created":
            handlePollCreated(extendedWs, data);
            break;
          case "poll-vote":
            handlePollVote(extendedWs, data);
            break;
          case "poll-ended":
            handlePollEnded(extendedWs, data);
            break;
          case "pong":
            extendedWs.isAlive = true;
            break;
          default:
            if (data.type !== "whiteboard-toggle") {
              console.warn(`Received unknown message type: ${data.type}`);
            }
        }
      } catch (err) {
        console.error("Error processing message:", err);
      }
    });
    extendedWs.on("close", () => {
      console.log("WebSocket connection closed");
      if (extendedWs.pingInterval) {
        clearInterval(extendedWs.pingInterval);
      }
      handleLeaveRoom(extendedWs);
    });
    extendedWs.on("error", (error) => {
      console.error("WebSocket connection error:", error);
      if (extendedWs.pingInterval) {
        clearInterval(extendedWs.pingInterval);
      }
      handleLeaveRoom(extendedWs);
    });
  });
  console.log("WebRTC WebSocket server initialized");
  return wss;
}
function startPingPong(ws) {
  if (ws.pingInterval) {
    clearInterval(ws.pingInterval);
  }
  const userAgent = ws.requestHeaders?.["user-agent"] || "";
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
  const pingInterval = isMobile ? 15e3 : 3e4;
  ws.pingInterval = setInterval(() => {
    if (!ws.isAlive) {
      console.log("Connection is not alive, terminating");
      if (ws.pingInterval) clearInterval(ws.pingInterval);
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "connection-timeout",
            message: "Connection timed out due to inactivity"
          }));
        }
      } catch (e) {
      }
      return ws.terminate();
    }
    ws.isAlive = false;
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
        if (isMobile) {
          ws.send(JSON.stringify({
            type: "ping",
            timestamp: Date.now()
          }));
        }
      }
    } catch (err) {
      console.error("Error sending ping:", err);
      if (ws.pingInterval) clearInterval(ws.pingInterval);
      ws.terminate();
    }
  }, pingInterval);
}
function handleJoinRoom(ws, data) {
  if (!data.roomId || !data.payload || !data.payload.userId || !data.payload.name) {
    return sendError(ws, "Missing required join data");
  }
  const roomId = data.roomId;
  const userId = data.payload.userId;
  const username = data.payload.name;
  const isAdmin = !!data.payload.isAdmin;
  const isHost = !!data.payload.isHost;
  const hostVideoPriority = data.payload.hostVideoPriority !== void 0 ? data.payload.hostVideoPriority : true;
  const allowParticipantDetach = data.payload.allowParticipantDetach !== void 0 ? data.payload.allowParticipantDetach : true;
  if (ws.roomId && ws.userId) {
    handleLeaveRoom(ws);
  }
  console.log(`User ${username} (${userId}) joining room ${roomId}`);
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      clients: /* @__PURE__ */ new Map(),
      participants: /* @__PURE__ */ new Map(),
      createdAt: Date.now(),
      hostId: isHost ? userId : void 0,
      hostVideoPriority,
      allowParticipantDetach
    });
  } else if (isHost) {
    const room2 = rooms.get(roomId);
    room2.hostId = userId;
    room2.hostVideoPriority = hostVideoPriority;
    room2.allowParticipantDetach = allowParticipantDetach;
  }
  const room = rooms.get(roomId);
  const existingClient = room.clients.get(userId);
  if (existingClient && existingClient !== ws) {
    sendToClient(existingClient, {
      type: "connection-replaced",
      payload: { message: "Your connection was replaced by a new one" }
    });
    if (existingClient.pingInterval) {
      clearInterval(existingClient.pingInterval);
    }
    existingClient.terminate();
    room.clients.delete(userId);
  }
  ws.userId = userId;
  ws.roomId = roomId;
  room.clients.set(userId, ws);
  const participant = {
    id: userId,
    name: username,
    isAdmin,
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
  const existingParticipants = Array.from(room.participants.values()).filter((p) => p.id !== userId);
  sendToClient(ws, {
    type: "room-users",
    payload: { participants: existingParticipants }
  });
  broadcastToRoom(roomId, {
    type: "user-joined",
    payload: {
      userId,
      participant
    }
  }, userId);
  console.log(`Room ${roomId} now has ${room.participants.size} participants`);
}
function handleLeaveRoom(ws) {
  const { userId, roomId } = ws;
  if (!userId || !roomId) return;
  console.log(`User ${userId} leaving room ${roomId}`);
  const room = rooms.get(roomId);
  if (room) {
    const isHost = room.hostId === userId;
    room.clients.delete(userId);
    room.participants.delete(userId);
    if (isHost && room.participants.size > 0) {
      const newHostId = Array.from(room.participants.keys())[0];
      room.hostId = newHostId;
      const newHost = room.participants.get(newHostId);
      if (newHost) {
        newHost.isHost = true;
      }
      broadcastToRoom(roomId, {
        type: "host-changed",
        payload: {
          userId: newHostId,
          hostVideoPriority: room.hostVideoPriority,
          allowParticipantDetach: room.allowParticipantDetach
        }
      });
    }
    broadcastToRoom(roomId, {
      type: "user-left",
      payload: { userId }
    });
    console.log(`Room ${roomId} now has ${room.participants.size} participants`);
    if (room.clients.size === 0) {
      console.log(`Room ${roomId} is empty, removing`);
      rooms.delete(roomId);
    }
  }
  ws.userId = "";
  ws.roomId = "";
}
function handleSignalingMessage(ws, data) {
  if (!ws.userId || !ws.roomId || !data.to) {
    return sendError(ws, "Invalid signaling message");
  }
  const userAgent = ws.requestHeaders?.["user-agent"] || "";
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
  const isLowEndMobile = isMobile && /Android 4|Android 5|iPhone 5|iPhone 6/i.test(userAgent);
  if (data.type === "ice-candidate" && data.payload?.candidate) {
    const candidateStr = data.payload.candidate.toLowerCase();
    if (isLowEndMobile && candidateStr.includes("tcptype") && candidateStr.includes("relay")) {
      return;
    }
    const priority = (
      // Локальные/хост-кандидаты имеют наивысший приоритет
      candidateStr.includes("host") ? "critical" : (
        // Рефлексивные кандидаты (STUN) - следующий приоритет
        candidateStr.includes("srflx") ? "high" : (
          // Relay кандидаты - средний приоритет
          candidateStr.includes("relay") ? "medium" : "low"
        )
      )
    );
    const optimizedPayload = {
      c: data.payload.candidate,
      m: data.payload.sdpMid,
      l: data.payload.sdpMLineIndex
    };
    sendToUser(data.to, {
      t: "i",
      // 'i' вместо 'ice-candidate'
      p: optimizedPayload,
      f: ws.userId,
      r: priority,
      m: isMobile ? 1 : 0
      // Еще сильнее оптимизируем: 1 или 0 вместо boolean
    });
  } else if (data.type === "offer" || data.type === "answer") {
    let sdp = data.payload;
    if (isLowEndMobile && sdp && sdp.sdp) {
      try {
        sendToUser(data.to, {
          t: data.type.charAt(0),
          // 'o' для offer, 'a' для answer
          p: sdp,
          f: ws.userId,
          r: "critical",
          // SDP-сообщения всегда критичны
          m: isMobile ? 1 : 0
        });
      } catch (e) {
        sendToUser(data.to, {
          type: data.type,
          payload: data.payload,
          from: ws.userId,
          priority: "high",
          isMobile
        });
      }
    } else {
      sendToUser(data.to, {
        t: data.type.charAt(0),
        // 'o' для offer, 'a' для answer
        p: sdp,
        f: ws.userId,
        r: "high",
        m: isMobile ? 1 : 0
      });
    }
  } else {
    sendToUser(data.to, {
      type: data.type,
      payload: data.payload,
      from: ws.userId,
      priority: "normal",
      isMobile
    });
  }
}
function handleToggleMedia(ws, data) {
  if (!ws.userId || !ws.roomId || !data.payload || !data.payload.type) {
    return sendError(ws, "Invalid media toggle message");
  }
  const room = rooms.get(ws.roomId);
  if (!room) return;
  const participant = room.participants.get(ws.userId);
  if (!participant) return;
  if (data.payload.type === "audio") {
    participant.audioEnabled = !!data.payload.enabled;
  } else if (data.payload.type === "video") {
    participant.videoEnabled = !!data.payload.enabled;
  }
  broadcastToRoom(ws.roomId, {
    type: "media-state-changed",
    payload: {
      userId: ws.userId,
      mediaType: data.payload.type,
      enabled: data.payload.type === "audio" ? participant.audioEnabled : participant.videoEnabled
    }
  });
}
function handleChatMessage(ws, data) {
  if (!ws.userId || !ws.roomId || !data.payload || !data.payload.message) {
    return sendError(ws, "Invalid chat message");
  }
  const room = rooms.get(ws.roomId);
  if (!room) return;
  const participant = room.participants.get(ws.userId);
  if (!participant) return;
  broadcastToRoom(ws.roomId, {
    type: "chat-message",
    payload: {
      id: uuidv4(),
      senderId: ws.userId,
      senderName: participant.name,
      text: data.payload.message,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      isAdmin: participant.isAdmin
    }
  });
}
function handleHandStateChanged(ws, data) {
  if (!ws.userId || !ws.roomId) {
    return;
  }
  broadcastToRoom(ws.roomId, {
    type: "hand-state-changed",
    payload: {
      userId: ws.userId,
      raised: !!data.payload?.raised
    }
  });
}
function handleRecordingStateChanged(ws, data) {
  if (!ws.userId || !ws.roomId) {
    return;
  }
  const room = rooms.get(ws.roomId);
  if (!room) return;
  const participant = room.participants.get(ws.userId);
  if (!participant || !participant.isAdmin && !participant.isHost && room.hostId !== ws.userId) {
    return sendError(ws, "Only admin or host can control recording");
  }
  broadcastToRoom(ws.roomId, {
    type: "recording-state-changed",
    payload: {
      isRecording: !!data.payload?.isRecording
    }
  });
}
function handleFileShare(ws, data) {
  if (!ws.userId || !ws.roomId || !data.payload) {
    return;
  }
  broadcastToRoom(ws.roomId, {
    type: "file-shared",
    payload: data.payload
  });
}
function handlePollCreated(ws, data) {
  if (!ws.userId || !ws.roomId || !data.payload) {
    return;
  }
  const room = rooms.get(ws.roomId);
  if (!room) return;
  const participant = room.participants.get(ws.userId);
  if (!participant || !participant.isAdmin && !participant.isHost && room.hostId !== ws.userId) {
    return sendError(ws, "Only admin or host can create polls");
  }
  broadcastToRoom(ws.roomId, {
    type: "poll-created",
    payload: data.payload
  });
}
function handleUpdateHostSettings(ws, data) {
  if (!ws.userId || !ws.roomId || !data.payload) {
    return sendError(ws, "Invalid host settings update");
  }
  const room = rooms.get(ws.roomId);
  if (!room) return;
  if (room.hostId !== ws.userId) {
    return sendError(ws, "Only host can update room settings");
  }
  if (data.payload.hostVideoPriority !== void 0) {
    room.hostVideoPriority = !!data.payload.hostVideoPriority;
  }
  if (data.payload.allowParticipantDetach !== void 0) {
    room.allowParticipantDetach = !!data.payload.allowParticipantDetach;
  }
  broadcastToRoom(ws.roomId, {
    type: "host-settings-updated",
    payload: {
      hostVideoPriority: room.hostVideoPriority,
      allowParticipantDetach: room.allowParticipantDetach
    }
  });
}
function handlePollVote(ws, data) {
  if (!ws.userId || !ws.roomId || !data.payload) {
    return;
  }
  broadcastToRoom(ws.roomId, {
    type: "poll-vote",
    payload: {
      ...data.payload,
      userId: ws.userId
    }
  });
}
function handlePollEnded(ws, data) {
  if (!ws.userId || !ws.roomId || !data.payload) {
    return;
  }
  const room = rooms.get(ws.roomId);
  if (!room) return;
  const participant = room.participants.get(ws.userId);
  if (!participant || !participant.isAdmin && !participant.isHost && room.hostId !== ws.userId) {
    return sendError(ws, "Only admin or host can end polls");
  }
  broadcastToRoom(ws.roomId, {
    type: "poll-ended",
    payload: {
      ...data.payload,
      endedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
}
function sendError(ws, message) {
  sendToClient(ws, {
    type: "error",
    payload: { message }
  });
}
function sendToClient(ws, message) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      const priority = message.priority || message.r;
      const isMobile = ws.requestHeaders && /iPhone|iPad|iPod|Android/i.test(ws.requestHeaders["user-agent"] || "");
      if (isMobile) {
        if (typeof message !== "string") {
          const compactMessage = compactifyMessage(message);
          ws.send(JSON.stringify(compactMessage));
        } else {
          ws.send(message);
        }
      } else {
        if (typeof message !== "string") {
          const jsonString = JSON.stringify(message);
          ws.send(jsonString);
        } else {
          ws.send(message);
        }
      }
      return true;
    }
  } catch (err) {
    console.error("Error sending message to client:", err);
  }
  return false;
}
function compactifyMessage(message) {
  if (message.t && message.p !== void 0) {
    return message;
  }
  const compactMessage = {};
  if (message.type) compactMessage.t = message.type;
  if (message.payload !== void 0) compactMessage.p = message.payload;
  if (message.from) compactMessage.f = message.from;
  if (message.to) compactMessage.to = message.to;
  if (message.priority) compactMessage.r = message.priority;
  if (message.timestamp) compactMessage.ts = message.timestamp;
  return compactMessage;
}
function sendToUser(userId, message) {
  for (const room of rooms.values()) {
    const ws = room.clients.get(userId);
    if (ws) {
      return sendToClient(ws, message);
    }
  }
  return false;
}
function broadcastToRoom(roomId, message, excludeUserId) {
  const room = rooms.get(roomId);
  if (!room) return;
  const mobileClients = [];
  const desktopClients = [];
  room.clients.forEach((ws, userId) => {
    if (excludeUserId === userId || ws.readyState !== WebSocket.OPEN) return;
    const userAgent = ws.requestHeaders?.["user-agent"] || "";
    if (/iPhone|iPad|iPod|Android/i.test(userAgent)) {
      mobileClients.push(ws);
    } else {
      desktopClients.push(ws);
    }
  });
  if (mobileClients.length > 0) {
    const mobileMessage = compactifyMessage(message);
    const serializedMobile = JSON.stringify(mobileMessage);
    mobileClients.forEach((ws) => {
      try {
        ws.send(serializedMobile);
      } catch (err) {
        console.error(`Error broadcasting to mobile client:`, err);
      }
    });
  }
  if (desktopClients.length > 0) {
    const serializedDesktop = JSON.stringify(message);
    desktopClients.forEach((ws) => {
      try {
        ws.send(serializedDesktop);
      } catch (err) {
        console.error(`Error broadcasting to desktop client:`, err);
      }
    });
  }
}
var cleanupInterval = setInterval(() => {
  try {
    const now = Date.now();
    for (const [roomId, room] of rooms.entries()) {
      const inactiveClients = Array.from(room.clients.entries()).filter(([, ws]) => !ws.isAlive || ws.readyState !== WebSocket.OPEN).map(([userId]) => userId);
      if (inactiveClients.length > 0) {
        console.log(`Removing ${inactiveClients.length} inactive clients from room ${roomId}`);
        inactiveClients.forEach((userId) => {
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
          broadcastToRoom(roomId, {
            type: "user-left",
            payload: { userId }
          });
        });
      }
      const isInactive = room.clients.size === 0 || now - room.createdAt > 24 * 60 * 60 * 1e3;
      if (isInactive) {
        console.log(`Removing inactive room ${roomId}`);
        rooms.delete(roomId);
        try {
          storage.getConference(roomId).then((conference) => {
            if (conference && conference.active) {
              storage.updateConference(roomId, { active: false });
            }
          }).catch((err) => console.error(`Error updating conference status: ${err}`));
        } catch (err) {
          console.error(`Error updating conference status: ${err}`);
        }
      }
    }
  } catch (err) {
    console.error("Error in room cleanup:", err);
  }
}, 6e4);
process.on("SIGINT", () => {
  clearInterval(cleanupInterval);
  process.exit(0);
});

// server/routes.ts
init_schema();
init_telegram();
import { z } from "zod";
import { scrypt as scrypt3, randomBytes as randomBytes3 } from "crypto";
import { promisify as promisify4 } from "util";

// server/admin.ts
init_storage();

// server/cache.ts
var ServerCache = class {
  /**
   * Инициализация кеша с настройками
   * @param maxSize Максимальное количество записей в кеше
   * @param defaultTTL Время жизни записи по умолчанию (в миллисекундах)
   * @param cleanupIntervalMs Интервал очистки устаревших записей (в миллисекундах)
   */
  constructor(maxSize = 100, defaultTTL = 6e4, cleanupIntervalMs = 6e4) {
    this.hitCount = 0;
    this.missCount = 0;
    this.cleanupInterval = null;
    this.cache = /* @__PURE__ */ new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }
  /**
   * Получение данных из кеша
   * @param key Ключ для поиска данных
   * @returns Данные или undefined если не найдены или устарели
   */
  get(key) {
    const entry = this.cache.get(key);
    const now = Date.now();
    if (!entry) {
      this.missCount++;
      return void 0;
    }
    if (entry.expires < now) {
      this.cache.delete(key);
      this.missCount++;
      return void 0;
    }
    this.hitCount++;
    return entry.data;
  }
  /**
   * Сохранение данных в кеше
   * @param key Ключ для сохранения данных
   * @param data Данные для сохранения
   * @param ttl Время жизни в миллисекундах (опционально)
   */
  set(key, data, ttl = this.defaultTTL) {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }
    const expires = Date.now() + ttl;
    this.cache.set(key, { data, expires });
  }
  /**
   * Удаление данных из кеша
   * @param key Ключ для удаления
   * @returns true если данные были удалены, false если их не было
   */
  delete(key) {
    return this.cache.delete(key);
  }
  /**
   * Очистка всего кеша
   */
  clear() {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }
  /**
   * Получение статистики использования кеша
   */
  getStats() {
    const total = this.hitCount + this.missCount;
    const hitRate = total ? this.hitCount / total : 0;
    return {
      size: this.cache.size,
      hits: this.hitCount,
      misses: this.missCount,
      hitRate
    };
  }
  /**
   * Удаление всех записей содержащих подстроку в ключе
   * Полезно для инвалидации связанных данных
   * @param substring Подстрока для поиска в ключах
   */
  invalidateByPrefix(substring) {
    for (const key of this.cache.keys()) {
      if (key.includes(substring)) {
        this.cache.delete(key);
      }
    }
  }
  /**
   * Остановка процессов кеширования и очистка ресурсов
   */
  dispose() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
  /**
   * Очистка устаревших записей из кеша
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.cache.delete(key);
      }
    }
  }
  /**
   * Удаление самой старой записи из кеша
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < oldestTime) {
        oldestTime = entry.expires;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
};
var serverCache = new ServerCache(500, 5 * 60 * 1e3);
var cache_default = serverCache;

// server/admin.ts
init_db();
init_schema();
import { eq as eq3, desc as desc3, lt, lte, gte as gte3, sql as sql3 } from "drizzle-orm";
import os from "os";
import { exec } from "child_process";
import { promisify as promisify3 } from "util";
import * as fs from "fs";

// server/payments.ts
init_storage();
import { v4 as uuidv42 } from "uuid";
import { YooCheckout } from "@a2seven/yoo-checkout";
var YOUKASSA_SHOP_ID = process.env.YOUKASSA_SHOP_ID || "";
var YOUKASSA_SECRET_KEY = process.env.YOUKASSA_SECRET_KEY || "";
if (!YOUKASSA_SHOP_ID || !YOUKASSA_SECRET_KEY) {
  console.error("\u0412\u041D\u0418\u041C\u0410\u041D\u0418\u0415: \u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0442 \u043A\u043B\u044E\u0447\u0438 \u042EKassa. \u041F\u043B\u0430\u0442\u0435\u0436\u043D\u0430\u044F \u0441\u0438\u0441\u0442\u0435\u043C\u0430 \u043D\u0435 \u0431\u0443\u0434\u0435\u0442 \u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C.");
}
var checkout = new YooCheckout({
  shopId: YOUKASSA_SHOP_ID,
  secretKey: YOUKASSA_SECRET_KEY
});
var PaymentService = class {
  // Создание нового платежа
  static async createPayment(data) {
    try {
      if (!checkout) {
        throw new Error("\u041F\u043B\u0430\u0442\u0435\u0436\u043D\u044B\u0439 \u0441\u0435\u0440\u0432\u0438\u0441 \u043D\u0435 \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D");
      }
      const { amount, plan, months, userId, isRenewal, description } = data;
      const idempotenceKey = uuidv42();
      const createPayload = {
        amount: {
          value: amount.toFixed(2),
          currency: "RUB"
        },
        capture: true,
        confirmation: {
          type: "redirect",
          return_url: `${process.env.BASE_URL || "http://localhost:3000"}/payment-success`
        },
        description: description || `\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0430 \u043D\u0430 \u043F\u043B\u0430\u043D "${plan}" \u043D\u0430 ${months} \u043C\u0435\u0441.`,
        metadata: {
          userId: userId.toString(),
          plan,
          months: months.toString(),
          isRenewal: isRenewal ? "true" : "false"
        }
      };
      const payment = await checkout.createPayment(
        createPayload,
        idempotenceKey
      );
      await storage.createPayment({
        userId,
        amount,
        status: "pending",
        externalId: payment.id,
        type: "subscription",
        details: JSON.stringify({
          plan,
          months,
          isRenewal: !!isRenewal
        }),
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      return {
        paymentId: payment.id,
        confirmation_url: payment.confirmation.confirmation_url,
        status: payment.status
      };
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u043F\u043B\u0430\u0442\u0435\u0436\u0430:", error);
      throw new Error(`\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u043F\u043B\u0430\u0442\u0435\u0436\u0430: ${error.message}`);
    }
  }
  // Получение информации о платеже
  static async getPaymentInfo(paymentId) {
    try {
      const payment = await checkout.getPayment(paymentId);
      return payment;
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0438 \u043E \u043F\u043B\u0430\u0442\u0435\u0436\u0435:", error);
      throw new Error(`\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0438 \u043E \u043F\u043B\u0430\u0442\u0435\u0436\u0435: ${error.message}`);
    }
  }
  // Обработка webhook-уведомления от ЮKassa
  static async handleWebhookNotification(body) {
    try {
      const { event, object } = body;
      if (event === "payment.succeeded") {
        const paymentInfo = await storage.getPaymentByExternalId(object.id);
        if (!paymentInfo) {
          throw new Error(`\u041F\u043B\u0430\u0442\u0435\u0436 \u0441 id ${object.id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 \u0441\u0438\u0441\u0442\u0435\u043C\u0435`);
        }
        await storage.updatePayment(paymentInfo.id, {
          status: "completed",
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        const details = JSON.parse(paymentInfo.details);
        const { plan, months, isRenewal } = details;
        const user = await storage.getUser(paymentInfo.userId);
        if (!user) {
          throw new Error(`\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0441 id ${paymentInfo.userId} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`);
        }
        let expiresAt = /* @__PURE__ */ new Date();
        if (isRenewal && user.subscriptionExpiresAt) {
          expiresAt = new Date(user.subscriptionExpiresAt);
        }
        expiresAt.setMonth(expiresAt.getMonth() + parseInt(months, 10));
        await storage.updateUser(paymentInfo.userId, {
          subscriptionType: "pro",
          subscriptionExpiresAt: expiresAt.toISOString()
        });
        await storage.createBalanceHistory({
          userId: paymentInfo.userId,
          amount: paymentInfo.amount,
          type: "payment",
          description: `\u041E\u043F\u043B\u0430\u0442\u0430 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 "${plan}" \u043D\u0430 ${months} \u043C\u0435\u0441.`,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        console.log(`\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0430 \u0430\u043A\u0442\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u043D\u0430 \u0434\u043B\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F ${paymentInfo.userId}, \u043F\u043B\u0430\u043D: ${plan}, \u0438\u0441\u0442\u0435\u043A\u0430\u0435\u0442: ${expiresAt.toISOString()}`);
      } else if (event === "payment.canceled") {
        const paymentInfo = await storage.getPaymentByExternalId(object.id);
        if (paymentInfo) {
          await storage.updatePayment(paymentInfo.id, {
            status: "canceled",
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      }
      return { success: true };
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0438 webhook:", error);
      throw new Error(`\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0438 webhook: ${error.message}`);
    }
  }
  // Получение статистики платежей для админ-панели
  static async getPaymentStats() {
    try {
      const allPayments = await storage.getAllPayments();
      const successfulPayments = allPayments.filter((p) => p.status === "completed");
      const totalAmount = successfulPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const subscriptionsByType = {};
      const revenueByMonth = {};
      successfulPayments.forEach((payment) => {
        try {
          const details = JSON.parse(payment.details);
          if (details.plan) {
            subscriptionsByType[details.plan] = (subscriptionsByType[details.plan] || 0) + 1;
          }
          const paymentDate = new Date(payment.createdAt);
          const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, "0")}`;
          revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + payment.amount;
        } catch (e) {
          console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0430\u043D\u0430\u043B\u0438\u0437\u0435 \u0434\u0435\u0442\u0430\u043B\u0435\u0439 \u043F\u043B\u0430\u0442\u0435\u0436\u0430:", e);
        }
      });
      const conversionRate = allPayments.length > 0 ? successfulPayments.length / allPayments.length * 100 : 0;
      const averagePaymentAmount = successfulPayments.length > 0 ? totalAmount / successfulPayments.length : 0;
      const latestPayments = allPayments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);
      return {
        totalPayments: successfulPayments.length,
        totalAmount,
        subscriptionsByType,
        revenueByMonth,
        latestPayments,
        conversionRate,
        averagePaymentAmount
      };
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0438 \u043F\u043B\u0430\u0442\u0435\u0436\u0435\u0439:", error);
      throw new Error(`\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0438 \u043F\u043B\u0430\u0442\u0435\u0436\u0435\u0439: ${error.message}`);
    }
  }
};

// server/admin.ts
var execAsync = promisify3(exec);
function requireAdmin(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "\u041D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u0430 \u0430\u0443\u0442\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u044F" });
  }
  if (req.user.role !== "admin" && req.user.role !== "superadmin") {
    return res.status(403).json({ error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043F\u0440\u0430\u0432 \u0434\u043E\u0441\u0442\u0443\u043F\u0430" });
  }
  next();
}
function requireSuperAdmin(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "\u041D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u0430 \u0430\u0443\u0442\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u044F" });
  }
  if (req.user.role !== "superadmin") {
    return res.status(403).json({ error: "\u041D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u044B \u043F\u0440\u0430\u0432\u0430 \u0441\u0443\u043F\u0435\u0440\u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430" });
  }
  next();
}
var cpuHistory = [];
var memoryHistory = [];
async function getSystemInfo() {
  try {
    const cpuInfo = os.cpus();
    const cpuModel = cpuInfo[0].model;
    const cpuCores = cpuInfo.length;
    const totalMemory = Math.round(os.totalmem() / (1024 * 1024 * 1024) * 10) / 10;
    const freeMemory = Math.round(os.freemem() / (1024 * 1024 * 1024) * 10) / 10;
    const usedMemory = Math.round((totalMemory - freeMemory) * 10) / 10;
    const memoryUsage = Math.round(usedMemory / totalMemory * 100);
    const loadAverage = os.loadavg();
    const uptime = Math.round(os.uptime() / 3600 * 10) / 10;
    const diskInfo = await execAsync("df -h / | awk '{print $2, $3, $5}' | tail -1");
    const diskParts = diskInfo.stdout.trim().split(/\s+/);
    const totalDisk = diskParts[0].replace("G", "");
    const usedDisk = diskParts[1].replace("G", "");
    const diskUsage = parseInt(diskParts[2].replace("%", ""));
    const netStatBefore = await getNetworkStats();
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    const netStatAfter = await getNetworkStats();
    const networkIn = Math.round((netStatAfter.rx - netStatBefore.rx) / 125e3);
    const networkOut = Math.round((netStatAfter.tx - netStatBefore.tx) / 125e3);
    const nodeVersion = process.version;
    const { stdout: procOut } = await execAsync("ps aux | wc -l");
    const processes = parseInt(procOut.trim()) - 1;
    const { stdout: cpuOut } = await execAsync(`top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk '{print 100 - $1}'`);
    const cpu = parseFloat(cpuOut.trim());
    const now = /* @__PURE__ */ new Date();
    const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`;
    cpuHistory.push({ time: timeStr, usage: Math.round(cpu) });
    memoryHistory.push({ time: timeStr, usage: memoryUsage });
    if (cpuHistory.length > 20) cpuHistory.shift();
    if (memoryHistory.length > 20) memoryHistory.shift();
    const services = {
      api: true,
      // Сервер Express всегда работает, если мы получаем запрос
      webrtc: await checkServiceStatus("webrtc"),
      telegram: await checkServiceStatus("telegram"),
      database: await checkDatabaseStatus()
    };
    const cacheStats = serverCache.getStats();
    return {
      os: {
        type: os.type(),
        platform: os.platform(),
        version: os.release()
      },
      cpu,
      cpuModel,
      cpuCores,
      totalMemory,
      usedMemory,
      freeMemory,
      memoryUsage,
      loadAverage,
      uptime,
      totalDisk,
      usedDisk,
      diskUsage,
      networkIn,
      networkOut,
      nodeVersion,
      processes,
      services,
      cpuHistory,
      memoryHistory,
      cache: {
        size: cacheStats.size,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: Math.round(cacheStats.hitRate * 100)
      }
    };
  } catch (error) {
    console.error("Error getting system info:", error);
    return {
      error: "Failed to get system information",
      cpuHistory,
      memoryHistory
    };
  }
}
async function getNetworkStats() {
  try {
    const { stdout } = await execAsync("cat /proc/net/dev | grep -v face | grep -v lo | awk '{print $2, $10}'");
    const lines = stdout.trim().split("\n");
    let rx = 0;
    let tx = 0;
    for (const line of lines) {
      if (!line.trim()) continue;
      const [rxBytes, txBytes] = line.trim().split(/\s+/).map(Number);
      rx += rxBytes;
      tx += txBytes;
    }
    return { rx, tx };
  } catch (error) {
    console.error("Error getting network stats:", error);
    return { rx: 0, tx: 0 };
  }
}
async function checkServiceStatus(service) {
  try {
    if (service === "webrtc") {
      const { stdout } = await execAsync('netstat -tulpn | grep -E ":3000|LISTEN" | wc -l');
      return parseInt(stdout.trim()) > 0;
    } else if (service === "telegram") {
      const [settings] = await db.select().from(telegramSettings);
      return settings?.isConnected || false;
    }
    return false;
  } catch (error) {
    console.error(`Error checking service ${service} status:`, error);
    return false;
  }
}
async function checkDatabaseStatus() {
  try {
    await db.execute(sql3`SELECT 1`);
    return true;
  } catch (error) {
    console.error("Error checking database status:", error);
    return false;
  }
}
async function getSecurityLogs() {
  try {
    const logLines = [];
    if (!fs.existsSync("./logs/security.log")) {
      return [];
    }
    const content = fs.readFileSync("./logs/security.log", "utf8");
    const lines = content.split("\n").filter(Boolean).slice(-100);
    for (const line of lines) {
      const match = line.match(/\[(.*?)\]\s*\[(.*?)\]\s*(.*)/);
      if (match) {
        logLines.push({
          timestamp: new Date(match[1]),
          level: match[2].toLowerCase(),
          message: match[3]
        });
      }
    }
    return logLines.slice(-50);
  } catch (error) {
    console.error("Error reading security logs:", error);
    return [];
  }
}
function registerAdminRoutes(app2) {
  app2.get("/api/admin/check", requireAdmin, (req, res) => {
    res.json({ isAdmin: true, role: req.user.role });
  });
  app2.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const userCount = await db.select({ count: sql3`COUNT(*)` }).from(users);
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1e3);
      const newUsers = await db.select({ count: sql3`COUNT(*)` }).from(users).where(gte3(users.createdAt, yesterday));
      const conferenceCount = await db.select({ count: sql3`COUNT(*)` }).from(conferences);
      const activeConferences = await db.select({ count: sql3`COUNT(*)` }).from(conferences).where(eq3(conferences.active, true));
      const totalRevenue = await db.select({ sum: sql3`SUM(amount)` }).from(payments).where(eq3(payments.status, "completed"));
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      const revenueToday = await db.select({ sum: sql3`SUM(amount)` }).from(payments).where(eq3(payments.status, "completed")).where(gte3(payments.createdAt, today));
      const systemLoad = {
        cpu: 0,
        memory: 0
      };
      try {
        const sysInfo = await getSystemInfo();
        systemLoad.cpu = Math.round(sysInfo.cpu);
        systemLoad.memory = sysInfo.memoryUsage;
      } catch (error) {
        console.error("Error getting system load:", error);
      }
      const usersOverTime = [];
      for (let i = 0; i < 30; i++) {
        const date = /* @__PURE__ */ new Date();
        date.setDate(date.getDate() - (29 - i));
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        const result = await db.select({ count: sql3`COUNT(*)` }).from(users).where(gte3(users.createdAt, date)).where(lt(users.createdAt, nextDay));
        usersOverTime.push({
          date: date.toLocaleDateString(),
          users: Number(result[0].count)
        });
      }
      const conferencesOverTime = [];
      for (let i = 0; i < 30; i++) {
        const date = /* @__PURE__ */ new Date();
        date.setDate(date.getDate() - (29 - i));
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        const result = await db.select({ count: sql3`COUNT(*)` }).from(conferences).where(gte3(conferences.createdAt, date)).where(lt(conferences.createdAt, nextDay));
        conferencesOverTime.push({
          date: date.toLocaleDateString(),
          conferences: Number(result[0].count)
        });
      }
      const freeSubs = await db.select({ count: sql3`COUNT(*)` }).from(users).where(eq3(users.subscriptionType, "free"));
      const proSubs = await db.select({ count: sql3`COUNT(*)` }).from(users).where(eq3(users.subscriptionType, "pro"));
      res.json({
        userCount: Number(userCount[0].count),
        newUsers: Number(newUsers[0].count),
        conferenceCount: Number(conferenceCount[0].count),
        activeConferences: Number(activeConferences[0].count),
        totalRevenue: totalRevenue[0].sum || 0,
        revenueToday: revenueToday[0].sum || 0,
        serverLoad: systemLoad,
        usersOverTime,
        conferencesOverTime,
        subscriptionStats: {
          free: Number(freeSubs[0].count),
          pro: Number(proSubs[0].count)
        },
        resourceUsage: {
          cpu: systemLoad.cpu,
          memory: systemLoad.memory,
          disk: 35,
          network: 25
        }
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin statistics" });
    }
  });
  app2.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const search = req.query.search;
      let query = db.select().from(users).orderBy(desc3(users.createdAt));
      if (search) {
        query = query.where(
          sql3`username LIKE ${`%${search}%`} OR email LIKE ${`%${search}%`} OR name LIKE ${`%${search}%`}`
        );
      }
      const allUsers = await query.limit(100);
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  app2.get("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });
  app2.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }
      if (existingUser.role === "superadmin" && req.user.role !== "superadmin") {
        return res.status(403).json({ error: "You cannot edit a superadmin" });
      }
      if (req.body.role === "superadmin" && req.user.role !== "superadmin") {
        return res.status(403).json({ error: "Only superadmins can promote to superadmin" });
      }
      if (req.body.balance !== void 0 && existingUser.balance !== req.body.balance) {
        const difference = req.body.balance - (existingUser.balance || 0);
        await storage.createBalanceHistory({
          userId,
          amount: difference,
          type: difference > 0 ? "admin_add" : "admin_subtract",
          description: `\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435 \u0431\u0430\u043B\u0430\u043D\u0441\u0430 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u043E\u043C ${req.user.username}`,
          adminId: req.user.id
        });
      }
      if (req.body.subscriptionType && req.body.subscriptionType !== existingUser.subscriptionType) {
        const existingSubscription = await storage.getActiveSubscriptionByUserId(userId);
        if (existingSubscription) {
          await storage.updateSubscription(existingSubscription.id, {
            isActive: false,
            cancelledAt: /* @__PURE__ */ new Date()
          });
        }
        if (req.body.subscriptionType === "pro") {
          const expiresAt = req.body.subscriptionExpiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3);
          await storage.createSubscription({
            userId,
            type: "pro",
            expiresAt,
            amount: 0
            // Бесплатная подписка от администратора
          });
        }
      }
      const updatedUser = await storage.updateUser(userId, req.body);
      await logSecurityEvent("info", `Admin ${req.user.username} updated user ${existingUser.username}`);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });
  app2.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }
      if (existingUser.role === "superadmin" && req.user.role !== "superadmin") {
        return res.status(403).json({ error: "You cannot delete a superadmin" });
      }
      await storage.updateUser(userId, { isBanned: true, banReason: "\u0423\u0434\u0430\u043B\u0435\u043D \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u043E\u043C" });
      await logSecurityEvent("warning", `Admin ${req.user.username} deleted user ${existingUser.username}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
  app2.get("/api/admin/conferences", requireAdmin, async (req, res) => {
    try {
      const search = req.query.search;
      const activeOnly = req.query.active === "true";
      let query = db.select().from(conferences).orderBy(desc3(conferences.createdAt));
      if (search) {
        query = query.where(
          sql3`name LIKE ${`%${search}%`} OR description LIKE ${`%${search}%`} OR id = ${search}`
        );
      }
      if (activeOnly) {
        query = query.where(eq3(conferences.active, true));
      }
      const allConferences = await query.limit(100);
      const conferencesWithCreators = await Promise.all(
        allConferences.map(async (conf) => {
          const creator = await storage.getUser(conf.creatorId);
          return {
            ...conf,
            creatorName: creator ? creator.name || creator.username : `User ${conf.creatorId}`
          };
        })
      );
      res.json(conferencesWithCreators);
    } catch (error) {
      console.error("Error fetching conferences:", error);
      res.status(500).json({ error: "Failed to fetch conferences" });
    }
  });
  app2.get("/api/admin/conferences/:id", requireAdmin, async (req, res) => {
    try {
      const conference = await storage.getConference(req.params.id);
      if (!conference) {
        return res.status(404).json({ error: "Conference not found" });
      }
      const creator = await storage.getUser(conference.creatorId);
      res.json({
        ...conference,
        creatorName: creator ? creator.name || creator.username : `User ${conference.creatorId}`
      });
    } catch (error) {
      console.error("Error fetching conference:", error);
      res.status(500).json({ error: "Failed to fetch conference" });
    }
  });
  app2.patch("/api/admin/conferences/:id", requireAdmin, async (req, res) => {
    try {
      const conferenceId = req.params.id;
      const existingConference = await storage.getConference(conferenceId);
      if (!existingConference) {
        return res.status(404).json({ error: "Conference not found" });
      }
      if (req.body.active === true && !existingConference.active) {
        if (existingConference.endedAt) {
          req.body.endedAt = null;
        }
      }
      const updatedConference = await storage.updateConference(conferenceId, req.body);
      await logSecurityEvent("info", `Admin ${req.user.username} updated conference ${existingConference.name}`);
      res.json(updatedConference);
    } catch (error) {
      console.error("Error updating conference:", error);
      res.status(500).json({ error: "Failed to update conference" });
    }
  });
  app2.delete("/api/admin/conferences/:id", requireAdmin, async (req, res) => {
    try {
      const conferenceId = req.params.id;
      const existingConference = await storage.getConference(conferenceId);
      if (!existingConference) {
        return res.status(404).json({ error: "Conference not found" });
      }
      await storage.updateConference(conferenceId, {
        active: false,
        endedAt: /* @__PURE__ */ new Date()
      });
      await logSecurityEvent("warning", `Admin ${req.user.username} deleted conference ${existingConference.name}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting conference:", error);
      res.status(500).json({ error: "Failed to delete conference" });
    }
  });
  app2.get("/api/admin/finance", requireAdmin, async (req, res) => {
    try {
      const totalRevenueResult = await db.select({ sum: sql3`SUM(amount)` }).from(payments).where(eq3(payments.status, "completed"));
      const totalRevenue = totalRevenueResult[0].sum || 0;
      const revenueByMonth = [];
      for (let i = 0; i < 12; i++) {
        const date = /* @__PURE__ */ new Date();
        date.setMonth(date.getMonth() - i);
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        lastDay.setHours(23, 59, 59, 999);
        const result = await db.select({ sum: sql3`SUM(amount)` }).from(payments).where(eq3(payments.status, "completed")).where(gte3(payments.createdAt, date)).where(lt(payments.createdAt, lastDay));
        revenueByMonth.unshift({
          month: date.toLocaleDateString("ru-RU", { month: "short" }),
          revenue: result[0].sum || 0
        });
      }
      const activeSubscriptionsResult = await db.select({ count: sql3`COUNT(*)` }).from(subscriptions).where(eq3(subscriptions.isActive, true));
      const activeSubscriptions = Number(activeSubscriptionsResult[0].count);
      const monthlySubsResult = await db.select({ count: sql3`COUNT(*)` }).from(subscriptions).where(sql3`EXTRACT(DAY FROM (expires_at - started_at)) <= 31`);
      const yearlySubsResult = await db.select({ count: sql3`COUNT(*)` }).from(subscriptions).where(sql3`EXTRACT(DAY FROM (expires_at - started_at)) > 31`);
      const monthlySubs = Number(monthlySubsResult[0].count);
      const yearlySubs = Number(yearlySubsResult[0].count);
      const totalSubs = monthlySubs + yearlySubs;
      const subscriptionsByType = [
        { name: "\u041C\u0435\u0441\u044F\u0447\u043D\u044B\u0435", value: totalSubs ? Math.round(monthlySubs / totalSubs * 100) : 0 },
        { name: "\u0413\u043E\u0434\u043E\u0432\u044B\u0435", value: totalSubs ? Math.round(yearlySubs / totalSubs * 100) : 0 }
      ];
      const avgOrderValueResult = await db.select({ avg: sql3`AVG(amount)` }).from(payments).where(eq3(payments.status, "completed"));
      const averageOrderValue = avgOrderValueResult[0].avg || 0;
      const subscriptionRenewalRate = 70;
      const recentPaymentsQuery = db.select().from(payments).orderBy(desc3(payments.createdAt)).limit(10);
      const recentPayments = await recentPaymentsQuery;
      const recentPaymentsWithUsernames = await Promise.all(
        recentPayments.map(async (payment) => {
          const user = await storage.getUser(payment.userId);
          return {
            ...payment,
            userName: user ? user.name || user.username : `User ${payment.userId}`
          };
        })
      );
      res.json({
        totalRevenue,
        revenueByMonth,
        activeSubscriptions,
        subscriptionsByType,
        averageOrderValue,
        subscriptionRenewalRate,
        recentPayments: recentPaymentsWithUsernames
      });
    } catch (error) {
      console.error("Error fetching finance stats:", error);
      res.status(500).json({ error: "Failed to fetch finance statistics" });
    }
  });
  app2.get("/api/admin/payment-stats", requireAdmin, async (req, res) => {
    try {
      const totalPaymentsResult = await db.select({ count: sql3`COUNT(*)` }).from(payments);
      const totalPayments = Number(totalPaymentsResult[0]?.count || 0);
      const totalAmountResult = await db.select({ sum: sql3`SUM(amount)` }).from(payments).where(eq3(payments.status, "completed"));
      const totalAmount = Number(totalAmountResult[0]?.sum || 0);
      const averagePaymentAmount = totalPayments > 0 ? totalAmount / totalPayments : 0;
      const subscriptionsByTypeResult = await db.select({
        type: payments.type,
        count: sql3`COUNT(*)`
      }).from(payments).where(eq3(payments.status, "completed")).groupBy(payments.type);
      const subscriptionsByType = {};
      subscriptionsByTypeResult.forEach((item) => {
        if (item.type) {
          subscriptionsByType[item.type] = Number(item.count);
        }
      });
      const revenueByMonthResult = await db.select({
        month: sql3`TO_CHAR(created_at, 'YYYY-MM')`,
        revenue: sql3`SUM(amount)`
      }).from(payments).where(eq3(payments.status, "completed")).groupBy(sql3`TO_CHAR(created_at, 'YYYY-MM')`).orderBy(sql3`TO_CHAR(created_at, 'YYYY-MM')`);
      const revenueByMonth = {};
      revenueByMonthResult.forEach((item) => {
        if (item.month && item.revenue !== null) {
          revenueByMonth[item.month] = Number(item.revenue);
        }
      });
      const latestPayments = await db.select({
        id: payments.id,
        userId: payments.userId,
        username: users.username,
        amount: payments.amount,
        status: payments.status,
        paymentMethod: payments.paymentMethod,
        createdAt: payments.createdAt
      }).from(payments).leftJoin(users, eq3(payments.userId, users.id)).orderBy(desc3(payments.createdAt)).limit(5);
      const successfulPaymentsResult = await db.select({ count: sql3`COUNT(*)` }).from(payments).where(eq3(payments.status, "completed"));
      const successfulPayments = Number(successfulPaymentsResult[0]?.count || 0);
      const conversionRate = totalPayments > 0 ? successfulPayments / totalPayments : 0;
      res.json({
        totalPayments,
        totalAmount,
        subscriptionsByType,
        revenueByMonth,
        latestPayments,
        conversionRate,
        averagePaymentAmount
      });
    } catch (error) {
      console.error("Error fetching payment statistics:", error);
      res.status(500).json({ error: "Failed to fetch payment statistics" });
    }
  });
  app2.get("/api/admin/payments", requireAdmin, async (req, res) => {
    try {
      const search = req.query.search;
      const fromDate = req.query.from ? new Date(req.query.from) : void 0;
      const toDate = req.query.to ? new Date(req.query.to) : void 0;
      let query = db.select({
        id: payments.id,
        userId: payments.userId,
        username: users.username,
        amount: payments.amount,
        status: payments.status,
        paymentMethod: payments.paymentMethod,
        paymentId: payments.paymentId,
        externalId: payments.externalId,
        type: payments.type,
        details: payments.details,
        createdAt: payments.createdAt,
        completedAt: payments.completedAt
      }).from(payments).leftJoin(users, eq3(payments.userId, users.id)).orderBy(desc3(payments.createdAt));
      if (search) {
        query = query.where(
          sql3`users.username LIKE ${`%${search}%`} OR payments.payment_id LIKE ${`%${search}%`} OR payments.external_id LIKE ${`%${search}%`}`
        );
      }
      if (fromDate) {
        query = query.where(gte3(payments.createdAt, fromDate));
      }
      if (toDate) {
        query = query.where(lte(payments.createdAt, toDate));
      }
      const allPayments = await query.limit(100);
      res.json(allPayments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });
  app2.patch("/api/admin/payments/:id", requireAdmin, async (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);
      const { status } = req.body;
      const updatedPayment = await storage.updatePayment(paymentId, {
        status,
        completedAt: status === "completed" ? /* @__PURE__ */ new Date() : void 0
      });
      if (!updatedPayment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      if (status === "completed" && updatedPayment.subscriptionId) {
        const subscription = await storage.getSubscription(updatedPayment.subscriptionId);
        if (subscription) {
          await storage.updateSubscription(subscription.id, {
            isActive: true,
            cancelledAt: null
          });
          await storage.updateUser(updatedPayment.userId, {
            subscriptionType: subscription.type
          });
        }
      }
      res.json(updatedPayment);
    } catch (error) {
      console.error("Error updating payment:", error);
      res.status(500).json({ error: "Failed to update payment" });
    }
  });
  app2.get("/api/admin/payments/settings", requireAdmin, async (req, res) => {
    try {
      const [settings] = await db.select().from(telegramSettings);
      const paymentSettings = {
        yukassa: {
          shopId: settings?.paymentProvider === "yookassa" ? settings.paymentProvider : "",
          secretKey: settings?.paymentApiKey || "",
          enabled: settings?.paymentProvider === "yookassa"
        }
      };
      res.json(paymentSettings);
    } catch (error) {
      console.error("Error fetching payment settings:", error);
      res.status(500).json({ error: "Failed to fetch payment settings" });
    }
  });
  app2.post("/api/admin/payments/settings", requireAdmin, async (req, res) => {
    try {
      if (req.body.yukassa) {
        const [settings] = await db.select().from(telegramSettings);
        if (!settings) {
          return res.status(404).json({ error: "Settings not found" });
        }
        await db.update(telegramSettings).set({
          paymentProvider: req.body.yukassa.enabled ? "yookassa" : "",
          paymentApiKey: req.body.yukassa.secretKey
        }).where(eq3(telegramSettings.id, settings.id));
        await logSecurityEvent("info", `Admin ${req.user.username} updated payment settings`);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating payment settings:", error);
      res.status(500).json({ error: "Failed to update payment settings" });
    }
  });
  app2.get("/api/admin/system", requireAdmin, async (req, res) => {
    try {
      const interval = parseInt(req.query.interval) || 60;
      const systemInfo = await getSystemInfo();
      res.json(systemInfo);
    } catch (error) {
      console.error("Error fetching system info:", error);
      res.status(500).json({ error: "Failed to fetch system information" });
    }
  });
  app2.post("/api/admin/system/restart", requireSuperAdmin, async (req, res) => {
    try {
      const service = req.body.service;
      if (!service) {
        return res.status(400).json({ error: "Service name is required" });
      }
      await logSecurityEvent("warning", `Admin ${req.user.username} restarted service ${service}`);
      if (service === "api") {
        serverCache.clear();
        res.json({ success: true, message: "API server cache cleared" });
      } else if (service === "webrtc") {
        serverCache.invalidateByPrefix("webrtc");
        res.json({ success: true, message: "WebRTC cache cleared" });
      } else if (service === "telegram") {
        res.json({ success: true, message: "Telegram bot restarted" });
      } else if (service === "database") {
        res.json({ success: true, message: "Database connection restarted" });
      } else {
        res.status(400).json({ error: "Unknown service" });
      }
    } catch (error) {
      console.error("Error restarting service:", error);
      res.status(500).json({ error: "Failed to restart service" });
    }
  });
  app2.post("/api/admin/system/clear-cache", requireAdmin, async (req, res) => {
    try {
      serverCache.clear();
      await logSecurityEvent("info", `Admin ${req.user.username} cleared server cache`);
      res.json({ success: true, message: "Server cache cleared" });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });
  app2.get("/api/admin/security", requireAdmin, async (req, res) => {
    try {
      const [settings] = await db.select().from(telegramSettings);
      const securityLogs = await getSecurityLogs();
      res.json({
        telegramAdminPassword: settings?.adminPassword || "",
        superAdminId: settings?.superAdminId || "",
        webhookUrl: `https://ikarus.app/api/payments/webhook`,
        yukassaWebhookSecret: settings?.paymentApiKey || "",
        securityLogs
      });
    } catch (error) {
      console.error("Error fetching security settings:", error);
      res.status(500).json({ error: "Failed to fetch security settings" });
    }
  });
  app2.post("/api/admin/security", requireAdmin, async (req, res) => {
    try {
      const [settings] = await db.select().from(telegramSettings);
      if (!settings) {
        return res.status(404).json({ error: "Settings not found" });
      }
      if (req.body.telegramAdminPassword) {
        await db.update(telegramSettings).set({ adminPassword: req.body.telegramAdminPassword }).where(eq3(telegramSettings.id, settings.id));
        await logSecurityEvent("warning", `Admin ${req.user.username} updated Telegram admin password`);
      }
      if (req.body.yukassaWebhookSecret) {
        await db.update(telegramSettings).set({ paymentApiKey: req.body.yukassaWebhookSecret }).where(eq3(telegramSettings.id, settings.id));
        await logSecurityEvent("warning", `Admin ${req.user.username} updated webhook secret`);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating security settings:", error);
      res.status(500).json({ error: "Failed to update security settings" });
    }
  });
  app2.get("/api/admin/payment-stats", requireAdmin, async (req, res) => {
    try {
      const stats = await PaymentService.getPaymentStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching payment stats:", error);
      res.status(500).json({ error: "Failed to fetch payment statistics" });
    }
  });
}
async function logSecurityEvent(level, message) {
  try {
    if (!fs.existsSync("./logs")) {
      fs.mkdirSync("./logs");
    }
    const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
    const logEntry = `[${timestamp2}] [${level.toUpperCase()}] ${message}
`;
    fs.appendFileSync("./logs/security.log", logEntry);
  } catch (error) {
    console.error("Error writing to security log:", error);
  }
}

// server/routes.ts
var scryptAsync3 = promisify4(scrypt3);
async function hashPassword2(password) {
  const salt = randomBytes3(16).toString("hex");
  const buf = await scryptAsync3(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function registerRoutes(app2) {
  setupAuth(app2);
  registerAdminRoutes(app2);
  app2.get("/api/system/is-configured", async (req, res) => {
    try {
      const adminUsers = await storage.getAllUsers().then(
        (users2) => users2.filter((user) => user.role === "admin" || user.role === "superadmin")
      );
      const telegramSettings3 = await storage.getTelegramSettings();
      const isConfigured = adminUsers.length > 0 && telegramSettings3?.isConnected === true;
      res.json({
        isConfigured,
        hasAdmins: adminUsers.length > 0,
        hasTelegramBot: telegramSettings3?.isConnected === true
      });
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435 \u043A\u043E\u043D\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u0438 \u0441\u0438\u0441\u0442\u0435\u043C\u044B:", error);
      res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435 \u043A\u043E\u043D\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u0438 \u0441\u0438\u0441\u0442\u0435\u043C\u044B" });
    }
  });
  app2.get("/api/telegram/status", async (req, res) => {
    try {
      const settings = await storage.getTelegramSettings();
      res.json({
        isConnected: settings?.isConnected || false,
        connectedAt: settings?.connectedAt || null
      });
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u0441\u0442\u0430\u0442\u0443\u0441\u0430 Telegram \u0431\u043E\u0442\u0430:", error);
      res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u0441\u0442\u0430\u0442\u0443\u0441\u0430 Telegram \u0431\u043E\u0442\u0430" });
    }
  });
  app2.post("/api/telegram/connect", async (req, res) => {
    try {
      const { botToken, adminPassword } = req.body;
      if (!botToken) {
        return res.status(400).json({ error: "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D \u0442\u043E\u043A\u0435\u043D \u0431\u043E\u0442\u0430" });
      }
      const isAuthed = req.isAuthenticated();
      const isSuperAdmin = isAuthed && req.user.role === "superadmin";
      const telegramService2 = await TelegramService.getInstance();
      const connected = await telegramService2.init(botToken);
      if (!connected) {
        return res.status(400).json({ error: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C\u0441\u044F \u043A API Telegram" });
      }
      const updateData = {
        botToken,
        isConnected: true,
        connectedAt: /* @__PURE__ */ new Date()
      };
      if (adminPassword) {
        updateData.adminPassword = await hashPassword2(adminPassword);
      }
      if (isSuperAdmin) {
        updateData.superAdminId = req.user.telegramId || null;
      }
      try {
        const existingSettings = await storage.getTelegramSettings();
        let settings;
        if (existingSettings) {
          settings = await storage.updateTelegramSettings(updateData);
        } else {
          settings = await storage.saveTelegramSettings(updateData);
        }
        res.json({
          success: true,
          isConnected: settings?.isConnected || true,
          connectedAt: settings?.connectedAt || /* @__PURE__ */ new Date()
        });
      } catch (error) {
        console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0438 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A Telegram:", error);
        res.status(500).json({
          error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0438 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A Telegram",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0438 Telegram \u0431\u043E\u0442\u0430:", error);
      res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0438 Telegram \u0431\u043E\u0442\u0430" });
    }
  });
  app2.get("/api/telegram/is-configured", async (req, res) => {
    try {
      const settings = await storage.getTelegramSettings();
      res.json({
        isConfigured: settings?.isConnected === true
      });
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 Telegram \u0431\u043E\u0442\u0430:", error);
      res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 Telegram \u0431\u043E\u0442\u0430" });
    }
  });
  app2.get("/api/telegram/status", async (req, res) => {
    try {
      const settings = await storage.getTelegramSettings();
      res.json({
        isConnected: settings?.isConnected === true,
        connectedAt: settings?.connectedAt
      });
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u0441\u0442\u0430\u0442\u0443\u0441\u0430 Telegram \u0431\u043E\u0442\u0430:", error);
      res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u0441\u0442\u0430\u0442\u0443\u0441\u0430 Telegram \u0431\u043E\u0442\u0430" });
    }
  });
  app2.post("/api/admin/telegram/send-test", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin" && req.user.role !== "superadmin") {
      return res.status(403).json({ error: "\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430" });
    }
    try {
      const { userId, message, type } = req.body;
      if (!userId || !message) {
        return res.status(400).json({ error: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0443\u043A\u0430\u0437\u0430\u0442\u044C ID \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0438 \u0442\u0435\u043A\u0441\u0442 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F" });
      }
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ error: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      }
      if (!user.telegramId) {
        return res.status(400).json({ error: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043B Telegram \u0430\u043A\u043A\u0430\u0443\u043D\u0442" });
      }
      const telegramService2 = await TelegramService.getInstance();
      const result = await telegramService2.sendSystemNotification(
        user.id,
        "\u0422\u0435\u0441\u0442\u043E\u0432\u043E\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435",
        message,
        type || "info"
      );
      if (result) {
        res.json({ success: true, message: "\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E" });
      } else {
        res.status(500).json({ error: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435" });
      }
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0435 \u0442\u0435\u0441\u0442\u043E\u0432\u043E\u0433\u043E \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F:", error);
      res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0435 \u0442\u0435\u0441\u0442\u043E\u0432\u043E\u0433\u043E \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F" });
    }
  });
  app2.post("/api/admin/telegram/broadcast", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin" && req.user.role !== "superadmin") {
      return res.status(403).json({ error: "\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430" });
    }
    try {
      const { message, onlyAdmins, silent } = req.body;
      if (!message) {
        return res.status(400).json({ error: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0443\u043A\u0430\u0437\u0430\u0442\u044C \u0442\u0435\u043A\u0441\u0442 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F" });
      }
      const telegramService2 = await TelegramService.getInstance();
      const successCount = await telegramService2.sendBroadcastMessage(message, {
        onlyAdmins: onlyAdmins === true,
        parseMode: "HTML",
        silent: silent === true
      });
      res.json({
        success: true,
        message: `\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E ${successCount} \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F\u043C`
      });
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0435 \u043C\u0430\u0441\u0441\u043E\u0432\u043E\u0433\u043E \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F:", error);
      res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0435 \u043C\u0430\u0441\u0441\u043E\u0432\u043E\u0433\u043E \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F" });
    }
  });
  app2.post("/api/create-payment-intent", async (req, res) => {
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
        description: `\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0430 \u043D\u0430 \u043F\u043B\u0430\u043D "${plan}" \u043D\u0430 ${months} \u043C\u0435\u0441.`
      };
      const payment = await PaymentService.createPayment(paymentData);
      res.json({
        paymentId: payment.paymentId,
        confirmation_url: payment.confirmation_url,
        status: payment.status
      });
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({
        error: "Error creating payment",
        details: error.message
      });
    }
  });
  app2.post("/api/renew-subscription", async (req, res) => {
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
        description: `\u041F\u0440\u043E\u0434\u043B\u0435\u043D\u0438\u0435 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 "${plan}" \u043D\u0430 ${months} \u043C\u0435\u0441.`
      };
      const payment = await PaymentService.createPayment(paymentData);
      res.json({
        paymentId: payment.paymentId,
        confirmation_url: payment.confirmation_url,
        status: payment.status
      });
    } catch (error) {
      console.error("Error creating renewal payment:", error);
      res.status(500).json({
        error: "Error creating renewal payment",
        details: error.message
      });
    }
  });
  app2.post("/api/webhook/youkassa", async (req, res) => {
    try {
      const result = await PaymentService.handleWebhookNotification(req.body);
      res.json(result);
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/payment/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const paymentId = req.params.id;
      const payment = await PaymentService.getPaymentInfo(paymentId);
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
    } catch (error) {
      console.error("Error getting payment status:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/conferences", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F" });
    }
    const conferences3 = await storage.getConferencesByUserId(req.user.id);
    res.json({ conferences: conferences3 });
  });
  app2.get("/api/conferences/active", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F" });
    }
    const conferences3 = await storage.getAllActiveConferences();
    res.json({ conferences: conferences3 });
  });
  app2.get("/api/conferences/:id", async (req, res) => {
    const conference = await storage.getConference(req.params.id);
    if (!conference) {
      return res.status(404).json({ message: "\u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" });
    }
    let userSubscriptionType = "free";
    let subscriptionRestrictions = null;
    let isCreator = false;
    let timeLimitExceeded = false;
    if (req.isAuthenticated()) {
      userSubscriptionType = req.user.subscriptionType || "free";
      isCreator = conference.creatorId === req.user.id;
      if (userSubscriptionType === "pro" && req.user.subscriptionExpiresAt) {
        const now = /* @__PURE__ */ new Date();
        if (new Date(req.user.subscriptionExpiresAt) < now) {
          userSubscriptionType = "free";
        }
      }
    }
    if (userSubscriptionType === "free" && !isCreator && conference.active && conference.startedAt) {
      const now = /* @__PURE__ */ new Date();
      const durationMin = Math.floor((now.getTime() - conference.startedAt.getTime()) / (60 * 1e3));
      if (durationMin >= 15) {
        timeLimitExceeded = true;
        subscriptionRestrictions = {
          timeLimit: 15 * 60,
          // 15 минут в секундах
          participantsLimit: 5,
          noRecording: true,
          lowResolution: true,
          timeLimitExceeded: true,
          currentDuration: durationMin
        };
      } else {
        subscriptionRestrictions = {
          timeLimit: 15 * 60,
          // 15 минут в секундах
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
  app2.post("/api/conferences", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F" });
    }
    try {
      let maxParticipants = 5;
      let hasScreenShare = false;
      const userSubscriptionType = req.user.subscriptionType || "free";
      if (userSubscriptionType === "pro" && req.user.subscriptionExpiresAt) {
        const now = /* @__PURE__ */ new Date();
        const expiresAt = new Date(req.user.subscriptionExpiresAt);
        if (expiresAt < now) {
          await storage.updateUser(req.user.id, {
            subscriptionType: "free",
            subscriptionExpiresAt: null
          });
        } else {
          maxParticipants = req.body.maxParticipants || 50;
          hasScreenShare = req.body.hasScreenShare !== void 0 ? req.body.hasScreenShare : true;
        }
      } else if (userSubscriptionType === "pro") {
        maxParticipants = req.body.maxParticipants || 50;
        hasScreenShare = req.body.hasScreenShare !== void 0 ? req.body.hasScreenShare : true;
      }
      const conferenceData = insertConferenceSchema.parse({
        ...req.body,
        creatorId: req.user.id,
        maxParticipants: userSubscriptionType === "pro" ? req.body.maxParticipants || 50 : 5,
        hasScreenShare: userSubscriptionType === "pro" ? req.body.hasScreenShare !== void 0 ? req.body.hasScreenShare : true : false
      });
      const conference = await storage.createConference(conferenceData);
      res.status(201).json({
        conference,
        subscriptionType: userSubscriptionType,
        restrictions: userSubscriptionType === "free" ? {
          maxParticipants: 5,
          timeLimit: 15 * 60,
          // 15 минут в секундах
          noScreenShare: true,
          lowResolution: true
        } : null
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0432\u0430\u043B\u0438\u0434\u0430\u0446\u0438\u0438", errors: error.errors });
      }
      console.error("Error creating conference:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438" });
    }
  });
  app2.post("/api/conferences/:id/end", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F" });
    }
    const conference = await storage.getConference(req.params.id);
    if (!conference) {
      return res.status(404).json({ message: "\u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" });
    }
    if (conference.creatorId !== req.user.id) {
      return res.status(403).json({ message: "\u0412\u044B \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0435\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u0435\u043B\u0435\u043C \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438" });
    }
    const updatedConference = await storage.updateConference(req.params.id, {
      active: false,
      // In a real app, we'd also save the recording URL here
      recordingUrl: `/recordings/${req.params.id}.mp4`
    });
    res.json({ conference: updatedConference });
  });
  app2.patch("/api/conferences/:id/host-settings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F" });
    }
    const conference = await storage.getConference(req.params.id);
    if (!conference) {
      return res.status(404).json({ message: "\u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" });
    }
    if (conference.creatorId !== req.user.id) {
      return res.status(403).json({ message: "\u0422\u043E\u043B\u044C\u043A\u043E \u0441\u043E\u0437\u0434\u0430\u0442\u0435\u043B\u044C \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438 \u043C\u043E\u0436\u0435\u0442 \u0438\u0437\u043C\u0435\u043D\u044F\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438" });
    }
    const { hostVideoPriority, allowParticipantDetach } = req.body;
    const updates = {};
    if (hostVideoPriority !== void 0) {
      updates.hostVideoPriority = hostVideoPriority;
    }
    if (allowParticipantDetach !== void 0) {
      updates.allowParticipantDetach = allowParticipantDetach;
    }
    try {
      const updatedConference = await storage.updateConference(req.params.id, updates);
      if (!updatedConference) {
        return res.status(500).json({ message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438" });
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
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0438 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438:", error);
      res.status(500).json({
        success: false,
        message: "\u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0438 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438"
      });
    }
  });
  app2.patch("/api/conferences/:id/lock", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F" });
    }
    const conference = await storage.getConference(req.params.id);
    if (!conference) {
      return res.status(404).json({ message: "\u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" });
    }
    if (conference.creatorId !== req.user.id && conference.hostId !== req.user.id.toString()) {
      return res.status(403).json({ message: "\u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u043F\u0440\u0430\u0432 \u043D\u0430 \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0443 \u044D\u0442\u043E\u0439 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438" });
    }
    const { isLocked } = req.body;
    try {
      const updatedConference = await storage.updateConference(req.params.id, {
        isLocked: isLocked === true
      });
      if (!updatedConference) {
        return res.status(500).json({ message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u0442\u0430\u0442\u0443\u0441 \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438" });
      }
      if (storage.wss) {
        const clients = Array.from(storage.wss.clients);
        for (const client of clients) {
          if (client.readyState === WebSocket2.OPEN) {
            try {
              client.send(JSON.stringify({
                type: "conference_lock_status",
                conferenceId: req.params.id,
                isLocked
              }));
            } catch (err) {
              console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0447\u0435\u0440\u0435\u0437 WebSocket:", err);
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
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0438 \u0441\u0442\u0430\u0442\u0443\u0441\u0430 \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438:", error);
      res.status(500).json({
        success: false,
        message: "\u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0438 \u0441\u0442\u0430\u0442\u0443\u0441\u0430 \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438"
      });
    }
  });
  app2.post("/api/conferences/:id/end", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F" });
    }
    const conference = await storage.getConference(req.params.id);
    if (!conference) {
      return res.status(404).json({ message: "\u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" });
    }
    if (conference.creatorId !== req.user.id && conference.hostId !== req.user.id.toString()) {
      return res.status(403).json({ message: "\u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u043F\u0440\u0430\u0432 \u043D\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u0435 \u044D\u0442\u043E\u0439 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438" });
    }
    try {
      const now = /* @__PURE__ */ new Date();
      const updatedConference = await storage.updateConference(req.params.id, {
        endedAt: now,
        active: false
      });
      if (!updatedConference) {
        return res.status(500).json({ message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044C \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044E" });
      }
      if (storage.wss) {
        const clients = Array.from(storage.wss.clients);
        for (const client of clients) {
          if (client.readyState === WebSocket2.OPEN) {
            try {
              client.send(JSON.stringify({
                type: "conference_ended",
                conferenceId: req.params.id,
                endedBy: req.user.name || req.user.username || "\u0425\u043E\u0441\u0442"
              }));
            } catch (err) {
              console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0447\u0435\u0440\u0435\u0437 WebSocket:", err);
            }
          }
        }
      }
      res.json({
        success: true,
        conference: updatedConference,
        message: "\u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044F \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430"
      });
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u0438 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438:", error);
      res.status(500).json({
        success: false,
        message: "\u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u0438 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438"
      });
    }
  });
  app2.post("/api/conferences/:id/join", async (req, res) => {
    try {
      const conference = await storage.getConference(req.params.id);
      if (!conference) {
        return res.status(404).json({
          success: false,
          message: "\u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430",
          error: "CONFERENCE_NOT_FOUND"
        });
      }
      if (!conference.active) {
        return res.status(400).json({
          success: false,
          message: "\u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044F \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430",
          error: "CONFERENCE_ENDED"
        });
      }
      if (conference.isLocked) {
        const isCreatorOrHost = req.isAuthenticated() && (conference.creatorId === req.user.id || conference.hostId === req.user.id.toString());
        if (!isCreatorOrHost) {
          return res.status(403).json({
            success: false,
            message: "\u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044F \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u0430. \u041D\u043E\u0432\u044B\u0435 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438 \u043D\u0435 \u043C\u043E\u0433\u0443\u0442 \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0442\u044C\u0441\u044F",
            error: "CONFERENCE_LOCKED"
          });
        }
      }
      const { name } = req.body;
      if (!name || typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0435 \u0438\u043C\u044F (\u043D\u0435 \u043C\u0435\u043D\u0435\u0435 2 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432)",
          error: "INVALID_NAME",
          minLength: 2
        });
      }
      const maxParticipants = conference.maxParticipants || 5;
      if ((conference.currentParticipants || 0) >= maxParticipants) {
        return res.status(400).json({
          success: false,
          message: "\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 \u043B\u0438\u043C\u0438\u0442 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438",
          error: "MAX_PARTICIPANTS_REACHED",
          currentParticipants: conference.currentParticipants,
          maxParticipants
        });
      }
      let userSubscriptionType = "free";
      let subscriptionRestrictions = null;
      if (req.isAuthenticated()) {
        userSubscriptionType = req.user.subscriptionType || "free";
        if (userSubscriptionType === "pro" && req.user.subscriptionExpiresAt) {
          const now = /* @__PURE__ */ new Date();
          if (new Date(req.user.subscriptionExpiresAt) < now) {
            await storage.updateUser(req.user.id, {
              subscriptionType: "free",
              subscriptionExpiresAt: null
            });
            userSubscriptionType = "free";
          }
        }
        if (userSubscriptionType === "free" && conference.creatorId !== req.user.id) {
          const confStartTime = conference.startedAt || conference.createdAt;
          const now = /* @__PURE__ */ new Date();
          const durationMin = Math.floor((now.getTime() - confStartTime.getTime()) / (60 * 1e3));
          if (durationMin >= 15) {
            return res.status(403).json({
              message: "\u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438 \u0434\u043B\u044F \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u0445 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0430 15 \u043C\u0438\u043D\u0443\u0442\u0430\u043C\u0438",
              error: "FREE_PLAN_TIME_LIMIT",
              durationMin,
              maxDurationMin: 15
            });
          }
          subscriptionRestrictions = {
            timeLimit: 15 * 60,
            // 15 минут в секундах
            participantsLimit: 5,
            noRecording: true,
            lowResolution: true
          };
        }
      } else {
        const confStartTime = conference.startedAt || conference.createdAt;
        const now = /* @__PURE__ */ new Date();
        const durationMin = Math.floor((now.getTime() - confStartTime.getTime()) / (60 * 1e3));
        if (durationMin >= 15) {
          return res.status(403).json({
            message: "\u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438 \u0434\u043B\u044F \u0433\u043E\u0441\u0442\u0435\u0439 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0430 15 \u043C\u0438\u043D\u0443\u0442\u0430\u043C\u0438",
            error: "GUEST_TIME_LIMIT",
            durationMin,
            maxDurationMin: 15
          });
        }
        if (!req.session.guestInfo) {
          req.session.guestInfo = {};
        }
        req.session.guestInfo.name = name;
        req.session.guestInfo.conferenceId = req.params.id;
        subscriptionRestrictions = {
          timeLimit: 15 * 60,
          // 15 минут в секундах
          participantsLimit: 5,
          noRecording: true,
          lowResolution: true,
          noScreenShare: true
        };
      }
      if (!conference.startedAt && conference.currentParticipants === 0) {
        try {
          await storage.updateConference(req.params.id, {
            startedAt: /* @__PURE__ */ new Date()
          });
        } catch (error) {
          console.warn("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0432\u0440\u0435\u043C\u044F \u043D\u0430\u0447\u0430\u043B\u0430 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438, \u043D\u043E \u044D\u0442\u043E \u043D\u0435 \u043A\u0440\u0438\u0442\u0438\u0447\u043D\u043E", error);
        }
      }
      let updatedConference;
      try {
        updatedConference = await storage.updateConference(req.params.id, {
          currentParticipants: (conference.currentParticipants || 0) + 1
        });
        if (!updatedConference) {
          console.warn("\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438 \u0432\u0435\u0440\u043D\u0443\u043B\u043E null, \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u043C \u0442\u0435\u043A\u0443\u0449\u0443\u044E \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044E");
          updatedConference = conference;
        }
      } catch (error) {
        console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0438 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u0430 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438:", error);
        updatedConference = conference;
      }
      res.json({
        success: true,
        conference: updatedConference,
        userType: req.isAuthenticated() ? req.user.role === "admin" || req.user.role === "superadmin" ? "admin" : "user" : "guest",
        participantName: req.isAuthenticated() ? req.user.name || req.user.username : name,
        subscriptionType: userSubscriptionType,
        subscriptionRestrictions
      });
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0438 \u043A \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438:", error);
      res.status(500).json({
        success: false,
        message: "\u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0438 \u043A \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0435 \u0440\u0430\u0437.",
        error: "SERVER_ERROR"
      });
    }
  });
  app2.get("/api/telegram/status", async (req, res) => {
    const settings = await storage.getTelegramSettings();
    res.json({
      isConnected: settings?.isConnected || false,
      connectedAt: settings?.connectedAt || null
    });
  });
  app2.get("/api/telegram/is-configured", async (req, res) => {
    const settings = await storage.getTelegramSettings();
    const users2 = await storage.getAllUsers();
    const isConfigured = settings?.isConnected === true || users2.length > 1;
    res.json({
      isConfigured
    });
  });
  app2.post("/api/telegram/init-from-env", async (req, res) => {
    try {
      const existingSettings = await storage.getTelegramSettings();
      if (existingSettings?.isConnected) {
        return res.status(400).json({ message: "Telegram \u0431\u043E\u0442 \u0443\u0436\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D" });
      }
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return res.status(400).json({ message: "\u0422\u043E\u043A\u0435\u043D \u0431\u043E\u0442\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0445 \u043E\u043A\u0440\u0443\u0436\u0435\u043D\u0438\u044F" });
      }
      const users2 = await storage.getAllUsers();
      const adminPassword = "\u041C\u043D\u0435\u043D\u0443\u0436\u043D\u043E\u0431\u044B\u043B\u043E\u043B\u0438\u0448\u044C\u0432\u0435\u0440\u0438\u0442\u044C\u0432\u0441\u0432\u043E\u0438\u043A\u0440\u044B\u043B\u044C\u044F\u0430\u043D\u0435\u0432\u043F\u0440\u0430\u0432\u0434\u0443\u0434\u0440\u0443\u0433\u0438\u0445";
      const superAdminId = "532150529";
      const settings = await storage.saveTelegramSettings({
        botToken,
        isConnected: false,
        // Сначала помечаем как неподключенный
        connectedAt: null,
        webhookUrl: null,
        paymentProvider: "yookassa",
        paymentApiKey: null,
        adminPassword,
        superAdminId
      });
      const { telegramService: telegramService2 } = (init_telegram(), __toCommonJS(telegram_exports));
      try {
        const botInitialized = await telegramService2.initialize();
        if (botInitialized) {
          await storage.updateTelegramSettings({
            id: settings.id,
            isConnected: true,
            connectedAt: /* @__PURE__ */ new Date()
          });
          console.log("Telegram \u0431\u043E\u0442 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D \u0438\u0437 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 \u043E\u043A\u0440\u0443\u0436\u0435\u043D\u0438\u044F");
        } else {
          console.log("Telegram \u0431\u043E\u0442 \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0438\u0437 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 \u043E\u043A\u0440\u0443\u0436\u0435\u043D\u0438\u044F");
          return res.status(500).json({
            message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438 Telegram \u0431\u043E\u0442\u0430. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u0442\u043E\u043A\u0435\u043D\u0430."
          });
        }
      } catch (error) {
        console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438 Telegram \u0431\u043E\u0442\u0430:", error);
        return res.status(500).json({
          message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438 Telegram \u0431\u043E\u0442\u0430: " + (error.message || "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430")
        });
      }
      if (users2.length <= 1) {
        if (req.isAuthenticated()) {
          await storage.updateUser(req.user.id, { role: "admin" });
        } else if (users2.length === 0) {
          await storage.createUser({
            username: "admin",
            password: await hashPassword2("admin"),
            // Метод хеширования из auth.ts
            role: "admin",
            subscriptionType: "pro",
            name: "\u0410\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440"
          });
        }
      }
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Error initializing Telegram bot from environment:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438 Telegram \u0431\u043E\u0442\u0430 \u0438\u0437 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 \u043E\u043A\u0440\u0443\u0436\u0435\u043D\u0438\u044F" });
    }
  });
  app2.post("/api/telegram/connect", async (req, res) => {
    try {
      const botToken = req.body.botToken;
      if (!botToken) {
        return res.status(400).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0442\u043E\u043A\u0435\u043D \u0431\u043E\u0442\u0430" });
      }
      const existingSettings = await storage.getTelegramSettings();
      if (existingSettings?.isConnected) {
        return res.status(400).json({ message: "Telegram \u0431\u043E\u0442 \u0443\u0436\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D" });
      }
      const users2 = await storage.getAllUsers();
      if (users2.length > 1 && (!req.isAuthenticated() || req.user.role !== "admin" && req.user.role !== "superadmin")) {
        return res.status(403).json({
          message: "\u0422\u043E\u043B\u044C\u043A\u043E \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440 \u043C\u043E\u0436\u0435\u0442 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0431\u043E\u0442\u0430 \u043F\u043E\u0441\u043B\u0435 \u043F\u0435\u0440\u0432\u043E\u043D\u0430\u0447\u0430\u043B\u044C\u043D\u043E\u0439 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438"
        });
      }
      const adminPassword = req.body.adminPassword || "\u041C\u043D\u0435\u043D\u0443\u0436\u043D\u043E\u0431\u044B\u043B\u043E\u043B\u0438\u0448\u044C\u0432\u0435\u0440\u0438\u0442\u044C\u0432\u0441\u0432\u043E\u0438\u043A\u0440\u044B\u043B\u044C\u044F\u0430\u043D\u0435\u0432\u043F\u0440\u0430\u0432\u0434\u0443\u0434\u0440\u0443\u0433\u0438\u0445";
      const superAdminId = req.body.superAdminId || "532150529";
      const settings = await storage.saveTelegramSettings({
        botToken,
        isConnected: false,
        // Сначала помечаем как неподключенный
        connectedAt: null,
        webhookUrl: req.body.webhookUrl || null,
        paymentProvider: req.body.paymentProvider || "yookassa",
        paymentApiKey: req.body.paymentApiKey || null,
        adminPassword,
        superAdminId
      });
      const { telegramService: telegramService2 } = (init_telegram(), __toCommonJS(telegram_exports));
      try {
        const botInitialized = await telegramService2.initialize();
        if (botInitialized) {
          await storage.updateTelegramSettings({
            id: settings.id,
            isConnected: true,
            connectedAt: /* @__PURE__ */ new Date()
          });
          console.log("Telegram \u0431\u043E\u0442 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D");
        } else {
          console.log("Telegram \u0431\u043E\u0442 \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C");
          return res.status(500).json({
            message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438 Telegram \u0431\u043E\u0442\u0430. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u0442\u043E\u043A\u0435\u043D\u0430."
          });
        }
      } catch (error) {
        console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438 Telegram \u0431\u043E\u0442\u0430:", error);
        return res.status(500).json({
          message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438 Telegram \u0431\u043E\u0442\u0430: " + (error.message || "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430")
        });
      }
      if (users2.length <= 1) {
        if (req.isAuthenticated()) {
          await storage.updateUser(req.user.id, { role: "admin" });
        } else if (users2.length === 0) {
          await storage.createUser({
            username: "admin",
            password: await hashPassword2("admin"),
            // Метод хеширования из auth.ts
            role: "admin",
            subscriptionType: "pro",
            name: "\u0410\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440"
          });
        }
      }
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Error connecting Telegram bot:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F Telegram \u0431\u043E\u0442\u0430" });
    }
  });
  app2.post("/api/telegram/link", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F" });
    }
    try {
      const { telegramId } = req.body;
      if (!telegramId) {
        return res.status(400).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F ID Telegram" });
      }
      const existingUser = await storage.getUserByTelegramId(telegramId);
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(400).json({ message: "\u042D\u0442\u043E\u0442 Telegram \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u0443\u0436\u0435 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D \u043A \u0434\u0440\u0443\u0433\u043E\u043C\u0443 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044E" });
      }
      const updatedUser = await storage.updateUser(req.user.id, { telegramId });
      if (!updatedUser) {
        return res.status(404).json({ message: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      }
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error linking Telegram account:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0438 Telegram \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430" });
    }
  });
  app2.get("/api/subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F" });
    }
    try {
      const subscription = await storage.getActiveSubscriptionByUserId(req.user.id);
      res.json({ subscription });
    } catch (error) {
      console.error("Error getting subscription:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F \u0434\u0430\u043D\u043D\u044B\u0445 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438" });
    }
  });
  app2.get("/api/subscription/history", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F" });
    }
    try {
      const subscriptions2 = await storage.getSubscriptionsByUserId(req.user.id);
      res.json({ subscriptions: subscriptions2 });
    } catch (error) {
      console.error("Error getting subscription history:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F \u0438\u0441\u0442\u043E\u0440\u0438\u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u043E\u043A" });
    }
  });
  app2.post("/api/subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F" });
    }
    if (req.user.role !== "admin" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "\u0422\u043E\u043B\u044C\u043A\u043E \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440 \u043C\u043E\u0436\u0435\u0442 \u0441\u043E\u0437\u0434\u0430\u0432\u0430\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 \u0432\u0440\u0443\u0447\u043D\u0443\u044E" });
    }
    try {
      const { type, userId, duration } = req.body;
      if (!type || !userId) {
        return res.status(400).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0443\u043A\u0430\u0437\u0430\u0442\u044C \u0442\u0438\u043F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 \u0438 ID \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F" });
      }
      if (type !== "free" && type !== "pro") {
        return res.status(400).json({ message: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0442\u0438\u043F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u0442\u0438\u043F\u044B: free, pro" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      }
      let expiresAt = null;
      let amount = 0;
      if (type === "pro") {
        const durationMs = duration === "year" ? 365 * 24 * 60 * 60 * 1e3 : 30 * 24 * 60 * 60 * 1e3;
        expiresAt = new Date(Date.now() + durationMs);
        amount = duration === "year" ? 799900 : 79900;
      }
      const subscriptionId = await storage.createSubscription({
        userId,
        type,
        expiresAt,
        amount
      });
      await storage.updateUser(userId, {
        subscriptionType: type,
        subscriptionExpiresAt: expiresAt
      });
      const subscription = await storage.getSubscription(subscriptionId);
      res.status(201).json({
        success: true,
        subscription,
        message: "\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0441\u043E\u0437\u0434\u0430\u043D\u0430"
      });
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438" });
    }
  });
  app2.post("/api/subscription/:id/cancel", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F" });
    }
    try {
      const subscriptionId = parseInt(req.params.id);
      if (isNaN(subscriptionId)) {
        return res.status(400).json({ message: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 ID \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438" });
      }
      const subscription = await storage.getSubscription(subscriptionId);
      if (!subscription) {
        return res.status(404).json({ message: "\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" });
      }
      if (subscription.userId !== req.user.id && req.user.role !== "admin" && req.user.role !== "superadmin") {
        return res.status(403).json({ message: "\u041D\u0435\u0442 \u043F\u0440\u0430\u0432 \u043D\u0430 \u043E\u0442\u043C\u0435\u043D\u0443 \u044D\u0442\u043E\u0439 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438" });
      }
      const cancelledSubscription = await storage.updateSubscription(subscriptionId, {
        isActive: false,
        cancelledAt: /* @__PURE__ */ new Date()
      });
      if (subscription.isActive) {
        await storage.updateUser(subscription.userId, {
          subscriptionType: "free",
          subscriptionExpiresAt: null
        });
      }
      res.json({
        success: true,
        subscription: cancelledSubscription,
        message: "\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u0430"
      });
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0442\u043C\u0435\u043D\u044B \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438" });
    }
  });
  app2.get("/api/payments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F" });
    }
    try {
      const payments2 = await storage.getPaymentsByUserId(req.user.id);
      res.json({ payments: payments2 });
    } catch (error) {
      console.error("Error getting payments:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F \u0438\u0441\u0442\u043E\u0440\u0438\u0438 \u043F\u043B\u0430\u0442\u0435\u0436\u0435\u0439" });
    }
  });
  app2.post("/api/payments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F" });
    }
    if (req.user.role !== "admin" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "\u0422\u043E\u043B\u044C\u043A\u043E \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440 \u043C\u043E\u0436\u0435\u0442 \u0441\u043E\u0437\u0434\u0430\u0432\u0430\u0442\u044C \u043F\u043B\u0430\u0442\u0435\u0436\u0438 \u0432\u0440\u0443\u0447\u043D\u0443\u044E" });
    }
    try {
      const { userId, amount, paymentMethod, subscriptionId } = req.body;
      if (!userId || !amount) {
        return res.status(400).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0443\u043A\u0430\u0437\u0430\u0442\u044C ID \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0438 \u0441\u0443\u043C\u043C\u0443" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      }
      const payment = await storage.createPayment({
        userId,
        amount: parseInt(amount),
        status: "completed",
        paymentMethod: paymentMethod || "manual",
        subscriptionId: subscriptionId || null
      });
      if (!subscriptionId) {
        const currentBalance = user.balance || 0;
        await storage.updateUser(userId, {
          balance: currentBalance + parseInt(amount)
        });
        await storage.createBalanceHistory({
          userId,
          amount: parseInt(amount),
          type: "deposit",
          description: "\u041F\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 \u0431\u0430\u043B\u0430\u043D\u0441\u0430",
          adminId: parseInt(req.user.id.toString())
        });
      }
      res.status(201).json({
        success: true,
        payment,
        message: "\u041F\u043B\u0430\u0442\u0435\u0436 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0441\u043E\u0437\u0434\u0430\u043D"
      });
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u043F\u043B\u0430\u0442\u0435\u0436\u0430" });
    }
  });
  app2.post("/api/upgrade-subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F" });
    }
    try {
      const { duration = 30 } = req.body;
      const payment = await storage.createPayment({
        userId: req.user.id,
        amount: duration === 30 ? 499 : 999,
        status: "completed",
        paymentMethod: "test",
        paymentId: `test-${Date.now()}`
      });
      const expiresAt = /* @__PURE__ */ new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(duration));
      const subscriptionId = await storage.createSubscription({
        userId: req.user.id,
        type: "pro",
        expiresAt,
        paymentId: payment.id.toString(),
        // Преобразуем в строку для соответствия схеме
        amount: payment.amount
      });
      await storage.createBalanceHistory({
        userId: req.user.id,
        amount: payment.amount,
        type: "subscription_payment",
        description: `\u041E\u043F\u043B\u0430\u0442\u0430 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 PRO \u043D\u0430 ${duration} \u0434\u043D\u0435\u0439`
      });
      const updatedUser = await storage.updateUser(req.user.id, {
        subscriptionType: "pro",
        subscriptionExpiresAt: expiresAt
      });
      await storage.updatePayment(payment.id, {
        subscriptionId: parseInt(subscriptionId.toString()),
        // Преобразуем в число для соответствия схеме
        completedAt: /* @__PURE__ */ new Date()
      });
      const subscription = await storage.getSubscription(subscriptionId);
      res.json({
        success: true,
        user: updatedUser,
        subscription,
        payment,
        message: `\u0412\u0430\u0448\u0430 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0430 \u0434\u043E PRO \u0434\u043E ${expiresAt.toLocaleDateString()}`
      });
    } catch (error) {
      console.error("Error upgrading subscription:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438" });
    }
  });
  app2.get("/api/balance/history", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F" });
    }
    try {
      const history = await storage.getBalanceHistoryByUserId(req.user.id);
      res.json({ history });
    } catch (error) {
      console.error("Error getting balance history:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F \u0438\u0441\u0442\u043E\u0440\u0438\u0438 \u0431\u0430\u043B\u0430\u043D\u0441\u0430" });
    }
  });
  app2.post("/api/admin/users/:userId/subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F" });
    }
    if (req.user.role !== "admin" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "\u0422\u043E\u043B\u044C\u043A\u043E \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440 \u043C\u043E\u0436\u0435\u0442 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430\u043C\u0438 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439" });
    }
    try {
      const userId = parseInt(req.params.userId);
      const { subscriptionType, duration } = req.body;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      }
      if (subscriptionType === "free") {
        const activeSubscription = await storage.getActiveSubscriptionByUserId(userId);
        if (activeSubscription) {
          await storage.updateSubscription(activeSubscription.id, {
            isActive: false,
            cancelledAt: /* @__PURE__ */ new Date()
          });
        }
        const updatedUser = await storage.updateUser(userId, {
          subscriptionType: "free",
          subscriptionExpiresAt: null
        });
        await storage.createBalanceHistory({
          userId,
          amount: 0,
          type: "admin_action",
          description: `\u0421\u0431\u0440\u043E\u0441 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 \u0434\u043E FREE \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u043E\u043C (${req.user.username})`,
          adminId: parseInt(req.user.id.toString())
          // Преобразуем в число
        });
        return res.json({
          success: true,
          user: updatedUser,
          message: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043F\u0435\u0440\u0435\u0432\u0435\u0434\u0435\u043D \u043D\u0430 \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u0439 \u043F\u043B\u0430\u043D"
        });
      }
      if (subscriptionType === "pro") {
        const durationDays = duration || 30;
        const expiresAt = /* @__PURE__ */ new Date();
        expiresAt.setDate(expiresAt.getDate() + Number(durationDays));
        const subscriptionId = await storage.createSubscription({
          userId,
          type: "pro",
          expiresAt,
          amount: 0
          // Бесплатно, т.к. админ назначил
        });
        const updatedUser = await storage.updateUser(userId, {
          subscriptionType: "pro",
          subscriptionExpiresAt: expiresAt
        });
        await storage.createBalanceHistory({
          userId,
          amount: 0,
          type: "admin_action",
          description: `\u041D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 PRO \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 \u043D\u0430 ${durationDays} \u0434\u043D\u0435\u0439 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u043E\u043C (${req.user.username})`,
          adminId: parseInt(req.user.id.toString())
          // Преобразуем в число
        });
        return res.json({
          success: true,
          user: updatedUser,
          expiresAt,
          message: `\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044E \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0430 PRO \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430 \u0434\u043E ${expiresAt.toLocaleDateString()}`
        });
      }
      return res.status(400).json({ message: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0442\u0438\u043F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438. \u0414\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F: 'free', 'pro'" });
    } catch (error) {
      console.error("Error updating user subscription:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F" });
    }
  });
  app2.get("/api/conferences/:id/check-limits", async (req, res) => {
    const conference = await storage.getConference(req.params.id);
    if (!conference) {
      return res.status(404).json({ message: "\u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" });
    }
    if (!conference.active) {
      return res.json({
        active: false,
        message: "\u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044F \u0443\u0436\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430"
      });
    }
    const creator = await storage.getUser(conference.creatorId);
    if (!creator) {
      return res.status(404).json({ message: "\u0421\u043E\u0437\u0434\u0430\u0442\u0435\u043B\u044C \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
    }
    const creatorSubscriptionType = creator.subscriptionType || "free";
    const isFreeTier = creatorSubscriptionType === "free";
    if (isFreeTier && conference.startedAt) {
      const now = /* @__PURE__ */ new Date();
      const durationMin = Math.floor((now.getTime() - conference.startedAt.getTime()) / (60 * 1e3));
      if (durationMin >= 15) {
        const durationSeconds = Math.floor((now.getTime() - conference.startedAt.getTime()) / 1e3);
        await storage.updateConference(conference.id, {
          active: false,
          endedAt: now,
          duration: durationSeconds
        });
        return res.json({
          active: false,
          timeLimitExceeded: true,
          message: "\u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430 \u0438\u0437-\u0437\u0430 \u043F\u0440\u0435\u0432\u044B\u0448\u0435\u043D\u0438\u044F \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0433\u043E \u043B\u0438\u043C\u0438\u0442\u0430 \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E\u0433\u043E \u043F\u043B\u0430\u043D\u0430",
          durationMin,
          freeTimeLimit: 15
        });
      }
      return res.json({
        active: true,
        timeLimitExceeded: false,
        subscriptionType: creatorSubscriptionType,
        durationMin,
        freeTimeLimit: 15,
        remainingMin: 15 - durationMin
      });
    }
    return res.json({
      active: true,
      timeLimitExceeded: false,
      subscriptionType: creatorSubscriptionType,
      hasTimeLimits: false
    });
  });
  const httpServer = createServer(app2);
  const wss = setupWebRTC(httpServer);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
init_db();

// server/middleware.ts
function cacheControl(maxAge = 3600) {
  return (req, res, next) => {
    if (req.method === "GET" && (req.path.includes(".js") || req.path.includes(".css") || req.path.includes(".woff") || req.path.includes(".png") || req.path.includes(".jpg") || req.path.includes(".jpeg") || req.path.includes(".svg") || req.path.includes(".ico"))) {
      res.setHeader("Cache-Control", `public, max-age=${maxAge}, stale-while-revalidate=86400`);
      res.setHeader("Vary", "Accept-Encoding");
    }
    if (req.path.startsWith("/api/")) {
      res.setHeader("Cache-Control", "no-store, max-age=0");
    }
    next();
  };
}
function apiCache(ttl = 1e4) {
  return (req, res, next) => {
    if (req.method !== "GET" || !req.path.startsWith("/api/")) {
      return next();
    }
    if (req.headers.cookie?.includes("connect.sid") || req.headers.authorization) {
      return next();
    }
    const cacheKey = `api:${req.originalUrl}`;
    const cachedData = cache_default.get(cacheKey);
    if (cachedData) {
      res.json(cachedData);
      return;
    }
    const originalJson = res.json;
    res.json = function(data) {
      res.json = originalJson;
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache_default.set(cacheKey, data, ttl);
      }
      return originalJson.call(this, data);
    };
    next();
  };
}
function requestMonitor() {
  return (req, res, next) => {
    const startTime = process.hrtime();
    res.on("finish", () => {
      const hrTime = process.hrtime(startTime);
      const duration = hrTime[0] * 1e3 + hrTime[1] / 1e6;
      if (duration > 500 && req.path.startsWith("/api/")) {
        log(`SLOW REQUEST: ${req.method} ${req.path} - ${duration.toFixed(2)}ms`, "warning");
      }
    });
    next();
  };
}
function deviceDetection() {
  return (req, res, next) => {
    const userAgent = req.headers["user-agent"] || "";
    const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
    req.deviceInfo = {
      isMobile,
      isTablet,
      isDesktop: !isMobile && !isTablet,
      userAgent
    };
    next();
  };
}

// server/index.ts
init_telegram();
var app = express2();
app.use(express2.json({ limit: "2mb" }));
app.use(express2.urlencoded({ extended: false, limit: "2mb" }));
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    const allowedOrigins = ["https://yancuic-tlanextia.replit.app", "https://yancuic-tlanextia.com"];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
    }
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization,Upgrade,Connection,Sec-WebSocket-Key,Sec-WebSocket-Version,Sec-WebSocket-Extensions");
  res.header("Access-Control-Max-Age", "86400");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});
app.use(cacheControl(3600));
app.use(apiCache(3e4));
app.use(requestMonitor());
app.use(deviceDetection());
app.use((req, res, next) => {
  if (req.path.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf|eot)$/)) {
    return next();
  }
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (req.method === "GET") {
        const cacheKey = `api:${req.originalUrl}`;
        const cached = cache_default.get(cacheKey) !== void 0;
        if (cached) {
          logLine += " [cached]";
        }
      }
      if (capturedJsonResponse) {
        const jsonStr = JSON.stringify(capturedJsonResponse);
        if (jsonStr.length > 80) {
          logLine += ` :: ${jsonStr.slice(0, 79)}\u2026`;
        } else {
          logLine += ` :: ${jsonStr}`;
        }
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  try {
    const connected = await checkDatabaseConnection();
    if (!connected) {
      console.error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C\u0441\u044F \u043A \u0431\u0430\u0437\u0435 \u0434\u0430\u043D\u043D\u044B\u0445. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F.");
      process.exit(1);
    }
    log("\u0423\u0441\u043F\u0435\u0448\u043D\u043E\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u043A \u0431\u0430\u0437\u0435 \u0434\u0430\u043D\u043D\u044B\u0445");
  } catch (err) {
    console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u043A \u0431\u0430\u0437\u0435 \u0434\u0430\u043D\u043D\u044B\u0445:", err);
    process.exit(1);
  }
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  try {
    const botInitialized = await telegramService.initialize();
    if (botInitialized) {
      log("Telegram \u0431\u043E\u0442 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D");
    } else {
      log("Telegram \u0431\u043E\u0442 \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D \u0438\u043B\u0438 \u043F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438");
    }
  } catch (err) {
    console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438 Telegram \u0431\u043E\u0442\u0430:", err);
  }
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
  const gracefulShutdown = async () => {
    log("Graceful shutdown initiated...");
    try {
      await telegramService.stop();
      log("Telegram \u0431\u043E\u0442 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D");
    } catch (err) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0435 Telegram \u0431\u043E\u0442\u0430:", err);
    }
    server.close(() => {
      log("HTTP \u0441\u0435\u0440\u0432\u0435\u0440 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D");
      process.exit(0);
    });
    setTimeout(() => {
      log("\u041F\u0440\u0438\u043D\u0443\u0434\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u0435 \u0440\u0430\u0431\u043E\u0442\u044B");
      process.exit(1);
    }, 5e3);
  };
  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
})();
