import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Mail, Lock, ArrowRight, Loader2, Droplets, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import LoginTransition from '../components/LoginTransition';

// Generate floating bubble data
const BUBBLES = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  size: 20 + Math.random() * 60,
  left: Math.random() * 100,
  duration: 6 + Math.random() * 8,
  delay: Math.random() * 10,
  driftX: -40 + Math.random() * 80,
  driftEnd: -30 + Math.random() * 60,
}));

const POP_BUBBLES = [
  { id: 0, size: 18, left: 5,  top: 10, duration: 4,   delay: 1 },
  { id: 1, size: 25, left: 88, top: 8,  duration: 3.5, delay: 4 },
  { id: 2, size: 15, left: 8,  top: 75, duration: 5,   delay: 7 },
  { id: 3, size: 22, left: 92, top: 70, duration: 3.8, delay: 10 },
  { id: 4, size: 20, left: 15, top: 45, duration: 4.5, delay: 13 },
  { id: 5, size: 16, left: 85, top: 40, duration: 3.2, delay: 16 },
  { id: 6, size: 28, left: 3,  top: 30, duration: 4.2, delay: 19 },
  { id: 7, size: 14, left: 95, top: 25, duration: 3.6, delay: 22 },
  { id: 8, size: 20, left: 10, top: 88, duration: 4.8, delay: 25 },
  { id: 9, size: 17, left: 90, top: 90, duration: 3.4, delay: 28 },
];

// Generate stable ambient particles
const PARTICLES = Array.from({ length: 20 }, (_, i) => {
  const yAnim = -30 - Math.random() * 50;
  const xAnim = Math.random() * 20 - 10;
  return {
    id: i,
    size: 2 + Math.random() * 3,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    background: `rgba(${56 + Math.random() * 100}, ${189 + Math.random() * 60}, 248, ${0.3 + Math.random() * 0.4})`,
    yAnimArray: [0, yAnim, 0],
    xAnimArray: [0, xAnim, 0],
    opacityArray: [0.2, 0.8, 0.2],
    transition: {
      duration: 4 + Math.random() * 6,
      repeat: Infinity,
      delay: Math.random() * 5,
      ease: 'easeInOut',
    }
  };
});

