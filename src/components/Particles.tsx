import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  velocity: { x: number; y: number };
  rotation: number;
  rotationSpeed: number;
  shape: 'circle' | 'square' | 'star';
}

interface ParticlesProps {
  trigger: boolean;
  type?: 'win' | 'bust';
}

const COLORS = {
  win: ['#FFD700', '#FFA500', '#FF6B35', '#FFE66D', '#F7DC6F', '#FFFFFF'],
  bust: ['#FF4444', '#FF6666', '#CC0000', '#990000', '#FF0000'],
};

export function Particles({ trigger, type = 'win' }: ParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (trigger) {
      const colors = COLORS[type];
      const newParticles: Particle[] = [];
      const particleCount = type === 'win' ? 60 : 30;
      
      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
        const speed = 3 + Math.random() * 5;
        
        newParticles.push({
          id: i,
          x: 50,
          y: 50,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 4 + Math.random() * 8,
          velocity: {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed - 2,
          },
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 20,
          shape: ['circle', 'square', 'star'][Math.floor(Math.random() * 3)] as Particle['shape'],
        });
      }
      
      setParticles(newParticles);
      setIsActive(true);
      
      // Animate particles
      let frame = 0;
      const maxFrames = 60;
      
      const animate = () => {
        frame++;
        if (frame >= maxFrames) {
          setIsActive(false);
          setParticles([]);
          return;
        }
        
        setParticles(prev => prev.map(p => ({
          ...p,
          x: p.x + p.velocity.x * 0.5,
          y: p.y + p.velocity.y * 0.5,
          velocity: {
            x: p.velocity.x * 0.96,
            y: p.velocity.y * 0.96 + 0.15, // gravity
          },
          rotation: p.rotation + p.rotationSpeed,
          size: p.size * (1 - frame / maxFrames * 0.5),
        })));
        
        requestAnimationFrame(animate);
      };
      
      requestAnimationFrame(animate);
    }
  }, [trigger, type]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            transform: `translate(-50%, -50%) rotate(${particle.rotation}deg)`,
          }}
        >
          {particle.shape === 'circle' && (
            <div
              className="rounded-full"
              style={{
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                boxShadow: `0 0 ${particle.size}px ${particle.color}`,
              }}
            />
          )}
          {particle.shape === 'square' && (
            <div
              style={{
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                boxShadow: `0 0 ${particle.size}px ${particle.color}`,
              }}
            />
          )}
          {particle.shape === 'star' && (
            <svg
              width={particle.size * 1.5}
              height={particle.size * 1.5}
              viewBox="0 0 24 24"
              fill={particle.color}
              style={{
                filter: `drop-shadow(0 0 ${particle.size / 2}px ${particle.color})`,
              }}
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}
