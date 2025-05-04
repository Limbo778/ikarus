import React, { useState, useEffect } from 'react';

interface WingsIconProps {
  color?: string;
  secondaryColor?: string;
  size?: number;
  className?: string;
  animate?: boolean;
  type?: 'gold' | 'silver' | 'gray';
}

export default function WingsIcon({
  color = "#8a2be2",
  secondaryColor = "#4a1d95",
  size = 48,
  className = "",
  animate = false,
  type = 'silver'
}: WingsIconProps) {
  // Устанавливаем статичное положение крыльев (средняя позиция = 1)
  const [flapPosition, setFlapPosition] = useState(1);
  
  // Эффект свечения для золотых крыльев вместо взмахов
  useEffect(() => {
    if (!animate || type !== 'gold') return;
    
    // Пульсация свечения для золотых крыльев
    const pulseInterval = setInterval(() => {
      // Медленная пульсация между значениями 1.8 и 2.2 для свечения
      const pulseFactor = 2 + Math.sin(Date.now() / 1000) * 0.2;
      // Обновляем только интенсивность свечения, без изменения положения крыльев
    }, 100);
    
    return () => {
      clearInterval(pulseInterval);
    };
  }, [animate, type]);
  
  // Calculate wing path based on flap position
  const getWingPath = (isLeft: boolean) => {
    // Base wing curve
    const baseWing = isLeft
      ? "M10,25 Q15,15 23,20 Q26,21 28,25"
      : "M40,25 Q35,15 27,20 Q24,21 22,25";
    
    // Flap modifications
    const flapMods = [
      // Down position
      { 
        left: "M10,28 Q18,22 23,25 Q26,27 28,28",
        right: "M40,28 Q32,22 27,25 Q24,27 22,28" 
      },
      // Middle position
      { 
        left: "M10,25 Q15,15 23,20 Q26,21 28,25",
        right: "M40,25 Q35,15 27,20 Q24,21 22,25" 
      },
      // Up position
      { 
        left: "M10,22 Q15,10 23,15 Q26,18 28,22",
        right: "M40,22 Q35,10 27,15 Q24,18 22,22" 
      }
    ];
    
    return animate ? flapMods[flapPosition][isLeft ? 'left' : 'right'] : baseWing;
  };
  
  // Colors based on type
  const getColors = () => {
    if (type === 'gold') {
      return {
        primary: 'url(#goldGradient)',
        secondary: 'url(#goldSecondaryGradient)',
        highlight: '#ffd700',
        lowlight: '#b8860b',
        glowIntensity: '2'  // Сильное свечение для золотых крыльев
      };
    } else if (type === 'gray') {
      return {
        primary: '#888888',
        secondary: '#555555',
        highlight: '#cccccc',
        lowlight: '#444444',
        glowIntensity: '0'  // Без свечения для серых крыльев
      };
    }
    
    return {
      primary: color,
      secondary: secondaryColor,
      highlight: '#e0b0ff',
      lowlight: '#4a1d95',
      glowIntensity: '1'  // Умеренное свечение для серебряных крыльев
    };
  };
  
  const colors = getColors();
  
  // Scale to desired size
  const scale = size / 50;
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 50 50" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ transform: `scale(${scale})` }}
    >
      <defs>
        <radialGradient id="goldGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="#ffd700" />
          <stop offset="80%" stopColor="#b8860b" />
          <stop offset="100%" stopColor="#8b6914" />
        </radialGradient>
        
        <radialGradient id="goldSecondaryGradient" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
          <stop offset="0%" stopColor="#ffd700" />
          <stop offset="70%" stopColor="#daa520" />
          <stop offset="100%" stopColor="#b8860b" />
        </radialGradient>
        
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={colors.glowIntensity} result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {/* Left Wing */}
      <g className={animate ? "animate-wing-left" : ""}>
        <path 
          d={getWingPath(true)} 
          stroke={colors.primary} 
          strokeWidth="2" 
          fill="none" 
          strokeLinecap="round"
          filter="url(#glow)"
        />
        <path 
          d={getWingPath(true)}
          stroke="transparent"
          strokeWidth="1" 
          fill={colors.secondary} 
          fillOpacity="0.3"
        />
        {/* Wing details */}
        <path 
          d="M12,25 Q14,20 18,22" 
          stroke={colors.highlight} 
          strokeWidth="0.5" 
          fill="none" 
          strokeLinecap="round"
          transform={`translate(0, ${flapPosition === 0 ? 3 : flapPosition === 2 ? -3 : 0})`}
        />
      </g>
      
      {/* Right Wing */}
      <g className={animate ? "animate-wing-right" : ""}>
        <path 
          d={getWingPath(false)} 
          stroke={colors.primary} 
          strokeWidth="2" 
          fill="none" 
          strokeLinecap="round"
          filter="url(#glow)"
        />
        <path 
          d={getWingPath(false)}
          stroke="transparent"
          strokeWidth="1" 
          fill={colors.secondary} 
          fillOpacity="0.3"
        />
        {/* Wing details */}
        <path 
          d="M38,25 Q36,20 32,22" 
          stroke={colors.highlight} 
          strokeWidth="0.5" 
          fill="none" 
          strokeLinecap="round"
          transform={`translate(0, ${flapPosition === 0 ? 3 : flapPosition === 2 ? -3 : 0})`}
        />
      </g>
      
      {/* Center circle for the badge/logo */}
      <circle cx="25" cy="25" r="5" fill="transparent" />
      
      {/* Убираем Sparkle effect для анимированных крыльев */}
    </svg>
  );
}