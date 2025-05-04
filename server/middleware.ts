import { Request, Response, NextFunction } from 'express';
import serverCache from './cache';
import { log } from './vite';

/**
 * Middleware для установки оптимальных HTTP-заголовков кеширования
 * для статических ресурсов и API ответов
 */
export function cacheControl(maxAge: number = 3600) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Для статических ресурсов
    if (req.method === 'GET' && (
      req.path.includes('.js') ||
      req.path.includes('.css') ||
      req.path.includes('.woff') ||
      req.path.includes('.png') ||
      req.path.includes('.jpg') ||
      req.path.includes('.jpeg') ||
      req.path.includes('.svg') ||
      req.path.includes('.ico')
    )) {
      // Установка заголовков для браузерного кеширования
      res.setHeader('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=86400`);
      res.setHeader('Vary', 'Accept-Encoding');
    }
    
    // Для API запросов без кеширования
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
    }
    
    next();
  };
}

/**
 * Middleware для кеширования API ответов на стороне сервера
 */
export function apiCache(ttl: number = 10000) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Применяем только для GET запросов к API
    if (req.method !== 'GET' || !req.path.startsWith('/api/')) {
      return next();
    }
    
    // Не кешируем запросы с авторизацией и пользовательскими данными
    // Проверяем наличие сессии или куки авторизации
    if (req.headers.cookie?.includes('connect.sid') || req.headers.authorization) {
      return next();
    }
    
    // Создаем ключ кеша на основе URL и заголовков
    const cacheKey = `api:${req.originalUrl}`;
    
    // Проверяем наличие данных в кеше
    const cachedData = serverCache.get(cacheKey);
    if (cachedData) {
      res.json(cachedData);
      return;
    }
    
    // Сохраняем оригинальный метод res.json
    const originalJson = res.json;
    
    // Переопределяем метод json для перехвата ответа
    res.json = function(data) {
      // Восстанавливаем оригинальный метод
      res.json = originalJson;
      
      // Кешируем данные только при успешном ответе
      if (res.statusCode >= 200 && res.statusCode < 300) {
        serverCache.set(cacheKey, data, ttl);
      }
      
      // Вызываем оригинальный метод
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * Middleware для мониторинга и оптимизации запросов
 */
export function requestMonitor() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Добавляем метку времени
    const startTime = process.hrtime();
    
    // После завершения запроса
    res.on('finish', () => {
      const hrTime = process.hrtime(startTime);
      const duration = hrTime[0] * 1000 + hrTime[1] / 1000000; // в миллисекундах
      
      // Логируем только медленные запросы (более 500 мс)
      if (duration > 500 && req.path.startsWith('/api/')) {
        log(`SLOW REQUEST: ${req.method} ${req.path} - ${duration.toFixed(2)}ms`, 'warning');
      }
    });
    
    next();
  };
}

/**
 * Middleware для обнаружения мобильных устройств
 */
export function deviceDetection() {
  return (req: Request, res: Response, next: NextFunction) => {
    const userAgent = req.headers['user-agent'] || '';
    
    // Определяем тип устройства
    const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
    
    // Добавляем информацию о устройстве в запрос
    (req as any).deviceInfo = {
      isMobile,
      isTablet,
      isDesktop: !isMobile && !isTablet,
      userAgent
    };
    
    next();
  };
}