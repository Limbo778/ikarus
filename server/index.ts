import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkDatabaseConnection } from "./db";
import { cacheControl, apiCache, requestMonitor, deviceDetection } from "./middleware";
import serverCache from "./cache";
import { telegramService } from "./telegram";

const app = express();

// Базовые миддлвэры
app.use(express.json({ limit: '2mb' })); // Ограничиваем размер тела запроса
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

// Оптимизированная настройка CORS
app.use((req, res, next) => {
  // Более безопасная настройка CORS с ограничением источников для production
  if (process.env.NODE_ENV === 'production') {
    // В production разрешаем только определенные домены
    const allowedOrigins = ['https://yancuic-tlanextia.replit.app', 'https://yancuic-tlanextia.com'];
    const origin = req.headers.origin;
    
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  } else {
    // В разработке разрешаем все источники
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,Upgrade,Connection,Sec-WebSocket-Key,Sec-WebSocket-Version,Sec-WebSocket-Extensions');
  res.header('Access-Control-Max-Age', '86400'); // Кешируем preflight-запросы на 24 часа
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Оптимизация для OPTIONS запросов (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
});

// Подключаем оптимизирующие миддлвэры
app.use(cacheControl(3600)); // Кеширование статики на 1 час
app.use(apiCache(30000));    // Кеширование API на 30 секунд
app.use(requestMonitor());   // Мониторинг производительности запросов
app.use(deviceDetection());  // Определение типа устройства

// Логирование запросов с оптимизацией производительности
app.use((req, res, next) => {
  // Пропускаем запросы к статическим файлам для снижения объема логов
  if (req.path.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf|eot)$/)) {
    return next();
  }
  
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Перехватываем JSON ответы
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    // Логируем только API запросы и только с определенной длительностью
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Добавляем информацию о кеше для GET запросов
      if (req.method === 'GET') {
        const cacheKey = `api:${req.originalUrl}`;
        const cached = serverCache.get(cacheKey) !== undefined;
        if (cached) {
          logLine += ' [cached]';
        }
      }
      
      // Добавляем тело ответа для отладки, но только в кратком виде
      if (capturedJsonResponse) {
        const jsonStr = JSON.stringify(capturedJsonResponse);
        if (jsonStr.length > 80) {
          logLine += ` :: ${jsonStr.slice(0, 79)}…`;
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
  // Проверяем подключение к базе данных перед запуском сервера
  try {
    const connected = await checkDatabaseConnection();
    if (!connected) {
      console.error("Не удалось подключиться к базе данных. Проверьте настройки подключения.");
      process.exit(1);
    }
    log("Успешное подключение к базе данных");
  } catch (err) {
    console.error("Ошибка проверки подключения к базе данных:", err);
    process.exit(1);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Инициализация Telegram бота
  try {
    const botInitialized = await telegramService.initialize();
    if (botInitialized) {
      log("Telegram бот успешно инициализирован");
    } else {
      log("Telegram бот не настроен или произошла ошибка инициализации");
    }
  } catch (err) {
    console.error("Ошибка инициализации Telegram бота:", err);
    // Продолжаем работу сервера даже если бот не запустился
  }

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // Добавляем обработчик для корректного завершения работы
  const gracefulShutdown = async () => {
    log("Graceful shutdown initiated...");
    
    // Остановка Telegram бота
    try {
      await telegramService.stop();
      log("Telegram бот остановлен");
    } catch (err) {
      console.error("Ошибка при остановке Telegram бота:", err);
    }
    
    // Закрытие HTTP сервера
    server.close(() => {
      log("HTTP сервер остановлен");
      process.exit(0);
    });
    
    // Принудительное завершение, если сервер не закрылся за 5 секунд
    setTimeout(() => {
      log("Принудительное завершение работы");
      process.exit(1);
    }, 5000);
  };

  // Обработка сигналов для корректного завершения работы
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  // WebRTC server is already initialized in routes.ts
  // No need to initialize it again here
})();