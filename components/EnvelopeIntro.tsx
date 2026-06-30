'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { weddingConfig } from '@/lib/config';

interface EnvelopeIntroProps {
  onComplete: () => void;
  onStartExit?: () => void;
}

type AnimState = 'FRONT' | 'FLIPPING' | 'BACK_CLOSED' | 'OPENING' | 'OPENED' | 'EXITING';

export default function EnvelopeIntro({ onComplete, onStartExit }: EnvelopeIntroProps) {
  const [showPre, setShowPre] = useState(true);
  const [state, setState] = useState<AnimState>('FRONT');
  const [showBackAssets, setShowBackAssets] = useState(false);

  const assets = {
    front: 'https://res.cloudinary.com/djqtkbyez/image/upload/v1782138241/envelope_vzvnkc.webp',
    backClosed: 'https://res.cloudinary.com/djqtkbyez/image/upload/v1782138240/envelope_3_x1vucq.webp',
    base: 'https://res.cloudinary.com/djqtkbyez/image/upload/v1782138238/4072.portrait.back_liqheu.webp',
    flapClosed: 'https://res.cloudinary.com/djqtkbyez/image/upload/v1782138240/envelope_4_gxzbpf.webp',
    flapOpen: 'https://res.cloudinary.com/djqtkbyez/image/upload/v1782138411/flapopen.webp',
    cardBg: 'https://res.cloudinary.com/djqtkbyez/image/upload/v1777711072/texturapapel-limoncello-scaled_cgfzov.jpg'
  };

  useEffect(() => {
    // Only start the flip animation after the user interacts with the pre-screen
    if (showPre) return;
    const startTimer = setTimeout(() => {
      if (state === 'FRONT') setState('FLIPPING');
    }, 800);
    return () => clearTimeout(startTimer);
  }, [showPre, state]);

  useEffect(() => {
    if (state === 'FLIPPING') {
      const timer = setTimeout(() => setShowBackAssets(true), 400);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <AnimatePresence>
      {state !== 'EXITING' && (
        <motion.div
          key="intro-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden select-none"
        >
          {/* Mobile Background */}
          <div
            className="absolute -inset-y-16 inset-x-0 z-[-1] md:hidden"
            style={{
              backgroundImage: 'url("https://res.cloudinary.com/djqtkbyez/image/upload/v1782379379/An%CC%83adir_un_ti%CC%81tulo_11_ymomd0.png")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: '#faf8f3',
            }}
          />

          {/* Desktop Background */}
          <div
            className="absolute inset-0 z-[-1] hidden md:block"
            style={{
              backgroundImage: 'url("https://res.cloudinary.com/djqtkbyez/image/upload/v1782377623/Disen%CC%83o_sin_ti%CC%81tulo_9_yb1wm6.png")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: '#faf8f3',
            }}
          />

          {/* Pre-screen: shown before the envelope animation starts */}
          <AnimatePresence>
            {showPre && (
              <motion.div
                key="pre-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 z-[60] flex flex-col items-center justify-center cursor-pointer"
                onClick={() => setShowPre(false)}
              >
                {/* Floating envelope image */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative mb-8 w-[180px] md:w-[220px] aspect-[4/3]"
                >
                  <Image
                    src={assets.backClosed}
                    alt="Sobre"
                    fill
                    className="object-contain"
                    priority
                    referrerPolicy="no-referrer"
                  />
                </motion.div>

                <p className="font-serif text-accent text-2xl md:text-3xl italic mb-1">
                  Tenés una carta
                </p>
                <p className="font-sans text-secondary text-[11px] uppercase tracking-[0.35em] mb-10">
                  de {weddingConfig.shortNames}
                </p>

                <motion.button
                  type="button"
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="px-8 py-3 rounded-full bg-primary text-bg-light font-sans text-xs uppercase tracking-[0.25em] shadow-lg hover:bg-primary/90 transition-colors"
                >
                  Abrir invitación
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Envelope (hidden behind pre-screen, shown after click) */}
          <AnimatePresence>
            {!showPre && (
              <motion.div
                key="envelope"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative w-[88vw] max-w-[430px] aspect-[4/3] flex items-center justify-center perspective-[1500px] translate-y-[4vh] md:translate-y-[5vh]"
              >
                <motion.div
                  className="relative w-full h-full preserve-3d"
                  animate={state !== 'FRONT' ? { rotateY: 180 } : { rotateY: 0 }}
                  transition={{ duration: 1.5, ease: [0.33, 1, 0.68, 1] }}
                  onAnimationComplete={() => {
                    if (state === 'FLIPPING') {
                      setTimeout(() => setState('OPENING'), 700);
                    }
                  }}
                >
                  {/* --- FACE A: FRONT --- */}
                  <div className="absolute inset-0 z-50 backface-hidden shadow-2xl rounded-sm overflow-hidden">
                    <Image src={assets.front} alt="Sobre Frontal" fill className="object-cover" priority referrerPolicy="no-referrer" />
                  </div>

                  {/* --- FACE B: BACK --- */}
                  <div
                    className="absolute inset-0 z-40 overflow-visible"
                    style={{ transform: 'rotateY(180deg)' }}
                  >
                    {/* 1. Envelope Back Base */}
                    <div className="absolute inset-x-0 bottom-0 h-full z-10">
                      <Image src={assets.base} alt="Base" fill className="object-contain" referrerPolicy="no-referrer" />
                    </div>

                    {/* 2. Open Flap Layer */}
                    {(state === 'OPENING' || state === 'OPENED') && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-x-0 bottom-full h-full z-[12] pointer-events-none"
                      >
                        <Image src={assets.flapOpen} alt="Flap Abierta" fill className="object-contain object-bottom" referrerPolicy="no-referrer" />
                      </motion.div>
                    )}

                    {/* 3. The Card */}
                    <motion.div
                      className="absolute inset-x-0 top-[15%] h-[230px] md:h-[260px] rounded-sm shadow-xl flex flex-col items-center justify-center p-8 text-center"
                      style={{ backgroundImage: `url(${assets.cardBg})`, backgroundSize: 'cover', zIndex: 20 }}
                      initial={{ y: -18, opacity: 0 }}
                      animate={
                        state === 'OPENED'
                          ? { y: '-140px', opacity: 1, zIndex: 20 }
                          : state === 'OPENING'
                            ? { y: '0', opacity: 1, zIndex: 20 }
                            : { y: '0', opacity: 0, zIndex: 20 }
                      }
                      transition={{ y: { duration: 1.5, ease: [0.33, 1, 0.68, 1], delay: 0.30 } }}
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={state === 'OPENED' ? { opacity: 1, y: 0 } : {}}
                        transition={{ delay: 0.30, duration: 0.1 }}
                        className="relative z-50 flex flex-col items-center pointer-events-auto"
                      >
                        <p className="font-serif text-accent text-lg mb-2 italic">Estás invitado/a al casamiento de</p>
                        <h2 className="font-serif text-2xl md:text-3xl text-accent mb-6 leading-tight font-light italic">
                          {weddingConfig.shortNames}
                        </h2>
                        <div className="h-px w-10 bg-primary/20 mb-5" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setState('EXITING');
                            if (onStartExit) onStartExit();
                            setTimeout(onComplete, 1000);
                          }}
                          className="relative z-[999] pointer-events-auto px-6 py-2 bg-primary text-white font-sans tracking-[0.2em] text-[9px] uppercase rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95"
                        >
                          Ver Invitación
                        </button>
                      </motion.div>
                    </motion.div>

                    {/* 4. Front Pocket */}
                    <div className="absolute inset-0 z-30 pointer-events-none">
                      <Image src={assets.base} alt="Pocket" fill className="object-contain" style={{ clipPath: 'inset(0% 0 0 0)' }} referrerPolicy="no-referrer" />
                    </div>

                    {/* 5. The Rotating Flap */}
                    <div className="absolute inset-0 z-40 overflow-visible origin-top pointer-events-none">
                      {(state === 'FLIPPING' || state === 'OPENING') && (
                        <motion.div
                          className="absolute inset-0"
                          initial={{ opacity: 1 }}
                          animate={state === 'OPENING' ? { opacity: 0 } : { opacity: 1 }}
                          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                          onAnimationComplete={() => {
                            if (state === 'OPENING') setState('OPENED');
                          }}
                        >
                          <Image src={assets.backClosed} alt="Dorso Cerrado" fill className="object-contain" referrerPolicy="no-referrer" />
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
