import React, { useState, useRef } from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  is3D?: boolean;
  accentGlow?: string;
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  onClick,
  is3D = true,
  accentGlow,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  const [glare, setGlare] = useState<{ x: number; y: number; opacity: number }>({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!is3D || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Smooth tilt limit: max 8.5 degrees
    const rotateX = ((y - centerY) / centerY) * -8.5;
    const rotateY = ((x - centerX) / centerX) * 8.5;

    setTransform(
      `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(8px) scale3d(1.02, 1.02, 1.02)`
    );
    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.18,
    });
  };

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)');
    setGlare({ x: 50, y: 50, opacity: 0 });
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: is3D ? transform : undefined,
        transformStyle: is3D ? 'preserve-3d' : undefined,
        transition: is3D ? 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms ease' : 'all 200ms ease',
      }}
      className={`relative overflow-hidden cursor-pointer select-none ${className}`}
    >
      {/* 3D Specular Light Sheen */}
      {is3D && (
        <div
          className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 180px at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}), transparent 80%)`,
          }}
        />
      )}

      {/* Subtle 3D Edge Bevel / Glow */}
      {is3D && accentGlow && (
        <div
          className="pointer-events-none absolute -inset-px rounded-inherit opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
          style={{
            boxShadow: `0 0 20px -3px ${accentGlow}`,
          }}
        />
      )}

      <div style={{ transform: is3D ? 'translateZ(18px)' : undefined, transformStyle: is3D ? 'preserve-3d' : undefined }}>
        {children}
      </div>
    </div>
  );
};
