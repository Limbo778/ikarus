import React, { useState, useEffect } from 'react';
import WingsIcon from './icons/WingsIcon';

type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

interface LogoProps {
  size?: LogoSize;
  withText?: boolean;
  className?: string;
  type?: 'full' | 'icon';
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  withText = true, 
  className = '',
  type = 'full'
}) => {
  // Анимация затмения всегда активна (без задержки)
  const animate = true;
  
  // Map of sizes for the logo
  const sizeMap: Record<LogoSize, { icon: number, text: string }> = {
    'sm': { icon: 32, text: 'text-xl' },
    'md': { icon: 48, text: 'text-2xl' },
    'lg': { icon: 64, text: 'text-3xl' },
    'xl': { icon: 96, text: 'text-4xl' }
  };
  
  const { icon: iconSize, text: textSize } = sizeMap[size];
  
  return (
    <div className={`flex items-center ${className}`}>
      <div className={`relative ${animate ? 'animate-glow' : ''}`}>
        {/* Крылья */}
        <WingsIcon 
          size={iconSize} 
          color="rgba(138, 43, 226, 0.8)" 
          secondaryColor="rgba(138, 43, 226, 0.4)" 
          animate 
          type="gold"
        />
        
        {/* Солнечное затмение */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Солнце (задний фон) */}
          <div className={`w-3/5 h-3/5 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 
                         shadow-lg shadow-amber-500/50 transition-all duration-1000 ${animate ? 'animate-pulse-slow' : ''}`} />
          
          {/* Луна (затмевает солнце) */}
          <div className={`absolute w-[57%] h-[57%] rounded-full bg-gradient-to-br from-slate-800 to-slate-900 
                          shadow-inner shadow-purple-800/30 transition-all duration-1000
                          ${animate ? 'translate-x-[8%] translate-y-[8%]' : ''}`} />
          
          {/* Кольцо света вокруг затмения */}
          <div className={`absolute w-[70%] h-[70%] rounded-full bg-transparent border-2 border-amber-400/50
                         filter blur-[1px] animate-pulse-slow`} />
          
          {/* Свечение по краям затмения */}
          <div className={`absolute w-[70%] h-[70%] rounded-full bg-transparent 
                         shadow-[0_0_15px_5px_rgba(255,191,0,0.3)] animate-pulse-slow opacity-70`} />
        </div>
      </div>
      
      {withText && (
        <span className={`font-bold ${textSize} ml-3 cosmic-text`} data-text="Ikarus">
          Ikarus
        </span>
      )}
    </div>
  );
};