/**
 * Модуль для оптимизации кеширования данных на сервере
 * с целью снижения нагрузки на базу данных и повышения производительности.
 */

// Тип для установки срока действия записи в кеше
type CacheEntry<T> = {
  data: T;
  expires: number;
}

class ServerCache {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;
  private defaultTTL: number;
  private hitCount: number = 0;
  private missCount: number = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Инициализация кеша с настройками
   * @param maxSize Максимальное количество записей в кеше
   * @param defaultTTL Время жизни записи по умолчанию (в миллисекундах)
   * @param cleanupIntervalMs Интервал очистки устаревших записей (в миллисекундах)
   */
  constructor(maxSize: number = 100, defaultTTL: number = 60000, cleanupIntervalMs: number = 60000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;

    // Запускаем периодическую очистку
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  /**
   * Получение данных из кеша
   * @param key Ключ для поиска данных
   * @returns Данные или undefined если не найдены или устарели
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (!entry) {
      this.missCount++;
      return undefined;
    }

    // Проверяем не устарела ли запись
    if (entry.expires < now) {
      this.cache.delete(key);
      this.missCount++;
      return undefined;
    }

    this.hitCount++;
    return entry.data as T;
  }

  /**
   * Сохранение данных в кеше
   * @param key Ключ для сохранения данных
   * @param data Данные для сохранения
   * @param ttl Время жизни в миллисекундах (опционально)
   */
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    // Проверка на максимальный размер кеша
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
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Очистка всего кеша
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Получение статистики использования кеша
   */
  getStats(): {size: number, hits: number, misses: number, hitRate: number} {
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
  invalidateByPrefix(substring: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(substring)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Остановка процессов кеширования и очистка ресурсов
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  /**
   * Очистка устаревших записей из кеша
   */
  private cleanup(): void {
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
  private evictOldest(): void {
    let oldestKey: string | null = null;
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
}

// Создаем экземпляр кеша для использования во всем приложении
export const serverCache = new ServerCache(500, 5 * 60 * 1000);

export default serverCache;