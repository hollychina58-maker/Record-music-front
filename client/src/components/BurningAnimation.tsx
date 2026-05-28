import { useRef, useEffect, useCallback } from 'react';
import './BurningAnimation.css';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface BurningAnimationProps {
  isBurning: boolean;
  duration?: number;
  onComplete?: () => void;
}

const COLORS = ['#e85a2c', '#f5a623', '#c43c26', '#ff6b35', '#ffb347'];
const PARTICLE_COUNT = 80;
const GRAVITY = 0.08;

export function BurningAnimation({
  isBurning,
  duration = 3000,
  onComplete,
}: BurningAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const createParticle = useCallback((canvas: HTMLCanvasElement): Particle => {
    const colors = COLORS;
    return {
      x: canvas.width / 2 + (Math.random() - 0.5) * 60,
      y: canvas.height * 0.7,
      vx: (Math.random() - 0.5) * 3,
      vy: -Math.random() * 4 - 2,
      life: 1,
      maxLife: Math.random() * 0.02 + 0.01,
      size: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  }, []);

  const updateParticles = useCallback((canvas: HTMLCanvasElement): boolean => {
    const particles = particlesRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return false;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Create new particles
    if (particles.length < PARTICLE_COUNT) {
      for (let i = 0; i < 3; i++) {
        particles.push(createParticle(canvas));
      }
    }

    // Update and draw existing particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      p.x += p.vx;
      p.y += p.vy;
      p.vy += GRAVITY;
      p.life -= p.maxLife;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      // Draw particle with fading effect
      ctx.save();
      ctx.globalAlpha = p.life * 0.8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    return particles.length > 0;
  }, [createParticle]);

  useEffect(() => {
    if (!isBurning) {
      particlesRef.current = [];
      cancelAnimationFrame(animationRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    startTimeRef.current = performance.now();
    particlesRef.current = [];

    const animate = (time: number) => {
      const elapsed = time - startTimeRef.current;

      if (elapsed >= duration) {
        onComplete?.();
        return;
      }

      const hasParticles = updateParticles(canvas);
      if (hasParticles) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isBurning, duration, onComplete, updateParticles]);

  return (
    <div className={`ink-burning ${isBurning ? 'ink-burning--active' : ''}`}>
      <canvas
        ref={canvasRef}
        className="ink-burning__canvas"
        width={200}
        height={300}
      />
      {isBurning && (
        <div className="ink-burning__paper">
          <div className="ink-burning__edge" />
        </div>
      )}
    </div>
  );
}
