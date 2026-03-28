import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import osDevsLogo from '../assets/osdevs-logo.jpeg';

interface LoginTransitionProps {
  isActive: boolean;
  onComplete: () => void;
}

const LoginTransition: React.FC<LoginTransitionProps> = ({ isActive, onComplete }) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!isActive) return;

    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 700);
    const t3 = setTimeout(() => setPhase(3), 1400);
    const t4 = setTimeout(() => onComplete(), 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isActive, onComplete]);

  const transitionBubbles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 10 + Math.random() * 50,
    delay: Math.random() * 0.6,
  }));

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-[9999] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Dark base */}
          <motion.div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #0c1929 0%, #0a2540 50%, #0c1929 100%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />

          {/* Water jet sweep */}
          {phase >= 1 && (
            <motion.div
              className="absolute inset-0"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
            >
              <div
                className="absolute inset-y-0 w-full"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.05) 20%, rgba(56,189,248,0.3) 40%, rgba(255,255,255,0.6) 50%, rgba(56,189,248,0.3) 60%, rgba(56,189,248,0.05) 80%, transparent 100%)',
                }}
              />
            </motion.div>
          )}

          {/* Bubble burst */}
          {phase >= 2 &&
            transitionBubbles.map((bubble) => (
              <motion.div
                key={bubble.id}
                className="absolute rounded-full"
                style={{
                  left: `${bubble.x}%`,
                  top: `${bubble.y}%`,
                  width: bubble.size,
                  height: bubble.size,
                  background:
                    'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), rgba(186,230,253,0.3), rgba(56,189,248,0.1))',
                  border: '1px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 0 15px rgba(56,189,248,0.2)',
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.2, 0.9, 0], opacity: [0, 0.9, 0.7, 0] }}
                transition={{ duration: 0.8, delay: bubble.delay, ease: 'easeOut' }}
              />
            ))}

          {/* Central logo */}
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <motion.div
              initial={{ scale: 0, rotateY: -180 }}
              animate={
                phase >= 3
                  ? { scale: [1.2, 2], rotateY: 0, opacity: [1, 0] }
                  : { scale: [0, 1.2, 1], rotateY: 0 }
              }
              transition={{ duration: phase >= 3 ? 0.6 : 0.8, ease: 'easeOut' }}
              style={{ perspective: 800, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {/* ── Glow layers ── */}

              {/* Rotating aurora conic ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  inset: -28,
                  borderRadius: '50%',
                  background:
                    'conic-gradient(from 0deg, rgba(56,189,248,0), rgba(56,189,248,0.8), rgba(96,165,250,1), rgba(139,92,246,0.7), rgba(56,189,248,0))',
                  filter: 'blur(12px)',
                  zIndex: 0,
                }}
              />

              {/* Soft ambient radial glow */}
              <div
                style={{
                  position: 'absolute',
                  inset: -20,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(56,189,248,0.6) 0%, rgba(96,165,250,0.3) 45%, transparent 70%)',
                  filter: 'blur(18px)',
                  zIndex: 0,
                }}
              />

              {/* Pulse ring A */}
              <motion.div
                animate={{ scale: [1, 1.55, 1], opacity: [0.75, 0, 0.75] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  inset: -4,
                  borderRadius: '28px',
                  border: '2.5px solid rgba(56,189,248,0.75)',
                  zIndex: 0,
                }}
              />

              {/* Pulse ring B (delayed) */}
              <motion.div
                animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }}
                style={{
                  position: 'absolute',
                  inset: -4,
                  borderRadius: '28px',
                  border: '2px solid rgba(96,165,250,0.5)',
                  zIndex: 0,
                }}
              />

              {/* ── Logo Image ── */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: 170,
                  height: 170,
                  borderRadius: '26px',
                  overflow: 'hidden',
                  boxShadow:
                    '0 0 0 2px rgba(255,255,255,0.12), 0 0 40px rgba(56,189,248,0.55), 0 0 90px rgba(56,189,248,0.2)',
                }}
              >
                <img
                  src={osDevsLogo}
                  alt="Os Devs"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </motion.div>

            {/* Text below logo */}
            <motion.div
              className="mt-8 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <motion.p
                className="text-xl font-bold text-white/90 tracking-wide"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  textShadow: '0 0 20px rgba(56,189,248,0.5)',
                }}
                animate={phase >= 3 ? { opacity: 0, y: -10 } : {}}
                transition={{ duration: 0.3 }}
              >
                Preparando seu painel...
              </motion.p>

              <motion.div
                className="mt-3 flex items-center justify-center gap-1.5"
                initial={{ opacity: 0 }}
                animate={phase >= 2 ? { opacity: 1 } : {}}
                transition={{ delay: 0.4 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-cyan-400"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </motion.div>
            </motion.div>
          </div>

          {/* Water streaks */}
          {phase >= 1 &&
            Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={`streak-${i}`}
                className="absolute"
                style={{
                  top: `${10 + i * 12}%`,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: `linear-gradient(90deg, transparent, rgba(56,189,248,${0.1 + Math.random() * 0.3}), transparent)`,
                }}
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: [0, 1, 0] }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeInOut' }}
              />
            ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoginTransition;
