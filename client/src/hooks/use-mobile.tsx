import { useCallback, useEffect, useState } from "react";
import useMediaQuery from "./use-media-query";

/**
 * Расширенный хук для определения мобильных устройств
 * с дополнительной логикой по определению возможностей
 */
export default function useMobile() {
  // Используем медиа-запросы для определения типа устройства
  const isMobileScreen = useMediaQuery("(max-width: 768px)");
  const isTabletScreen = useMediaQuery("(min-width: 769px) and (max-width: 1024px)");
  const isSmallMobile = useMediaQuery("(max-width: 480px)");
  const isLowEndDevice = useMediaQuery("(max-width: 350px)");
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  
  // Определяем тип устройства на основе User-Agent (более точно, чем только размер экрана)
  const [deviceType, setDeviceType] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isLowPerformance, setIsLowPerformance] = useState(false);
  
  // Определение характеристик устройства при монтировании
  useEffect(() => {
    // Проверка на тачскрин
    const hasTouchScreen = () => {
      return ('ontouchstart' in window) || 
             (navigator.maxTouchPoints > 0) || 
             (navigator as any).msMaxTouchPoints > 0;
    };
    
    // Проверка на низкую производительность устройства
    const detectLowPerformance = () => {
      // Проверка на количество логических ядер процессора
      const lowCPU = navigator.hardwareConcurrency <= 4;
      
      // Проверка на низкую память (не во всех браузерах)
      let lowMemory = false;
      if ((navigator as any).deviceMemory) {
        lowMemory = (navigator as any).deviceMemory < 4;
      }
      
      // Проверка на низкую производительность через requestAnimationFrame
      let lowFPS = false;
      let frames = 0;
      let lastTime = performance.now();
      
      const countFrames = () => {
        frames++;
        const currentTime = performance.now();
        if (currentTime - lastTime >= 1000) {
          lowFPS = frames < 30; // Если меньше 30 FPS, считаем устройство слабым
          // Очистка счетчика
          frames = 0;
          lastTime = currentTime;
        }
        if (currentTime - lastTime < 3000) { // Проверяем только первые 3 секунды
          requestAnimationFrame(countFrames);
        }
      };
      
      requestAnimationFrame(countFrames);
      
      return lowCPU || lowMemory || lowFPS || prefersReducedMotion;
    };
    
    // Определение типа устройства по User-Agent
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent);
    const isTabletUA = /ipad|android(?!.*mobile)/i.test(userAgent);
    
    // Комбинируем различные факторы для точного определения типа устройства
    if (isTabletUA || (isTabletScreen && !isSmallMobile)) {
      setDeviceType("tablet");
    } else if (isMobileUA || isMobileScreen || isSmallMobile) {
      setDeviceType("mobile");
    } else {
      setDeviceType("desktop");
    }
    
    // Определяем, имеет ли устройство сенсорный экран
    setIsTouchDevice(hasTouchScreen());
    
    // Проверяем производительность устройства
    setIsLowPerformance(detectLowPerformance() || isLowEndDevice);
    
  }, [isMobileScreen, isTabletScreen, isSmallMobile, isLowEndDevice, prefersReducedMotion]);
  
  // Функция для определения оптимального размера медиа для текущего устройства
  const getOptimalMediaSize = useCallback(() => {
    if (isLowPerformance) {
      return {
        width: 320,
        height: 240,
        frameRate: 10
      };
    }
    
    if (deviceType === "mobile") {
      return {
        width: 640,
        height: 480,
        frameRate: 15
      };
    }
    
    if (deviceType === "tablet") {
      return {
        width: 960,
        height: 720,
        frameRate: 24
      };
    }
    
    return {
      width: 1280,
      height: 720,
      frameRate: 30
    };
  }, [deviceType, isLowPerformance]);
  
  return {
    isMobile: deviceType === "mobile",
    isTablet: deviceType === "tablet",
    isDesktop: deviceType === "desktop",
    isTouchDevice,
    isLowPerformance,
    prefersReducedMotion,
    deviceType,
    getOptimalMediaSize
  };
}