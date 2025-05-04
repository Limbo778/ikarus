import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const { Pool } = pg;

// Оптимизированное подключение к базе данных с повторными попытками и пулом соединений
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Максимальное количество соединений в пуле
  idleTimeoutMillis: 60000, // Таймаут неиспользуемого соединения в мс (увеличено)
  connectionTimeoutMillis: 15000, // Таймаут соединения в мс (увеличено)
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  keepAlive: true, // Опция для поддержания соединений активными
  query_timeout: 30000 // Увеличиваем таймаут для запросов
});

// Обработка событий пула соединений
pool.on('connect', () => {
  console.log('New PostgreSQL client connected');
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error:', err);
});

// Подключаем Drizzle ORM к пулу
export const db = drizzle(pool, { schema });

// Функция для проверки соединения с базой данных
export async function checkDatabaseConnection(): Promise<boolean> {
  let retries = 3; // Количество повторных попыток
  let lastError;

  while (retries > 0) {
    try {
      // Используем простой запрос для проверки соединения
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT now()');
        console.log('Database connection successful');
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      lastError = error;
      console.error(`Database connection attempt failed (${retries} retries left):`, error);
      retries--;
      
      if (retries > 0) {
        // Пауза перед следующей попыткой (увеличиваем время ожидания с каждой попыткой)
        const delay = (4 - retries) * 1000; // 1с, 2с, 3с
        console.log(`Waiting ${delay}ms before next connection attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error('All database connection attempts failed. Last error:', lastError);
  return false;
}