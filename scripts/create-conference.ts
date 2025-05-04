import { db } from "../server/db";
import { conferences } from "../shared/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

async function createConference() {
  try {
    // Информация о конференции
    const conferenceId = "conf-" + uuidv4().substring(0, 8);
    const conferenceName = "Тестовая конференция";
    const conferenceDescription = "Конференция для тестирования функционала";
    const creatorId = 1; // ID администратора, созданного ранее
    
    // Проверяем, есть ли уже конференция с таким ID
    const existingConference = await db.select().from(conferences).where(eq(conferences.id, conferenceId));
    
    if (existingConference.length > 0) {
      // Обновляем существующую конференцию
      const updatedConference = await db
        .update(conferences)
        .set({ 
          name: conferenceName,
          description: conferenceDescription,
          active: true,
          maxParticipants: 10,
          hasScreenShare: true,
          hasChat: true,
          hasVideoEnabled: true
        })
        .where(eq(conferences.id, conferenceId))
        .returning();
      
      console.log("Конференция обновлена:", updatedConference[0]);
    } else {
      // Создаем новую конференцию
      const newConference = await db
        .insert(conferences)
        .values({
          id: conferenceId,
          name: conferenceName,
          description: conferenceDescription,
          creatorId: creatorId,
          active: true,
          maxParticipants: 10,
          currentParticipants: 0,
          hasScreenShare: true,
          hasChat: true,
          hasVideoEnabled: true,
          startedAt: null,
          endedAt: null,
          duration: 0
        })
        .returning();
      
      console.log("Конференция создана:", newConference[0]);
    }
    
    // Создадим вторую конференцию для обычного пользователя
    const conferenceId2 = "conf-" + uuidv4().substring(0, 8);
    const conferenceName2 = "Встреча команды";
    const conferenceDescription2 = "Еженедельное совещание команды разработки";
    const creatorId2 = 2; // ID обычного пользователя
    
    const newConference2 = await db
      .insert(conferences)
      .values({
        id: conferenceId2,
        name: conferenceName2,
        description: conferenceDescription2,
        creatorId: creatorId2,
        active: true,
        maxParticipants: 5,
        currentParticipants: 0,
        hasScreenShare: true,
        hasChat: true,
        hasVideoEnabled: true,
        startedAt: null,
        endedAt: null,
        duration: 0
      })
      .returning();
    
    console.log("Вторая конференция создана:", newConference2[0]);
    
    console.log("Операция успешно завершена");
    
  } catch (error) {
    console.error("Ошибка при создании конференции:", error);
  } finally {
    process.exit(0);
  }
}

// Запускаем создание конференции
createConference();