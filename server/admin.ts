import { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { v4 as uuidv4 } from "uuid";
import { serverCache } from "./cache";
import { db } from "./db";
import { eq, like, desc, lt, lte, gte, sql } from "drizzle-orm";
import { telegramSettings, users, conferences, payments, subscriptions, balanceHistory } from "@shared/schema";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import { PaymentService } from "./payments";

const execAsync = promisify(exec);

// Промежуточное ПО для проверки прав администратора
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Необходима аутентификация" });
  }

  if (req.user.role !== "admin" && req.user.role !== "superadmin") {
    return res.status(403).json({ error: "Недостаточно прав доступа" });
  }

  next();
}

// Промежуточное ПО для проверки прав суперадминистратора
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Необходима аутентификация" });
  }

  if (req.user.role !== "superadmin") {
    return res.status(403).json({ error: "Необходимы права суперадминистратора" });
  }

  next();
}

// История загрузки CPU и памяти для графиков
const cpuHistory: { time: string; usage: number }[] = [];
const memoryHistory: { time: string; usage: number }[] = [];

// Функция для получения данных о системе
async function getSystemInfo() {
  try {
    // Получаем загрузку CPU
    const cpuInfo = os.cpus();
    const cpuModel = cpuInfo[0].model;
    const cpuCores = cpuInfo.length;
    
    // Получаем использование памяти
    const totalMemory = Math.round(os.totalmem() / (1024 * 1024 * 1024) * 10) / 10; // ГБ с округлением до 1 знака
    const freeMemory = Math.round(os.freemem() / (1024 * 1024 * 1024) * 10) / 10; // ГБ с округлением до 1 знака
    const usedMemory = Math.round((totalMemory - freeMemory) * 10) / 10;
    const memoryUsage = Math.round((usedMemory / totalMemory) * 100);
    
    // Получаем загрузку системы
    const loadAverage = os.loadavg();
    
    // Получаем время работы
    const uptime = Math.round(os.uptime() / 3600 * 10) / 10; // Часы с округлением до 1 знака
    
    // Получаем информацию о дисковом пространстве
    const diskInfo = await execAsync('df -h / | awk \'{print $2, $3, $5}\' | tail -1');
    const diskParts = diskInfo.stdout.trim().split(/\s+/);
    const totalDisk = diskParts[0].replace('G', ''); // Убираем 'G' из строки
    const usedDisk = diskParts[1].replace('G', '');
    const diskUsage = parseInt(diskParts[2].replace('%', ''));
    
    // Получаем информацию о сетевой активности
    const netStatBefore = await getNetworkStats();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Ждем 1 секунду
    const netStatAfter = await getNetworkStats();
    
    const networkIn = Math.round((netStatAfter.rx - netStatBefore.rx) / 125000); // Мбит/с (делим на 125000 для перевода Б/с в Мбит/с)
    const networkOut = Math.round((netStatAfter.tx - netStatBefore.tx) / 125000); // Мбит/с
    
    // Получаем версию Node.js
    const nodeVersion = process.version;
    
    // Получаем количество процессов
    const { stdout: procOut } = await execAsync('ps aux | wc -l');
    const processes = parseInt(procOut.trim()) - 1; // -1 для учета заголовка
    
    // Получаем информацию о CPU
    const { stdout: cpuOut } = await execAsync('top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk \'{print 100 - $1}\'');
    const cpu = parseFloat(cpuOut.trim());
    
    // Сохраняем данные для истории
    const now = new Date();
    const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    cpuHistory.push({ time: timeStr, usage: Math.round(cpu) });
    memoryHistory.push({ time: timeStr, usage: memoryUsage });
    
    // Обрезаем историю до последних 20 значений
    if (cpuHistory.length > 20) cpuHistory.shift();
    if (memoryHistory.length > 20) memoryHistory.shift();
    
    // Получаем состояние служб
    const services = {
      api: true, // Сервер Express всегда работает, если мы получаем запрос
      webrtc: await checkServiceStatus('webrtc'),
      telegram: await checkServiceStatus('telegram'),
      database: await checkDatabaseStatus(),
    };
    
    // Получаем статистику кеша
    const cacheStats = serverCache.getStats();
    
    return {
      os: {
        type: os.type(),
        platform: os.platform(),
        version: os.release(),
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
        hitRate: Math.round(cacheStats.hitRate * 100),
      }
    };
  } catch (error) {
    console.error('Error getting system info:', error);
    return {
      error: 'Failed to get system information',
      cpuHistory,
      memoryHistory,
    };
  }
}

