import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Перечисления для типов подписок и ролей пользователей
export const subscriptionTypeEnum = pgEnum('subscription_type', ['free', 'pro']);
export const userRoleEnum = pgEnum('user_role', ['user', 'host', 'admin', 'superadmin']);

// Таблица пользователей
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  password: text("password").notNull(),
  name: text("name"),
  avatar: text("avatar"),
  role: userRoleEnum("role").notNull().default('user'),
  subscriptionType: subscriptionTypeEnum("subscription_type").notNull().default('free'),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  telegramId: text("telegram_id").unique(),
  isBanned: boolean("is_banned").default(false),
  banReason: text("ban_reason"),
  balance: integer("balance").default(0), // баланс в копейках
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

// Таблица конференций
export const conferences = pgTable("conferences", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  creatorId: integer("creator_id").notNull(),
  creatorName: text("creator_name"), // Имя создателя для быстрого отображения
  hostId: text("host_id"), // ID хоста конференции (может быть уникальным ID сессии)
  active: boolean("active").default(true),
  maxParticipants: integer("max_participants").default(5), // Лимит участников - 5 для обычной подписки
  currentParticipants: integer("current_participants").default(0),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  duration: integer("duration").default(0), // в секундах
  hasScreenShare: boolean("has_screen_share").default(false),
  hasChat: boolean("has_chat").default(true),
  hasVideoEnabled: boolean("has_video_enabled").default(true),
  hostVideoPriority: boolean("host_video_priority").default(true), // Приоритет видео хоста
  allowParticipantDetach: boolean("allow_participant_detach").default(true), // Разрешать ли участникам отцеплять видео
  isLocked: boolean("is_locked").default(false), // Заблокирована ли конференция от присоединения новых участников
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Таблица настроек телеграм-бота
export const telegramSettings = pgTable("telegram_settings", {
  id: serial("id").primaryKey(),
  botToken: text("bot_token"),
  isConnected: boolean("is_connected").default(false),
  connectedAt: timestamp("connected_at"),
  webhookUrl: text("webhook_url"),
  paymentProvider: text("payment_provider").default('yookassa'),
  paymentApiKey: text("payment_api_key"),
  adminPassword: text("admin_password"), // хешированный пароль для админа бота
  superAdminId: text("super_admin_id"), // Telegram ID суперадмина
});

// Таблица подписок
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: subscriptionTypeEnum("type").notNull(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  cancelledAt: timestamp("cancelled_at"),
  paymentId: text("payment_id"),
  amount: integer("amount"), // сумма в копейках
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Таблица платежей
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(), // сумма в копейках
  status: text("status").notNull(), // pending, completed, failed, refunded, canceled
  paymentMethod: text("payment_method"), // telegram, yookassa и т.д.
  paymentId: text("payment_id"), // ID платежа в платежной системе
  externalId: text("external_id"), // ID платежа во внешней платежной системе
  details: text("details"), // JSON строка с дополнительными данными о платеже
  type: text("type"), // subscription, extension, donation и т.д.
  subscriptionId: integer("subscription_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at"),
});

// Таблица истории баланса
export const balanceHistory = pgTable("balance_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(), // сумма изменения в копейках
  type: text("type").notNull(), // deposit, withdrawal, bonus, subscription
  description: text("description"),
  adminId: integer("admin_id"), // ID администратора, который изменил баланс
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Схемы для валидации данных при вставке

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  name: true,
  avatar: true,
  role: true,
  subscriptionType: true,
  telegramId: true,
});

export const insertConferenceSchema = createInsertSchema(conferences).pick({
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
  isLocked: true,
});

export const insertTelegramSettingsSchema = createInsertSchema(telegramSettings).pick({
  botToken: true,
  isConnected: true,
  connectedAt: true,
  webhookUrl: true,
  paymentProvider: true,
  paymentApiKey: true,
  adminPassword: true,
  superAdminId: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).pick({
  userId: true,
  type: true,
  expiresAt: true,
  paymentId: true,
  amount: true,
});

export const insertPaymentSchema = createInsertSchema(payments).pick({
  userId: true,
  amount: true,
  status: true,
  paymentMethod: true,
  paymentId: true,
  externalId: true,
  details: true,
  type: true,
  subscriptionId: true,
  updatedAt: true,
});

export const insertBalanceHistorySchema = createInsertSchema(balanceHistory).pick({
  userId: true,
  amount: true,
  type: true,
  description: true,
  adminId: true,
});

// Типы данных для использования в приложении

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertConference = z.infer<typeof insertConferenceSchema>;
// Используем непосредственно тип из базы данных для избежания несоответствий
export type Conference = typeof conferences.$inferSelect;

export type InsertTelegramSettings = z.infer<typeof insertTelegramSettingsSchema>;
export type TelegramSettings = typeof telegramSettings.$inferSelect;

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertBalanceHistory = z.infer<typeof insertBalanceHistorySchema>;
export type BalanceHistory = typeof balanceHistory.$inferSelect;

export type Participant = {
  id: string;
  name: string;
  isAdmin: boolean;
  isHost?: boolean; // Добавляем флаг для создателя конференции
  videoEnabled?: boolean;
  audioEnabled?: boolean;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isScreenSharing?: boolean;
  isHandRaised?: boolean;
  isRecording?: boolean;
  isSpeaking?: boolean;
  subscriptionType?: 'free' | 'pro'; // Тип подписки участника
  avatarUrl?: string; // URL аватара участника
  joinedAt?: string; // Время присоединения к конференции
};

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isAdmin: boolean;
};

export type PollOption = {
  id: string;
  text: string;
  votes: string[];
};

export type Poll = {
  id: string;
  question: string;
  options: PollOption[];
  creatorId: string;
  creatorName: string;
  multiple: boolean;
  createdAt: string;
  endedAt?: string;
};
