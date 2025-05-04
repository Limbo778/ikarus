import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createUser() {
  try {
    // Информация о пользователе
    const username = "user1";
    const password = "123456";
    const email = "user1@example.com";
    const name = "Обычный пользователь";
    
    // Хешируем пароль
    const hashedPassword = await hashPassword(password);
    
    // Проверяем есть ли уже такой пользователь
    const existingUser = await db.select().from(users).where(eq(users.username, username));
    
    if (existingUser.length > 0) {
      // Обновляем существующего пользователя
      const updatedUser = await db
        .update(users)
        .set({ 
          password: hashedPassword,
          role: "user",
          name: name,
          email: email,
          balance: 100000 // 1000 рублей
        })
        .where(eq(users.username, username))
        .returning();
      
      console.log("Пользователь обновлен:", updatedUser[0]);
    } else {
      // Создаем нового пользователя
      const newUser = await db
        .insert(users)
        .values({
          username: username,
          password: hashedPassword,
          email: email,
          name: name,
          role: "user", 
          balance: 100000 // 1000 рублей
        })
        .returning();
      
      console.log("Пользователь создан:", newUser[0]);
    }
    
    console.log("Операция успешно завершена");
    
  } catch (error) {
    console.error("Ошибка при создании пользователя:", error);
  } finally {
    process.exit(0);
  }
}

// Запускаем создание пользователя
createUser();