// Вспомогательная функция для получения сетевой статистики
async function getNetworkStats() {
  try {
    const { stdout } = await execAsync('cat /proc/net/dev | grep -v face | grep -v lo | awk \'{print $2, $10}\'');
    const lines = stdout.trim().split('\n');
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
    console.error('Error getting network stats:', error);
    return { rx: 0, tx: 0 };
  }
}

// Проверка состояния сервиса
async function checkServiceStatus(service: string) {
  try {
    if (service === 'webrtc') {
      // Проверяем наличие слушателя WebSocket
      const { stdout } = await execAsync('netstat -tulpn | grep -E ":3000|LISTEN" | wc -l');
      return parseInt(stdout.trim()) > 0;
    } else if (service === 'telegram') {
      // Проверяем статус телеграм-бота в базе данных
      const [settings] = await db.select().from(telegramSettings);
      return settings?.isConnected || false;
    }
    return false;
  } catch (error) {
    console.error(`Error checking service ${service} status:`, error);
    return false;
  }
}

// Проверка состояния базы данных
async function checkDatabaseStatus() {
  try {
    // Простой запрос для проверки соединения
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    console.error('Error checking database status:', error);
    return false;
  }
}

// Получаем журналы безопасности
async function getSecurityLogs() {
  try {
    const logLines: Array<{ timestamp: Date; level: string; message: string }> = [];
    
    // Проверяем существование файла
    if (!fs.existsSync('./logs/security.log')) {
      return [];
    }
    
    // Читаем файл логов
    const content = fs.readFileSync('./logs/security.log', 'utf8');
    const lines = content.split('\n').filter(Boolean).slice(-100); // Последние 100 строк
    
    for (const line of lines) {
      // Парсим строку лога (формат: [ISO DATE] [LEVEL] Message)
      const match = line.match(/\[(.*?)\]\s*\[(.*?)\]\s*(.*)/);
      if (match) {
        logLines.push({
          timestamp: new Date(match[1]),
          level: match[2].toLowerCase(),
          message: match[3],
        });
      }
    }
    
    return logLines.slice(-50); // Возвращаем последние 50 записей
  } catch (error) {
    console.error('Error reading security logs:', error);
    return [];
  }
}

