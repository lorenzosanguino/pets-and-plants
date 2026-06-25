import React from 'react';

export const ConfettiOverlay: React.FC = () => {
  const [particles] = React.useState(() => {
    const particleCount = 45;
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 1.5}s`,
      duration: `${2 + Math.random() * 2}s`,
      rotation: `${Math.random() * 360}deg`,
      color: ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#009688', '#4caf50', '#ffeb3b', '#ff9800'][Math.floor(Math.random() * 10)],
      shape: Math.random() > 0.5 ? 'circle' : 'square',
      scale: 0.4 + Math.random() * 0.8,
    }));
  });

  return (
    <div className="confetti-celebration-container">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`confetti-particle shape-${p.shape}`}
          style={{
            left: p.left,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
            transform: `scale(${p.scale}) rotate(${p.rotation})`,
          }}
        />
      ))}
      <style>{`
        .confetti-celebration-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 9999999;
          overflow: hidden;
        }

        .confetti-particle {
          position: absolute;
          top: -20px;
          width: 10px;
          height: 10px;
          opacity: 0;
          animation: confettiFall linear forwards;
          will-change: transform, opacity;
        }

        .confetti-particle.shape-circle {
          border-radius: 50%;
        }

        @keyframes confettiFall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
