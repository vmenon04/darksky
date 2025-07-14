import React, { useMemo } from 'react';

export const StarsBackground: React.FC = () => {
  const stars = useMemo(() => 
    Array.from({ length: 100 }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      animationDelay: Math.random() * 2,
      size: Math.random() * 2 + 1,
    })), []
  );

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute bg-white rounded-full animate-twinkle"
          style={{
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: `${star.animationDelay}s`,
          }}
        />
      ))}
    </div>
  );
};
