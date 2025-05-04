import { useState, useEffect } from 'react';

/**
 * Хук для отслеживания медиа-запросов и адаптации компонентов
 * в зависимости от характеристик устройства
 *
 * @param query - Строка медиа-запроса CSS (например, '(max-width: 768px)')
 * @returns Булево значение, указывающее соответствует ли текущее состояние экрана запросу
 */
function useMediaQuery(query: string): boolean {
  // Проверяем доступность window (SSR-совместимость)
  const getMatches = (): boolean => {
    // Проверка на null в случае SSR
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  // Состояние для отслеживания соответствия медиа-запросу
  const [matches, setMatches] = useState<boolean>(getMatches());

  // Функция для обновления состояния matches
  const handleChange = () => {
    setMatches(getMatches());
  };

  // Эффект для установки слушателя изменения медиа-запроса
  useEffect(() => {
    // Создаем медиа-запрос
    const matchMedia = window.matchMedia(query);

    // Инициализируем состояние
    handleChange();

    // Используем подходящий метод для слушателя
    // (addEventListener для современных браузеров, addListener для старых)
    if (matchMedia.addEventListener) {
      matchMedia.addEventListener('change', handleChange);
    } else {
      // Для обратной совместимости со старыми браузерами
      matchMedia.addListener(handleChange);
    }

    // Очистка слушателя при размонтировании
    return () => {
      if (matchMedia.removeEventListener) {
        matchMedia.removeEventListener('change', handleChange);
      } else {
        // Для обратной совместимости со старыми браузерами
        matchMedia.removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
}

export default useMediaQuery;