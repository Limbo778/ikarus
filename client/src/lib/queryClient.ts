import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Функция для преобразования snake_case в camelCase
function toCamelCase(str: string): string {
  return str.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace('-', '').replace('_', '')
  );
}

// Рекурсивное преобразование ключей объекта из snake_case в camelCase
export function convertKeysToCamelCase(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToCamelCase(item));
  }

  const camelCaseObj: Record<string, any> = {};
  
  Object.keys(obj).forEach(key => {
    const camelKey = toCamelCase(key);
    camelCaseObj[camelKey] = convertKeysToCamelCase(obj[key]);
  });
  
  return camelCaseObj;
}

type ApiRequestOptions = RequestInit & {
  on401?: "error" | "returnNull";
};

export const apiRequest = async (
  method: string,
  url: string,
  body?: any,
  options: ApiRequestOptions = {}
) => {
  const { on401 = "error", ...rest } = options;
  
  // Для отладки
  const requestId = Math.random().toString(36).substring(2, 8);
  console.log(`[apiRequest:${requestId}] ${method} ${url}`);

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
    ...rest,
  });

  // Handle 401 unauthorized based on options
  if (response.status === 401) {
    if (on401 === "returnNull") {
      console.log(`[apiRequest:${requestId}] 401 Unauthorized, returning null`);
      return null;
    } else {
      console.log(`[apiRequest:${requestId}] 401 Unauthorized, throwing error`);
      throw new Error("Unauthorized");
    }
  }

  // Handle other error status codes
  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
      console.log(`[apiRequest:${requestId}] Error response:`, errorData);
    } catch (e) {
      console.log(`[apiRequest:${requestId}] Error parsing error response:`, e);
    }
    
    console.log(`[apiRequest:${requestId}] ${response.status} Error: ${errorMessage}`);
    throw new Error(errorMessage);
  }
  
  console.log(`[apiRequest:${requestId}] Successful response: ${response.status}`);
  return response;
};

export const getQueryFn = (options: ApiRequestOptions = {}) => {
  return async ({ queryKey }: { queryKey: unknown[] }) => {
    // Добавляем уникальный идентификатор запроса для отслеживания
    const requestId = Math.random().toString(36).substring(2, 8);
    console.log(`[queryClient:${requestId}] Начало запроса, queryKey:`, queryKey);
    
    // Обработка разных форматов queryKey для обеспечения совместимости
    let url = '';
    
    if (queryKey.length === 1 && typeof queryKey[0] === 'string') {
      // Формат: ['url']
      url = queryKey[0];
      console.log(`[queryClient:${requestId}] Используется формат прямого URL`);
    } else if (queryKey.length > 1 && typeof queryKey[0] === 'string') {
      // Формат: ['base', 'id'] -> 'base/id'
      // Пример: ['/api/conferences', 'CONF-123'] -> '/api/conferences/CONF-123'
      if (typeof queryKey[1] === 'string' && queryKey[1]) {
        // Добавляем слэш между элементами, если его нет
        const base = queryKey[0].endsWith('/') ? queryKey[0].slice(0, -1) : queryKey[0];
        url = `${base}/${queryKey[1]}`;
        console.log(`[queryClient:${requestId}] Собираем URL из частей: база=${queryKey[0]}, id=${queryKey[1]}`);
      } else {
        url = queryKey[0] as string;
        console.log(`[queryClient:${requestId}] ID пустой, используем только базовый URL`);
      }
    } else {
      console.error(`[queryClient:${requestId}] Неверный формат queryKey:`, queryKey);
      throw new Error(`Неверный формат queryKey: ${JSON.stringify(queryKey)}`);
    }
    
    console.log(`[queryClient:${requestId}] Итоговый URL запроса: ${url}`);
    
    try {
      console.log(`[queryClient:${requestId}] Выполняем fetch запрос к ${url}`);
      const response = await apiRequest("GET", url, undefined, options);
      
      if (response === null) {
        console.log(`[queryClient:${requestId}] Запрос вернул null (401)`);
        return null; // Возвращаем null вместо undefined
      }
      
      console.log(`[queryClient:${requestId}] Получен ответ от сервера:`, response.status, response.statusText);
      const rawData = await response.json();
      
      // Преобразуем snake_case в camelCase
      const data = convertKeysToCamelCase(rawData);
      
      if (data && typeof data === 'object') {
        const keys = Object.keys(data);
        console.log(`[queryClient:${requestId}] Получены данные, ключи:`, keys.join(', '));
        
        // Для /api/conferences/:id проверяем наличие конференции
        if (url.includes('/api/conferences/') && keys.includes('conference')) {
          const conf = data.conference;
          if (conf) {
            console.log(`[queryClient:${requestId}] Конференция найдена: id=${conf.id}, name=${conf.name}`);
            
            // Вывод всех полей конференции для отладки
            console.log(`[queryClient:${requestId}] Поля конференции:`, Object.keys(conf).join(', '));
          } else {
            console.log(`[queryClient:${requestId}] Конференция не определена в ответе`);
          }
        }
      } else {
        console.log(`[queryClient:${requestId}] Получены данные не в формате объекта`);
      }
      
      return data;
    } catch (error) {
      console.error(`[queryClient:${requestId}] Ошибка при запросе ${url}:`, error);
      throw error;
    }
  };
};