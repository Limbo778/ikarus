import React, { useState, useEffect } from 'react';

interface ParticleProps {
  size?: number;
  color?: string;
  secondaryColor?: string;
  delay?: number;
  orbitSize?: number;
  excentricity?: number;
  duration?: number;
  pulseFrequency?: number;
  type?: 'cosmic' | 'eclipse' | 'stellar';
  className?: string;
}

export const OrbitingParticle: React.FC<ParticleProps> = ({
  size = 6,
  color = '#8A2BE2',
  secondaryColor,
  delay = 0,
  orbitSize = 100,
  excentricity = 0,
  duration = 12,
  pulseFrequency = 0,
  type = 'cosmic',
  className = ''
}) => {
  const [pulsing, setPulsing] = useState(false);

  // Эффект пульсации
  useEffect(() => {
    if (pulseFrequency > 0) {
      const interval = setInterval(() => {
        setPulsing(prev => !prev);
      }, pulseFrequency * 1000);
      
      return () => clearInterval(interval);
    }
  }, [pulseFrequency]);
  
  // Определяем свечение в зависимости от типа частицы
  let glowEffect = `0 0 ${size}px ${color}`;
  let particleSize = `${size}px`;
  let particleBg = color;
  
  if (type === 'eclipse') {
    // Эффект частиц солнечной короны
    glowEffect = `0 0 ${size * 3}px ${color}, 0 0 ${size * 1.5}px ${secondaryColor || 'rgba(255, 215, 0, 0.8)'}`;
    particleBg = 'transparent';
    particleSize = `${size * 1.2}px`;
  } else if (type === 'stellar') {
    // Эффект звездной частицы
    glowEffect = `0 0 ${size * 2}px ${color}, 0 0 ${size}px rgba(255, 255, 255, 0.8)`;
  }
  
  // Добавляем эллиптическую орбиту через модификацию transform
  const ellipticalTransform = excentricity > 0 
    ? `translateX(${orbitSize}px) scaleY(${1 - excentricity})`
    : `translateX(${orbitSize}px)`;
  
  // Определяем только базовые стили без свойств анимации
  const baseStyle = {
    width: particleSize,
    height: particleSize,
    backgroundColor: particleBg,
    borderRadius: '50%',
    position: 'absolute' as const,
    boxShadow: pulsing ? `0 0 ${size * 2}px ${color}` : glowEffect,
    transform: ellipticalTransform,
    opacity: pulsing ? 0.9 : 0.7,
    border: type === 'eclipse' ? `${Math.max(1, size/4)}px solid ${color}` : 'none',
    transition: 'box-shadow 0.3s ease',
  };
  
  // Все анимации полностью удалены, включая пульсацию
  const animationClass = '';
  
  // Используем только базовые стили без анимации
  const animationStyle = baseStyle;
  
  // Для типа "eclipse" добавляем внутреннюю раскаленную область
  const coreStyle = type === 'eclipse' ? {
    position: 'absolute' as const,
    width: `${size * 0.6}px`,
    height: `${size * 0.6}px`,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%',
    background: secondaryColor || 'rgba(255, 180, 0, 0.9)',
    filter: `blur(${Math.max(1, size / 8)}px)`,
    boxShadow: `0 0 ${size/2}px ${secondaryColor || 'rgba(255, 215, 0, 0.5)'}`,
  } : undefined;

  const customProperties = {
    '--delay': `${delay}s`,
    '--duration': `${duration}s`
  } as React.CSSProperties;

  return (
    <div 
      style={{...animationStyle, ...customProperties}} 
      className={`${animationClass} ${className}`}
    >
      {type === 'eclipse' && <div style={coreStyle} />}
    </div>
  );
};

interface OrbitingParticlesProps {
  count?: number;
  centerX?: number;
  centerY?: number;
  maxSize?: number;
  type?: 'cosmic' | 'eclipse' | 'mixed';
  className?: string;
}

