-- Создание типов для перечислений
CREATE TYPE subscription_type AS ENUM ('free', 'pro');
CREATE TYPE user_role AS ENUM ('user', 'host', 'admin', 'superadmin');

-- Создание таблицы users (пользователи)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  role user_role NOT NULL DEFAULT 'user',
  subscription_type subscription_type NOT NULL DEFAULT 'free',
  subscription_expires_at TIMESTAMP,
  telegram_id TEXT UNIQUE,
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  balance INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP
);

-- Создание таблицы conferences (конференции)
CREATE TABLE IF NOT EXISTS conferences (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  creator_id INTEGER NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  max_participants INTEGER DEFAULT 5,
  current_participants INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration INTEGER DEFAULT 0,
  has_screen_share BOOLEAN DEFAULT FALSE,
  has_chat BOOLEAN DEFAULT TRUE,
  has_video_enabled BOOLEAN DEFAULT TRUE,
  recording_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Создание таблицы telegram_settings (настройки телеграм-бота)
CREATE TABLE IF NOT EXISTS telegram_settings (
  id SERIAL PRIMARY KEY,
  bot_token TEXT,
  is_connected BOOLEAN DEFAULT FALSE,
  connected_at TIMESTAMP,
  webhook_url TEXT,
  payment_provider TEXT DEFAULT 'yookassa',
  payment_api_key TEXT,
  admin_password TEXT,
  super_admin_id TEXT
);

-- Создание таблицы subscriptions (подписки)
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

-- Создание таблицы payments (платежи)
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

-- Создание таблицы balance_history (история баланса)
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
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_conferences_creator_id ON conferences(creator_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_history_user_id ON balance_history(user_id);

-- Создание суперадмина (пароль: admin)
INSERT INTO users (username, email, password, name, role, subscription_type)
VALUES ('admin', 'admin@example.com', '$2b$10$NXAKRoGC4Y7PYgC.xLVPM.wLxAM4y0K8wv0x8JVlvYXjxvnv.j1fC', 'System Administrator', 'superadmin', 'pro')
ON CONFLICT (username) DO NOTHING;

-- Начальные настройки для телеграм-бота
INSERT INTO telegram_settings (bot_token, admin_password, super_admin_id)
VALUES ((SELECT current_setting('app.telegram_bot_token')), 
        '$2b$10$Mz7BxijzdHxYxRqkwSKGUOo5njYsPgNmm7sv3T4OhQ1bvdVhgI5oe', -- хешированный пароль "Мненужнобылолишьверитьвсвоикрыльяаневправдудругих"
        '532150529')
ON CONFLICT DO NOTHING;