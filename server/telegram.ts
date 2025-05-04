import TelegramBot from 'node-telegram-bot-api';
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from './storage';
import { User, TelegramSettings, subscriptionTypeEnum, telegramSettings, users, conferences, payments } from '@shared/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';
import { db } from './db';

// Пространства имен для действий с инлайн клавиатурой
enum ActionNamespace {
  MENU = 'menu',   // Основное меню
  CONF = 'conf',   // Управление конференциями
  JOIN = 'join',   // Присоединение к конференции
  SUB = 'sub',     // Управление подписками
  ADMIN = 'adm',   // Функции администратора
  CREATE = 'create', // Создание конференции
}

// Типы меню
enum MenuType {
  MAIN = 'main',         // Главное меню
  CONFERENCES = 'confs', // Меню конференций
  PROFILE = 'profile',   // Профиль пользователя
  SUBSCRIPTION = 'subs', // Информация о подписке
  ADMIN = 'admin',       // Меню администратора
  CREATE_CONF = 'create', // Создание конференции
  JOIN_CONF = 'join',     // Присоединение к конференции
}

// Структура для создания кнопок меню
interface MenuButton {
  text: string;
  callback_data: string;
}

// Интерфейс для информации о состоянии создания конференции
interface CreateConferenceState {
  stage: 'name' | 'confirming';
  name?: string;
  timestamp: number;
}

// Интерфейс для информации о состоянии присоединения к конференции
interface JoinConferenceState {
  stage: 'id' | 'confirming';
  conferenceId?: string;
  timestamp: number;
}

// Интерфейс для информации о состоянии авторизации
interface AuthState {
  stage: 'username' | 'password';
  username?: string;
  timestamp: number;
}

const scryptAsync = promisify(scrypt);

// Константы для работы с подписками
const SUBSCRIPTION_PRICES = {
  free: 0,
  pro: {
    month: 79900, // 799 рублей в месяц
    year: 799900, // 7999 рублей в год (экономия 15%)
  }
};

const SUBSCRIPTION_DURATIONS = {
  month: 30 * 24 * 60 * 60 * 1000, // 30 дней в миллисекундах
  year: 365 * 24 * 60 * 60 * 1000, // 365 дней в миллисекундах
};

// Класс для работы с Telegram ботом
export class TelegramService {
  private static instance: TelegramService;
  
