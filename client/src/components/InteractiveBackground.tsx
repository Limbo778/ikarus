import React, { useEffect, useRef, useState } from 'react';

interface InteractiveBackgroundProps {
  className?: string;
}

interface Star {
  x: number;
  y: number;
  size: number;
  color: string;
  pulse: number;
  pulseSpeed: number;
  speedX: number;
  speedY: number;
  glow: number;
}

interface Nebula {
  x: number;
  y: number;
  radius: number;
  color: string;
  opacity: number;
  pulse: number;
  pulseSpeed: number;
}

interface CoronaRay {
  angle: number;
  length: number;
  width: number;
  opacity: number;
  pulse: number;
  pulseSpeed: number;
}

const InteractiveBackground: React.FC<InteractiveBackgroundProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animationFrameId = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Элементы фона
  const stars = useRef<Star[]>([]);
  const nebulae = useRef<Nebula[]>([]);
  const coronaRays = useRef<CoronaRay[]>([]);
  const eclipsePosition = useRef<{x: number, y: number, size: number}>({x: 0, y: 0, size: 0});
  const time = useRef<number>(0);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Обработчик движения мыши
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mousePosition.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };
    
    // Обработчик изменения размеров окна
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Инициализируем при первой загрузке
      if (!isInitialized) {
        // Позиция затмения - сразу видима на экране (в правой части)
        eclipsePosition.current = {
          x: canvas.width * 0.75, 
          y: canvas.height * 0.3, 
          size: Math.min(canvas.width, canvas.height) * 0.15
        };
        initBackground();
        setIsInitialized(true);
      }
    };
    
    // Инициализация всех элементов фона
    const initBackground = () => {
      initStars();
      initNebulae();
      initCoronaRays();
    };
    
    // Инициализация звезд
    const initStars = () => {
      const starCount = Math.floor((canvas.width * canvas.height) / 8000); // Увеличенная плотность
      stars.current = [];
      
      for (let i = 0; i < starCount; i++) {
        const size = Math.random() * 2.5 + 0.5;
        
        // Создаем градиент от фиолетовых до золотистых оттенков
        let hue, saturation, lightness;
        
        if (Math.random() > 0.8) {
          // Золотистые/янтарные звезды (реже)
          hue = 30 + Math.random() * 40; // от золотистого до янтарного
          saturation = 70 + Math.random() * 30;
          lightness = 60 + Math.random() * 30;
        } else {
          // Фиолетовые/синие звезды (чаще)
          hue = 260 + Math.random() * 60; // От фиолетового до синего
          saturation = 60 + Math.random() * 40;
          lightness = 40 + Math.random() * 50;
        }
        
        stars.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size,
          color: `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.6 + Math.random() * 0.4})`,
          pulse: Math.random() * Math.PI * 2, // Случайная начальная фаза
          pulseSpeed: 0.005 + Math.random() * 0.02,
          speedX: (Math.random() - 0.5) * 0.1, // Небольшое движение по X
          speedY: (Math.random() - 0.5) * 0.1, // Небольшое движение по Y
          glow: 2 + Math.random() * 4 // Сила свечения
        });
      }
    };
    
    // Инициализация туманностей
    const initNebulae = () => {
      const nebulaCount = 3 + Math.floor(Math.random() * 4); // От 3 до 6 туманностей
      nebulae.current = [];
      
      for (let i = 0; i < nebulaCount; i++) {
        // Цвета туманностей
        let hue;
        if (Math.random() > 0.5) {
          hue = 260 + Math.random() * 60; // Фиолетовые/синие
        } else {
          hue = 20 + Math.random() * 40; // Золотистые/оранжевые
        }
        
        nebulae.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: canvas.width * (0.1 + Math.random() * 0.2), // 10-30% от ширины экрана
          color: `hsla(${hue}, 70%, 50%, 0.05)`,
          opacity: 0.03 + Math.random() * 0.06,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: 0.0005 + Math.random() * 0.001
        });
      }
    };
    
    // Инициализация лучей короны затмения
    const initCoronaRays = () => {
      coronaRays.current = [];
      const rayCount = 12 + Math.floor(Math.random() * 8); // От 12 до 20 лучей
      
      for (let i = 0; i < rayCount; i++) {
        coronaRays.current.push({
          angle: (2 * Math.PI * i) / rayCount,
          length: 1 + Math.random() * 1.5, // Длина относительно размера затмения
          width: 0.03 + Math.random() * 0.1, // Ширина луча
          opacity: 0.3 + Math.random() * 0.5,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: 0.001 + Math.random() * 0.003
        });
      }
    };
    
    // Анимация
    const animate = () => {
      time.current += 0.01;
      
      // Полная очистка холста без эффекта следа
      ctx.fillStyle = 'rgba(10, 0, 16, 1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Отключена анимация затмения, оно остается на фиксированной позиции
      // Затмение теперь сразу видно в правой части экрана
      
      // Рисуем туманности
      drawNebulae(ctx);
      
      // Рисуем звезды
      drawStars(ctx);
      
      // Рисуем затмение
      drawEclipse(ctx);
      
      animationFrameId.current = requestAnimationFrame(animate);
    };
    
    // Рисование звезд
    const drawStars = (ctx: CanvasRenderingContext2D) => {
      stars.current.forEach(star => {
        // Обновляем пульсацию
        star.pulse += star.pulseSpeed;
        if (star.pulse > Math.PI * 2) star.pulse = 0;
        
        // Обновляем положение звезды
        star.x += star.speedX;
        star.y += star.speedY;
        
        // Возвращаем звезды на холст, если они вышли за его пределы
        if (star.x < 0) star.x = canvas.width;
        if (star.x > canvas.width) star.x = 0;
        if (star.y < 0) star.y = canvas.height;
        if (star.y > canvas.height) star.y = 0;
        
        // Рассчитываем расстояние от курсора для интерактивного эффекта
        const dx = star.x - mousePosition.current.x;
        const dy = star.y - mousePosition.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 200;
        
        // Эффект пульсации размера
        const basePulse = (Math.sin(star.pulse) + 1) * 0.5; // от 0 до 1
        let sizeMultiplier = 1 + basePulse * 0.7; // от 1 до 1.7
        
        // Эффект от близости к мыши
        if (distance < maxDistance) {
          const proximity = 1 - distance / maxDistance;
          sizeMultiplier += proximity * 2; // Увеличенный размер возле мыши
          
          // Небольшое отталкивание от мыши
          const angle = Math.atan2(dy, dx);
          const force = proximity * 0.3;
          star.x += Math.cos(angle) * force;
          star.y += Math.sin(angle) * force;
        }
        
        // Эффект от близости к затмению
        const dxEclipse = star.x - eclipsePosition.current.x;
        const dyEclipse = star.y - eclipsePosition.current.y;
        const distanceEclipse = Math.sqrt(dxEclipse * dxEclipse + dyEclipse * dyEclipse);
        const eclipseInfluenceRadius = eclipsePosition.current.size * 5;
        
        if (distanceEclipse < eclipseInfluenceRadius) {
          const eclipseProximity = 1 - distanceEclipse / eclipseInfluenceRadius;
          
          // Звезды стремятся к затмению
          const angleToEclipse = Math.atan2(dyEclipse, dxEclipse);
          const gravityForce = eclipseProximity * 0.2;
          star.x -= Math.cos(angleToEclipse) * gravityForce;
          star.y -= Math.sin(angleToEclipse) * gravityForce;
          
          // Звезды ярче возле затмения
          sizeMultiplier += eclipseProximity * 1.5;
        }
        
        // Рисуем звезду
        const drawSize = star.size * sizeMultiplier;
        
        // Эффект свечения
        const gradient = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, drawSize * star.glow
        );
        gradient.addColorStop(0, star.color);
        gradient.addColorStop(1, 'rgba(138, 43, 226, 0)');
        
        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(star.x, star.y, drawSize * star.glow, 0, Math.PI * 2);
        ctx.fill();
        
        // Ядро звезды
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.arc(star.x, star.y, drawSize / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Блики на больших звездах
        if (star.size > 1.5) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 0.5;
          
          // Крестообразный блик
          const blinkSize = drawSize * 2;
          ctx.moveTo(star.x - blinkSize, star.y);
          ctx.lineTo(star.x + blinkSize, star.y);
          ctx.moveTo(star.x, star.y - blinkSize);
          ctx.lineTo(star.x, star.y + blinkSize);
          ctx.stroke();
        }
      });
    };
    
    // Рисование туманностей
    const drawNebulae = (ctx: CanvasRenderingContext2D) => {
      nebulae.current.forEach(nebula => {
        // Обновляем пульсацию
        nebula.pulse += nebula.pulseSpeed;
        if (nebula.pulse > Math.PI * 2) nebula.pulse = 0;
        
        const pulseFactor = 1 + (Math.sin(nebula.pulse) * 0.2);
        const currentRadius = nebula.radius * pulseFactor;
        const currentOpacity = nebula.opacity * (0.8 + Math.sin(nebula.pulse) * 0.2);
        
        // Создаем градиент для туманности
        const gradient = ctx.createRadialGradient(
          nebula.x, nebula.y, 0,
          nebula.x, nebula.y, currentRadius
        );
        
        const color = nebula.color.replace('0.05', currentOpacity.toString());
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, color.replace('0.05', (currentOpacity * 0.5).toString()));
        gradient.addColorStop(1, 'rgba(10, 0, 16, 0)');
        
        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(nebula.x, nebula.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
      });
    };
    
    // Рисование солнечного затмения
    const drawEclipse = (ctx: CanvasRenderingContext2D) => {
      const { x, y, size } = eclipsePosition.current;
      
      // Если затмение не видно, не рисуем его
      if (x > canvas.width * 1.2) return;
      
      // Рисуем лучи короны (за затмением)
      drawCoronaRays(ctx, x, y, size);
      
      // Солнце (внешний ореол)
      const sunGradient = ctx.createRadialGradient(
        x, y, size * 0.5,
        x, y, size * 2.5
      );
      sunGradient.addColorStop(0, 'rgba(255, 200, 64, 0.8)');
      sunGradient.addColorStop(0.2, 'rgba(255, 160, 0, 0.3)');
      sunGradient.addColorStop(0.5, 'rgba(255, 120, 0, 0.1)');
      sunGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
      
      ctx.beginPath();
      ctx.fillStyle = sunGradient;
      ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Солнце (яркая часть)
      const innerSunGradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, size
      );
      innerSunGradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
      innerSunGradient.addColorStop(0.7, 'rgba(255, 200, 64, 1)');
      innerSunGradient.addColorStop(1, 'rgba(255, 140, 0, 1)');
      
      ctx.beginPath();
      ctx.fillStyle = innerSunGradient;
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Пульсирующий фактор для луны
      const moonPulse = Math.sin(time.current * 0.5) * 0.01;
      
      // Луна (затмевающая солнце)
      const offsetX = Math.sin(time.current * 0.2) * size * 0.1;
      const offsetY = Math.cos(time.current * 0.15) * size * 0.05;
      
      const moonX = x + offsetX;
      const moonY = y + offsetY;
      const moonSize = size * (0.95 + moonPulse);
      
      // Градиент для луны
      const moonGradient = ctx.createRadialGradient(
        moonX, moonY, 0,
        moonX, moonY, moonSize
      );
      moonGradient.addColorStop(0, 'rgba(30, 30, 50, 1)');
      moonGradient.addColorStop(0.7, 'rgba(20, 20, 40, 1)');
      moonGradient.addColorStop(1, 'rgba(10, 10, 30, 1)');
      
      ctx.beginPath();
      ctx.fillStyle = moonGradient;
      ctx.arc(moonX, moonY, moonSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Тонкое кольцо света по краю затмения
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonSize * 1.02, 0, Math.PI * 2);
      ctx.lineWidth = size * 0.01;
      ctx.strokeStyle = 'rgba(255, 220, 100, 0.8)';
      ctx.stroke();
      
      // Свечение по краям затмения (эффект алмазного кольца)
      const ringGlow = ctx.createRadialGradient(
        moonX, moonY, moonSize * 0.9,
        moonX, moonY, moonSize * 1.1
      );
      ringGlow.addColorStop(0, 'rgba(255, 200, 100, 0)');
      ringGlow.addColorStop(0.8, 'rgba(255, 200, 100, 0.2)');
      ringGlow.addColorStop(0.9, 'rgba(255, 220, 150, 0.5)');
      ringGlow.addColorStop(1, 'rgba(255, 220, 150, 0)');
      
      ctx.beginPath();
      ctx.fillStyle = ringGlow;
      ctx.arc(moonX, moonY, moonSize * 1.1, 0, Math.PI * 2);
      ctx.fill();
      
      // Яркие блики (эффект бриллиантового кольца) - появляется случайно
      if (Math.random() > 0.95) {
        const angle = Math.random() * Math.PI * 2;
        const blinkX = moonX + Math.cos(angle) * moonSize;
        const blinkY = moonY + Math.sin(angle) * moonSize;
        const blinkSize = size * (0.05 + Math.random() * 0.15);
        
        const blinkGradient = ctx.createRadialGradient(
          blinkX, blinkY, 0,
          blinkX, blinkY, blinkSize * 3
        );
        blinkGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        blinkGradient.addColorStop(0.3, 'rgba(255, 255, 150, 0.7)');
        blinkGradient.addColorStop(1, 'rgba(255, 200, 50, 0)');
        
        ctx.beginPath();
        ctx.fillStyle = blinkGradient;
        ctx.arc(blinkX, blinkY, blinkSize * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    
    // Рисуем лучи короны солнечного затмения
    const drawCoronaRays = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      coronaRays.current.forEach(ray => {
        // Обновляем пульсацию
        ray.pulse += ray.pulseSpeed;
        if (ray.pulse > Math.PI * 2) ray.pulse = 0;
        
        const pulseFactor = 1 + (Math.sin(ray.pulse) * 0.3);
        const rayLength = size * ray.length * pulseFactor;
        const rayWidth = size * ray.width * (0.8 + Math.sin(ray.pulse) * 0.2);
        const currentOpacity = ray.opacity * (0.7 + Math.sin(ray.pulse) * 0.3);
        
        // Конечные координаты луча
        const endX = x + Math.cos(ray.angle + time.current * 0.01) * (rayLength * 3);
        const endY = y + Math.sin(ray.angle + time.current * 0.01) * (rayLength * 3);
        
        // Создаем градиент для луча
        const gradient = ctx.createLinearGradient(x, y, endX, endY);
        gradient.addColorStop(0, `rgba(255, 200, 100, ${currentOpacity})`);
        gradient.addColorStop(0.3, `rgba(255, 150, 50, ${currentOpacity * 0.7})`);
        gradient.addColorStop(1, `rgba(255, 100, 0, 0)`);
        
        // Рисуем луч как линию с градиентом
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.lineWidth = rayWidth;
        ctx.strokeStyle = gradient;
        ctx.lineCap = 'round';
        ctx.stroke();
      });
    };
    
    // Настройка
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    handleResize();
    animate();
    
    // Очистка
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [isInitialized]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className={`fixed top-0 left-0 w-full h-full -z-10 ${className}`} 
    />
  );
};

export default InteractiveBackground;