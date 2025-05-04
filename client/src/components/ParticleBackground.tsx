import React, { useEffect, useRef } from 'react';

interface ParticleBackgroundProps {
  particleCount?: number;
  density?: number; // Альтернативный способ задать количество частиц
  particleColor?: string;
  particleSize?: number;
  backgroundColor?: string;
  linkDistance?: number;
  linkWidth?: number;
  linkColor?: string;
  speed?: number;
  className?: string;
}

const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  particleCount = 50,
  density,
  particleColor = 'rgba(138, 43, 226, 0.6)',
  particleSize = 1.5,
  backgroundColor = 'transparent',
  linkDistance = 120,
  linkWidth = 0.5,
  linkColor = 'rgba(138, 43, 226, 0.15)',
  speed = 0.5,
  className = '',
}) => {
  // Если задан density, используем его вместо particleCount
  const actualParticleCount = density !== undefined ? density : particleCount;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<any[]>([]);
  const animationFrameId = useRef<number | null>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Resize handler
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };
    
    // Initialize particles
    const initParticles = () => {
      particles.current = [];
      for (let i = 0; i < actualParticleCount; i++) {
        particles.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * speed,
          vy: (Math.random() - 0.5) * speed,
          size: Math.random() * particleSize + particleSize / 2,
          color: particleColor,
        });
      }
    };
    
    // Animation loop
    const animate = () => {
      // Очищаем весь холст перед каждым кадром (убираем следы от движения частиц)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw particles
      particles.current.forEach((p, i) => {
        // Update position
        p.x += p.vx;
        p.y += p.vy;
        
        // Bounce off edges
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        
        // Draw links
        particles.current.forEach((p2, j) => {
          if (i === j) return;
          
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < linkDistance) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = linkColor;
            ctx.lineWidth = linkWidth * (1 - distance / linkDistance);
            ctx.stroke();
          }
        });
      });
      
      animationFrameId.current = requestAnimationFrame(animate);
    };
    
    // Set up
    window.addEventListener('resize', handleResize);
    handleResize();
    animate();
    
    // Clean up
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [actualParticleCount, particleColor, particleSize, backgroundColor, linkDistance, linkWidth, linkColor, speed]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className={`fixed top-0 left-0 w-full h-full -z-10 ${className}`}
    />
  );
};

export default ParticleBackground;