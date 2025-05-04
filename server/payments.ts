import { storage } from './storage';
import { v4 as uuidv4 } from 'uuid';
import { YooCheckout, ICreatePayment, IConfirmationType } from '@a2seven/yoo-checkout';
import { InsertPayment, InsertBalanceHistory } from '@shared/schema';

const YOUKASSA_SHOP_ID = process.env.YOUKASSA_SHOP_ID || '';
const YOUKASSA_SECRET_KEY = process.env.YOUKASSA_SECRET_KEY || '';

// Проверка наличия ключей
if (!YOUKASSA_SHOP_ID || !YOUKASSA_SECRET_KEY) {
  console.error('ВНИМАНИЕ: Отсутствуют ключи ЮKassa. Платежная система не будет работать.');
}

// Инициализация клиента ЮKassa
const checkout = new YooCheckout({
  shopId: YOUKASSA_SHOP_ID,
  secretKey: YOUKASSA_SECRET_KEY
});

// Структура для хранения данных о платеже
interface PaymentData {
  amount: number;
  plan: string;
  months: number;
  userId: number;
  isRenewal?: boolean;
  description?: string;
}

// Структура для статистики платежей
export interface PaymentStats {
  totalPayments: number;
  totalAmount: number;
  subscriptionsByType: Record<string, number>;
  revenueByMonth: Record<string, number>;
  latestPayments: any[];
  conversionRate: number;
  averagePaymentAmount: number;
}

// Класс для работы с платежами ЮKassa
export class PaymentService {
  // Создание нового платежа
  static async createPayment(data: PaymentData) {
    try {
      if (!checkout) {
        throw new Error('Платежный сервис не инициализирован');
      }

      const { amount, plan, months, userId, isRenewal, description } = data;
      
      // Генерируем уникальный идентификатор платежа
      const idempotenceKey = uuidv4();
      
      // Генерация данных для создания платежа
      const createPayload: ICreatePayment = {
        amount: {
          value: amount.toFixed(2),
          currency: 'RUB'
        },
        capture: true,
        confirmation: {
          type: 'redirect' as IConfirmationType,
          return_url: `${process.env.BASE_URL || 'http://localhost:3000'}/payment-success`
        },
        description: description || `Подписка на план "${plan}" на ${months} мес.`,
        metadata: {
          userId: userId.toString(),
          plan,
          months: months.toString(),
          isRenewal: isRenewal ? 'true' : 'false'
        }
      };
      
      // Создаем платеж в ЮKassa
      const payment = await checkout.createPayment(
        createPayload,
        idempotenceKey
      );
      
      // Сохраняем информацию о платеже в нашей базе данных
      await storage.createPayment({
        userId,
        amount,
        status: 'pending',
        externalId: payment.id,
        type: 'subscription',
        details: JSON.stringify({
          plan,
          months,
          isRenewal: !!isRenewal
        }),
        createdAt: new Date().toISOString()
      });
      
      return {
        paymentId: payment.id,
        confirmation_url: payment.confirmation.confirmation_url,
        status: payment.status
      };
    } catch (error: any) {
      console.error('Ошибка создания платежа:', error);
      throw new Error(`Ошибка создания платежа: ${error.message}`);
    }
  }
  
  // Получение информации о платеже
  static async getPaymentInfo(paymentId: string) {
    try {
      const payment = await checkout.getPayment(paymentId);
      return payment;
    } catch (error: any) {
      console.error('Ошибка получения информации о платеже:', error);
      throw new Error(`Ошибка получения информации о платеже: ${error.message}`);
    }
  }
  
