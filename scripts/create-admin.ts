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

async function createAdmin() {
  try {
    // Информация об администраторе
    const adminUsername = "Hitklif";
    const adminPassword = "123456";
    const adminEmail = "admin@ikarus.app";
    const adminName = "Администратор";
    
    // Хешируем пароль
    const hashedPassword = await hashPassword(adminPassword);
    
    // Проверяем есть ли уже такой пользователь
    const existingUser = await db.select().from(users).where(eq(users.username, adminUsername));
    
    if (existingUser.length > 0) {
      // Обновляем существующего пользователя до superadmin
      const updatedUser = await db
        .update(users)
        .set({ 
          password: hashedPassword,
          role: "superadmin",
          subscriptionType: "pro",
          subscriptionExpiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 лет
          balance: 1000000 // 10 000 рублей
        })
        .where(eq(users.username, adminUsername))
        .returning();
      
      console.log("Администратор обновлен:", updatedUser[0]);
    } else {
      // Создаем нового пользователя-администратора
      const newUser = await db
        .insert(users)
        .values({
          username: adminUsername,
          password: hashedPassword,
          email: adminEmail,
          name: adminName,
          role: "superadmin",
          subscriptionType: "pro",
          subscriptionExpiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 лет
          balance: 1000000 // 10 000 рублей
        })
        .returning();
      
      console.log("Администратор создан:", newUser[0]);
    }
    
    console.log("Операция успешно завершена");
    
  } catch (error) {
    console.error("Ошибка при создании администратора:", error);
  } finally {
    process.exit(0);
  }
}

// Запускаем создание администратора
createAdmin();