export const OrbitingParticles: React.FC<OrbitingParticlesProps> = ({
  count = 5,
  centerX = 50,
  centerY = 50,
  maxSize = 8,
  type = 'cosmic',
  className = ''
}) => {
  const particles = Array.from({ length: count }).map((_, i) => {
    const size = Math.max(2, Math.floor(Math.random() * maxSize));
    const delay = Math.random() * 5;
    const duration = 8 + Math.random() * 12;
    const orbitSize = 20 + Math.random() * 40;
    const excentricity = Math.random() * 0.3; // Эллиптические орбиты
    const pulseFrequency = Math.random() > 0.7 ? 2 + Math.random() * 3 : 0; // 30% частиц пульсируют
    
    // Выбираем тип и цвет частицы в зависимости от переданного type
    let particleType: 'cosmic' | 'eclipse' | 'stellar';
    let color: string;
    let secondaryColor: string | undefined;
    
    if (type === 'eclipse') {
      // Для затмения - преимущественно золотистые/оранжевые цвета (солнечные)
      particleType = 'eclipse';
      
      // Цвета солнечной короны
      const hue = 30 + Math.floor(Math.random() * 30); // от золотистого до оранжевого
      color = `rgba(255, ${150 + Math.floor(Math.random() * 50)}, ${Math.floor(Math.random() * 100)}, ${0.6 + Math.random() * 0.4})`;
      secondaryColor = `rgba(255, ${200 + Math.floor(Math.random() * 55)}, ${50 + Math.floor(Math.random() * 50)}, 0.8)`;
    } else if (type === 'mixed') {
      // Смешанный тип - сочетание космических и солнечных частиц
      if (Math.random() > 0.6) {
        particleType = 'eclipse';
        const hue = 30 + Math.floor(Math.random() * 30);
        color = `rgba(255, ${150 + Math.floor(Math.random() * 50)}, ${Math.floor(Math.random() * 100)}, ${0.6 + Math.random() * 0.4})`;
        secondaryColor = `rgba(255, ${200 + Math.floor(Math.random() * 55)}, ${50 + Math.floor(Math.random() * 50)}, 0.8)`;
      } else if (Math.random() > 0.3) {
        particleType = 'cosmic';
        color = `rgba(138, 43, 226, ${0.5 + Math.random() * 0.5})`;
      } else {
        particleType = 'stellar';
        // Звездные частицы могут быть разных цветов
        const starTypes = [
          `rgba(255, 255, 255, ${0.7 + Math.random() * 0.3})`, // белые звезды
          `rgba(200, 200, 255, ${0.7 + Math.random() * 0.3})`, // голубоватые звезды
          `rgba(255, 200, 150, ${0.7 + Math.random() * 0.3})`, // желтоватые звезды
          `rgba(255, 150, 150, ${0.7 + Math.random() * 0.3})`, // красноватые звезды
        ];
        color = starTypes[Math.floor(Math.random() * starTypes.length)];
      }
    } else {
      // Космический тип - фиолетовые оттенки
      particleType = Math.random() > 0.2 ? 'cosmic' : 'stellar';
      
      if (particleType === 'cosmic') {
        color = `rgba(138, 43, 226, ${0.5 + Math.random() * 0.5})`;
      } else {
        // Звездные частицы
        const starTypes = [
          `rgba(255, 255, 255, ${0.7 + Math.random() * 0.3})`,
          `rgba(200, 200, 255, ${0.7 + Math.random() * 0.3})`,
        ];
        color = starTypes[Math.floor(Math.random() * starTypes.length)];
      }
    }
    
    const style = {
      top: `${centerY}%`,
      left: `${centerX}%`,
      transform: `rotate(${Math.random() * 360}deg)`, // Случайный угол орбиты для каждой частицы
    };
    
    return (
      <div key={i} style={style} className="absolute">
        <OrbitingParticle
          size={size}
          color={color}
          secondaryColor={secondaryColor}
          delay={delay}
          orbitSize={orbitSize}
          excentricity={excentricity}
          duration={duration}
          pulseFrequency={pulseFrequency}
          type={particleType}
        />
      </div>
    );
  });

  return (
    <div className={`relative w-full h-full ${className}`}>
      {particles}
    </div>
  );
};

export default OrbitingParticles;