import React from 'react';

// Ornate Islamic floral arabesque corner ornament
export const CornerOrnament: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-16 h-16 pointer-events-none ${className}`}
  >
    <path
      d="M2 2C35 2 70 12 90 32C110 52 118 85 118 118"
      stroke="url(#goldGrad)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M2 14C28 14 56 22 74 40C92 58 106 86 106 118"
      stroke="url(#goldGrad)"
      strokeWidth="0.8"
      strokeDasharray="2 3"
    />
    <path
      d="M10 2C10 24 18 52 36 70C54 88 82 96 118 96"
      stroke="url(#goldGrad)"
      strokeWidth="0.8"
    />
    {/* Floral petal flourishes */}
    <circle cx="90" cy="32" r="3" fill="#D4AF37" />
    <circle cx="32" cy="90" r="3" fill="#D4AF37" />
    <circle cx="2" cy="2" r="2.5" fill="#D4AF37" />
    <path
      d="M2 2Q25 45 45 25Q45 2 2 2Z"
      fill="url(#goldGradSubtle)"
      stroke="url(#goldGrad)"
      strokeWidth="0.75"
    />
    <path
      d="M2 2Q45 25 25 45Q2 45 2 2Z"
      fill="url(#goldGradSubtle)"
      stroke="url(#goldGrad)"
      strokeWidth="0.75"
    />
    <path
      d="M45 45C55 35 70 35 75 45C70 55 55 55 45 45Z"
      fill="#D4AF37"
      opacity="0.6"
    />
    <defs>
      <linearGradient id="goldGrad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#B38728" />
        <stop offset="50%" stopColor="#FBF5B7" />
        <stop offset="100%" stopColor="#AA771C" />
      </linearGradient>
      <linearGradient id="goldGradSubtle" x1="0" y1="0" x2="60" y2="60" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#FBF5B7" stopOpacity="0.05" />
      </linearGradient>
    </defs>
  </svg>
);

// Tulip & Crescent Ottoman Floral Divider
export const FloralDivider: React.FC<{ className?: string; title?: string }> = ({ className = '', title }) => (
  <div className={`flex items-center justify-center gap-3 my-6 ${className}`}>
    <div className="h-[1px] flex-1 max-w-[90px] bg-gradient-to-r from-transparent via-[#D4AF37] to-[#B38728]" />
    
    <svg width="48" height="24" viewBox="0 0 48 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#C59B27]">
      {/* Central stylized Tulip (Lale motif) */}
      <path
        d="M24 3C22 8 20 13 24 20C28 13 26 8 24 3Z"
        fill="url(#laleGrad)"
        stroke="#AA771C"
        strokeWidth="0.7"
      />
      <path
        d="M20 7C17 10 17 14 20 17C21 15 21 10 20 7Z"
        fill="#DFBA52"
        opacity="0.85"
      />
      <path
        d="M28 7C31 10 31 14 28 17C27 15 27 10 28 7Z"
        fill="#DFBA52"
        opacity="0.85"
      />
      {/* Side delicate curls */}
      <path
        d="M14 14C11 11 8 13 6 12C4 11 2 13 2 13"
        stroke="#C59B27"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M34 14C37 11 40 13 42 12C44 11 46 13 46 13"
        stroke="#C59B27"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <circle cx="2" cy="13" r="1.5" fill="#AA771C" />
      <circle cx="46" cy="13" r="1.5" fill="#AA771C" />
      <defs>
        <linearGradient id="laleGrad" x1="20" y1="3" x2="28" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBF5B7" />
          <stop offset="60%" stopColor="#DAA520" />
          <stop offset="100%" stopColor="#9B7013" />
        </linearGradient>
      </defs>
    </svg>

    {title && (
      <span className="font-serif-title uppercase tracking-widest text-xs text-[#9B7013] font-semibold">
        {title}
      </span>
    )}

    <div className="h-[1px] flex-1 max-w-[90px] bg-gradient-to-l from-transparent via-[#D4AF37] to-[#B38728]" />
  </div>
);

// Floating Rose Petals & Golden Stardust Particle Generator
export const FloatingParticles: React.FC = () => {
  const petals = React.useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => ({
      id: i,
      left: `${(i * 7.5 + Math.random() * 5) % 96}%`,
      delay: `${(i * 1.3) % 10}s`,
      duration: `${11 + (i % 6) * 2}s`,
      size: 10 + (i % 4) * 4,
      isGold: i % 2 === 0,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-20">
      {petals.map((p) => (
        <div
          key={p.id}
          className="petal-particle"
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: `${p.size}px`,
            height: `${p.size * 1.4}px`,
          }}
        >
          {p.isGold ? (
            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-sm opacity-60">
              <path
                d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
                fill="url(#goldStarGrad)"
              />
              <defs>
                <linearGradient id="goldStarGrad" x1="2" y1="2" x2="22" y2="22">
                  <stop offset="0%" stopColor="#FBF5B7" />
                  <stop offset="100%" stopColor="#B38728" />
                </linearGradient>
              </defs>
            </svg>
          ) : (
            <svg viewBox="0 0 24 30" fill="none" className="w-full h-full opacity-70">
              <path
                d="M12 2C18 7 22 14 20 22C18 28 12 29 10 27C7 24 4 17 6 10C7 6 9 3 12 2Z"
                fill="url(#rosePetalGrad)"
              />
              <defs>
                <linearGradient id="rosePetalGrad" x1="6" y1="2" x2="20" y2="29">
                  <stop offset="0%" stopColor="#FCE7F3" />
                  <stop offset="50%" stopColor="#F472B6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#DB2777" stopOpacity="0.9" />
                </linearGradient>
              </defs>
            </svg>
          )}
        </div>
      ))}
    </div>
  );
};
