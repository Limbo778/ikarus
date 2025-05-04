import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function linkTelegramToAdmin() {
  try {
    // Имя пользователя администратора
    const adminUsername = "Hitklif";
    // Telegram ID, который необходимо привязать
    const telegramId = "YOUR_TELEGRAM_ID"; // Замените на ваш реальный Telegram ID
    
    // Находим пользователя в базе данных
    const existingUser = await db.select().from(users).where(eq(users.username, adminUsername));
    
    if (existingUser.length === 0) {
      console.error("Администратор с таким именем пользователя не найден:", adminUsername);
      return;
    }
    
    // Привязываем Telegram ID к аккаунту администратора
    const updatedUser = await db
      .update(users)
      .set({ 
        telegramId: telegramId,
        lastLoginAt: new Date()
      })
      .where(eq(users.username, adminUsername))
      .returning();
    
    console.log("Telegram ID привязан к администратору:", updatedUser[0]);
    console.log("Операция успешно завершена");
    
  } catch (error) {
    console.error("Ошибка при привязке Telegram ID:", error);
  } finally {
    process.exit(0);
  }
}

// Запускаем привязку Telegram ID
linkTelegramToAdmin();