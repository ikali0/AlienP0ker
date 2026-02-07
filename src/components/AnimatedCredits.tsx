import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Coins } from 'lucide-react';

interface AnimatedCreditsProps {
  value: number;
  className?: string;
}

export function AnimatedCredits({ value, className }: AnimatedCreditsProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const [changeAmount, setChangeAmount] = useState(0);
  const previousValue = useRef(value);

  useEffect(() => {
    if (value === previousValue.current) return;
    
    const diff = value - previousValue.current;
    setChangeAmount(diff);
    setIsAnimating(true);
    
    const startValue = previousValue.current;
    const endValue = value;
    const duration = 600;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const currentValue = Math.round(startValue + (endValue - startValue) * easeOutQuart);
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        previousValue.current = value;
      }
    };
    
    requestAnimationFrame(animate);
    
    // Hide change indicator after animation
    const timeout = setTimeout(() => {
      setChangeAmount(0);
    }, 1500);
    
    return () => clearTimeout(timeout);
  }, [value]);

  return (
    <div className={cn('relative flex items-center gap-2', className)}>
      <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-casino-gold" />
      
      <div className="relative">
        <span 
          className={cn(
            'text-lg sm:text-2xl font-bold text-casino-gold tabular-nums transition-transform',
            isAnimating && changeAmount > 0 && 'animate-credits-pop'
          )}
        >
          {displayValue.toLocaleString()}
        </span>
        
        {/* Floating change indicator */}
        {changeAmount !== 0 && (
          <span 
            className={cn(
              'absolute -top-4 sm:-top-5 left-0 text-xs sm:text-sm font-bold animate-float-up',
              changeAmount > 0 ? 'text-accent' : 'text-destructive'
            )}
          >
            {changeAmount > 0 ? '+' : ''}{changeAmount}
          </span>
        )}
      </div>
      
      {/* Sparkle effect on increase */}
      {isAnimating && changeAmount > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(4)].map((_, i) => (
            <span
              key={i}
              className="absolute animate-sparkle"
              style={{
                left: `${20 + i * 20}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 100}ms`,
              }}
            >
              ✨
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
