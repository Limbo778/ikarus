import TelegramBot from 'node-telegram-bot-api';
import { db } from "../server/db";
import { telegramSettings } from "../shared/schema";
import { eq } from "drizzle-orm";

async function getAdminTelegramId() {
  try {
    // Получаем настройки бота из базы данных
    const [settings] = await db.select().from(telegramSettings);
    
    if (!settings || !settings.botToken) {
      console.error('Telegram bot token not found in database');
      return;
    }
    
    // Создаем экземпляр бота
    const bot = new TelegramBot(settings.botToken, { polling: true });
    
    console.log('Бот запущен. Пожалуйста, отправьте боту сообщение "/admin_id", чтобы получить ваш Telegram ID.');
    console.log('После получения ID, нажмите Ctrl+C для завершения скрипта.');
    
    // Устанавливаем обработчик команды
    bot.onText(/\/admin_id/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      
      if (!userId) {
        await bot.sendMessage(chatId, 'Не удалось получить ваш Telegram ID');
        return;
      }
      
      await bot.sendMessage(chatId, 
        `Ваш Telegram ID: ${userId}\n\n` +
        `Используйте этот ID в скрипте link-telegram.ts для привязки к аккаунту администратора.`
      );
      
      console.log(`Telegram ID пользователя: ${userId}`);
    });
    
  } catch (error) {
    console.error("Ошибка при получении Telegram ID:", error);
  }
}

// Запускаем скрипт
getAdminTelegramId();