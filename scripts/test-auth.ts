import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function comparePasswords(supplied: string, stored: string) {
  const [hashedPassword, salt] = stored.split(".");
  const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
  const suppliedPasswordBuf = (await scryptAsync(
    supplied,
    salt,
    64
  )) as Buffer;
  return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}

async function testAuth() {
  try {
    // Тестовые данные
    const testUsers = [
      { username: "Hitklif", password: "123456" },
      { username: "user1", password: "123456" },
      { username: "nonexistent", password: "wrong" }
    ];
    
    for (const testUser of testUsers) {
      console.log(`Проверка для пользователя: ${testUser.username}`);
      
      // Ищем пользователя в базе
      const user = await db.select().from(users).where(eq(users.username, testUser.username));
      
      if (user.length === 0) {
        console.log(`Пользователь ${testUser.username} не найден`);
        continue;
      }
      
      // Проверяем пароль
      const isPasswordValid = await comparePasswords(testUser.password, user[0].password);
      
      if (isPasswordValid) {
        console.log(`Авторизация успешна для ${testUser.username}`);
        console.log(`Роль: ${user[0].role}, Подписка: ${user[0].subscriptionType}`);
      } else {
        console.log(`Неверный пароль для ${testUser.username}`);
      }
      
      console.log("---");
    }
    
  } catch (error) {
    console.error("Ошибка при проверке авторизации:", error);
  } finally {
    process.exit(0);
  }
}

// Запускаем тест
testAuth();