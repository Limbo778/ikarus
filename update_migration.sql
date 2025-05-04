-- Создание типов для перечислений
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_type') THEN
        CREATE TYPE subscription_type AS ENUM ('free', 'pro');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'host', 'admin', 'superadmin');
    END IF;
END$$;

-- Обновление таблицы users
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar TEXT,
    ADD COLUMN IF NOT EXISTS role user_role,
    ADD COLUMN IF NOT EXISTS subscription_type subscription_type,
    ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS ban_reason TEXT,
    ADD COLUMN IF NOT EXISTS balance INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
    
-- Обновим значения для role и subscription_type для существующих записей
UPDATE users SET 
    role = CASE 
        WHEN is_admin THEN 'admin'::user_role 
        ELSE 'user'::user_role 
    END,
    subscription_type = 'free'::subscription_type
WHERE role IS NULL OR subscription_type IS NULL;

-- Установим NOT NULL и DEFAULT для колонок role и subscription_type
ALTER TABLE users 
    ALTER COLUMN role SET NOT NULL,
    ALTER COLUMN role SET DEFAULT 'user'::user_role,
    ALTER COLUMN subscription_type SET NOT NULL,
    ALTER COLUMN subscription_type SET DEFAULT 'free'::subscription_type;

-- Обновление таблицы conferences
ALTER TABLE conferences
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 5,
    ADD COLUMN IF NOT EXISTS current_participants INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS has_screen_share BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS has_chat BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS has_video_enabled BOOLEAN DEFAULT TRUE;

-- Обновление таблицы telegram_settings
ALTER TABLE telegram_settings
    ADD COLUMN IF NOT EXISTS webhook_url TEXT,
    ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'yookassa',
    ADD COLUMN IF NOT EXISTS payment_api_key TEXT,
    ADD COLUMN IF NOT EXISTS admin_password TEXT,
    ADD COLUMN IF NOT EXISTS super_admin_id TEXT;

-- Создание таблицы subscriptions если она не существует
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  type subscription_type NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  cancelled_at TIMESTAMP,
  payment_id TEXT,
  amount INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Создание таблицы payments если она не существует
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  payment_method TEXT,
  payment_id TEXT,
  subscription_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Создание таблицы balance_history если она не существует
CREATE TABLE IF NOT EXISTS balance_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  admin_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_history_user_id ON balance_history(user_id);

-- Обновление настроек для телеграм-бота (установка admin_password и super_admin_id)
UPDATE telegram_settings 
SET 
    admin_password = '$2b$10$Mz7BxijzdHxYxRqkwSKGUOo5njYsPgNmm7sv3T4OhQ1bvdVhgI5oe',
    super_admin_id = '532150529'
WHERE id = 1;

-- Если нет записи в telegram_settings, создаем ее
INSERT INTO telegram_settings (bot_token, admin_password, super_admin_id)
SELECT
    (SELECT current_setting('TELEGRAM_BOT_TOKEN', TRUE)),
    '$2b$10$Mz7BxijzdHxYxRqkwSKGUOo5njYsPgNmm7sv3T4OhQ1bvdVhgI5oe',
    '532150529'
WHERE NOT EXISTS (SELECT 1 FROM telegram_settings);

-- Создаем суперадмина, если его нет
INSERT INTO users (username, email, password, name, role, subscription_type)
SELECT 
    'admin', 
    'admin@example.com', 
    '$2b$10$NXAKRoGC4Y7PYgC.xLVPM.wLxAM4y0K8wv0x8JVlvYXjxvnv.j1fC', 
    'System Administrator', 
    'superadmin'::user_role, 
    'pro'::subscription_type
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');