export default function Login() {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTransition, setShowTransition] = useState(false);

  const handleTransitionComplete = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      setError(error);
      setLoading(false);
    } else {
      setShowTransition(true);
    }
  };

  return (
    <>
      <LoginTransition isActive={showTransition} onComplete={handleTransitionComplete} />

      <div className="login-bg min-h-screen flex flex-col justify-center items-center p-4 font-primary relative overflow-hidden">

        {/* Animated wave layers at bottom */}
        <div className="wave-layer" style={{ bottom: 0, height: '30%', zIndex: 1 }}>
          <svg viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ width: '100%', height: '100%', animation: 'wave-move 6s ease-in-out infinite' }}>
            <defs>
              <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(6,182,212,0.15)" />
                <stop offset="50%" stopColor="rgba(59,130,246,0.2)" />
                <stop offset="100%" stopColor="rgba(139,92,246,0.15)" />
              </linearGradient>
            </defs>
            <path fill="url(#waveGrad1)" d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,170.7C960,160,1056,192,1152,213.3C1248,235,1344,245,1392,250.7L1440,256L1440,320L0,320Z" />
          </svg>
        </div>
        <div className="wave-layer" style={{ bottom: 0, height: '25%', zIndex: 2 }}>
          <svg viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ width: '100%', height: '100%', animation: 'wave-move-reverse 8s ease-in-out infinite' }}>
            <defs>
              <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(56,189,248,0.1)" />
                <stop offset="50%" stopColor="rgba(6,182,212,0.15)" />
                <stop offset="100%" stopColor="rgba(59,130,246,0.1)" />
              </linearGradient>
            </defs>
            <path fill="url(#waveGrad2)" d="M0,256L48,240C96,224,192,192,288,186.7C384,181,480,203,576,218.7C672,235,768,245,864,234.7C960,224,1056,192,1152,176C1248,160,1344,160,1392,160L1440,160L1440,320L0,320Z" />
          </svg>
        </div>

        {/* Floating soap bubbles */}
        {BUBBLES.map((b) => (
          <div
            key={b.id}
            className="login-bubble"
            style={{
              width: b.size,
              height: b.size,
              left: `${b.left}%`,
              bottom: '-10%',
              '--duration': `${b.duration}s`,
              '--delay': `${b.delay}s`,
              '--drift-x': `${b.driftX}px`,
              '--drift-end': `${b.driftEnd}px`,
              zIndex: 3,
            } as React.CSSProperties}
          />
        ))}

        {/* Popping bubbles — discrete, one at a time */}
        {POP_BUBBLES.map((b) => (
          <div
            key={`pop-${b.id}`}
            className="pop-bubble"
            style={{
              width: b.size,
              height: b.size,
              left: `${b.left}%`,
              top: `${b.top}%`,
              '--pop-duration': `${b.duration}s`,
              '--pop-delay': `${b.delay}s`,
              zIndex: 3,
            } as React.CSSProperties}
          />
        ))}

        {/* Ambient particles */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
          {PARTICLES.map((p) => (
            <motion.div
              key={`particle-${p.id}`}
              className="absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                left: p.left,
                top: p.top,
                background: p.background,
              }}
              animate={{
                y: p.yAnimArray,
                x: p.xAnimArray,
                opacity: p.opacityArray,
              }}
              transition={p.transition}
            />
          ))}
        </div>

        {/* Main content */}
        <div className="relative z-10 w-full max-w-md entrance-scale">

          {/* White Logo — Clean car icon */}
          <motion.div
            className="flex flex-col items-center mb-8"
            initial={{ opacity: 0, y: -30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              className="flex items-center justify-center w-24 h-24 rounded-3xl shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)',
                boxShadow: '0 20px 50px rgba(37, 99, 235, 0.5), 0 0 40px rgba(56, 189, 248, 0.2)',
              }}
              animate={{
                boxShadow: [
                  '0 20px 50px rgba(37, 99, 235, 0.5), 0 0 40px rgba(56, 189, 248, 0.2)',
                  '0 20px 60px rgba(37, 99, 235, 0.6), 0 0 60px rgba(56, 189, 248, 0.35)',
                  '0 20px 50px rgba(37, 99, 235, 0.5), 0 0 40px rgba(56, 189, 248, 0.2)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Car className="w-12 h-12 text-white" strokeWidth={2} />
            </motion.div>

            <motion.h1
              className="text-3xl font-extrabold text-white mt-5 tracking-tight"
              style={{ textShadow: '0 0 30px rgba(56,189,248,0.5), 0 2px 10px rgba(0,0,0,0.3)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              FluxoAmigo
            </motion.h1>
            <motion.div
              className="flex items-center gap-2 mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <Droplets className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-cyan-400/90 uppercase tracking-[0.3em]">
                Lava Auto
              </span>
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </motion.div>
          </motion.div>

          {/* Login Card */}
          <motion.div
            className="login-card-3d relative rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4), 0 0 40px rgba(56,189,248,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="water-sheen" />

            <div className="p-8 relative z-10">
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-white">Bem-vindo de volta</h2>
                <p className="text-cyan-200/60 text-sm mt-1">Acesse o painel do seu lava-jato</p>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className={`mb-4 p-3 rounded-xl text-sm font-medium ${
                      error.includes('Conta criada')
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-cyan-100/80">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400/50 w-5 h-5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@fluxoamigo.com"
                      className="input-glow w-full pl-11 pr-4 py-3.5 rounded-xl outline-none transition-all text-white placeholder-white/30 text-sm font-medium"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                      required
                    />
                  </div>
                </div>



                <div className="space-y-2">
                  <label className="text-sm font-semibold text-cyan-100/80">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400/50 w-5 h-5" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input-glow w-full pl-11 pr-4 py-3.5 rounded-xl outline-none transition-all text-white placeholder-white/30 text-sm font-medium"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  className="shimmer-btn w-full py-3.5 px-4 rounded-xl font-bold transition-all flex items-center justify-center group mt-2 cursor-pointer text-white disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
                    boxShadow: '0 10px 30px rgba(59,130,246,0.3), 0 0 0 1px rgba(255,255,255,0.1) inset',
                  }}
                  whileHover={{ scale: 1.02, boxShadow: '0 15px 40px rgba(59,130,246,0.4)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Droplets className="w-5 h-5 mr-2 opacity-80" />
                      Entrar no Sistema
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </motion.button>
              </form>


            </div>
          </motion.div>

          <motion.p
            className="text-center text-white/20 text-xs mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            © 2026 FluxoAmigo · Gestão inteligente para lava-jatos
          </motion.p>
        </div>
      </div>
    </>
  );
}