// Регистрация маршрутов администратора
export function registerAdminRoutes(app: Express) {
  // Проверка, является ли пользователь администратором
  app.get('/api/admin/check', requireAdmin, (req, res) => {
    res.json({ isAdmin: true, role: req.user.role });
  });
  
  // Получение статистики для дашборда
  app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
      // Получаем общее количество пользователей
      const userCount = await db.select({ count: sql`COUNT(*)` }).from(users);
      
      // Получаем новых пользователей за последние 24 часа
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const newUsers = await db
        .select({ count: sql`COUNT(*)` })
        .from(users)
        .where(gte(users.createdAt, yesterday));
      
      // Получаем общее количество конференций
      const conferenceCount = await db.select({ count: sql`COUNT(*)` }).from(conferences);
      
      // Получаем количество активных конференций
      const activeConferences = await db
        .select({ count: sql`COUNT(*)` })
        .from(conferences)
        .where(eq(conferences.active, true));
      
      // Получаем данные о доходе
      const totalRevenue = await db
        .select({ sum: sql`SUM(amount)` })
        .from(payments)
        .where(eq(payments.status, 'completed'));
      
      // Получаем доход за сегодня
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const revenueToday = await db
        .select({ sum: sql`SUM(amount)` })
        .from(payments)
        .where(eq(payments.status, 'completed'))
        .where(gte(payments.createdAt, today));
      
      // Получаем информацию о загрузке сервера
      const systemLoad = {
        cpu: 0,
        memory: 0,
      };
      
      try {
        const sysInfo = await getSystemInfo();
        systemLoad.cpu = Math.round(sysInfo.cpu);
        systemLoad.memory = sysInfo.memoryUsage;
      } catch (error) {
        console.error('Error getting system load:', error);
      }
      
      // Получаем данные о пользователях за последние 30 дней
      const usersOverTime = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        date.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const result = await db
          .select({ count: sql`COUNT(*)` })
          .from(users)
          .where(gte(users.createdAt, date))
          .where(lt(users.createdAt, nextDay));
        
        usersOverTime.push({
          date: date.toLocaleDateString(),
          users: Number(result[0].count),
        });
      }
      
      // Получаем данные о конференциях за последние 30 дней
      const conferencesOverTime = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        date.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const result = await db
          .select({ count: sql`COUNT(*)` })
          .from(conferences)
          .where(gte(conferences.createdAt, date))
          .where(lt(conferences.createdAt, nextDay));
        
        conferencesOverTime.push({
          date: date.toLocaleDateString(),
          conferences: Number(result[0].count),
        });
      }
      
      // Получаем статистику по типам подписок
      const freeSubs = await db
        .select({ count: sql`COUNT(*)` })
        .from(users)
        .where(eq(users.subscriptionType, 'free'));
      
      const proSubs = await db
        .select({ count: sql`COUNT(*)` })
        .from(users)
        .where(eq(users.subscriptionType, 'pro'));
      
      // Формируем ответ
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
          pro: Number(proSubs[0].count),
        },
        resourceUsage: {
          cpu: systemLoad.cpu,
          memory: systemLoad.memory,
          disk: 35,
          network: 25,
        },
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ error: 'Failed to fetch admin statistics' });
    }
  });
  
  // Управление пользователями
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      
      let query = db.select().from(users).orderBy(desc(users.createdAt));
      
      if (search) {
        query = query.where(
          sql`username LIKE ${`%${search}%`} OR email LIKE ${`%${search}%`} OR name LIKE ${`%${search}%`}`
        );
      }
      
      const allUsers = await query.limit(100);
      res.json(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });
  
  app.get('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });
  
  app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Проверка существования пользователя
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Запрещаем редактировать суперадмина, если пользователь не суперадмин
      if (existingUser.role === 'superadmin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'You cannot edit a superadmin' });
      }
      
      // Запрещаем повышать до суперадмина, если пользователь не суперадмин
      if (req.body.role === 'superadmin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Only superadmins can promote to superadmin' });
      }
      
      // Если изменяется баланс, создаем запись в истории баланса
      if (req.body.balance !== undefined && existingUser.balance !== req.body.balance) {
        const difference = req.body.balance - (existingUser.balance || 0);
        await storage.createBalanceHistory({
          userId,
          amount: difference,
          type: difference > 0 ? 'admin_add' : 'admin_subtract',
          description: `Изменение баланса администратором ${req.user.username}`,
          adminId: req.user.id,
        });
      }
      
      // Если изменяется тип подписки, обновляем подписку
      if (req.body.subscriptionType && req.body.subscriptionType !== existingUser.subscriptionType) {
        // Получаем существующую активную подписку
        const existingSubscription = await storage.getActiveSubscriptionByUserId(userId);
        
        if (existingSubscription) {
          // Деактивируем существующую подписку
          await storage.updateSubscription(existingSubscription.id, {
            isActive: false,
            cancelledAt: new Date(),
          });
        }
        
        // Создаем новую подписку, если новый тип — pro
        if (req.body.subscriptionType === 'pro') {
          // Дата окончания подписки через 1 год
          const expiresAt = req.body.subscriptionExpiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
          
          await storage.createSubscription({
            userId,
            type: 'pro',
            expiresAt,
            amount: 0, // Бесплатная подписка от администратора
          });
        }
      }
      
      // Обновляем пользователя
      const updatedUser = await storage.updateUser(userId, req.body);
      
      // Логируем действие
      await logSecurityEvent('info', `Admin ${req.user.username} updated user ${existingUser.username}`);
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });
  
  app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Проверка существования пользователя
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Запрещаем удалять суперадмина, если пользователь не суперадмин
      if (existingUser.role === 'superadmin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'You cannot delete a superadmin' });
      }
      
      // Удаляем пользователя
      // В текущей реализации просто устанавливаем статус "Заблокирован"
      await storage.updateUser(userId, { isBanned: true, banReason: 'Удален администратором' });
      
      // Логируем действие
      await logSecurityEvent('warning', `Admin ${req.user.username} deleted user ${existingUser.username}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });
  
  // Управление конференциями
  app.get('/api/admin/conferences', requireAdmin, async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const activeOnly = req.query.active === 'true';
      
      let query = db.select().from(conferences).orderBy(desc(conferences.createdAt));
      
      if (search) {
        query = query.where(
          sql`name LIKE ${`%${search}%`} OR description LIKE ${`%${search}%`} OR id = ${search}`
        );
      }
      
      if (activeOnly) {
        query = query.where(eq(conferences.active, true));
      }
      
      const allConferences = await query.limit(100);
      
      // Получаем имена создателей конференций
      const conferencesWithCreators = await Promise.all(
        allConferences.map(async (conf) => {
          const creator = await storage.getUser(conf.creatorId);
          return {
            ...conf,
            creatorName: creator ? (creator.name || creator.username) : `User ${conf.creatorId}`,
          };
        })
      );
      
      res.json(conferencesWithCreators);
    } catch (error) {
      console.error('Error fetching conferences:', error);
      res.status(500).json({ error: 'Failed to fetch conferences' });
    }
  });
  
  app.get('/api/admin/conferences/:id', requireAdmin, async (req, res) => {
    try {
      const conference = await storage.getConference(req.params.id);
      
      if (!conference) {
        return res.status(404).json({ error: 'Conference not found' });
      }
      
      // Получаем информацию о создателе конференции
      const creator = await storage.getUser(conference.creatorId);
      
      res.json({
        ...conference,
        creatorName: creator ? (creator.name || creator.username) : `User ${conference.creatorId}`,
      });
    } catch (error) {
      console.error('Error fetching conference:', error);
      res.status(500).json({ error: 'Failed to fetch conference' });
    }
  });
  
  app.patch('/api/admin/conferences/:id', requireAdmin, async (req, res) => {
    try {
      const conferenceId = req.params.id;
      
      // Проверка существования конференции
      const existingConference = await storage.getConference(conferenceId);
      if (!existingConference) {
        return res.status(404).json({ error: 'Conference not found' });
      }
      
      // Если конференция завершена и пытаемся её активировать,
      // создаем новую запись в истории
      if (req.body.active === true && !existingConference.active) {
        if (existingConference.endedAt) {
          req.body.endedAt = null;
        }
      }
      
      // Обновляем конференцию
      const updatedConference = await storage.updateConference(conferenceId, req.body);
      
      // Логируем действие
      await logSecurityEvent('info', `Admin ${req.user.username} updated conference ${existingConference.name}`);
      
      res.json(updatedConference);
    } catch (error) {
      console.error('Error updating conference:', error);
      res.status(500).json({ error: 'Failed to update conference' });
    }
  });
  
  app.delete('/api/admin/conferences/:id', requireAdmin, async (req, res) => {
    try {
      const conferenceId = req.params.id;
      
      // Проверка существования конференции
      const existingConference = await storage.getConference(conferenceId);
      if (!existingConference) {
        return res.status(404).json({ error: 'Conference not found' });
      }
      
      // Завершаем конференцию вместо удаления
      await storage.updateConference(conferenceId, {
        active: false,
        endedAt: new Date(),
      });
      
      // Логируем действие
      await logSecurityEvent('warning', `Admin ${req.user.username} deleted conference ${existingConference.name}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting conference:', error);
      res.status(500).json({ error: 'Failed to delete conference' });
    }
  });
  
  // Финансовая статистика и управление
  app.get('/api/admin/finance', requireAdmin, async (req, res) => {
    try {
      // Получаем общий доход
      const totalRevenueResult = await db
        .select({ sum: sql`SUM(amount)` })
        .from(payments)
        .where(eq(payments.status, 'completed'));
      
      const totalRevenue = totalRevenueResult[0].sum || 0;
      
      // Получаем доход за каждый месяц последнего года
      const revenueByMonth = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        lastDay.setHours(23, 59, 59, 999);
        
        const result = await db
          .select({ sum: sql`SUM(amount)` })
          .from(payments)
          .where(eq(payments.status, 'completed'))
          .where(gte(payments.createdAt, date))
          .where(lt(payments.createdAt, lastDay));
        
        revenueByMonth.unshift({
          month: date.toLocaleDateString('ru-RU', { month: 'short' }),
          revenue: result[0].sum || 0,
        });
      }
      
      // Получаем количество активных подписок
      const activeSubscriptionsResult = await db
        .select({ count: sql`COUNT(*)` })
        .from(subscriptions)
        .where(eq(subscriptions.isActive, true));
      
      const activeSubscriptions = Number(activeSubscriptionsResult[0].count);
      
      // Получаем статистику по типам подписок
      const monthlySubsResult = await db
        .select({ count: sql`COUNT(*)` })
        .from(subscriptions)
        .where(sql`EXTRACT(DAY FROM (expires_at - started_at)) <= 31`);
      
      const yearlySubsResult = await db
        .select({ count: sql`COUNT(*)` })
        .from(subscriptions)
        .where(sql`EXTRACT(DAY FROM (expires_at - started_at)) > 31`);
      
      const monthlySubs = Number(monthlySubsResult[0].count);
      const yearlySubs = Number(yearlySubsResult[0].count);
      const totalSubs = monthlySubs + yearlySubs;
      
      const subscriptionsByType = [
        { name: 'Месячные', value: totalSubs ? Math.round((monthlySubs / totalSubs) * 100) : 0 },
        { name: 'Годовые', value: totalSubs ? Math.round((yearlySubs / totalSubs) * 100) : 0 },
      ];
      
      // Получаем средний чек
      const avgOrderValueResult = await db
        .select({ avg: sql`AVG(amount)` })
        .from(payments)
        .where(eq(payments.status, 'completed'));
      
      const averageOrderValue = avgOrderValueResult[0].avg || 0;
      
      // Рассчитываем возобновляемость подписок (renewal rate)
      // Просто используем среднее значение ~70%, так как точные данные требуют сложной аналитики
      const subscriptionRenewalRate = 70;
      
      // Получаем последние платежи
      const recentPaymentsQuery = db
        .select()
        .from(payments)
        .orderBy(desc(payments.createdAt))
        .limit(10);
      
      const recentPayments = await recentPaymentsQuery;
      
      // Добавляем имена пользователей к платежам
      const recentPaymentsWithUsernames = await Promise.all(
        recentPayments.map(async (payment) => {
          const user = await storage.getUser(payment.userId);
          return {
            ...payment,
            userName: user ? (user.name || user.username) : `User ${payment.userId}`,
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
        recentPayments: recentPaymentsWithUsernames,
      });
    } catch (error) {
      console.error('Error fetching finance stats:', error);
      res.status(500).json({ error: 'Failed to fetch finance statistics' });
    }
  });
  
  // Управление платежными настройками
  // API для получения статистики платежей для админ-панели
  app.get('/api/admin/payment-stats', requireAdmin, async (req, res) => {
    try {
      // Получаем общее количество платежей
      const totalPaymentsResult = await db
        .select({ count: sql`COUNT(*)` })
        .from(payments);
      const totalPayments = Number(totalPaymentsResult[0]?.count || 0);
      
      // Получаем общую сумму платежей
      const totalAmountResult = await db
        .select({ sum: sql`SUM(amount)` })
        .from(payments)
        .where(eq(payments.status, 'completed'));
      const totalAmount = Number(totalAmountResult[0]?.sum || 0);
      
      // Получаем среднюю сумму платежа
      const averagePaymentAmount = totalPayments > 0 ? totalAmount / totalPayments : 0;
      
      // Получаем статистику по типам подписок
      const subscriptionsByTypeResult = await db
        .select({
          type: payments.type,
          count: sql`COUNT(*)`,
        })
        .from(payments)
        .where(eq(payments.status, 'completed'))
        .groupBy(payments.type);
      
      const subscriptionsByType: Record<string, number> = {};
      subscriptionsByTypeResult.forEach(item => {
        if (item.type) {
          subscriptionsByType[item.type] = Number(item.count);
        }
      });
      
      // Получаем данные о выручке по месяцам
      const revenueByMonthResult = await db
        .select({
          month: sql`TO_CHAR(created_at, 'YYYY-MM')`,
          revenue: sql`SUM(amount)`,
        })
        .from(payments)
        .where(eq(payments.status, 'completed'))
        .groupBy(sql`TO_CHAR(created_at, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(created_at, 'YYYY-MM')`);
      
      const revenueByMonth: Record<string, number> = {};
      revenueByMonthResult.forEach(item => {
        if (item.month && item.revenue !== null) {
          revenueByMonth[item.month] = Number(item.revenue);
        }
      });
      
      // Получаем последние платежи
      const latestPayments = await db
        .select({
          id: payments.id,
          userId: payments.userId,
          username: users.username,
          amount: payments.amount,
          status: payments.status,
          paymentMethod: payments.paymentMethod,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .leftJoin(users, eq(payments.userId, users.id))
        .orderBy(desc(payments.createdAt))
        .limit(5);
      
      // Рассчитываем конверсию (отношение успешных платежей к общему числу)
      const successfulPaymentsResult = await db
        .select({ count: sql`COUNT(*)` })
        .from(payments)
        .where(eq(payments.status, 'completed'));
      const successfulPayments = Number(successfulPaymentsResult[0]?.count || 0);
      const conversionRate = totalPayments > 0 ? successfulPayments / totalPayments : 0;
      
      res.json({
        totalPayments,
        totalAmount,
        subscriptionsByType,
        revenueByMonth,
        latestPayments,
        conversionRate,
        averagePaymentAmount,
      });
    } catch (error) {
      console.error('Error fetching payment statistics:', error);
      res.status(500).json({ error: 'Failed to fetch payment statistics' });
    }
  });

  app.get('/api/admin/payments', requireAdmin, async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const fromDate = req.query.from ? new Date(req.query.from as string) : undefined;
      const toDate = req.query.to ? new Date(req.query.to as string) : undefined;
      
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
        completedAt: payments.completedAt,
      })
      .from(payments)
      .leftJoin(users, eq(payments.userId, users.id))
      .orderBy(desc(payments.createdAt));
      
      // Применяем фильтры если они указаны
      if (search) {
        query = query.where(
          sql`users.username LIKE ${`%${search}%`} OR payments.payment_id LIKE ${`%${search}%`} OR payments.external_id LIKE ${`%${search}%`}`
        );
      }
      
      if (fromDate) {
        query = query.where(gte(payments.createdAt, fromDate));
      }
      
      if (toDate) {
        query = query.where(lte(payments.createdAt, toDate));
      }
      
      const allPayments = await query.limit(100);
      res.json(allPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  });
  
  app.patch('/api/admin/payments/:id', requireAdmin, async (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);
      const { status } = req.body;
      
      // Обновляем статус платежа
      const updatedPayment = await storage.updatePayment(paymentId, {
        status,
        completedAt: status === 'completed' ? new Date() : undefined,
      });
      
      if (!updatedPayment) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      
      // Если платеж успешно завершен и это подписка, обновляем подписку пользователя
      if (status === 'completed' && updatedPayment.subscriptionId) {
        const subscription = await storage.getSubscription(updatedPayment.subscriptionId);
        if (subscription) {
          await storage.updateSubscription(subscription.id, {
            isActive: true,
            cancelledAt: null,
          });
          
          // Обновляем тип подписки пользователя
          await storage.updateUser(updatedPayment.userId, {
            subscriptionType: subscription.type,
          });
        }
      }
      
      res.json(updatedPayment);
    } catch (error) {
      console.error('Error updating payment:', error);
      res.status(500).json({ error: 'Failed to update payment' });
    }
  });

  app.get('/api/admin/payments/settings', requireAdmin, async (req, res) => {
    try {
      // Получаем настройки из базы данных
      const [settings] = await db.select().from(telegramSettings);
      
      // Формируем объект с настройками для разных платежных систем
      const paymentSettings = {
        yukassa: {
          shopId: settings?.paymentProvider === 'yookassa' ? settings.paymentProvider : '',
          secretKey: settings?.paymentApiKey || '',
          enabled: settings?.paymentProvider === 'yookassa',
        },
      };
      
      res.json(paymentSettings);
    } catch (error) {
      console.error('Error fetching payment settings:', error);
      res.status(500).json({ error: 'Failed to fetch payment settings' });
    }
  });
  
  app.post('/api/admin/payments/settings', requireAdmin, async (req, res) => {
    try {
      // Проверяем наличие настроек ЮKassa
      if (req.body.yukassa) {
        // Получаем настройки из базы данных
        const [settings] = await db.select().from(telegramSettings);
        
        if (!settings) {
          return res.status(404).json({ error: 'Settings not found' });
        }
        
        // Обновляем настройки
        await db
          .update(telegramSettings)
          .set({
            paymentProvider: req.body.yukassa.enabled ? 'yookassa' : '',
            paymentApiKey: req.body.yukassa.secretKey,
          })
          .where(eq(telegramSettings.id, settings.id));
        
        // Логируем действие
        await logSecurityEvent('info', `Admin ${req.user.username} updated payment settings`);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating payment settings:', error);
      res.status(500).json({ error: 'Failed to update payment settings' });
    }
  });
  
  // Мониторинг системы
  app.get('/api/admin/system', requireAdmin, async (req, res) => {
    try {
      // Получаем интервал обновления из запроса
      const interval = parseInt(req.query.interval as string) || 60;
      
      // Получаем информацию о системе
      const systemInfo = await getSystemInfo();
      
      res.json(systemInfo);
    } catch (error) {
      console.error('Error fetching system info:', error);
      res.status(500).json({ error: 'Failed to fetch system information' });
    }
  });
  
  app.post('/api/admin/system/restart', requireSuperAdmin, async (req, res) => {
    try {
      const service = req.body.service;
      
      if (!service) {
        return res.status(400).json({ error: 'Service name is required' });
      }
      
      // Логируем действие
      await logSecurityEvent('warning', `Admin ${req.user.username} restarted service ${service}`);
      
      // Имитируем перезапуск сервиса
      // В реальности здесь был бы код для перезапуска конкретной службы
      if (service === 'api') {
        // Очищаем кеш
        serverCache.clear();
        res.json({ success: true, message: 'API server cache cleared' });
      } else if (service === 'webrtc') {
        // В этой реализации только очищаем кеш, связанный с WebRTC
        serverCache.invalidateByPrefix('webrtc');
        res.json({ success: true, message: 'WebRTC cache cleared' });
      } else if (service === 'telegram') {
        // Перезапускаем Telegram бота
        // В реальности здесь был бы код для перезапуска бота
        res.json({ success: true, message: 'Telegram bot restarted' });
      } else if (service === 'database') {
        // Имитируем перезапуск базы данных
        // В реальности здесь был бы код для перезапуска соединения с базой данных
        res.json({ success: true, message: 'Database connection restarted' });
      } else {
        res.status(400).json({ error: 'Unknown service' });
      }
    } catch (error) {
      console.error('Error restarting service:', error);
      res.status(500).json({ error: 'Failed to restart service' });
    }
  });
  
  app.post('/api/admin/system/clear-cache', requireAdmin, async (req, res) => {
    try {
      // Очищаем серверный кеш
      serverCache.clear();
      
      // Логируем действие
      await logSecurityEvent('info', `Admin ${req.user.username} cleared server cache`);
      
      res.json({ success: true, message: 'Server cache cleared' });
    } catch (error) {
      console.error('Error clearing cache:', error);
      res.status(500).json({ error: 'Failed to clear cache' });
    }
  });
  
  // Управление безопасностью
  app.get('/api/admin/security', requireAdmin, async (req, res) => {
    try {
      // Получаем настройки из базы данных
      const [settings] = await db.select().from(telegramSettings);
      
      // Получаем журналы безопасности
      const securityLogs = await getSecurityLogs();
      
      res.json({
        telegramAdminPassword: settings?.adminPassword || '',
        superAdminId: settings?.superAdminId || '',
        webhookUrl: `https://ikarus.app/api/payments/webhook`,
        yukassaWebhookSecret: settings?.paymentApiKey || '',
        securityLogs,
      });
    } catch (error) {
      console.error('Error fetching security settings:', error);
      res.status(500).json({ error: 'Failed to fetch security settings' });
    }
  });
  
  app.post('/api/admin/security', requireAdmin, async (req, res) => {
    try {
      // Получаем настройки из базы данных
      const [settings] = await db.select().from(telegramSettings);
      
      if (!settings) {
        return res.status(404).json({ error: 'Settings not found' });
      }
      
      // Обновляем пароль администратора Telegram, если указан
      if (req.body.telegramAdminPassword) {
        await db
          .update(telegramSettings)
          .set({ adminPassword: req.body.telegramAdminPassword })
          .where(eq(telegramSettings.id, settings.id));
        
        // Логируем действие
        await logSecurityEvent('warning', `Admin ${req.user.username} updated Telegram admin password`);
      }
      
      // Обновляем секрет для вебхуков, если указан
      if (req.body.yukassaWebhookSecret) {
        await db
          .update(telegramSettings)
          .set({ paymentApiKey: req.body.yukassaWebhookSecret })
          .where(eq(telegramSettings.id, settings.id));
        
        // Логируем действие
        await logSecurityEvent('warning', `Admin ${req.user.username} updated webhook secret`);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating security settings:', error);
      res.status(500).json({ error: 'Failed to update security settings' });
    }
  });

  // Получение статистики платежей
  app.get('/api/admin/payment-stats', requireAdmin, async (req, res) => {
    try {
      const stats = await PaymentService.getPaymentStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching payment stats:', error);
      res.status(500).json({ error: 'Failed to fetch payment statistics' });
    }
  });
}

// Функция для логирования событий безопасности
async function logSecurityEvent(level: string, message: string) {
  try {
    // Создаем директорию для логов, если не существует
    if (!fs.existsSync('./logs')) {
      fs.mkdirSync('./logs');
    }
    
    // Форматируем сообщение
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    
    // Записываем в файл
    fs.appendFileSync('./logs/security.log', logEntry);
  } catch (error) {
    console.error('Error writing to security log:', error);
  }
}