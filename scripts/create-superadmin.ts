import { db } from '../server/db';
import { users } from '@shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { eq } from 'drizzle-orm';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createSuperAdmin() {
  try {
    console.log('Checking if superadmin already exists...');
    
    // Проверяем, существует ли пользователь с логином Hitklif
    const [existingUser] = await db.select().from(users).where(eq(users.username, 'Hitklif'));
    
    if (existingUser) {
      console.log('Пользователь Hitklif уже существует.');
      
      // Обновляем роль на суперадмина, если требуется
      if (existingUser.role !== 'superadmin') {
        await db.update(users)
          .set({ role: 'superadmin' })
          .where(eq(users.id, existingUser.id));
        console.log('Пользователь Hitklif обновлен до роли superadmin.');
      }
      
      process.exit(0);
    }
    
    // Создаем нового суперадмина
    console.log('Создание суперадмина...');
    const hashedPassword = await hashPassword('123456');
    
    await db.insert(users).values({
      username: 'Hitklif',
      password: hashedPassword,
      role: 'superadmin',
      name: 'Superadmin',
      subscriptionType: 'pro',
      subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 год
    });
    
    console.log('Суперадмин успешно создан!');
    console.log('Логин: Hitklif');
    console.log('Пароль: 123456');
  } catch (error) {
    console.error('Ошибка при создании суперадмина:', error);
  } finally {
    process.exit(0);
  }
}

createSuperAdmin();