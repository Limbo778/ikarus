import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Объединяет classNames с помощью clsx и tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Проверяет наличие требуемой роли у пользователя
 * Примечание: superadmin автоматически имеет права всех других ролей
 */
export function hasRole(user: any, requiredRoles: string[]) {
  if (!user || !user.role) return false;
  
  // Суперадмин имеет доступ ко всему
  if (user.role === 'superadmin') return true;
  
  // Проверяем, есть ли у пользователя хотя бы одна из требуемых ролей
  return requiredRoles.includes(user.role);
}

/**
 * Форматирует дату и время для отображения в интерфейсе
 */
export function formatDateTime(date: Date | string | number) {
  if (!date) return "";
  
  const d = new Date(date);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Форматирует продолжительность в минутах в человекопонятный формат
 */
export function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} мин`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 
      ? `${hours} ч ${remainingMinutes} мин` 
      : `${hours} ч`;
  }
}

/**
 * Преобразует цены из копеек в рубли для отображения
 */
export function formatCurrency(amountInKopecks: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountInKopecks / 100);
}

/**
 * Сокращает строку до указанной длины, добавляя многоточие
 */
export function truncateString(str: string, maxLength: number) {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + "...";
}

/**
 * Добавляет алфавитный индекс участникам для отображения в интерфейсе
 */
export function addParticipantIndex(index: number) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (index < alphabet.length) {
    return alphabet[index];
  } else {
    // Для индексов больше 25 (Z) используем AA, AB, и т.д.
    const firstChar = alphabet[Math.floor(index / alphabet.length) - 1];
    const secondChar = alphabet[index % alphabet.length];
    return `${firstChar}${secondChar}`;
  }
}

/**
 * Генерирует уникальный ID для сущностей
 */
export function generateId(prefix: string = "") {
  return `${prefix}${Math.random().toString(36).substring(2, 9)}-${Date.now().toString(36)}`;
}

/**
 * Преобразует тип подписки в человекопонятный текст
 */
export function formatSubscriptionType(type: string) {
  const types: Record<string, string> = {
    free: "Бесплатная",
    "pro-month": "Pro (месячная)",
    "pro-year": "Pro (годовая)",
    pro: "Pro",
  };
  
  return types[type] || type;
}

/**
 * Вычисляет оставшееся время подписки в днях
 */
export function getSubscriptionDaysLeft(expiresAt: Date | string | number | null | undefined) {
  if (!expiresAt) return 0;
  
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffTime = expires.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Определяет цвет для отображения статуса
 */
export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    active: "text-green-500",
    inactive: "text-gray-500",
    pending: "text-yellow-500",
    completed: "text-blue-500",
    failed: "text-red-500",
    banned: "text-red-500",
  };
  
  return colors[status] || "text-gray-500";
}

/**
 * Форматирует размер файла в байтах в читаемый формат
 */
export function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}