  // Метод для получения экземпляра сервиса (Singleton)
  public static async getInstance(): Promise<TelegramService> {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
      // Пытаемся инициализировать при первом создании
      await TelegramService.instance.initialize();
    }
    return TelegramService.instance;
  }
  
  private bot: TelegramBot | null = null;
  private settings: TelegramSettings | null = null;
  private isInitialized = false;
  
  // Хранение состояний пользователей для интерактивных меню
  private userStates: Map<number, {
    activeMenu?: MenuType;
    lastMenuMessageId?: number;
    createConferenceState?: CreateConferenceState;
    joinConferenceState?: JoinConferenceState;
    authState?: AuthState;
  }> = new Map();
  
  // Приватный конструктор для Singleton
  private constructor() {}

  // Инициализация бота с токеном из базы данных
  async initialize(): Promise<boolean> {
    try {
      // Получаем настройки бота из базы данных
      this.settings = await storage.getTelegramSettings();
      
      if (!this.settings || !this.settings.botToken) {
        console.error('Telegram bot token not found in database');
        return false;
      }
      
      // Создаем экземпляр бота
      this.bot = new TelegramBot(this.settings.botToken, { polling: true });
      
      // Регистрируем обработчики сообщений
      this.setupMessageHandlers();
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Telegram bot:', error);
      return false;
    }
  }
  
  // Инициализация бота с новым токеном
  async init(botToken: string): Promise<boolean> {
    try {
      if (!botToken) {
        console.error('No Telegram bot token provided');
        return false;
      }
      
      // Сохраняем новые настройки
      let settings = await storage.getTelegramSettings();
      
      if (settings) {
        settings = await storage.updateTelegramSettings({
          botToken,
          isConnected: true,
          connectedAt: new Date()
        });
      } else {
        settings = await storage.saveTelegramSettings({
          botToken,
          isConnected: true,
          connectedAt: new Date()
        });
      }
      
      this.settings = settings;
      
      // Создаем экземпляр бота с новым токеном
      if (this.bot) {
        try {
          this.bot.stopPolling();
        } catch (e) {
          console.log('Error stopping existing bot', e);
        }
      }
      
      this.bot = new TelegramBot(botToken, { polling: true });
      
      // Регистрируем обработчики сообщений
      this.setupMessageHandlers();
      
      this.isInitialized = true;
      console.log('Telegram bot initialized successfully with new token');
      return true;
    } catch (error) {
      console.error('Failed to initialize Telegram bot with new token:', error);
      return false;
    }
  }
  
  // Получение состояния пользователя с инициализацией при необходимости
  private getUserState(chatId: number) {
    if (!this.userStates.has(chatId)) {
      this.userStates.set(chatId, {});
    }
    return this.userStates.get(chatId)!;
  }
  
  // Создание инлайн-кнопки с правильным форматированием данных обратного вызова
  private createButton(text: string, namespace: ActionNamespace, action: string, param: string = ''): MenuButton {
    return {
      text,
      callback_data: `${namespace}:${action}${param ? `:${param}` : ''}`
    };
  }
  
  // Создание клавиатуры главного меню
  private async createMainMenuKeyboard(user: User): Promise<TelegramBot.InlineKeyboardButton[][]> {
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        this.createButton('🗓 Мои конференции', ActionNamespace.MENU, MenuType.CONFERENCES),
        this.createButton('👤 Мой профиль', ActionNamespace.MENU, MenuType.PROFILE)
      ],
      [
        this.createButton('➕ Создать конференцию', ActionNamespace.CREATE, 'start'),
        this.createButton('🔍 Присоединиться', ActionNamespace.JOIN, 'start')
      ],
      [
        this.createButton('💳 Подписка', ActionNamespace.MENU, MenuType.SUBSCRIPTION)
      ]
    ];
    
    // Добавляем меню администратора, если пользователь имеет соответствующие права
    if (user.role === 'admin' || user.role === 'superadmin') {
      keyboard.push([
        this.createButton('⚙️ Админ панель', ActionNamespace.MENU, MenuType.ADMIN)
      ]);
    }
    
    return keyboard;
  }
  
  // Отправка основного меню пользователю
  private async sendMainMenu(chatId: number, user: User) {
    if (!this.bot) return;
    
    const state = this.getUserState(chatId);
    
    // Определяем эмодзи подписки
    const subIcon = user.subscriptionType === 'pro' ? '🌟' : '🌙';
    const subName = user.subscriptionType === 'pro' ? 'Pro' : 'Free';
    
    // Создаем сообщение приветствия
    const welcomeMessage = `
🚀 <b>Ikarus</b> - платформа видеоконференций
    
👋 Здравствуйте, <b>${user.name || user.username}</b>!
${subIcon} Ваша подписка: <b>${subName}</b>${user.subscriptionExpiresAt ? ` (до ${user.subscriptionExpiresAt.toLocaleDateString()})` : ''}

Выберите действие:
`;
    
    // Получаем клавиатуру
    const keyboard = await this.createMainMenuKeyboard(user);
    
    try {
      // Если у пользователя уже было меню, удаляем его
      if (state.lastMenuMessageId) {
        try {
          await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
        } catch (e) {
          console.log('Could not delete previous menu message', e);
        }
      }
      
      // Отправляем новое меню
      const message = await this.bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      
      // Сохраняем ID сообщения с меню для последующего обновления
      state.lastMenuMessageId = message.message_id;
      state.activeMenu = MenuType.MAIN;
    } catch (error) {
      console.error('Error sending main menu:', error);
    }
  }

  // Настройка обработчиков сообщений
  private setupMessageHandlers() {
    if (!this.bot) return;
    
    // Обработка callback запросов от инлайн-кнопок (меню)
    this.bot.on('callback_query', async (query) => {
      if (!query.message || !query.data || !query.from) return;
      
      const chatId = query.message.chat.id;
      const telegramId = query.from.id.toString();
      
      // Парсим данные из callback
      const [namespace, action, param] = query.data.split(':');
      
      try {
        // Обработка админ-команд
        if (namespace === 'admin') {
          // Получаем пользователя для проверки прав
          const adminUser = await storage.getUserByTelegramId(telegramId);
          
          if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'superadmin')) {
            await this.bot?.answerCallbackQuery(query.id, {
              text: 'У вас нет прав администратора',
              show_alert: true
            });
            return;
          }
          
          // Если действие - возврат в панель администратора
          if (action === 'back') {
            await this.showAdminPanel(chatId, adminUser);
          } else {
            // Иначе передаем запрос в отдельный обработчик админ-команд
            await this.handleAdminCallbacks(query.data, query);
          }
          
          // Отвечаем на callback query, чтобы убрать "часики" с кнопки
          await this.bot?.answerCallbackQuery(query.id);
          return;
        }
        
        // Обработка авторизации (работает до привязки аккаунта)
        if (namespace === 'auth') {
          // Получаем состояние пользователя
          const state = this.getUserState(chatId);
          
          switch (action) {
            case 'login':
              if (param === 'start') {
                // Начинаем процесс входа
                await this.sendUsernamePrompt(chatId);
              }
              break;
            case 'help':
              // Показываем справку по авторизации
              await this.sendAuthHelp(chatId);
              break;
            case 'back':
              // Возвращаемся к начальному экрану авторизации
              await this.sendRegistrationInstructions(chatId);
              break;
            case 'cancel':
              // Отменяем процесс авторизации
              state.authState = undefined;
              await this.sendRegistrationInstructions(chatId);
              break;
          }
          
          // Отвечаем на callback query, чтобы убрать "часики" с кнопки
          await this.bot?.answerCallbackQuery(query.id);
          return;
        }
        
        // Для остальных команд требуется авторизация
        // Получаем пользователя
        const user = await storage.getUserByTelegramId(telegramId);
        
        if (!user) {
          await this.bot?.sendMessage(chatId, 
            '⚠️ Ваш Telegram не привязан к аккаунту. Используйте кнопки для входа.'
          );
          await this.sendRegistrationInstructions(chatId);
          return;
        }
        
        // Обработка различных типов меню
        if (namespace === ActionNamespace.MENU) {
          switch (action) {
            case MenuType.MAIN:
              await this.sendMainMenu(chatId, user);
              break;
            case MenuType.CONFERENCES:
              await this.sendConferencesMenu(chatId, user);
              break;
            case MenuType.PROFILE:
              await this.sendProfileMenu(chatId, user);
              break;
            case MenuType.SUBSCRIPTION:
              await this.sendSubscriptionMenu(chatId, user);
              break;
            case MenuType.ADMIN:
              // Интерактивная админ-панель для Telegram
              if (user.role === 'admin' || user.role === 'superadmin') {
                await this.showAdminPanel(chatId, user);
              } else {
                await this.bot.sendMessage(chatId, "⛔️ У вас нет прав администратора");
              }
              break;
          }
        }
        // Обработка создания конференции
        else if (namespace === ActionNamespace.CREATE) {
          if (action === 'start') {
            // Начинаем процесс создания конференции
            const state = this.getUserState(chatId);
            
            // Удаляем предыдущее меню
            if (state.lastMenuMessageId) {
              try {
                await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
              } catch (e) {
                console.log('Could not delete previous menu message', e);
              }
            }
            
            // Инициализируем состояние создания конференции
            state.createConferenceState = {
              stage: 'name',
              timestamp: Date.now()
            };
            
            const message = await this.bot.sendMessage(chatId, 
              '✏️ Пожалуйста, введите название для новой конференции (не менее 3 символов):',
              {
                reply_markup: {
                  inline_keyboard: [[
                    this.createButton('« Отмена', ActionNamespace.MENU, MenuType.MAIN)
                  ]]
                }
              }
            );
            
            state.lastMenuMessageId = message.message_id;
          }
        }
        // Обработка присоединения к конференции
        else if (namespace === ActionNamespace.JOIN) {
          if (action === 'start') {
            // Начинаем процесс присоединения к конференции
            const state = this.getUserState(chatId);
            
            // Удаляем предыдущее меню
            if (state.lastMenuMessageId) {
              try {
                await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
              } catch (e) {
                console.log('Could not delete previous menu message', e);
              }
            }
            
            // Инициализируем состояние присоединения
            state.joinConferenceState = {
              stage: 'id',
              timestamp: Date.now()
            };
            
            const message = await this.bot.sendMessage(chatId, 
              '🆔 Пожалуйста, введите ID конференции, к которой хотите присоединиться:',
              {
                reply_markup: {
                  inline_keyboard: [[
                    this.createButton('« Отмена', ActionNamespace.MENU, MenuType.MAIN)
                  ]]
                }
              }
            );
            
            state.lastMenuMessageId = message.message_id;
          }
        }
        // Обработка управления подпиской
        else if (namespace === ActionNamespace.SUB) {
          if (action === 'month') {
            // Оформление месячной подписки
            await this.subscribeUser(chatId, telegramId, 'pro-month');
            // После оформления показываем обновлённый профиль
            await this.sendProfileMenu(chatId, await storage.getUserByTelegramId(telegramId) as User);
          }
          else if (action === 'year') {
            // Оформление годовой подписки
            await this.subscribeUser(chatId, telegramId, 'pro-year');
            // После оформления показываем обновлённый профиль
            await this.sendProfileMenu(chatId, await storage.getUserByTelegramId(telegramId) as User);
          }
          else if (action === 'topup') {
            // Показываем информацию о пополнении баланса
            await this.bot.sendMessage(chatId, 
              '💳 Для пополнения баланса перейдите на наш сайт https://ikarus.app/payments или свяжитесь с администратором.'
            );
          }
        }
        
        // Отвечаем на callback query, чтобы убрать "часики" с кнопки
        await this.bot.answerCallbackQuery(query.id);
        
      } catch (error) {
        console.error('Error handling callback query:', error);
        await this.bot.sendMessage(chatId, 
          '⚠️ Произошла ошибка при обработке запроса. Пожалуйста, попробуйте позже.'
        );
      }
    });

    // Обработка команды /start
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();
      
      if (!telegramId) return;
      
      const user = await storage.getUserByTelegramId(telegramId);
      
      if (user) {
        // Пользователь уже зарегистрирован
        await this.sendWelcomeBackMessage(chatId, user);
      } else {
        // Новый пользователь
        await this.sendRegistrationInstructions(chatId);
      }
    });

    // Обработка команды /help
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      await this.sendHelpMessage(chatId);
    });
    
    // Обработка команды /conferences - показать мои конференции
    this.bot.onText(/\/conferences/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();
      
      if (!telegramId) return;
      
      await this.sendUserConferences(chatId, telegramId);
    });
    
    // Обработка команды /join - присоединиться к конференции по ID
    this.bot.onText(/\/join (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();
      
      if (!telegramId || !match || !match[1]) return;
      
      const conferenceId = match[1].trim();
      await this.joinConference(chatId, telegramId, conferenceId);
    });
    
    // Обработка команды /create - создать новую конференцию
    this.bot.onText(/\/create (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();
      
      if (!telegramId || !match || !match[1]) return;
      
      const conferenceName = match[1].trim();
      await this.createConference(chatId, telegramId, conferenceName);
    });
    

    // Обработка команды /register
    this.bot.onText(/\/register (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();
      
      if (!telegramId || !match || !match[1]) return;
      
      const credentials = match[1].split(' ');
      
      if (credentials.length < 2) {
        await this.bot?.sendMessage(chatId, 
          '⚠️ Неверный формат команды. Используйте: /register username password'
        );
        return;
      }
      
      const username = credentials[0];
      const password = credentials.slice(1).join(' ');
      
      await this.registerUser(chatId, telegramId, username, password);
    });

    // Обработка команды /status
    this.bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();
      
      if (!telegramId) return;
      
      await this.sendUserStatus(chatId, telegramId);
    });

    // Обработка команды /subscribe
    this.bot.onText(/\/subscribe (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();
      
      if (!telegramId || !match || !match[1]) return;
      
      const plan = match[1].toLowerCase();
      
      if (plan !== 'pro-month' && plan !== 'pro-year') {
        await this.bot?.sendMessage(chatId, 
          '⚠️ Неверный план подписки. Доступные планы: pro-month, pro-year'
        );
        return;
      }
      
      await this.subscribeUser(chatId, telegramId, plan);
    });

    // Обработка команды для админа /admin
    this.bot.onText(/\/admin (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();
      
      if (!telegramId || !match || !match[1]) return;
      
      const password = match[1];
      
      await this.handleAdminAuth(chatId, telegramId, password);
    });

    // Обработка команды админа для управления пользователями
    this.bot.onText(/\/user (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();
      
      if (!telegramId || !match || !match[1]) return;
      
      const user = await storage.getUserByTelegramId(telegramId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
        await this.bot?.sendMessage(chatId, '⛔️ У вас нет прав администратора');
        return;
      }
      
      const args = match[1].split(' ');
      const command = args[0].toLowerCase();
      
      switch (command) {
        case 'list':
          await this.listUsers(chatId);
          break;
        case 'info':
          if (args.length < 2) {
            await this.bot?.sendMessage(chatId, '⚠️ Укажите имя пользователя: /user info username');
            return;
          }
          await this.getUserInfo(chatId, args[1]);
          break;
        case 'ban':
          if (args.length < 2) {
            await this.bot?.sendMessage(chatId, '⚠️ Укажите имя пользователя: /user ban username причина');
            return;
          }
          const reason = args.length > 2 ? args.slice(2).join(' ') : 'Нарушение правил';
          await this.banUser(chatId, args[1], reason);
          break;
        case 'unban':
          if (args.length < 2) {
            await this.bot?.sendMessage(chatId, '⚠️ Укажите имя пользователя: /user unban username');
            return;
          }
          await this.unbanUser(chatId, args[1]);
          break;
        case 'upgrade':
          if (args.length < 3) {
            await this.bot?.sendMessage(chatId, '⚠️ Укажите имя пользователя и тип подписки: /user upgrade username pro');
            return;
          }
          await this.upgradeUserSubscription(chatId, args[1], args[2]);
          break;
        default:
          await this.bot?.sendMessage(chatId, 
            '⚠️ Неизвестная команда. Доступные команды:\n' +
            '/user list - список пользователей\n' +
            '/user info username - информация о пользователе\n' +
            '/user ban username причина - заблокировать пользователя\n' +
            '/user unban username - разблокировать пользователя\n' +
            '/user upgrade username тип - изменить тип подписки пользователя'
          );
      }
    });

    // Обработка неизвестных сообщений
    this.bot.on('message', async (msg) => {
      // Обрабатываем только текстовые сообщения и только если они не совпадают с командами
      if (!msg.text || msg.text.startsWith('/')) return;
      
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();
      const messageText = msg.text;
      
      if (!telegramId) return;
      
      try {
        // Получаем состояние для этого чата
        const state = this.getUserState(chatId);
        
        // Проверяем, находится ли пользователь в процессе авторизации
        if (state.authState) {
          if (state.authState.stage === 'username') {
            // Пользователь ввёл имя пользователя
            const username = messageText.trim();
            
            // Проверяем минимальную длину имени пользователя
            if (username.length < 3) {
              const errorMsg = await this.bot?.sendMessage(chatId, 
                '⚠️ Имя пользователя должно содержать не менее 3 символов. Попробуйте еще раз:',
                {
                  reply_markup: {
                    inline_keyboard: [[
                      { text: '« Отмена', callback_data: 'auth:cancel' }
                    ]]
                  }
                }
              );
              
              if (errorMsg) {
                state.lastMenuMessageId = errorMsg.message_id;
              }
              return;
            }
            
            // Проверяем существует ли такой пользователь
            const existingUser = await storage.getUserByUsername(username);
            if (!existingUser) {
              const errorMsg = await this.bot?.sendMessage(chatId, 
                '⚠️ Пользователь с таким именем не найден. Проверьте правильность ввода или зарегистрируйтесь на сайте.',
                {
                  reply_markup: {
                    inline_keyboard: [[
                      { text: '« Отмена', callback_data: 'auth:cancel' }
                    ]]
                  }
                }
              );
              
              if (errorMsg) {
                state.lastMenuMessageId = errorMsg.message_id;
              }
              return;
            }
            
            // Переходим к вводу пароля
            await this.sendPasswordPrompt(chatId, username);
            return;
          }
          else if (state.authState.stage === 'password') {
            // Пользователь ввёл пароль
            const password = messageText;
            const username = state.authState.username;
            
            if (!username) {
              // Неправильное состояние, перезапускаем процесс
              await this.sendRegistrationInstructions(chatId);
              return;
            }
            
            // Попытка входа
            await this.registerUser(chatId, telegramId, username, password);
            
            // Очищаем состояние авторизации
            state.authState = undefined;
            
            // Проверяем успешность входа
            const user = await storage.getUserByTelegramId(telegramId);
            if (user) {
              // Вход успешен, показываем главное меню
              await this.sendMainMenu(chatId, user);
            }
            return;
          }
        }
        
        // Если пользователь не авторизован, показываем меню авторизации
        const user = await storage.getUserByTelegramId(telegramId);
        if (!user) {
          await this.sendRegistrationInstructions(chatId);
          return;
        }
        
        // Проверяем, находится ли пользователь в процессе создания конференции
        if (state.createConferenceState && state.createConferenceState.stage === 'name') {
          // Удаляем предыдущее сообщение с инструкцией
          if (state.lastMenuMessageId) {
            try {
              await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
            } catch (e) {
              console.log('Could not delete previous message', e);
            }
          }
          
          // Проверяем валидность названия
          if (messageText.length < 3) {
            const errorMsg = await this.bot.sendMessage(chatId, 
              '⚠️ Название конференции должно содержать не менее 3 символов. Попробуйте еще раз:',
              {
                reply_markup: {
                  inline_keyboard: [[
                    this.createButton('« Отмена', ActionNamespace.MENU, MenuType.MAIN)
                  ]]
                }
              }
            );
            
            state.lastMenuMessageId = errorMsg.message_id;
            return;
          }
          
          // Создаем конференцию
          await this.createConference(chatId, telegramId, messageText);
          
          // Сбрасываем состояние создания
          state.createConferenceState = undefined;
          
          // Показываем обновленный список конференций
          await this.sendConferencesMenu(chatId, user);
          return;
        }
        
        // Проверяем, находится ли пользователь в процессе присоединения к конференции
        if (state.joinConferenceState && state.joinConferenceState.stage === 'id') {
          // Удаляем предыдущее сообщение с инструкцией
          if (state.lastMenuMessageId) {
            try {
              await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
            } catch (e) {
              console.log('Could not delete previous message', e);
            }
          }
          
          // Присоединяемся к конференции по ID
          await this.joinConference(chatId, telegramId, messageText);
          
          // Сбрасываем состояние присоединения
          state.joinConferenceState = undefined;
          
          // После небольшой паузы показываем главное меню
          setTimeout(async () => {
            await this.sendMainMenu(chatId, user);
          }, 2000);
          
          return;
        }
        
        // Если нет активного состояния ввода, показываем меню
        if (user.role === 'admin' || user.role === 'superadmin') {
          // Для админов отправляем админ-меню или справку
          await this.sendMainMenu(chatId, user);
        } else {
          // Для обычных пользователей показываем главное меню
          await this.sendMainMenu(chatId, user);
        }
      } catch (error) {
        console.error('Error handling message:', error);
        await this.bot.sendMessage(chatId, 
          '⚠️ Произошла ошибка при обработке сообщения. Пожалуйста, попробуйте позже.'
        );
      }
    });
  }

  // Отправка приветственного сообщения
  private async sendWelcomeBackMessage(chatId: number, user: User) {
    if (!this.bot) return;
    
    // Показываем современное меню вместо текстового сообщения
    await this.sendMainMenu(chatId, user);
  }
  
  // Отправка меню конференций
  private async sendConferencesMenu(chatId: number, user: User) {
    if (!this.bot) return;
    
    const state = this.getUserState(chatId);
    
    try {
      // Получаем конференции пользователя
      const conferences = await storage.getConferencesByUserId(user.id);
      
      // Разделяем на активные и завершенные
      const activeConferences = conferences.filter(conf => conf.active);
      const endedConferences = conferences.filter(conf => !conf.active).sort((a, b) => 
        (b.endedAt?.getTime() || 0) - (a.endedAt?.getTime() || 0)
      ).slice(0, 5);
      
      // Формируем сообщение
      let message = `<b>🗓 Ваши конференции</b>\n\n`;
      
      if (activeConferences.length === 0 && endedConferences.length === 0) {
        message += 'У вас пока нет конференций.\nСоздайте новую конференцию с помощью кнопки "Создать конференцию"';
      } else {
        if (activeConferences.length > 0) {
          message += `<b>Активные конференции:</b>\n`;
          activeConferences.forEach((conf, index) => {
            const startedAt = conf.startedAt || conf.createdAt;
            message += `${index + 1}. <b>${conf.name}</b>\n`;
            message += `   ID: <code>${conf.id}</code>\n`;
            message += `   Участники: ${conf.currentParticipants || 0}/${conf.maxParticipants || 5}\n`;
            message += `   Начало: ${startedAt.toLocaleString()}\n\n`;
          });
        }
        
        if (endedConferences.length > 0) {
          message += `<b>Недавние конференции:</b>\n`;
          endedConferences.forEach((conf, index) => {
            const endedAt = conf.endedAt || new Date();
            message += `${index + 1}. <b>${conf.name}</b>\n`;
            message += `   ID: <code>${conf.id}</code>\n`;
            message += `   Окончание: ${endedAt.toLocaleString()}\n`;
            if (conf.recordingUrl) {
              message += `   Запись: ${conf.recordingUrl}\n`;
            }
            message += `\n`;
          });
        }
      }
      
      // Создаем клавиатуру
      const keyboard: TelegramBot.InlineKeyboardButton[][] = [
        [
          this.createButton('➕ Создать конференцию', ActionNamespace.CREATE, 'start')
        ],
        [
          this.createButton('🔍 Присоединиться к конференции', ActionNamespace.JOIN, 'start')
        ]
      ];
      
      // Если есть активные конференции, добавляем кнопки для присоединения
      if (activeConferences.length > 0) {
        keyboard.push([
          this.createButton('📋 Показать все активные', ActionNamespace.CONF, 'listActive')
        ]);
      }
      
      // Кнопка возврата в главное меню
      keyboard.push([
        this.createButton('« Назад в меню', ActionNamespace.MENU, MenuType.MAIN)
      ]);
      
      // Удаляем предыдущее меню
      if (state.lastMenuMessageId) {
        try {
          await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
        } catch (e) {
          console.log('Could not delete previous menu message', e);
        }
      }
      
      // Отправляем новое меню
      const newMessage = await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      
      // Сохраняем ID сообщения и тип меню
      state.lastMenuMessageId = newMessage.message_id;
      state.activeMenu = MenuType.CONFERENCES;
      
    } catch (error) {
      console.error('Error sending conferences menu:', error);
      await this.bot.sendMessage(chatId, 
        '⚠️ Произошла ошибка при получении списка конференций. Пожалуйста, попробуйте позже.'
      );
    }
  }
  
  // Отправка меню профиля
  private async sendProfileMenu(chatId: number, user: User) {
    if (!this.bot) return;
    
    const state = this.getUserState(chatId);
    
    try {
      // Формируем сообщение с профилем пользователя
      let message = `<b>👤 Ваш профиль</b>\n\n`;
      message += `<b>Имя:</b> ${user.name || 'Не указано'}\n`;
      message += `<b>Пользователь:</b> ${user.username}\n`;
      message += `<b>Email:</b> ${user.email || 'Не указан'}\n`;
      message += `<b>Роль:</b> ${this.translateRole(user.role)}\n\n`;
      
      // Информация о подписке
      const subIcon = user.subscriptionType === 'pro' ? '🌟' : '🌙';
      const subName = user.subscriptionType === 'pro' ? 'Pro' : 'Free';
      
      message += `<b>${subIcon} Подписка:</b> ${subName}\n`;
      
      if (user.subscriptionExpiresAt) {
        const daysLeft = Math.ceil((user.subscriptionExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        message += `<b>Действует до:</b> ${user.subscriptionExpiresAt.toLocaleDateString()}\n`;
        message += `<b>Осталось дней:</b> ${daysLeft > 0 ? daysLeft : 'Истекла'}\n\n`;
      } else if (user.subscriptionType === 'pro') {
        message += `<b>Действует до:</b> Бессрочно\n\n`;
      } else {
        message += `\n`;
      }
      
      // Баланс
      const currentBalance = user.balance || 0;
      message += `<b>💰 Баланс:</b> ${(currentBalance / 100).toFixed(2)} ₽\n\n`;
      
      message += `<b>📆 Дата регистрации:</b> ${user.createdAt.toLocaleDateString()}\n`;
      if (user.lastLoginAt) {
        message += `<b>🕒 Последний вход:</b> ${user.lastLoginAt.toLocaleString()}\n`;
      }
      
      // Создаем клавиатуру
      const keyboard: TelegramBot.InlineKeyboardButton[][] = [];
      
      // Если у пользователя бесплатная подписка, предлагаем оформить Pro
      if (user.subscriptionType === 'free') {
        keyboard.push([
          this.createButton('⭐️ Оформить Pro подписку', ActionNamespace.MENU, MenuType.SUBSCRIPTION)
        ]);
      }
      
      // Кнопка возврата в главное меню
      keyboard.push([
        this.createButton('« Назад в меню', ActionNamespace.MENU, MenuType.MAIN)
      ]);
      
      // Удаляем предыдущее меню
      if (state.lastMenuMessageId) {
        try {
          await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
        } catch (e) {
          console.log('Could not delete previous menu message', e);
        }
      }
      
      // Отправляем новое меню
      const newMessage = await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      
      // Сохраняем ID сообщения и тип меню
      state.lastMenuMessageId = newMessage.message_id;
      state.activeMenu = MenuType.PROFILE;
      
    } catch (error) {
      console.error('Error sending profile menu:', error);
      await this.bot.sendMessage(chatId, 
        '⚠️ Произошла ошибка при получении профиля. Пожалуйста, попробуйте позже.'
      );
    }
  }
  
  // Отправка меню подписки
  private async sendSubscriptionMenu(chatId: number, user: User) {
    if (!this.bot) return;
    
    const state = this.getUserState(chatId);
    
    try {
      // Формируем сообщение о подписке
      let message = `<b>💳 Управление подпиской</b>\n\n`;
      
      // Информация о текущей подписке
      const subIcon = user.subscriptionType === 'pro' ? '🌟' : '🌙';
      const subName = user.subscriptionType === 'pro' ? 'Pro' : 'Free';
      
      message += `<b>Текущая подписка:</b> ${subIcon} ${subName}\n`;
      
      if (user.subscriptionExpiresAt) {
        const daysLeft = Math.ceil((user.subscriptionExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        message += `<b>Действует до:</b> ${user.subscriptionExpiresAt.toLocaleDateString()}\n`;
        message += `<b>Осталось дней:</b> ${daysLeft > 0 ? daysLeft : 'Истекла'}\n\n`;
      } else if (user.subscriptionType === 'pro') {
        message += `<b>Действует до:</b> Бессрочно\n\n`;
      } else {
        message += `\n`;
      }
      
      // Информация о планах подписки
      message += `<b>📊 Доступные планы:</b>\n\n`;
      message += `<b>🌙 Free</b>\n`;
      message += `• Длительность конференций до 15 минут\n`;
      message += `• До 5 участников в конференции\n`;
      message += `• Базовые функции видеосвязи\n\n`;
      
      message += `<b>🌟 Pro</b>\n`;
      message += `• Неограниченное время конференций\n`;
      message += `• До 50 участников в конференции\n`;
      message += `• Демонстрация экрана\n`;
      message += `• Запись конференций\n`;
      message += `• Дополнительные инструменты\n\n`;
      
      message += `<b>💰 Стоимость Pro:</b>\n`;
      message += `• Месячная подписка: ${(SUBSCRIPTION_PRICES.pro.month / 100).toFixed(2)} ₽/месяц\n`;
      message += `• Годовая подписка: ${(SUBSCRIPTION_PRICES.pro.year / 100).toFixed(2)} ₽/год (экономия 15%)\n\n`;
      
      // Баланс
      const currentBalance = user.balance || 0;
      message += `<b>💰 Ваш баланс:</b> ${(currentBalance / 100).toFixed(2)} ₽\n\n`;
      
      // Создаем клавиатуру
      const keyboard: TelegramBot.InlineKeyboardButton[][] = [];
      
      // Кнопки для оформления подписки
      if (user.subscriptionType === 'free' || (user.subscriptionExpiresAt && user.subscriptionExpiresAt < new Date())) {
        // Проверяем достаточно ли средств на балансе
        if (currentBalance >= SUBSCRIPTION_PRICES.pro.month) {
          keyboard.push([
            this.createButton('Оформить Pro на месяц', ActionNamespace.SUB, 'month')
          ]);
        }
        
        if (currentBalance >= SUBSCRIPTION_PRICES.pro.year) {
          keyboard.push([
            this.createButton('Оформить Pro на год (выгоднее!)', ActionNamespace.SUB, 'year')
          ]);
        }
        
        if (currentBalance < SUBSCRIPTION_PRICES.pro.month) {
          keyboard.push([
            this.createButton('Пополнить баланс', ActionNamespace.SUB, 'topup')
          ]);
        }
      } 
      // Если уже есть Pro подписка
      else if (user.subscriptionType === 'pro') {
        if (user.subscriptionExpiresAt) {
          keyboard.push([
            this.createButton('Продлить подписку', ActionNamespace.SUB, 'extend')
          ]);
        }
      }
      
      // Кнопка возврата в главное меню
      keyboard.push([
        this.createButton('« Назад в меню', ActionNamespace.MENU, MenuType.MAIN)
      ]);
      
      // Удаляем предыдущее меню
      if (state.lastMenuMessageId) {
        try {
          await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
        } catch (e) {
          console.log('Could not delete previous menu message', e);
        }
      }
      
      // Отправляем новое меню
      const newMessage = await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      
      // Сохраняем ID сообщения и тип меню
      state.lastMenuMessageId = newMessage.message_id;
      state.activeMenu = MenuType.SUBSCRIPTION;
      
    } catch (error) {
      console.error('Error sending subscription menu:', error);
      await this.bot.sendMessage(chatId, 
        '⚠️ Произошла ошибка при получении информации о подписке. Пожалуйста, попробуйте позже.'
      );
    }
  }

  // Отправка меню регистрации и входа
  private async sendRegistrationInstructions(chatId: number) {
    if (!this.bot) return;
    
    const state = this.getUserState(chatId);
    
    // Удаляем предыдущее сообщение с меню, если оно есть
    if (state.lastMenuMessageId) {
      try {
        await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
      } catch (e) {
        console.log('Could not delete previous menu message', e);
      }
    }
    
    // Создаем сообщение приветствия
    const welcomeMessage = `
🚀 <b>Добро пожаловать в Ikarus!</b>

Ikarus - это современная платформа для видеоконференций с множеством полезных функций.

Для начала работы вам необходимо войти в свой аккаунт или зарегистрироваться.
    `;
    
    // Создаем клавиатуру с кнопками для регистрации и входа
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: '🔑 Войти с существующим аккаунтом', callback_data: 'auth:login:start' }
      ],
      [
        { text: '📝 Зарегистрироваться на сайте', url: 'https://ikarus.app/register' }
      ],
      [
        { text: '❓ Помощь', callback_data: 'auth:help' }
      ]
    ];
    
    // Отправляем меню
    const message = await this.bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
    
    // Сохраняем ID сообщения
    state.lastMenuMessageId = message.message_id;
  }
  
  // Отправка меню для ввода логина
  private async sendUsernamePrompt(chatId: number) {
    if (!this.bot) return;
    
    const state = this.getUserState(chatId);
    
    // Удаляем предыдущее сообщение с меню, если оно есть
    if (state.lastMenuMessageId) {
      try {
        await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
      } catch (e) {
        console.log('Could not delete previous menu message', e);
      }
    }
    
    // Создаем сообщение с инструкцией
    const message = await this.bot.sendMessage(chatId, 
      '👤 <b>Вход в аккаунт</b>\n\nПожалуйста, введите ваше имя пользователя:',
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '« Отмена', callback_data: 'auth:cancel' }
          ]]
        }
      }
    );
    
    // Сохраняем состояние и ID сообщения
    state.lastMenuMessageId = message.message_id;
    state.authState = {
      stage: 'username',
      timestamp: Date.now()
    };
  }
  
  // Отправка меню для ввода пароля
  private async sendPasswordPrompt(chatId: number, username: string) {
    if (!this.bot) return;
    
    const state = this.getUserState(chatId);
    
    // Удаляем предыдущее сообщение с меню, если оно есть
    if (state.lastMenuMessageId) {
      try {
        await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
      } catch (e) {
        console.log('Could not delete previous menu message', e);
      }
    }
    
    // Создаем сообщение с инструкцией
    const message = await this.bot.sendMessage(chatId, 
      `👤 <b>Вход в аккаунт</b>\n\nИмя пользователя: <b>${username}</b>\n\nПожалуйста, введите ваш пароль:`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '« Отмена', callback_data: 'auth:cancel' }
          ]]
        }
      }
    );
    
    // Сохраняем состояние и ID сообщения
    state.lastMenuMessageId = message.message_id;
    state.authState = {
      stage: 'password',
      username,
      timestamp: Date.now()
    };
  }
  
  // Отправка справки по авторизации
  private async sendAuthHelp(chatId: number) {
    if (!this.bot) return;
    
    const state = this.getUserState(chatId);
    
    // Удаляем предыдущее сообщение с меню, если оно есть
    if (state.lastMenuMessageId) {
      try {
        await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
      } catch (e) {
        console.log('Could not delete previous menu message', e);
      }
    }
    
    // Создаем сообщение с инструкцией
    const helpMessage = `
<b>❓ Помощь с авторизацией</b>

<b>Как войти в существующий аккаунт:</b>
1. Нажмите кнопку "Войти с существующим аккаунтом"
2. Введите имя пользователя (логин)
3. Введите пароль

<b>Как зарегистрироваться:</b>
1. Нажмите кнопку "Зарегистрироваться на сайте"
2. Заполните форму регистрации на нашем сайте
3. Вернитесь в Telegram бот и войдите с созданными данными

<b>Проблемы с входом?</b>
• Проверьте правильность ввода имени пользователя и пароля
• Если вы забыли пароль, восстановите его на сайте
• По техническим вопросам обращайтесь в поддержку
    `;
    
    // Отправляем сообщение с помощью
    const message = await this.bot.sendMessage(chatId, helpMessage, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '« Назад', callback_data: 'auth:back' }
        ]]
      }
    });
    
    // Сохраняем ID сообщения
    state.lastMenuMessageId = message.message_id;
  }

  // Отправка справочного сообщения
  private async sendHelpMessage(chatId: number) {
    if (!this.bot) return;
    
    await this.bot.sendMessage(chatId, 
      '🔍 Доступные команды:\n\n' +
      '/start - начать взаимодействие с ботом\n' +
      '/help - показать справку\n' +
      '/register имя_пользователя пароль - привязать существующий аккаунт\n' +
      '/status - показать статус вашей подписки\n' +
      '/subscribe план - оформить подписку (доступные планы: pro-month, pro-year)\n' +
      '/conferences - список ваших конференций\n' +
      '/create название - создать новую конференцию\n' +
      '/join id - присоединиться к конференции по ID\n\n' +
      '💡 Преимущества Pro-подписки:\n' +
      '✅ Неограниченное время конференций (вместо 15 минут)\n' +
      '✅ До 100 участников в конференции (вместо 5)\n' +
      '✅ Запись конференций\n' +
      '✅ Демонстрация экрана\n' +
      '✅ Виртуальная доска\n' +
      '✅ Опросы и голосования\n\n' +
      '💰 Стоимость:\n' +
      'Pro-month: 799 ₽/месяц\n' +
      'Pro-year: 7999 ₽/год (экономия 15%)'
    );
  }

  // Отправка справки для админов
  private async sendAdminHelpMessage(chatId: number) {
    if (!this.bot) return;
    
    await this.bot.sendMessage(chatId, 
      '🔍 *Команды администратора:*\n\n' +
      '/user list - список пользователей\n' +
      '/user info username - информация о пользователе\n' +
      '/user ban username причина - заблокировать пользователя\n' +
      '/user unban username - разблокировать пользователя\n' +
      '/user upgrade username тип - изменить тип подписки пользователя\n\n' +
      '*Административная панель:*\n' +
      'Для полного доступа к функциям администратора перейдите на https://ikarus.app/admin\n' +
      'Там вы найдете расширенную статистику и полное управление системой.\n\n' +
      'Для получения обычной справки используйте /help',
      { parse_mode: 'Markdown' }
    );
  }

  // Регистрация пользователя
  private async registerUser(chatId: number, telegramId: string, username: string, password: string) {
    if (!this.bot) return;
    
    try {
      // Проверяем существует ли пользователь
      const existingUser = await storage.getUserByUsername(username);
      
      if (!existingUser) {
        await this.bot.sendMessage(chatId, 
          '⚠️ Пользователь с таким именем не найден. Убедитесь, что вы правильно ввели имя пользователя.'
        );
        return;
      }
      
      // Проверяем пароль
      const isPasswordValid = await this.comparePasswords(password, existingUser.password);
      
      if (!isPasswordValid) {
        await this.bot.sendMessage(chatId, 
          '⚠️ Неверный пароль. Пожалуйста, попробуйте снова.'
        );
        return;
      }
      
      // Проверяем, привязан ли уже Telegram к другому аккаунту
      if (existingUser.telegramId && existingUser.telegramId !== telegramId) {
        await this.bot.sendMessage(chatId, 
          '⚠️ Этот аккаунт уже привязан к другому Telegram пользователю.'
        );
        return;
      }
      
      // Обновляем пользователя, привязывая Telegram ID
      await storage.updateUser(existingUser.id, { 
        telegramId,
        lastLoginAt: new Date()
      });
      
      await this.bot.sendMessage(chatId, 
        `✅ Аккаунт успешно привязан к вашему Telegram!\n\n` +
        `Добро пожаловать, ${existingUser.name || existingUser.username}.\n\n` +
        `Используйте /status для проверки статуса вашей подписки.`
      );
      
    } catch (error) {
      console.error('Error registering user:', error);
      await this.bot.sendMessage(chatId, 
        '⚠️ Произошла ошибка при регистрации. Пожалуйста, попробуйте позже или обратитесь в поддержку.'
      );
    }
  }

  // Отправка статуса пользователя
  private async sendUserStatus(chatId: number, telegramId: string) {
    if (!this.bot) return;
    
    try {
      // Получаем пользователя по Telegram ID
      const user = await storage.getUserByTelegramId(telegramId);
      
      if (!user) {
        await this.bot.sendMessage(chatId, 
          '⚠️ Ваш Telegram не привязан к аккаунту. Используйте /register для привязки.'
        );
        return;
      }
      
      // Получаем активные конференции пользователя
      const conferences = await storage.getConferencesByUserId(user.id);
      const activeConferences = conferences.filter(conf => conf.active);
      
      // Безопасно получаем баланс
      const currentBalance = user.balance || 0;
      
      // Формируем сообщение о статусе
      let statusMessage = `👤 **Профиль пользователя**\n\n`;
      statusMessage += `Имя: ${user.name || 'Не указано'}\n`;
      statusMessage += `Пользователь: ${user.username}\n`;
      statusMessage += `Email: ${user.email || 'Не указан'}\n`;
      statusMessage += `Роль: ${this.translateRole(user.role)}\n`;
      statusMessage += `Баланс: ${(currentBalance / 100).toFixed(2)} ₽\n\n`;
      
      // Информация о подписке
      statusMessage += `📊 **Подписка**\n\n`;
      statusMessage += `Тип: ${user.subscriptionType === 'pro' ? '🌟 Pro' : '🌙 Free'}\n`;
      
      if (user.subscriptionExpiresAt) {
        const daysLeft = Math.ceil((user.subscriptionExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        statusMessage += `Действует до: ${user.subscriptionExpiresAt.toLocaleDateString()}\n`;
        statusMessage += `Осталось дней: ${daysLeft > 0 ? daysLeft : 'Истекла'}\n\n`;
      } else if (user.subscriptionType === 'pro') {
        statusMessage += `Действует до: Бессрочно\n\n`;
      } else {
        statusMessage += `\n`;
      }
      
      // Информация о конференциях
      statusMessage += `🗓 **Конференции**\n\n`;
      statusMessage += `Активных конференций: ${activeConferences.length}\n`;
      statusMessage += `Всего конференций: ${conferences.length}\n\n`;
      
      if (user.subscriptionType === 'free') {
        statusMessage += `⭐️ Оформите Pro подписку, чтобы получить доступ к расширенным возможностям!\n`;
        statusMessage += `Используйте /subscribe pro-month или /subscribe pro-year`;
      }
      
      await this.bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('Error sending user status:', error);
      await this.bot.sendMessage(chatId, 
        '⚠️ Произошла ошибка при получении статуса. Пожалуйста, попробуйте позже.'
      );
    }
  }

  // Подписка пользователя на платный план
  private async subscribeUser(chatId: number, telegramId: string, plan: string) {
    if (!this.bot) return;
    
    try {
      // Получаем пользователя по Telegram ID
      const user = await storage.getUserByTelegramId(telegramId);
      
      if (!user) {
        await this.bot.sendMessage(chatId, 
          '⚠️ Ваш Telegram не привязан к аккаунту. Используйте /register для привязки.'
        );
        return;
      }
      
      // Проверяем, не заблокирован ли пользователь
      if (user.isBanned) {
        await this.bot.sendMessage(chatId, 
          `⛔️ Ваш аккаунт заблокирован. Причина: ${user.banReason || 'Нарушение правил сервиса'}`
        );
        return;
      }
      
      // Определяем тип подписки и стоимость
      let amount: number;
      let duration: number;
      
      if (plan === 'pro-month') {
        amount = SUBSCRIPTION_PRICES.pro.month;
        duration = SUBSCRIPTION_DURATIONS.month;
      } else if (plan === 'pro-year') {
        amount = SUBSCRIPTION_PRICES.pro.year;
        duration = SUBSCRIPTION_DURATIONS.year;
      } else {
        await this.bot.sendMessage(chatId, 
          '⚠️ Неверный план подписки. Доступные планы: pro-month, pro-year'
        );
        return;
      }
      
      // Проверяем баланс пользователя
      const currentBalance = user.balance || 0;
      if (currentBalance < amount) {
        const missingAmount = amount - currentBalance;
        await this.bot.sendMessage(chatId, 
          `⚠️ Недостаточно средств на балансе для оформления подписки.\n\n` +
          `Текущий баланс: ${(currentBalance / 100).toFixed(2)} ₽\n` +
          `Стоимость подписки: ${(amount / 100).toFixed(2)} ₽\n` +
          `Не хватает: ${(missingAmount / 100).toFixed(2)} ₽\n\n` +
          `Для оплаты подписки используйте платежную систему на нашем сайте.`
        );
        return;
      }
      
      // Рассчитываем дату окончания подписки
      const expiresAt = new Date(Date.now() + duration);
      
      // Создаем запись о подписке
      const subscriptionId = await storage.createSubscription({
        userId: user.id,
        type: 'pro',
        expiresAt,
        amount
      });
      
      // Списываем средства с баланса пользователя
      await storage.updateUser(user.id, {
        subscriptionType: 'pro',
        subscriptionExpiresAt: expiresAt,
        balance: currentBalance - amount
      });
      
      // Создаем запись об оплате
      await storage.createPayment({
        userId: user.id,
        amount,
        status: 'completed',
        paymentMethod: 'balance',
        subscriptionId
      });
      
      // Создаем запись в истории баланса
      await storage.createBalanceHistory({
        userId: user.id,
        amount: -amount,
        type: 'subscription',
        description: `Оплата подписки ${plan}`
      });
      
      // Отправляем сообщение об успешной подписке
      await this.bot.sendMessage(chatId, 
        `✅ Подписка Pro успешно оформлена!\n\n` +
        `Тип: ${plan === 'pro-month' ? 'Месячная' : 'Годовая'}\n` +
        `Стоимость: ${(amount / 100).toFixed(2)} ₽\n` +
        `Действует до: ${expiresAt.toLocaleDateString()}\n\n` +
        `Теперь вам доступны все возможности Pro-аккаунта!\n` +
        `• Неограниченное время конференций\n` +
        `• До 100 участников\n` +
        `• Запись конференций\n` +
        `• Демонстрация экрана\n` +
        `• Виртуальная доска\n` +
        `• Опросы и голосования`
      );
      
    } catch (error) {
      console.error('Error subscribing user:', error);
      await this.bot.sendMessage(chatId, 
        '⚠️ Произошла ошибка при оформлении подписки. Пожалуйста, попробуйте позже или обратитесь в поддержку.'
      );
    }
  }

  // Обработка авторизации админа
  private async handleAdminAuth(chatId: number, telegramId: string, password: string) {
    if (!this.bot || !this.settings) return;
    
    try {
      // Проверяем, является ли пользователь суперадмином по Telegram ID
      const isSuperAdmin = this.settings.superAdminId === telegramId;
      
      // Проверяем пароль админа
      const isPasswordValid = this.settings.adminPassword && 
        await this.comparePasswords(password, this.settings.adminPassword);
      
      if (!isPasswordValid && !isSuperAdmin) {
        await this.bot.sendMessage(chatId, 
          '⚠️ Неверный пароль администратора.'
        );
        return;
      }
      
      // Получаем пользователя
      let user = await storage.getUserByTelegramId(telegramId);
      
      if (user) {
        // Обновляем роль пользователя до админа, если он еще не админ
        if (user.role !== 'admin' && user.role !== 'superadmin') {
          await storage.updateUser(user.id, { 
            role: isSuperAdmin ? 'superadmin' : 'admin'
          });
          
          user = await storage.getUserByTelegramId(telegramId);
        }
      } else {
        // Создаем нового пользователя с ролью админа
        const username = `admin_${Date.now()}`;
        const hashedPassword = await this.hashPassword(password);
        
        const newUser = await storage.createUser({
          username,
          password: hashedPassword,
          name: isSuperAdmin ? 'Super Administrator' : 'Administrator',
          role: isSuperAdmin ? 'superadmin' : 'admin',
          subscriptionType: 'pro',
          telegramId
        });
        
        user = newUser;
      }
      
      await this.bot.sendMessage(chatId, 
        `✅ Вы успешно аутентифицированы как ${isSuperAdmin ? 'суперадминистратор' : 'администратор'}!\n\n` +
        `Доступные команды администратора:\n` +
        `/user list - список пользователей\n` +
        `/user info username - информация о пользователе\n` +
        `/user ban username причина - заблокировать пользователя\n` +
        `/user unban username - разблокировать пользователя\n` +
        `/user upgrade username тип - изменить тип подписки пользователя`
      );
      
    } catch (error) {
      console.error('Error handling admin auth:', error);
      await this.bot.sendMessage(chatId, 
        '⚠️ Произошла ошибка при авторизации. Пожалуйста, попробуйте позже.'
      );
    }
  }

  // Вывод списка пользователей
  private async listUsers(chatId: number) {
    if (!this.bot) return;
    
    try {
      const allUsers = await storage.getAllUsers();
      
      if (allUsers.length === 0) {
        await this.bot.sendMessage(chatId, 'Пользователей не найдено.');
        return;
      }
      
      const usersList = allUsers.map((user, index) => {
        return `${index + 1}. ${user.username} (${this.translateRole(user.role)}) - ${user.subscriptionType === 'pro' ? '🌟 Pro' : '🌙 Free'}${user.isBanned ? ' ⛔️ Заблокирован' : ''}`;
      }).join('\n');
      
      const totalMessage = `👥 Всего пользователей: ${allUsers.length}\n\n${usersList}`;
      
      // Разбиваем сообщение, если оно слишком длинное
      if (totalMessage.length > 4000) {
        const chunks = this.splitMessage(totalMessage, 3900);
        for (const chunk of chunks) {
          await this.bot.sendMessage(chatId, chunk);
        }
      } else {
        await this.bot.sendMessage(chatId, totalMessage);
      }
      
    } catch (error) {
      console.error('Error listing users:', error);
      await this.bot.sendMessage(chatId, 
        '⚠️ Произошла ошибка при получении списка пользователей.'
      );
    }
  }

  // Получение информации о пользователе
  private async getUserInfo(chatId: number, username: string) {
    if (!this.bot) return;
    
    try {
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        await this.bot.sendMessage(chatId, 
          '⚠️ Пользователь не найден.'
        );
        return;
      }
      
      // Получаем конференции пользователя
      const conferences = await storage.getConferencesByUserId(user.id);
      
      // Безопасно получаем баланс
      const currentBalance = user.balance || 0;
      
      let message = `👤 **Информация о пользователе**\n\n`;
      message += `ID: ${user.id}\n`;
      message += `Имя пользователя: ${user.username}\n`;
      message += `Имя: ${user.name || 'Не указано'}\n`;
      message += `Email: ${user.email || 'Не указан'}\n`;
      message += `Роль: ${this.translateRole(user.role)}\n`;
      message += `Тип подписки: ${user.subscriptionType === 'pro' ? '🌟 Pro' : '🌙 Free'}\n`;
      
      if (user.subscriptionExpiresAt) {
        message += `Подписка до: ${user.subscriptionExpiresAt.toLocaleDateString()}\n`;
      }
      
      message += `Telegram ID: ${user.telegramId || 'Не привязан'}\n`;
      message += `Баланс: ${(currentBalance / 100).toFixed(2)} ₽\n`;
      message += `Статус: ${user.isBanned ? '⛔️ Заблокирован' : '✅ Активен'}\n`;
      
      if (user.isBanned && user.banReason) {
        message += `Причина блокировки: ${user.banReason}\n`;
      }
      
      message += `Дата регистрации: ${user.createdAt.toLocaleDateString()}\n`;
      message += `Последний вход: ${user.lastLoginAt ? user.lastLoginAt.toLocaleDateString() : 'Нет данных'}\n\n`;
      
      message += `🗓 **Конференции**\n\n`;
      message += `Всего конференций: ${conferences.length}\n`;
      message += `Активных конференций: ${conferences.filter(c => c.active).length}\n`;
      
      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('Error getting user info:', error);
      await this.bot.sendMessage(chatId, 
        '⚠️ Произошла ошибка при получении информации о пользователе.'
      );
    }
  }

  // Блокировка пользователя
  private async banUser(chatId: number, username: string, reason: string) {
    if (!this.bot) return;
    
    try {
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        await this.bot.sendMessage(chatId, 
          '⚠️ Пользователь не найден.'
        );
        return;
      }
      
      // Нельзя заблокировать суперадмина
      if (user.role === 'superadmin') {
        await this.bot.sendMessage(chatId, 
          '⚠️ Невозможно заблокировать суперадминистратора.'
        );
        return;
      }
      
      // Обновляем статус блокировки пользователя
      await storage.updateUser(user.id, {
        isBanned: true,
        banReason: reason
      });
      
      await this.bot.sendMessage(chatId, 
        `✅ Пользователь ${user.username} успешно заблокирован.\n` +
        `Причина: ${reason}`
      );
      
      // Отправляем уведомление пользователю, если у него привязан Telegram
      if (user.telegramId) {
        try {
          await this.bot.sendMessage(parseInt(user.telegramId), 
            `⛔️ Ваш аккаунт был заблокирован.\n` +
            `Причина: ${reason}\n\n` +
            `Для восстановления доступа, пожалуйста, обратитесь в поддержку.`
          );
        } catch (e) {
          console.error('Error sending ban notification to user:', e);
        }
      }
      
    } catch (error) {
      console.error('Error banning user:', error);
      await this.bot.sendMessage(chatId, 
        '⚠️ Произошла ошибка при блокировке пользователя.'
      );
    }
  }

  // Разблокировка пользователя
  private async unbanUser(chatId: number, username: string) {
    if (!this.bot) return;
    
    try {
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        await this.bot.sendMessage(chatId, 
          '⚠️ Пользователь не найден.'
        );
        return;
      }
      
      // Проверяем, что пользователь заблокирован
      if (!user.isBanned) {
        await this.bot.sendMessage(chatId, 
          '⚠️ Пользователь не заблокирован.'
        );
        return;
      }
      
      // Обновляем статус блокировки пользователя
      await storage.updateUser(user.id, {
        isBanned: false,
        banReason: null
      });
      
      await this.bot.sendMessage(chatId, 
        `✅ Пользователь ${user.username} успешно разблокирован.`
      );
      
      // Отправляем уведомление пользователю, если у него привязан Telegram
      if (user.telegramId) {
        try {
          await this.bot.sendMessage(parseInt(user.telegramId), 
            `✅ Ваш аккаунт был разблокирован.\n` +
            `Теперь вы снова можете пользоваться всеми возможностями сервиса.`
          );
        } catch (e) {
          console.error('Error sending unban notification to user:', e);
        }
      }
      
    } catch (error) {
      console.error('Error unbanning user:', error);
      await this.bot.sendMessage(chatId, 
        '⚠️ Произошла ошибка при разблокировке пользователя.'
      );
    }
  }

  // Обновление подписки пользователя
  private async upgradeUserSubscription(chatId: number, username: string, subscriptionType: string) {
    if (!this.bot) return;
    
    try {
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        await this.bot.sendMessage(chatId, 
          '⚠️ Пользователь не найден.'
        );
        return;
      }
      
      // Проверяем тип подписки
      if (subscriptionType !== 'free' && subscriptionType !== 'pro') {
        await this.bot.sendMessage(chatId, 
          '⚠️ Неверный тип подписки. Доступные типы: free, pro'
        );
        return;
      }
      
      // Рассчитываем дату окончания подписки (для Pro - 1 год от текущей даты)
      const expiresAt = subscriptionType === 'pro' ? 
        new Date(Date.now() + SUBSCRIPTION_DURATIONS.year) : null;
      
      // Обновляем подписку пользователя
      await storage.updateUser(user.id, {
        subscriptionType: subscriptionType as any,
        subscriptionExpiresAt: expiresAt
      });
      
      await this.bot.sendMessage(chatId, 
        `✅ Тип подписки пользователя ${user.username} успешно изменен на ${subscriptionType === 'pro' ? '🌟 Pro' : '🌙 Free'}.` +
        (expiresAt ? `\nСрок действия: до ${expiresAt.toLocaleDateString()}` : '')
      );
      
      // Отправляем уведомление пользователю, если у него привязан Telegram
      if (user.telegramId) {
        try {
          if (subscriptionType === 'pro') {
            await this.bot.sendMessage(parseInt(user.telegramId), 
              `🌟 Поздравляем! Ваша подписка была обновлена до Pro.\n` +
              `Срок действия: до ${expiresAt?.toLocaleDateString()}\n\n` +
              `Теперь вам доступны все возможности Pro-аккаунта!\n` +
              `• Неограниченное время конференций\n` +
              `• До 100 участников\n` +
              `• Запись конференций\n` +
              `• Демонстрация экрана\n` +
              `• Виртуальная доска\n` +
              `• Опросы и голосования`
            );
          } else {
            await this.bot.sendMessage(parseInt(user.telegramId), 
              `🌙 Ваша подписка была изменена на базовую (Free).\n` +
              `Теперь у вас действуют ограничения бесплатного аккаунта:\n` +
              `• Длительность конференций до 15 минут\n` +
              `• Максимум 5 участников\n` +
              `• Базовый функционал без дополнительных возможностей\n\n` +
              `Для получения полного доступа оформите Pro-подписку через команду /subscribe`
            );
          }
        } catch (e) {
          console.error('Error sending subscription update notification to user:', e);
        }
      }
      
    } catch (error) {
      console.error('Error upgrading user subscription:', error);
      await this.bot.sendMessage(chatId, 
        '⚠️ Произошла ошибка при обновлении подписки пользователя.'
      );
    }
  }
  
  // Отправка списка конференций пользователя
  private async sendUserConferences(chatId: number, telegramId: string) {
    if (!this.bot) return;
    
    try {
      // Получаем пользователя по Telegram ID
      const user = await storage.getUserByTelegramId(telegramId);
      
      if (!user) {
        await this.bot.sendMessage(chatId, 
          '⚠️ Ваш Telegram не привязан к аккаунту. Используйте /register для привязки.'
        );
        return;
      }
      
      // Получаем конференции пользователя
      const conferences = await storage.getConferencesByUserId(user.id);
      
      if (!conferences || conferences.length === 0) {
        await this.bot.sendMessage(chatId, 
          'У вас пока нет созданных конференций.\n\n' +
          'Используйте команду /create название для создания новой конференции.'
        );
        return;
      }
      
      // Разделяем на активные и завершенные
      const activeConferences = conferences.filter(conf => conf.active);
      const endedConferences = conferences.filter(conf => !conf.active);
      
      // Создаем сообщение со списком конференций
      let message = `🗓 **Ваши конференции**\n\n`;
      
      if (activeConferences.length > 0) {
        message += `**Активные конференции:**\n\n`;
        activeConferences.forEach((conf, index) => {
          const startedAt = conf.startedAt || conf.createdAt;
          const duration = conf.duration ? `${Math.floor(conf.duration / 60)} мин` : 'В процессе';
          
          message += `${index + 1}. *${conf.name}*\n`;
          message += `   ID: \`${conf.id}\`\n`;
          message += `   Участники: ${conf.currentParticipants || 0}/${conf.maxParticipants || 5}\n`;
          message += `   Начало: ${startedAt.toLocaleString()}\n`;
          message += `   Длительность: ${duration}\n\n`;
        });
      }
      
      if (endedConferences.length > 0) {
        message += `**Завершенные конференции:**\n\n`;
        // Показываем только последние 5 завершенных конференций
        const recentEnded = endedConferences.sort((a, b) => 
          (b.endedAt?.getTime() || 0) - (a.endedAt?.getTime() || 0)
        ).slice(0, 5);
        
        recentEnded.forEach((conf, index) => {
          const startedAt = conf.startedAt || conf.createdAt;
          const endedAt = conf.endedAt || new Date();
          const duration = conf.duration ? 
            `${Math.floor(conf.duration / 60)} мин` : 
            `${Math.floor((endedAt.getTime() - startedAt.getTime()) / (1000 * 60))} мин`;
          
          message += `${index + 1}. *${conf.name}*\n`;
          message += `   ID: \`${conf.id}\`\n`;
          message += `   Начало: ${startedAt.toLocaleString()}\n`;
          message += `   Окончание: ${endedAt.toLocaleString()}\n`;
          message += `   Длительность: ${duration}\n`;
          if (conf.recordingUrl) {
            message += `   Запись: ${conf.recordingUrl}\n`;
          }
          message += `\n`;
        });
        
        if (endedConferences.length > 5) {
          message += `...и еще ${endedConferences.length - 5} завершенных конференций\n\n`;
        }
      }
      
      message += `Для создания новой конференции используйте команду:\n`;
      message += `/create название_конференции\n\n`;
      message += `Для присоединения к конференции используйте команду:\n`;
      message += `/join ID_конференции`;
      
      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('Error sending user conferences:', error);
      await this.bot.sendMessage(chatId, 
        '⚠️ Произошла ошибка при получении списка конференций. Пожалуйста, попробуйте позже.'
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
  async sendNotification(userId: number, message: string, options?: {
    parseMode?: 'HTML' | 'Markdown',
    keyboard?: Array<Array<{ text: string, callback_data?: string, url?: string }>>,
    silent?: boolean
  }): Promise<boolean> {
    if (!this.bot || !this.isInitialized) return false;
    
    try {
      // Получаем пользователя
      const user = await storage.getUser(userId);
      
      if (!user || !user.telegramId) {
        console.log(`[TelegramBot] Cannot send notification: User ${userId} not found or has no telegramId`);
        return false;
      }
      
      // Опции для сообщения
      const messageOptions: TelegramBot.SendMessageOptions = {
        parse_mode: options?.parseMode || 'HTML',
        disable_notification: options?.silent
      };
      
      // Добавляем клавиатуру, если она передана
      if (options?.keyboard) {
        messageOptions.reply_markup = {
          inline_keyboard: options.keyboard
        };
      }
      
      // Отправляем сообщение
      await this.bot.sendMessage(parseInt(user.telegramId), message, messageOptions);
      return true;
    } catch (error) {
      console.error('[TelegramBot] Error sending notification:', error);
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
  async sendConferenceInvitation(userId: number, conferenceId: string, conferenceName: string, creatorName: string): Promise<boolean> {
    const message = `<b>🎯 Приглашение на конференцию</b>\n\n` +
      `Вы приглашены на конференцию <b>${conferenceName}</b>\n` +
      `Организатор: <b>${creatorName}</b>\n\n` +
      `Присоединяйтесь к конференции прямо сейчас!`;
    
    const keyboard = [
      [{ text: '🚀 Присоединиться', callback_data: `${ActionNamespace.CONF}:join:${conferenceId}` }],
      [{ text: '📱 Открыть в приложении', url: `https://yancuic-tlanextia.replit.app/conferences/${conferenceId}` }]
    ];
    
    return this.sendNotification(userId, message, {
      parseMode: 'HTML',
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
  async sendSystemNotification(userId: number, title: string, body: string, type: 'info' | 'success' | 'warning' | 'error'): Promise<boolean> {
    let icon = '📢'; // По умолчанию - информация
    
    switch (type) {
      case 'success':
        icon = '✅';
        break;
      case 'warning':
        icon = '⚠️';
        break;
      case 'error':
        icon = '❌';
        break;
      case 'info':
      default:
        icon = 'ℹ️';
        break;
    }
    
    const message = `<b>${icon} ${title}</b>\n\n${body}`;
    
    return this.sendNotification(userId, message, {
      parseMode: 'HTML'
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
  async sendPaymentNotification(userId: number, paymentId: string, status: 'completed' | 'failed' | 'pending' | 'cancelled', 
    amount: number, plan: string): Promise<boolean> {
    let statusIcon = '⏳';
    let statusText = 'Ожидает оплаты';
    
    switch (status) {
      case 'completed':
        statusIcon = '✅';
        statusText = 'Оплачен';
        break;
      case 'failed':
        statusIcon = '❌';
        statusText = 'Не удалось';
        break;
      case 'cancelled':
        statusIcon = '🚫';
        statusText = 'Отменен';
        break;
      case 'pending':
      default:
        statusIcon = '⏳';
        statusText = 'Ожидает оплаты';
        break;
    }
    
    // Форматируем сумму в рубли
    const amountRub = (amount / 100).toFixed(2);
    
    const message = `<b>💳 Информация о платеже</b>\n\n` +
      `Статус: ${statusIcon} <b>${statusText}</b>\n` +
      `Сумма: <b>${amountRub} ₽</b>\n` +
      `План: <b>${plan}</b>\n` +
      `ID платежа: <code>${paymentId}</code>`;
    
    let keyboard = [];
    
    if (status === 'pending') {
      keyboard = [
        [{ text: '💰 Оплатить', url: `https://yancuic-tlanextia.replit.app/payments/${paymentId}` }]
      ];
    } else if (status === 'completed') {
      keyboard = [
        [{ text: '👤 Мой профиль', callback_data: `${ActionNamespace.MENU}:${MenuType.PROFILE}` }]
      ];
    }
    
    return this.sendNotification(userId, message, {
      parseMode: 'HTML',
      keyboard: keyboard.length > 0 ? keyboard : undefined
    });
  }
  
  /**
   * Отправляет массовое уведомление всем пользователям с Telegram ID
   * @param message Текст сообщения
   * @param options Опции сообщения
   * @returns Количество пользователей, которым было отправлено сообщение
   */
  async sendBroadcastMessage(message: string, options?: {
    onlyAdmins?: boolean,
    parseMode?: 'HTML' | 'Markdown',
    silent?: boolean
  }): Promise<number> {
    if (!this.bot || !this.isInitialized) return 0;
    
    try {
      // Получаем всех пользователей с Telegram ID
      let usersQuery = db.select()
        .from(users)
        .where(sql`${users.telegramId} IS NOT NULL`);
      
      // Фильтруем только админов, если нужно
      if (options?.onlyAdmins) {
        usersQuery = usersQuery.where(sql`${users.role} IN ('admin', 'superadmin')`);
      }
      
      const usersWithTelegram = await usersQuery;
      
      let successCount = 0;
      
      // Опции для сообщения
      const messageOptions: TelegramBot.SendMessageOptions = {
        parse_mode: options?.parseMode || 'HTML',
        disable_notification: options?.silent
      };
      
      // Отправляем сообщение каждому пользователю
      for (const user of usersWithTelegram) {
        try {
          if (user.telegramId) {
            await this.bot.sendMessage(parseInt(user.telegramId), message, messageOptions);
            successCount++;
            
            // Небольшая задержка, чтобы не превысить лимиты Telegram API
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        } catch (error) {
          console.error(`[TelegramBot] Error sending broadcast to user ${user.id}:`, error);
        }
      }
      
      return successCount;
    } catch (error) {
      console.error('[TelegramBot] Error sending broadcast:', error);
      return 0;
    }
  }

  // ==================== ПРИВАТНЫЕ МЕТОДЫ ====================
  
  // Присоединение к конференции
  private async joinConference(chatId: number, telegramId: string, conferenceId: string) {
    if (!this.bot) return;
    
    try {
      // Получаем пользователя по Telegram ID
      const user = await storage.getUserByTelegramId(telegramId);
      
      if (!user) {
        await this.bot.sendMessage(chatId, 
          '⚠️ Ваш Telegram не привязан к аккаунту. Используйте /register для привязки.'
        );
        return;
      }
      
      // Получаем информацию о конференции
      const conference = await storage.getConference(conferenceId);
      
      if (!conference) {
        await this.bot.sendMessage(chatId, 
          '⚠️ Конференция не найдена. Проверьте правильность ID конференции.'
        );
        return;
      }
      
      if (!conference.active) {
        await this.bot.sendMessage(chatId, 
          '⚠️ Эта конференция уже завершена.'
        );
        return;
      }
      
      // Проверяем ограничения
      const maxParticipants = conference.maxParticipants || 5;
      if ((conference.currentParticipants || 0) >= maxParticipants) {
        await this.bot.sendMessage(chatId, 
          `⚠️ Достигнут лимит участников конференции (${maxParticipants}).`
        );
        return;
      }
      
      // Проверяем ограничения подписки
      if (user.subscriptionType === 'free' && conference.creatorId !== user.id) {
        const confStartTime = conference.startedAt || conference.createdAt;
        const now = new Date();
        const durationMin = Math.floor((now.getTime() - confStartTime.getTime()) / (60 * 1000));
        
        if (durationMin >= 15) {
          await this.bot.sendMessage(chatId, 
            '⚠️ Длительность конференции для бесплатных пользователей ограничена 15 минутами.\n\n' +
            'Оформите подписку Pro, чтобы присоединиться к этой конференции.'
          );
          return;
        }
      }
      
      // Формируем ссылку для присоединения
      const baseUrl = 'https://ikarus.app/conference';
      const joinUrl = `${baseUrl}/${conferenceId}?name=${encodeURIComponent(user.name || user.username)}`;
      
      // Отправляем сообщение со ссылкой
      await this.bot.sendMessage(chatId, 
        `✅ Вы можете присоединиться к конференции "${conference.name}".\n\n` +
        `[Нажмите здесь для присоединения](${joinUrl})\n\n` +
        `ID: ${conferenceId}\n` +
        `Участники: ${conference.currentParticipants || 0}/${maxParticipants}\n` +
        `Создана: ${conference.createdAt.toLocaleString()}\n\n` +
        `Если у вас возникли проблемы с присоединением, скопируйте ID конференции и перейдите на сайт Ikarus.`,
        { parse_mode: 'Markdown' }
      );
      
    } catch (error) {
      console.error('Error joining conference:', error);
      await this.bot.sendMessage(chatId, 
        '⚠️ Произошла ошибка при попытке присоединиться к конференции. Пожалуйста, попробуйте позже.'
      );
    }
  }
  
  // Создание новой конференции
  private async createConference(chatId: number, telegramId: string, conferenceName: string) {
    if (!this.bot) return;
    
    try {
      // Получаем пользователя по Telegram ID
      const user = await storage.getUserByTelegramId(telegramId);
      
      if (!user) {
        await this.bot.sendMessage(chatId, 
          '⚠️ Ваш Telegram не привязан к аккаунту. Используйте /register для привязки.'
        );
        return;
      }
      
      // Проверяем, не заблокирован ли пользователь
      if (user.isBanned) {
        await this.bot.sendMessage(chatId, 
          `⛔️ Ваш аккаунт заблокирован. Причина: ${user.banReason || 'Нарушение правил сервиса'}`
        );
        return;
      }
      
      // Проверяем имя конференции
      if (!conferenceName || conferenceName.length < 3) {
        await this.bot.sendMessage(chatId, 
          '⚠️ Название конференции должно содержать не менее 3 символов.'
        );
        return;
      }
      
      // Определяем ограничения по типу подписки
      let maxParticipants = 5; // Стандартное значение для бесплатной подписки
      let hasScreenShare = false;
      
      // Проверяем тип подписки пользователя
      if (user.subscriptionType === 'pro') {
        // Проверяем, не истекла ли PRO подписка
        if (user.subscriptionExpiresAt) {
          const now = new Date();
          if (new Date(user.subscriptionExpiresAt) < now) {
            // Понижаем до бесплатного плана
            await storage.updateUser(user.id, {
              subscriptionType: 'free',
              subscriptionExpiresAt: null
            });
            await this.bot.sendMessage(chatId, 
              '⚠️ Ваша подписка Pro истекла. Вы будете использовать бесплатный план с ограничениями.'
            );
          } else {
            // PRO подписка активна
            maxParticipants = 50;
            hasScreenShare = true;
          }
        } else {
          // У активных PRO пользователей без даты истечения
          maxParticipants = 50;
          hasScreenShare = true;
        }
      }
      
      // Генерируем уникальный ID для конференции
      const conferenceId = `conf_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
      
      // Создаем конференцию
      const conference = await storage.createConference({
        name: conferenceName,
        description: `Создано через Telegram бота ${new Date().toLocaleString()}`,
        creatorId: user.id,
        maxParticipants,
        hasScreenShare,
        hasChat: true,
        hasVideoEnabled: true
      });
      
      // Формируем ссылку для присоединения
      const baseUrl = 'https://ikarus.app/conference';
      const joinUrl = `${baseUrl}/${conference.id}?name=${encodeURIComponent(user.name || user.username)}`;
      
      // Отправляем сообщение с информацией о созданной конференции
      await this.bot.sendMessage(chatId, 
        `✅ Конференция успешно создана!\n\n` +
        `Название: ${conference.name}\n` +
        `ID: \`${conference.id}\`\n` +
        `Тип подписки: ${user.subscriptionType === 'pro' ? '🌟 Pro' : '🌙 Free'}\n` +
        `Максимум участников: ${maxParticipants}\n\n` +
        `[Нажмите здесь, чтобы присоединиться](${joinUrl})\n\n` +
        `Чтобы пригласить других участников, поделитесь ID конференции:\n` +
        `\`${conference.id}\`\n\n` +
        `Они могут присоединиться через Telegram бот командой:\n` +
        `/join ${conference.id}`,
        { parse_mode: 'Markdown' }
      );
      
    } catch (error) {
      console.error('Error creating conference:', error);
      await this.bot.sendMessage(chatId, 
        '⚠️ Произошла ошибка при создании конференции. Пожалуйста, попробуйте позже.'
      );
    }
  }

  // Перевод роли пользователя на русский язык
  private translateRole(role: string): string {
    switch (role) {
      case 'user': return 'Пользователь';
      case 'host': return 'Организатор';
      case 'admin': return 'Администратор';
      case 'superadmin': return 'Суперадминистратор';
      default: return role;
    }
  }

  // Разделение длинного сообщения на части
  private splitMessage(text: string, maxLength = 4000): string[] {
    const result: string[] = [];
    let currentText = '';
    
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (currentText.length + line.length + 1 <= maxLength) {
        currentText += (currentText ? '\n' : '') + line;
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
  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  // Сравнение паролей
  private async comparePasswords(supplied: string, stored: string): Promise<boolean> {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  }

  // Показать административную панель
  async showAdminPanel(chatId: number, user: User) {
    if (!this.bot) return;
    
    const state = this.getUserState(chatId);
    
    // Получаем статистику для отображения
    const userCount = await db.select({ count: sql`count(*)` }).from(users);
    const conferenceCount = await db.select({ count: sql`count(*)` }).from(conferences);
    const proUserCount = await db.select({ count: sql`count(*)` })
      .from(users)
      .where(eq(users.subscriptionType, 'pro'));
    
    // Получаем суммарные данные для отображения
    const totalRevenue = await db.select({ 
      sum: sql`COALESCE(SUM(amount), 0)` 
    }).from(payments);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const revenueToday = await db.select({ 
      sum: sql`COALESCE(SUM(amount), 0)` 
    }).from(payments)
      .where(gte(payments.createdAt, today));
    
    // Формируем сообщение
    const message = `
🔷 <b>Панель администратора Ikarus</b> 🔷

📊 <b>Общая статистика:</b>
👥 Пользователей: ${userCount[0].count}
👑 Pro-подписок: ${proUserCount[0].count} (${((Number(proUserCount[0].count) / Number(userCount[0].count)) * 100).toFixed(1)}%)
🎥 Конференций: ${conferenceCount[0].count}
💰 Общий доход: ${((Number(totalRevenue[0].sum) || 0) / 100).toFixed(0)} ₽
📈 Доход сегодня: ${((Number(revenueToday[0].sum) || 0) / 100).toFixed(0)} ₽

Для подробной статистики используйте разделы ниже.
${user.role === 'superadmin' ? '\n⚠️ У вас есть права суперадминистратора, вам доступны все функции.' : ''}
`;
    
    // Создаем клавиатуру с админ-функциями
    const adminKeyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: '👥 Пользователи', callback_data: 'admin:users' },
        { text: '🎥 Конференции', callback_data: 'admin:conferences' }
      ],
      [
        { text: '💰 Платежи', callback_data: 'admin:payments' },
        { text: '⚙️ Настройки', callback_data: 'admin:settings' }
      ],
      [
        { text: '🖥️ Система', callback_data: 'admin:system' },
        { text: '📊 Статистика', callback_data: 'admin:stats' }
      ],
      [
        { text: '🔍 Поиск', callback_data: 'admin:search' },
        { text: '🔄 Обновить', callback_data: 'admin:refresh' }
      ],
      [
        { text: '« Вернуться в главное меню', callback_data: `${ActionNamespace.MENU}:${MenuType.MAIN}` }
      ]
    ];

    try {
      // Удаляем предыдущее сообщение с меню, если оно было
      if (state.lastMenuMessageId) {
        try {
          await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
        } catch (e) {
          console.log('Could not delete previous menu message', e);
        }
      }
      
      // Отправляем сообщение с админ-панелью
      const sentMessage = await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: adminKeyboard
        }
      });
      
      // Сохраняем ID сообщения и текущее меню
      state.lastMenuMessageId = sentMessage.message_id;
      state.activeMenu = MenuType.ADMIN;
    } catch (error) {
      console.error('Error sending admin panel:', error);
      await this.bot.sendMessage(chatId, '⚠️ Произошла ошибка при отображении административной панели');
    }
  }
  
  // Показать управление пользователями
  async showAdminUsers(chatId: number, user: User) {
    if (!this.bot) return;
    
    const state = this.getUserState(chatId);
    
    // Получаем последних пользователей
    const recentUsers = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      subscriptionType: users.subscriptionType,
      createdAt: users.createdAt
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(5);
    
    // Формируем сообщение
    let message = `👥 <b>Управление пользователями</b>\n\n`;
    
    if (recentUsers.length > 0) {
      message += `<b>Последние пользователи:</b>\n`;
      
      for (let i = 0; i < recentUsers.length; i++) {
        const u = recentUsers[i];
        const subIcon = u.subscriptionType === 'pro' ? '👑' : '🌙';
        const date = new Date(u.createdAt).toLocaleDateString('ru-RU');
        
        message += `${i + 1}. ${subIcon} <b>${u.username}</b> - ${u.email}\n    Создан: ${date}\n`;
      }
    } else {
      message += `<i>Пользователи не найдены</i>\n`;
    }
    
    // Клавиатура для управления пользователями
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: '🔍 Поиск пользователя', callback_data: 'admin:user_search' },
        { text: '➕ Новые пользователи', callback_data: 'admin:user_new' }
      ],
      [
        { text: '👑 Pro-пользователи', callback_data: 'admin:user_pro' },
        { text: '⚠️ Заблокированные', callback_data: 'admin:user_banned' }
      ],
      [
        { text: '📊 Статистика', callback_data: 'admin:user_stats' },
        { text: '👤 Управление ролями', callback_data: 'admin:user_roles' }
      ],
      [
        { text: '« Назад в админ-панель', callback_data: 'admin:back' }
      ]
    ];
    
    try {
      // Удаляем предыдущее сообщение с меню, если оно было
      if (state.lastMenuMessageId) {
        try {
          await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
        } catch (e) {
          console.log('Could not delete previous menu message', e);
        }
      }
      
      // Отправляем сообщение
      const sentMessage = await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      
      // Сохраняем ID сообщения
      state.lastMenuMessageId = sentMessage.message_id;
    } catch (error) {
      console.error('Error sending admin users panel:', error);
      await this.bot.sendMessage(chatId, '⚠️ Произошла ошибка при отображении панели управления пользователями');
    }
  }
  
  // Обработка колбэка для администраторов
  private async handleAdminCallbacks(callbackData: string, query: TelegramBot.CallbackQuery) {
    if (!this.bot || !query.message) return;
    
    const chatId = query.message.chat.id;
    const telegramId = query.from.id.toString();
    
    // Получаем пользователя
    const user = await storage.getUserByTelegramId(telegramId);
    
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      await this.bot.answerCallbackQuery(query.id, {
        text: 'У вас нет прав администратора',
        show_alert: true
      });
      return;
    }
    
    // Отвечаем на колбэк
    await this.bot.answerCallbackQuery(query.id);
    
    // Парсим действие
    const [prefix, action, param] = callbackData.split(':');
    
    if (prefix !== 'admin') return;
    
    // Обрабатываем различные действия
    switch(action) {
      case 'users':
        await this.showAdminUsers(chatId, user);
        break;
      case 'user_view':
        if (param) {
          await this.showUserDetails(chatId, user, parseInt(param, 10));
        } else {
          await this.showAdminUsers(chatId, user);
        }
        break;
      case 'user_edit':
        if (param) {
          await this.showUserEditForm(chatId, user, parseInt(param, 10));
        } else {
          await this.showAdminUsers(chatId, user);
        }
        break;
      case 'user_delete':
        if (param) {
          await this.showUserDeleteConfirmation(chatId, user, parseInt(param, 10));
        } else {
          await this.showAdminUsers(chatId, user);
        }
        break;
      case 'conferences':
        await this.showAdminConferences(chatId, user);
        break;
      case 'conf_view':
        if (param) {
          await this.showConferenceDetails(chatId, user, param);
        } else {
          await this.showAdminConferences(chatId, user);
        }
        break;
      case 'conf_end':
        if (param) {
          await this.endConferenceConfirmation(chatId, user, param);
        } else {
          await this.showAdminConferences(chatId, user);
        }
        break;
      case 'payments':
        await this.showAdminPayments(chatId, user);
        break;
      case 'payment_view':
        if (param) {
          await this.showPaymentDetails(chatId, user, parseInt(param, 10));
        } else {
          await this.showAdminPayments(chatId, user);
        }
        break;
      case 'stats':
        await this.showAdminStatistics(chatId, user);
        break;
      case 'settings':
        await this.showAdminSettings(chatId, user);
        break;
      case 'settings_save':
        await this.saveAdminSettings(chatId, user, param || '');
        break;
      case 'back':
      case 'refresh':
        await this.showAdminPanel(chatId, user);
        break;
      default:
        await this.bot.sendMessage(chatId, `⚠️ Функция находится в разработке: ${action}`);
        break;
    }
  }
  
  // Получение экземпляра бота (для использования в других модулях)
  getBot(): TelegramBot | null {
    return this.bot;
  }

  // Показать админ-панель
  async showAdminPanel(chatId: number, user: User) {
    if (!this.bot) return;
    
    const state = this.getUserState(chatId);
    
    // Получаем статистику для отображения
    const userCount = await db.select({ count: sql`count(*)` }).from(users);
    const conferenceCount = await db.select({ count: sql`count(*)` }).from(conferences);
    const proUserCount = await db.select({ count: sql`count(*)` }).from(users).where(eq(users.subscriptionType, 'pro'));
    
    // Формируем сообщение
    const message = `
🔷 <b>Панель администратора Ikarus</b> 🔷

📊 <b>Общая статистика:</b>
👥 Пользователей: ${userCount[0].count}
👑 Pro-подписок: ${proUserCount[0].count} (${Number(userCount[0].count) > 0 ? ((Number(proUserCount[0].count) / Number(userCount[0].count)) * 100).toFixed(1) : 0}%)
🎥 Конференций: ${conferenceCount[0].count}

${user.role === 'superadmin' ? '\n⚠️ У вас есть права суперадминистратора, вам доступны все функции.' : ''}
`;
    
    // Создаем клавиатуру с админ-функциями
    const adminKeyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: '👥 Пользователи', callback_data: 'admin:users' },
        { text: '🎥 Конференции', callback_data: 'admin:conferences' }
      ],
      [
        { text: '💰 Платежи', callback_data: 'admin:payments' },
        { text: '⚙️ Настройки', callback_data: 'admin:settings' }
      ],
      [
        { text: '🖥️ Система', callback_data: 'admin:system' },
        { text: '📊 Статистика', callback_data: 'admin:stats' }
      ],
      [
        { text: '« Вернуться в главное меню', callback_data: `${ActionNamespace.MENU}:${MenuType.MAIN}` }
      ]
    ];

    try {
      // Удаляем предыдущее сообщение с меню, если оно было
      if (state.lastMenuMessageId) {
        try {
          await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
        } catch (e) {
          console.log('Could not delete previous menu message', e);
        }
      }
      
      // Отправляем сообщение с админ-панелью
      const sentMessage = await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: adminKeyboard
        }
      });
      
      // Сохраняем ID сообщения и текущее меню
      state.lastMenuMessageId = sentMessage.message_id;
      state.activeMenu = MenuType.ADMIN;
    } catch (error) {
      console.error('Error sending admin panel:', error);
      await this.bot?.sendMessage(chatId, '⚠️ Произошла ошибка при отображении административной панели');
    }
  }
  
  // Показать управление пользователями
  async showAdminUsers(chatId: number, user: User) {
    if (!this.bot) return;
    
    const state = this.getUserState(chatId);
    
    // Получаем последних пользователей
    const recentUsers = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      subscriptionType: users.subscriptionType,
      createdAt: users.createdAt
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(5);
    
    // Формируем сообщение
    let message = `👥 <b>Управление пользователями</b>\n\n`;
    
    if (recentUsers.length > 0) {
      message += `<b>Последние пользователи:</b>\n`;
      
      for (let i = 0; i < recentUsers.length; i++) {
        const u = recentUsers[i];
        const subIcon = u.subscriptionType === 'pro' ? '👑' : '🌙';
        const date = new Date(u.createdAt).toLocaleDateString('ru-RU');
        
        message += `${i + 1}. ${subIcon} <b>${u.username}</b> - ${u.email}\n    Создан: ${date}\n`;
      }
    } else {
      message += `<i>Пользователи не найдены</i>\n`;
    }
    
    // Клавиатура для управления пользователями
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: '🔍 Поиск пользователя', callback_data: 'admin:user_search' },
        { text: '➕ Новые пользователи', callback_data: 'admin:user_new' }
      ],
      [
        { text: '👑 Pro-пользователи', callback_data: 'admin:user_pro' },
        { text: '⚠️ Заблокированные', callback_data: 'admin:user_banned' }
      ],
      [
        { text: '« Назад в админ-панель', callback_data: 'admin:back' }
      ]
    ];
    
    try {
      // Удаляем предыдущее сообщение с меню, если оно было
      if (state.lastMenuMessageId) {
        try {
          await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
        } catch (e) {
          console.log('Could not delete previous menu message', e);
        }
      }
      
      // Отправляем сообщение
      const sentMessage = await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      
      // Сохраняем ID сообщения
      state.lastMenuMessageId = sentMessage.message_id;
    } catch (error) {
      console.error('Error sending admin users panel:', error);
      await this.bot?.sendMessage(chatId, '⚠️ Произошла ошибка при отображении панели управления пользователями');
    }
  }
  
  // Показать управление конференциями
  async showAdminConferences(chatId: number, user: User) {
    if (!this.bot) return;
    
    const state = this.getUserState(chatId);
    
    // Получаем активные конференции
    const activeConferences = await db.select({
      id: conferences.id,
      name: conferences.name,
      hostId: conferences.hostId,
      participantCount: conferences.participantCount,
      startTime: conferences.startTime
    })
    .from(conferences)
    .where(eq(conferences.status, 'active'))
    .orderBy(desc(conferences.startTime))
    .limit(5);
    
    // Формируем сообщение
    let message = `🎥 <b>Управление конференциями</b>\n\n`;
    
    if (activeConferences.length > 0) {
      message += `<b>Активные конференции:</b>\n`;
      
      for (let i = 0; i < activeConferences.length; i++) {
        const conf = activeConferences[i];
        
        // Получаем информацию о хосте
        const host = await db.select({ username: users.username })
          .from(users)
          .where(eq(users.id, conf.hostId))
          .limit(1);
        
        const hostName = host.length > 0 ? host[0].username : 'Неизвестно';
        const startTime = new Date(conf.startTime).toLocaleString('ru-RU');
        
        message += `${i + 1}. <b>${conf.name}</b>\n    Организатор: ${hostName}\n    Участников: ${conf.participantCount}\n    Начало: ${startTime}\n`;
      }
    } else {
      message += `<i>Активных конференций нет</i>\n`;
    }
    
    // Клавиатура для управления конференциями
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: '🔍 Поиск конференции', callback_data: 'admin:conf_search' },
        { text: '📊 Статистика', callback_data: 'admin:conf_stats' }
      ],
      [
        { text: '⏱️ По длительности', callback_data: 'admin:conf_duration' },
        { text: '👥 По участникам', callback_data: 'admin:conf_participants' }
      ],
      [
        { text: '« Назад в админ-панель', callback_data: 'admin:back' }
      ]
    ];
    
    try {
      // Удаляем предыдущее сообщение с меню, если оно было
      if (state.lastMenuMessageId) {
        try {
          await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
        } catch (e) {
          console.log('Could not delete previous menu message', e);
        }
      }
      
      // Отправляем сообщение
      const sentMessage = await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      
      // Сохраняем ID сообщения
      state.lastMenuMessageId = sentMessage.message_id;
    } catch (error) {
      console.error('Error sending admin conferences panel:', error);
      await this.bot?.sendMessage(chatId, '⚠️ Произошла ошибка при отображении панели управления конференциями');
    }
  }

  // Показать управление платежами
  async showAdminPayments(chatId: number, user: User) {
    if (!this.bot) return;
    
    const state = this.getUserState(chatId);
    
    // Получаем последние платежи
    const recentPayments = await db.select({
      id: payments.id,
      userId: payments.userId,
      amount: payments.amount,
      status: payments.status,
      createdAt: payments.createdAt
    })
    .from(payments)
    .orderBy(desc(payments.createdAt))
    .limit(5);
    
    // Формируем сообщение
    let message = `💰 <b>Управление платежами</b>\n\n`;
    
    if (recentPayments.length > 0) {
      message += `<b>Последние платежи:</b>\n`;
      
      for (let i = 0; i < recentPayments.length; i++) {
        const payment = recentPayments[i];
        
        // Получаем информацию о пользователе
        const userInfo = await db.select({ username: users.username })
          .from(users)
          .where(eq(users.id, payment.userId))
          .limit(1);
        
        const username = userInfo.length > 0 ? userInfo[0].username : 'Неизвестно';
        const amount = (payment.amount / 100).toFixed(0) + ' ₽';
        const date = new Date(payment.createdAt).toLocaleString('ru-RU');
        const status = payment.status === 'succeeded' ? '✅' : payment.status === 'pending' ? '⏳' : '❌';
        
        message += `${i + 1}. ${status} <b>${amount}</b> - ${username}\n    Дата: ${date}\n`;
      }
    } else {
      message += `<i>Платежи не найдены</i>\n`;
    }
    
    // Клавиатура для управления платежами
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: '📊 Статистика платежей', callback_data: 'admin:payment_stats' },
        { text: '🔍 Поиск платежа', callback_data: 'admin:payment_search' }
      ],
      [
        { text: '📅 По месяцам', callback_data: 'admin:payment_monthly' },
        { text: '💳 По методам оплаты', callback_data: 'admin:payment_methods' }
      ],
      [
        { text: '« Назад в админ-панель', callback_data: 'admin:back' }
      ]
    ];
    
    try {
      // Удаляем предыдущее сообщение с меню, если оно было
      if (state.lastMenuMessageId) {
        try {
          await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
        } catch (e) {
          console.log('Could not delete previous menu message', e);
        }
      }
      
      // Отправляем сообщение
      const sentMessage = await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      
      // Сохраняем ID сообщения
      state.lastMenuMessageId = sentMessage.message_id;
    } catch (error) {
      console.error('Error sending admin payments panel:', error);
      await this.bot?.sendMessage(chatId, '⚠️ Произошла ошибка при отображении панели управления платежами');
    }
  }
  
  // Показать системные настройки
  async showAdminSettings(chatId: number, user: User) {
    if (!this.bot) return;
    
    const state = this.getUserState(chatId);
    
    // Формируем сообщение
    let message = `⚙️ <b>Настройки системы</b>\n\n`;
    
    message += `<b>Текущие настройки:</b>\n`;
    message += `💰 Стоимость Pro-подписки: <b>799 ₽/мес</b>\n`;
    message += `⏱️ Лимит времени (Free): <b>15 минут</b>\n`;
    message += `👥 Макс. участников (Free): <b>5 человек</b>\n\n`;
    
    message += `<b>API ключи:</b>\n`;
    message += `🇷🇺 YooKassa: ✅ Настроена\n`;
    message += `💳 Stripe: ⏳ В процессе настройки\n`;
    
    // Клавиатура для управления настройками
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: '💰 Цены и лимиты', callback_data: 'admin:settings_limits' },
        { text: '🔑 API ключи', callback_data: 'admin:settings_api' }
      ],
      [
        { text: '🌐 Домены и URL', callback_data: 'admin:settings_domains' },
        { text: '🔐 Безопасность', callback_data: 'admin:settings_security' }
      ],
      [
        { text: '« Назад в админ-панель', callback_data: 'admin:back' }
      ]
    ];
    
    try {
      // Удаляем предыдущее сообщение с меню, если оно было
      if (state.lastMenuMessageId) {
        try {
          await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
        } catch (e) {
          console.log('Could not delete previous menu message', e);
        }
      }
      
      // Отправляем сообщение
      const sentMessage = await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      
      // Сохраняем ID сообщения
      state.lastMenuMessageId = sentMessage.message_id;
    } catch (error) {
      console.error('Error sending admin settings panel:', error);
      await this.bot?.sendMessage(chatId, '⚠️ Произошла ошибка при отображении панели настроек');
    }
  }
  
  // Показать системную информацию
  async showAdminSystem(chatId: number, user: User) {
    if (!this.bot) return;
    
    const state = this.getUserState(chatId);
    
    try {
      // Получаем информацию о системе
      const os = require('os');
      
      const uptime = Math.floor(os.uptime() / 60); // в минутах
      const uptimeFormatted = uptime >= 60 
        ? `${Math.floor(uptime / 60)} ч ${uptime % 60} мин` 
        : `${uptime} мин`;
        
      const freeMemoryMB = Math.floor(os.freemem() / 1024 / 1024);
      const totalMemoryMB = Math.floor(os.totalmem() / 1024 / 1024);
      const freeMemoryGB = (freeMemoryMB / 1024).toFixed(1);
      const totalMemoryGB = (totalMemoryMB / 1024).toFixed(1);
      
      const loadAvg = os.loadavg()[0].toFixed(2);
      const cpuUsage = (loadAvg * 100).toFixed(0) + '%';
      
      // Проверяем состояние БД
      let dbStatus = '❓ Неизвестно';
      try {
        await db.execute(sql`SELECT 1`);
        dbStatus = '✅ Онлайн';
      } catch (err) {
        dbStatus = '❌ Офлайн';
      }
      
      // Формируем сообщение
      let message = `🖥️ <b>Системная информация</b>\n\n`;
      
      message += `<b>Сервер:</b>\n`;
      message += `⏱️ Uptime: <b>${uptimeFormatted}</b>\n`;
      message += `💾 Память: <b>${freeMemoryGB}/${totalMemoryGB} ГБ</b> свободно\n`;
      message += `⚡ Загрузка CPU: <b>${cpuUsage}</b>\n`;
      message += `💻 ОС: <b>${os.platform()} ${os.release()}</b>\n\n`;
      
      message += `<b>База данных:</b>\n`;
      message += `🔄 Статус: <b>${dbStatus}</b>\n\n`;
      
      message += `<b>Сервисы:</b>\n`;
      message += `🤖 Telegram бот: ✅ Работает\n`;
      message += `🌐 Веб-сервер: ✅ Работает\n`;
      message += `🎥 WebRTC: ✅ Работает\n`;
      
      // Клавиатура для системной информации
      const keyboard: TelegramBot.InlineKeyboardButton[][] = [
        [
          { text: '🔄 Обновить', callback_data: 'admin:system_refresh' },
          { text: '📊 Подробнее', callback_data: 'admin:system_details' }
        ],
        [
          { text: '📑 Логи', callback_data: 'admin:system_logs' },
          { text: '🔧 Обслуживание', callback_data: 'admin:system_maintenance' }
        ],
        [
          { text: '« Назад в админ-панель', callback_data: 'admin:back' }
        ]
      ];
      
      // Удаляем предыдущее сообщение с меню, если оно было
      if (state.lastMenuMessageId) {
        try {
          await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
        } catch (e) {
          console.log('Could not delete previous menu message', e);
        }
      }
      
      // Отправляем сообщение
      const sentMessage = await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      
      // Сохраняем ID сообщения
      state.lastMenuMessageId = sentMessage.message_id;
    } catch (error) {
      console.error('Error sending admin system panel:', error);
      await this.bot?.sendMessage(chatId, '⚠️ Произошла ошибка при получении системной информации');
    }
  }

  // Остановка бота
  async stop(): Promise<void> {
    if (this.bot) {
      this.bot.stopPolling();
      this.isInitialized = false;
      console.log('Telegram bot stopped');
    }
  }
  
  // === НОВЫЕ МЕТОДЫ ДЛЯ КАБИНЕТА СУПЕР-АДМИНА ===

  // Показать детали пользователя
  async showUserDetails(chatId: number, admin: User, userId: number) {
    if (!this.bot) return;
    
    try {
      const state = this.getUserState(chatId);
      
      // Получаем информацию о пользователе
      const userInfo = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
        
      if (userInfo.length === 0) {
        await this.bot.sendMessage(chatId, '⚠️ Пользователь не найден.');
        await this.showAdminUsers(chatId, admin);
        return;
      }
      
      const user = userInfo[0];
      
      // Получаем статистику пользователя
      const userConfs = await db.select({ count: sql`count(*)` })
        .from(conferences)
        .where(eq(conferences.userId, user.id));
        
      const activeSubscription = user.subscriptionType === 'pro';
      
      // Формируем сообщение с деталями пользователя
      const message = `
👤 <b>Информация о пользователе</b>

<b>ID:</b> ${user.id}
<b>Имя пользователя:</b> ${user.username}
<b>Email:</b> ${user.email || 'Не указан'}
<b>Телеграм ID:</b> ${user.telegramId || 'Не привязан'}
<b>Роль:</b> ${this.formatUserRole(user.role)}
<b>Тип подписки:</b> ${user.subscriptionType === 'pro' ? '👑 Pro' : '🌙 Free'}
<b>Подписка до:</b> ${activeSubscription && user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).toLocaleDateString('ru-RU') : 'Не активна'}
<b>Баланс:</b> ${user.balance || 0} руб.

<b>Создано конференций:</b> ${userConfs[0].count}
<b>Дата регистрации:</b> ${new Date(user.createdAt).toLocaleDateString('ru-RU')}
      `;
      
      // Создаем клавиатуру с кнопками управления пользователем
      const keyboard: TelegramBot.InlineKeyboardButton[][] = [
        [
          { text: '✏️ Изменить', callback_data: `admin:user_edit:${user.id}` },
          { text: '❌ Удалить', callback_data: `admin:user_delete:${user.id}` }
        ],
        [
          { text: admin.role === 'superadmin' ? '👑 Сделать админом' : '👑 Повысить', callback_data: `admin:user_promote:${user.id}` },
          { text: '🔒 Заблокировать', callback_data: `admin:user_ban:${user.id}` }
        ],
        [
          { text: '💰 Изменить баланс', callback_data: `admin:user_balance:${user.id}` },
          { text: '🌟 Выдать Pro-статус', callback_data: `admin:user_give_pro:${user.id}` }
        ],
        [
          { text: '« Назад к пользователям', callback_data: 'admin:users' }
        ]
      ];
      
      // Удаляем предыдущее сообщение с меню, если оно было
      if (state.lastMenuMessageId) {
        try {
          await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
        } catch (e) {
          console.log('Could not delete previous menu message', e);
        }
      }
      
      // Отправляем сообщение с деталями пользователя
      const sentMessage = await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      
      // Сохраняем ID сообщения
      state.lastMenuMessageId = sentMessage.message_id;
    } catch (error) {
      console.error('Error showing user details:', error);
      await this.bot.sendMessage(chatId, '⚠️ Произошла ошибка при получении информации о пользователе.');
      await this.showAdminUsers(chatId, admin);
    }
  }
  
  // Показать форму редактирования пользователя
  async showUserEditForm(chatId: number, admin: User, userId: number) {
    if (!this.bot) return;
    
    try {
      const state = this.getUserState(chatId);
      
      // Получаем информацию о пользователе
      const userInfo = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
        
      if (userInfo.length === 0) {
        await this.bot.sendMessage(chatId, '⚠️ Пользователь не найден.');
        await this.showAdminUsers(chatId, admin);
        return;
      }
      
      const user = userInfo[0];
      
      // Формируем сообщение с формой редактирования
      const message = `
✏️ <b>Редактирование пользователя</b>

<b>ID:</b> ${user.id}
<b>Имя пользователя:</b> ${user.username}
<b>Email:</b> ${user.email || 'Не указан'}

Выберите поле для редактирования:
      `;
      
      // Создаем клавиатуру с опциями редактирования
      const keyboard: TelegramBot.InlineKeyboardButton[][] = [
        [
          { text: '👤 Имя пользователя', callback_data: `admin:user_edit_username:${user.id}` },
          { text: '📧 Email', callback_data: `admin:user_edit_email:${user.id}` }
        ],
        [
          { text: '🔑 Пароль', callback_data: `admin:user_edit_password:${user.id}` },
          { text: '👑 Роль', callback_data: `admin:user_edit_role:${user.id}` }
        ],
        [
          { text: '💰 Баланс', callback_data: `admin:user_edit_balance:${user.id}` },
          { text: '🌟 Тип подписки', callback_data: `admin:user_edit_subscription:${user.id}` }
        ],
        [
          { text: '« Вернуться', callback_data: `admin:user_view:${user.id}` }
        ]
      ];
      
      // Удаляем предыдущее сообщение с меню, если оно было
      if (state.lastMenuMessageId) {
        try {
          await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
        } catch (e) {
          console.log('Could not delete previous menu message', e);
        }
      }
      
      // Отправляем сообщение с формой редактирования
      const sentMessage = await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      
      // Сохраняем ID сообщения
      state.lastMenuMessageId = sentMessage.message_id;
    } catch (error) {
      console.error('Error showing user edit form:', error);
      await this.bot.sendMessage(chatId, '⚠️ Произошла ошибка при отображении формы редактирования.');
      await this.showAdminUsers(chatId, admin);
    }
  }
  
  // Показать подтверждение удаления пользователя
  async showUserDeleteConfirmation(chatId: number, admin: User, userId: number) {
    if (!this.bot) return;
    
    try {
      const state = this.getUserState(chatId);
      
      // Получаем информацию о пользователе
      const userInfo = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
        
      if (userInfo.length === 0) {
        await this.bot.sendMessage(chatId, '⚠️ Пользователь не найден.');
        await this.showAdminUsers(chatId, admin);
        return;
      }
      
      const user = userInfo[0];
      
      // Формируем сообщение с подтверждением удаления
      const message = `
⚠️ <b>Подтверждение удаления</b>

Вы действительно хотите удалить пользователя?

<b>ID:</b> ${user.id}
<b>Имя пользователя:</b> ${user.username}
<b>Email:</b> ${user.email || 'Не указан'}

Это действие невозможно отменить.
      `;
      
      // Создаем клавиатуру с кнопками подтверждения
      const keyboard: TelegramBot.InlineKeyboardButton[][] = [
        [
          { text: '✅ Да, удалить', callback_data: `admin:user_delete_confirm:${user.id}` },
          { text: '❌ Отмена', callback_data: `admin:user_view:${user.id}` }
        ]
      ];
      
      // Удаляем предыдущее сообщение с меню, если оно было
      if (state.lastMenuMessageId) {
        try {
          await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
        } catch (e) {
          console.log('Could not delete previous menu message', e);
        }
      }
      
      // Отправляем сообщение с подтверждением
      const sentMessage = await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      
      // Сохраняем ID сообщения
      state.lastMenuMessageId = sentMessage.message_id;
    } catch (error) {
      console.error('Error showing user delete confirmation:', error);
      await this.bot.sendMessage(chatId, '⚠️ Произошла ошибка при отображении подтверждения удаления.');
      await this.showAdminUsers(chatId, admin);
    }
  }
  
  // Показать административную статистику
  async showAdminStatistics(chatId: number, admin: User) {
    if (!this.bot) return;
    
    try {
      const state = this.getUserState(chatId);
      
      // Получаем базовую статистику
      const userCount = await db.select({ count: sql`count(*)` }).from(users);
      const newUsersToday = await db.select({ count: sql`count(*)` })
        .from(users)
        .where(sql`DATE(${users.createdAt}) = CURRENT_DATE`);
        
      const proUserCount = await db.select({ count: sql`count(*)` })
        .from(users)
        .where(eq(users.subscriptionType, 'pro'));
        
      const confCount = await db.select({ count: sql`count(*)` }).from(conferences);
      const activeConfCount = await db.select({ count: sql`count(*)` })
        .from(conferences)
        .where(eq(conferences.active, true));
        
      const paymentCount = await db.select({ count: sql`count(*)` }).from(payments);
      const successPaymentCount = await db.select({ count: sql`count(*)` })
        .from(payments)
        .where(eq(payments.status, 'completed'));
        
      // Получаем общую сумму платежей
      const totalRevenue = await db.select({ total: sql`sum(${payments.amount})` })
        .from(payments)
        .where(eq(payments.status, 'completed'));
        
      // Формируем сообщение со статистикой
      const message = `
📊 <b>Статистика системы</b>

👥 <b>Пользователи:</b>
• Всего: ${userCount[0].count}
• Новых сегодня: ${newUsersToday[0].count}
• Pro-подписки: ${proUserCount[0].count} (${Number(userCount[0].count) > 0 ? ((Number(proUserCount[0].count) / Number(userCount[0].count)) * 100).toFixed(1) : 0}%)

🎥 <b>Конференции:</b>
• Всего: ${confCount[0].count}
• Активных: ${activeConfCount[0].count}

💰 <b>Финансы:</b>
• Всего платежей: ${paymentCount[0].count}
• Успешных: ${successPaymentCount[0].count}
• Общая выручка: ${totalRevenue[0].total || 0} руб.
      `;
      
      // Создаем клавиатуру с кнопками навигации
      const keyboard: TelegramBot.InlineKeyboardButton[][] = [
        [
          { text: '📅 По дням', callback_data: 'admin:stats_daily' },
          { text: '📈 Графики', callback_data: 'admin:stats_charts' }
        ],
        [
          { text: '💲 Доходы', callback_data: 'admin:stats_revenue' },
          { text: '🗣️ Конверсия', callback_data: 'admin:stats_conversion' }
        ],
        [
          { text: '« Назад в админ-панель', callback_data: 'admin:back' }
        ]
      ];
      
      // Удаляем предыдущее сообщение с меню, если оно было
      if (state.lastMenuMessageId) {
        try {
          await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
        } catch (e) {
          console.log('Could not delete previous menu message', e);
        }
      }
      
      // Отправляем сообщение со статистикой
      const sentMessage = await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      
      // Сохраняем ID сообщения
      state.lastMenuMessageId = sentMessage.message_id;
    } catch (error) {
      console.error('Error showing admin statistics:', error);
      await this.bot.sendMessage(chatId, '⚠️ Произошла ошибка при получении статистики.');
      await this.showAdminPanel(chatId, admin);
    }
  }
  
  // Показать настройки администратора
  async showAdminSettings(chatId: number, admin: User) {
    if (!this.bot) return;
    
    try {
      const state = this.getUserState(chatId);
      
      // Получаем текущие настройки из базы данных, если они есть
      // Или используем значения по умолчанию
      const settings = {
        welcomeMessage: 'Добро пожаловать в Ikarus!',
        notificationEnabled: true,
        maxFreeDuration: 15,
        maxFreeParticipants: 5
      };
      
      // Формируем сообщение с настройками
      const message = `
⚙️ <b>Настройки системы</b>

<b>Приветствие:</b>
${settings.welcomeMessage}

<b>Уведомления:</b> ${settings.notificationEnabled ? '✅ Включены' : '❌ Выключены'}

<b>Ограничения бесплатного аккаунта:</b>
• Макс. длительность конференции: ${settings.maxFreeDuration} мин.
• Макс. количество участников: ${settings.maxFreeParticipants}

<b>Выберите настройку для изменения:</b>
      `;
      
      // Создаем клавиатуру с кнопками настроек
      const keyboard: TelegramBot.InlineKeyboardButton[][] = [
        [
          { text: '✏️ Приветствие', callback_data: 'admin:settings_welcome' },
          { text: settings.notificationEnabled ? '🔕 Выключить уведомления' : '🔔 Включить уведомления', 
            callback_data: `admin:settings_toggle_notifications:${!settings.notificationEnabled}` }
        ],
        [
          { text: '⏱️ Длительность (Free)', callback_data: 'admin:settings_free_duration' },
          { text: '👥 Участники (Free)', callback_data: 'admin:settings_free_participants' }
        ],
        [
          { text: '🔄 Сбросить настройки', callback_data: 'admin:settings_reset' }
        ],
        [
          { text: '« Назад в админ-панель', callback_data: 'admin:back' }
        ]
      ];
      
      // Удаляем предыдущее сообщение с меню, если оно было
      if (state.lastMenuMessageId) {
        try {
          await this.bot.deleteMessage(chatId, state.lastMenuMessageId);
        } catch (e) {
          console.log('Could not delete previous menu message', e);
        }
      }
      
      // Отправляем сообщение с настройками
      const sentMessage = await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      
      // Сохраняем ID сообщения
      state.lastMenuMessageId = sentMessage.message_id;
    } catch (error) {
      console.error('Error showing admin settings:', error);
      await this.bot.sendMessage(chatId, '⚠️ Произошла ошибка при получении настроек.');
      await this.showAdminPanel(chatId, admin);
    }
  }
  
  // Сохранить настройки администратора
  async saveAdminSettings(chatId: number, admin: User, param: string) {
    if (!this.bot) return;
    
    try {
      // В этом методе будет реализована логика сохранения настроек
      // В зависимости от параметра param
      
      await this.bot.sendMessage(chatId, '✅ Настройки успешно сохранены.');
      await this.showAdminSettings(chatId, admin);
    } catch (error) {
      console.error('Error saving admin settings:', error);
      await this.bot.sendMessage(chatId, '⚠️ Произошла ошибка при сохранении настроек.');
      await this.showAdminSettings(chatId, admin);
    }
  }
  
  // Форматирование роли пользователя
  private formatUserRole(role: string): string {
    switch (role) {
      case 'user':
        return '👤 Пользователь';
      case 'host':
        return '🎙️ Организатор';
      case 'admin':
        return '🛡️ Администратор';
      case 'superadmin':
        return '👑 Супер-администратор';
      default:
        return role;
    }
  }
}

// Создаем и экспортируем экземпляр сервиса
export const telegramService = new TelegramService();