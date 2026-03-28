import React from 'react';

interface CarWashLogoProps {
  size?: number;
  className?: string;
}

const CarWashLogo: React.FC<CarWashLogoProps> = ({ size = 120, className = '' }) => {
  return (
    <div className={`car-wash-logo-container ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 0 30px rgba(56, 189, 248, 0.5))' }}
      >
        <defs>
          {/* Main gradient */}
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          
          {/* Shimmer gradient */}
          <linearGradient id="shimmerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              from="-1 0"
              to="1 0"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </linearGradient>

          {/* Bubble gradient */}
          <radialGradient id="bubbleGrad" cx="35%" cy="35%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
            <stop offset="40%" stopColor="rgba(186,230,253,0.4)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0.1)" />
          </radialGradient>

          {/* Water drop gradient */}
          <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          
          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background Circle */}
        <circle cx="100" cy="100" r="90" fill="url(#logoGrad)" opacity="0.15" />
        <circle cx="100" cy="100" r="90" fill="none" stroke="url(#logoGrad)" strokeWidth="2.5" opacity="0.6">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 100 100"
            to="360 100 100"
            dur="20s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Inner ring */}
        <circle cx="100" cy="100" r="78" fill="none" stroke="url(#logoGrad)" strokeWidth="1" opacity="0.3" strokeDasharray="8 4">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="360 100 100"
            to="0 100 100"
            dur="15s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Car body */}
        <g filter="url(#glow)">
          {/* Car body main */}
          <path
            d="M55 120 L60 100 Q65 85 80 80 L120 80 Q135 85 140 100 L145 120 Q145 130 135 130 L65 130 Q55 130 55 120Z"
            fill="url(#logoGrad)"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1"
          />
          {/* Car roof/window */}
          <path
            d="M72 100 L78 88 Q80 85 85 85 L115 85 Q120 85 122 88 L128 100 Z"
            fill="rgba(255,255,255,0.3)"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="0.5"
          />
          {/* Windshield reflection */}
          <path
            d="M76 97 L80 90 Q82 87 86 87 L100 87 L100 97 Z"
            fill="rgba(255,255,255,0.15)"
          />
          {/* Wheels */}
          <circle cx="78" cy="130" r="10" fill="#1e293b" stroke="url(#logoGrad)" strokeWidth="2" />
          <circle cx="78" cy="130" r="4" fill="rgba(255,255,255,0.3)" />
          <circle cx="122" cy="130" r="10" fill="#1e293b" stroke="url(#logoGrad)" strokeWidth="2" />
          <circle cx="122" cy="130" r="4" fill="rgba(255,255,255,0.3)" />
          {/* Headlight */}
          <ellipse cx="142" cy="112" rx="4" ry="3" fill="#fbbf24" opacity="0.8">
            <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
          </ellipse>
        </g>

        {/* Water drops around the car */}
        <g opacity="0.7">
          {/* Drop 1 */}
          <path d="M50 70 Q52 62 54 70 Q52 74 50 70Z" fill="url(#waterGrad)">
            <animateTransform attributeName="transform" type="translate" values="0,0;2,-8;0,0" dur="2s" repeatCount="indefinite" />
          </path>
          {/* Drop 2 */}
          <path d="M150 75 Q152 67 154 75 Q152 79 150 75Z" fill="url(#waterGrad)">
            <animateTransform attributeName="transform" type="translate" values="0,0;-2,-10;0,0" dur="2.5s" repeatCount="indefinite" />
          </path>
          {/* Drop 3 */}
          <path d="M100 55 Q102 47 104 55 Q102 59 100 55Z" fill="url(#waterGrad)">
            <animateTransform attributeName="transform" type="translate" values="0,0;0,-12;0,0" dur="1.8s" repeatCount="indefinite" />
          </path>
        </g>

        {/* Decorative bubbles around car */}
        {[
          { cx: 45, cy: 90, r: 6, dur: '3s', delay: '0s' },
          { cx: 155, cy: 85, r: 5, dur: '3.5s', delay: '0.5s' },
          { cx: 60, cy: 65, r: 4, dur: '2.8s', delay: '1s' },
          { cx: 140, cy: 60, r: 7, dur: '4s', delay: '0.3s' },
          { cx: 100, cy: 45, r: 5, dur: '3.2s', delay: '0.8s' },
          { cx: 165, cy: 110, r: 3, dur: '2.5s', delay: '1.2s' },
          { cx: 35, cy: 110, r: 4, dur: '3s', delay: '0.6s' },
        ].map((b, i) => (
          <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill="url(#bubbleGrad)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5">
            <animateTransform
              attributeName="transform"
              type="translate"
              values={`0,0;${Math.sin(i) * 4},${-6 - i * 1.5};0,0`}
              dur={b.dur}
              begin={b.delay}
              repeatCount="indefinite"
            />
            <animate attributeName="opacity" values="0.7;1;0.7" dur={b.dur} begin={b.delay} repeatCount="indefinite" />
          </circle>
        ))}

        {/* Sparkle effects */}
        {[
          { x: 70, y: 72 },
          { x: 130, y: 68 },
          { x: 100, y: 150 },
        ].map((s, i) => (
          <g key={`sparkle-${i}`} transform={`translate(${s.x}, ${s.y})`}>
            <line x1="-3" y1="0" x2="3" y2="0" stroke="white" strokeWidth="1.5" opacity="0.8">
              <animate attributeName="opacity" values="0;1;0" dur={`${1.5 + i * 0.5}s`} repeatCount="indefinite" />
            </line>
            <line x1="0" y1="-3" x2="0" y2="3" stroke="white" strokeWidth="1.5" opacity="0.8">
              <animate attributeName="opacity" values="0;1;0" dur={`${1.5 + i * 0.5}s`} repeatCount="indefinite" />
            </line>
          </g>
        ))}

        {/* Shimmer overlay */}
        <circle cx="100" cy="100" r="88" fill="url(#shimmerGrad)" opacity="0.3" />
      </svg>
    </div>
  );
};

export default CarWashLogo;