  // Обработка webhook-уведомления от ЮKassa
  static async handleWebhookNotification(body: any) {
    try {
      const { event, object } = body;
      
      // Проверяем тип события
      if (event === 'payment.succeeded') {
        // Получаем информацию о платеже из нашей БД
        const paymentInfo = await storage.getPaymentByExternalId(object.id);
        
        if (!paymentInfo) {
          throw new Error(`Платеж с id ${object.id} не найден в системе`);
        }
        
        // Обновляем статус платежа в нашей БД
        await storage.updatePayment(paymentInfo.id, {
          status: 'completed',
          updatedAt: new Date().toISOString()
        });
        
        // Обновляем информацию о подписке пользователя
        const details = JSON.parse(paymentInfo.details);
        const { plan, months, isRenewal } = details;
        
        // Получаем пользователя
        const user = await storage.getUser(paymentInfo.userId);
        
        if (!user) {
          throw new Error(`Пользователь с id ${paymentInfo.userId} не найден`);
        }
        
        // Вычисляем дату окончания подписки
        let expiresAt = new Date();
        
        if (isRenewal && user.subscriptionExpiresAt) {
          // Для продления - добавляем месяцы к существующей дате истечения
          expiresAt = new Date(user.subscriptionExpiresAt);
        }
        
        // Добавляем месяцы к дате
        expiresAt.setMonth(expiresAt.getMonth() + parseInt(months, 10));
        
        // Обновляем информацию о подписке пользователя
        await storage.updateUser(paymentInfo.userId, {
          subscriptionType: "pro",
          subscriptionExpiresAt: expiresAt.toISOString()
        });
        
        // Создаем запись в истории баланса
        await storage.createBalanceHistory({
          userId: paymentInfo.userId,
          amount: paymentInfo.amount,
          type: 'payment',
          description: `Оплата подписки "${plan}" на ${months} мес.`,
          createdAt: new Date().toISOString()
        });
        
        console.log(`Подписка активирована для пользователя ${paymentInfo.userId}, план: ${plan}, истекает: ${expiresAt.toISOString()}`);
      } else if (event === 'payment.canceled') {
        // Обрабатываем отмену платежа
        const paymentInfo = await storage.getPaymentByExternalId(object.id);
        
        if (paymentInfo) {
          await storage.updatePayment(paymentInfo.id, {
            status: 'canceled',
            updatedAt: new Date().toISOString()
          });
        }
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Ошибка обработки webhook:', error);
      throw new Error(`Ошибка обработки webhook: ${error.message}`);
    }
  }
  
  // Получение статистики платежей для админ-панели
  static async getPaymentStats(): Promise<PaymentStats> {
    try {
      // Получаем все платежи
      const allPayments = await storage.getAllPayments();
      
      // Фильтруем только успешные платежи
      const successfulPayments = allPayments.filter(p => p.status === 'completed');
      
      // Вычисляем общую сумму
      const totalAmount = successfulPayments.reduce((sum, payment) => sum + payment.amount, 0);
      
      // Распределение по типам подписок
      const subscriptionsByType: Record<string, number> = {};
      
      // Распределение выручки по месяцам
      const revenueByMonth: Record<string, number> = {};
      
      // Обрабатываем данные каждого платежа
      successfulPayments.forEach(payment => {
        // Анализируем детали платежа
        try {
          const details = JSON.parse(payment.details);
          
          // Подсчитываем количество по планам
          if (details.plan) {
            subscriptionsByType[details.plan] = (subscriptionsByType[details.plan] || 0) + 1;
          }
          
          // Разбивка по месяцам
          const paymentDate = new Date(payment.createdAt);
          const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
          
          revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + payment.amount;
        } catch (e) {
          console.error('Ошибка при анализе деталей платежа:', e);
        }
      });
      
      // Коэффициент конверсии (успешные платежи / все платежи)
      const conversionRate = allPayments.length > 0 
        ? (successfulPayments.length / allPayments.length) * 100 
        : 0;
      
      // Средняя сумма платежа
      const averagePaymentAmount = successfulPayments.length > 0 
        ? totalAmount / successfulPayments.length 
        : 0;
      
      // Последние 10 платежей для отображения в админке
      const latestPayments = allPayments
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
      
      return {
        totalPayments: successfulPayments.length,
        totalAmount,
        subscriptionsByType,
        revenueByMonth,
        latestPayments,
        conversionRate,
        averagePaymentAmount
      };
    } catch (error: any) {
      console.error('Ошибка получения статистики платежей:', error);
      throw new Error(`Ошибка получения статистики платежей: ${error.message}`);
    }
  }
}