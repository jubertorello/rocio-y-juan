'use client';

/**
 * Animación de apertura del sobre.
 *
 * Secuencia lineal con `async/await` sobre `Animation.finished` (Web Animations
 * API): cada paso espera al anterior y toda la secuencia se puede cancelar.
 *
 * TRUCO DE LA SOLAPA: no es un elemento 3D de dos caras. Son dos imágenes
 * distintas — la exterior gira de 0° a 90° y se oculta; la interior aparece a
 * 89° y baja hasta 0°. Así se evitan los fallos de `backface-visibility` y el
 * parpadeo entre navegadores.
 *
 * Curvas: `ease-in` cuando algo va HACIA 90° (se esconde) y `ease-out` cuando
 * vuelve DESDE 90° (aparece).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { weddingConfig } from '@/lib/config';

interface EnvelopeIntroProps {
  onComplete: () => void;
  onStartExit?: () => void;
}

const assets = {
  /** Frente del sobre, cerrado y visto de cara. 840 × 600. */
  front: 'https://res.cloudinary.com/scihumn2/image/upload/v1789748038/rocio-y-juan/envelope_vzvnkc.webp',
  /** Dorso con la solapa cerrada y el lacre. Solo para la pantalla previa. */
  backClosed: 'https://res.cloudinary.com/scihumn2/image/upload/v1789748035/rocio-y-juan/envelope_3_x1vucq.webp',
  /**
   * Bolsillo con el escote recortado en transparente: va por DELANTE de la
   * tarjeta, así que el papel se ve por el escote mientras sale. 840 × 600.
   */
  pocket: 'https://res.cloudinary.com/scihumn2/image/upload/v1789748034/rocio-y-juan/4072.portrait.back_liqheu.webp',
  /** Solapa cerrada, cara exterior con el lacre. Gira de 0° a 90°. 840 × 549. */
  flapClosed: 'https://res.cloudinary.com/scihumn2/image/upload/v1789748037/rocio-y-juan/envelope_4_gxzbpf.webp',
  /** Solapa abierta, forro de rayas. Aparece a 89° y baja a 0°. 840 × 549. */
  flapOpen: 'https://res.cloudinary.com/scihumn2/image/upload/v1789748039/rocio-y-juan/flapopen.webp',
  /** Textura del papel de la tarjeta que sale del sobre. */
  cardBg: 'https://res.cloudinary.com/scihumn2/image/upload/v1789748012/rocio-y-juan/texturapapel-limoncello-scaled_cgfzov.jpg',
  mobileBg: 'https://res.cloudinary.com/scihumn2/image/upload/v1789748048/rocio-y-juan/Anadir_un_titulo_11_ymomd0.png',
  desktopBg: 'https://res.cloudinary.com/scihumn2/image/upload/v1789748046/rocio-y-juan/Diseno_sin_titulo_9_yb1wm6.png',
};

/** Color del papel del sobre, muestreado de la lámina del bolsillo. */
const ENVELOPE_PAPER = '#6B7554';

/** Proporciones reales de las láminas, para que las capas encajen. */
const ENVELOPE_RATIO = 840 / 600;
const FLAP_RATIO = 549 / 840;

/** Alto de cada solapa en % del alto del sobre, derivado de las imágenes. */
const FLAP_H = FLAP_RATIO * ENVELOPE_RATIO * 100;

/**
 * La salida de la tarjeta tiene dos tiempos, en fracción de su propio alto:
 * primero sube hasta quedar del todo fuera del bolsillo (`CARD_OUT`, algo más
 * que su altura: así ni las esquinas de abajo quedan tapadas), y solo entonces
 * pasa por delante del sobre y baja a su sitio (`CARD_RISE`). El cambio de capa
 * ocurre justo cuando ya no se solapan, así que no se ve.
 */
const CARD_OUT = 1.07;
const CARD_RISE = 0.72;
/** Escala en reposo: la tarjeta queda un punto más cerca del que mira. */
const CARD_SCALE = 1.04;

/** 1 es el ritmo normal; 0.8 lo acelera, 1.2 lo hace más lento. */
const TIME_SCALE = 1;

const ANNOUNCEMENTS = {
  flipping: 'El sobre gira para mostrar el dorso',
  flapOpening: 'Se abre la solapa del sobre',
  cardOut: 'Sale la tarjeta de la invitación',
  done: 'Invitación abierta',
};

export default function EnvelopeIntro({ onComplete, onStartExit }: EnvelopeIntroProps) {
  const [showPre, setShowPre] = useState(true);
  const [opened, setOpened] = useState(false);
  /** `true` cuando la tarjeta ya está fuera y pasa por delante del sobre. */
  const [delante, setDelante] = useState(false);
  const [exiting, setExiting] = useState(false);

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const flapClosedRef = useRef<HTMLDivElement>(null);
  const flapOpenRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);

  /** Animaciones vivas, para poder cancelarlas al desmontar. */
  const running = useRef<Animation[]>([]);
  const cancelled = useRef(false);

  const announce = useCallback((mensaje: string) => {
    if (liveRef.current) liveRef.current.textContent = mensaje;
  }, []);

  /**
   * Lanza una animación y devuelve su promesa. Pone `will-change` solo
   * mientras dura y lo quita al terminar, para no dejar capas promovidas.
   */
  const run = useCallback(
    (el: HTMLElement | null, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      if (!el) return Promise.resolve();
      el.style.willChange = 'transform, opacity';
      const anim = el.animate(keyframes, { fill: 'forwards', ...options });
      running.current.push(anim);
      return anim.finished
        .catch(() => {
          /* cancelada: no es un error */
        })
        .finally(() => {
          el.style.willChange = '';
          running.current = running.current.filter((a) => a !== anim);
        });
    },
    []
  );

  const wait = useCallback((ms: number) => new Promise((r) => setTimeout(r, ms)), []);

  /** Estado final: lo que se ve si se reduce el movimiento. */
  const applyFinalState = useCallback(() => {
    const set = (el: HTMLElement | null, styles: Partial<CSSStyleDeclaration>) => {
      if (el) Object.assign(el.style, styles);
    };
    set(frontRef.current, { visibility: 'hidden' });
    set(backRef.current, { visibility: 'visible', transform: 'none', filter: 'none' });
    set(flapClosedRef.current, { visibility: 'hidden' });
    set(flapOpenRef.current, { visibility: 'visible', transform: 'rotateX(0deg)', opacity: '1' });
    set(cardRef.current, {
      transform: `translateY(-${CARD_RISE * 100}%) scale(${CARD_SCALE})`,
      opacity: '1',
    });
    setDelante(true);
    setOpened(true);
    announce(ANNOUNCEMENTS.done);
  }, [announce]);

  // Cancela todo si el componente se desmonta a mitad de la secuencia.
  useEffect(() => {
    const vivas = running;
    return () => {
      cancelled.current = true;
      vivas.current.forEach((a) => a.cancel());
    };
  }, []);

  useEffect(() => {
    if (showPre) return;

    // React vuelve a montar el componente en modo estricto, y la limpieza del
    // montaje anterior deja la bandera levantada: hay que bajarla al arrancar.
    cancelled.current = false;

    const secuencia = async () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const t = reduce ? 0 : TIME_SCALE;

      // Nada arranca hasta que las imágenes estén decodificadas: si no, el
      // primer fotograma llega con capas a medio pintar.
      await Promise.all(
        [assets.front, assets.pocket, assets.flapClosed, assets.flapOpen].map(async (src) => {
          const img = new window.Image();
          img.src = src;
          try {
            await img.decode();
          } catch {
            /* si una imagen falla, seguimos igualmente */
          }
        })
      );
      if (cancelled.current) return;

      if (reduce) {
        applyFinalState();
        return;
      }

      await wait(500 * t);
      if (cancelled.current) return;

      // 1. Giro del sobre — dos imágenes, nunca las dos visibles a la vez.
      announce(ANNOUNCEMENTS.flipping);
      await run(
        frontRef.current,
        [
          { transform: 'rotateY(0deg)', filter: 'brightness(1)' },
          { transform: 'rotateY(90deg)', filter: 'brightness(0.6)' },
        ],
        { duration: 875 * t, easing: 'ease-in' }
      );
      if (cancelled.current) return;

      if (frontRef.current) frontRef.current.style.visibility = 'hidden';
      if (backRef.current) backRef.current.style.visibility = 'visible';

      await run(
        backRef.current,
        [
          { transform: 'rotateY(-89deg)', filter: 'brightness(0.6)' },
          { transform: 'rotateY(0deg)', filter: 'brightness(1)' },
        ],
        { duration: 875 * t, easing: 'ease-out' }
      );
      if (cancelled.current) return;

      if (backRef.current) {
        backRef.current.style.boxShadow = '20px 60px 60px rgba(0, 0, 0, 0.2)';
      }

      // 2. Solapa exterior: gira hasta ponerse de canto y desaparece.
      await wait(500 * t);
      if (cancelled.current) return;
      announce(ANNOUNCEMENTS.flapOpening);

      await run(
        flapClosedRef.current,
        [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(90deg)' }],
        { duration: 625 * t, easing: 'ease-in' }
      );
      if (cancelled.current) return;

      // 3. Solapa interior: entra de canto y se tumba hacia arriba.
      if (flapClosedRef.current) flapClosedRef.current.style.visibility = 'hidden';
      if (flapOpenRef.current) flapOpenRef.current.style.visibility = 'visible';

      const solapaAbriendo = run(
        flapOpenRef.current,
        [{ transform: 'rotateX(89deg)' }, { transform: 'rotateX(0deg)' }],
        { duration: 625 * t, easing: 'ease-out' }
      );

      // 4. Sale la tarjeta. Arranca cuando a la solapa le queda el último
      //    tramo: los dos movimientos se solapan y no se nota el corte.
      await wait(505 * t);
      if (cancelled.current) return;

      //    El alto se mide ahora, no antes: si la ventana cambió de tamaño
      //    por el camino, la medida de antes ya no valdría.
      announce(ANNOUNCEMENTS.cardOut);
      const alto = cardRef.current?.offsetHeight ?? 0;
      const fuera = Math.round(alto * CARD_OUT);
      const reposo = Math.round(alto * CARD_RISE);

      //    4a. Sube hasta salir del todo. Tres tiempos: se despega despacio,
      //    como si rozara con el sobre, coge velocidad y frena al final.
      await run(
        cardRef.current,
        [
          { transform: 'translateY(0px) scale(1)', easing: 'cubic-bezier(0.32, 0, 0.67, 0.28)' },
          {
            transform: `translateY(-${Math.round(fuera * 0.06)}px) scale(1)`,
            offset: 0.18,
            easing: 'cubic-bezier(0.25, 0.55, 0.25, 1)',
          },
          { transform: `translateY(-${fuera}px) scale(1)`, offset: 1 },
        ],
        { duration: 1600 * t }
      );
      if (cancelled.current) return;

      await solapaAbriendo;

      //    4b. Ya está entera fuera: nada se solapa con el sobre, así que
      //    ahora el cambio de capa no se ve. Y desde aquí se acerca al que
      //    mira y baja a su sitio, por delante del sobre.
      setDelante(true);
      await wait(140 * t);
      if (cancelled.current) return;

      await run(
        cardRef.current,
        [
          { transform: `translateY(-${fuera}px) scale(1)` },
          { transform: `translateY(-${reposo}px) scale(${CARD_SCALE})`, offset: 1 },
        ],
        { duration: 900 * t, easing: 'cubic-bezier(0.34, 0.6, 0.24, 1)' }
      );
      if (cancelled.current) return;

      //    Un respiro antes de dar por abierta la invitación: sin él, el
      //    cambio de estado pisaba el final del movimiento.
      await wait(240 * t);
      if (cancelled.current) return;

      setOpened(true);
      announce(ANNOUNCEMENTS.done);
    };

    secuencia();
  }, [showPre, announce, applyFinalState, run, wait]);

  const salir = () => {
    // El overlay se funde mientras la invitación aparece por debajo; solo al
    // acabar el fundido avisamos de que se puede desmontar.
    setExiting(true);
    onStartExit?.();
    setTimeout(onComplete, 1000);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden select-none transition-opacity duration-1000 ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Fondo móvil */}
      <div
        className="absolute -inset-y-16 inset-x-0 z-[-1] md:hidden"
        style={{
          backgroundImage: `url("${assets.mobileBg}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#faf8f3',
        }}
      />

      {/* Fondo escritorio */}
      <div
        className="absolute inset-0 z-[-1] hidden md:block"
        style={{
          backgroundImage: `url("${assets.desktopBg}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#faf8f3',
        }}
      />

      {/* Lo que va contando la animación, para lectores de pantalla */}
      <p ref={liveRef} aria-live="polite" className="sr-only" />

      {/* Pantalla previa */}
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

      {/* Escena del sobre */}
      <div
        className={`relative w-[88vw] max-w-[430px] translate-y-[4vh] md:translate-y-[5vh] transition-opacity duration-500 ${
          showPre ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ aspectRatio: '840 / 600', perspective: '800px' }}
      >
        {/* Frente */}
        <div
          ref={frontRef}
          className="absolute inset-0 rounded-sm shadow-2xl bg-center bg-cover"
          style={{ backgroundImage: `url("${assets.front}")` }}
        />

        {/* Dorso: contiene solapa, tarjeta y bolsillo */}
        <div
          ref={backRef}
          className="absolute inset-0 rounded-sm"
          style={{ visibility: 'hidden', perspective: '1800px' }}
        >
          {/* Papel del sobre detrás de todo: el bolsillo tiene el escote
              recortado y sin esto se vería el fondo de la pantalla por él. */}
          <div
            aria-hidden
            className="absolute inset-0 z-0 rounded-sm"
            style={{ backgroundColor: ENVELOPE_PAPER }}
          />

          {/* Solapa interior (abierta), por encima del sobre y con bisagra abajo */}
          <div
            ref={flapOpenRef}
            aria-hidden
            className="absolute inset-x-0 z-10 pointer-events-none bg-bottom bg-contain bg-no-repeat"
            style={{
              visibility: 'hidden',
              bottom: '99%',
              height: `${FLAP_H}%`,
              transformOrigin: '50% 100%',
              transform: 'rotateX(89deg)',
              backgroundImage: `url("${assets.flapOpen}")`,
            }}
          />

          {/* Tarjeta */}
          <div
            ref={cardRef}
            className="absolute inset-x-[4%] top-[8%] h-[92%] rounded-sm shadow-[0_10px_30px_rgba(0,0,0,0.28)] flex flex-col items-center justify-center px-5 py-4 text-center"
            style={{
              backgroundImage: `url("${assets.cardBg}")`,
              backgroundSize: '260px 260px',
              // Detrás del bolsillo mientras sale por el escote, y por delante
              // una vez está entera fuera. El salto de capa cae en el instante
              // en el que ya no se solapan, así que no se ve.
              zIndex: delante ? 35 : 20,
            }}
          >
            <p className="font-serif text-accent italic text-[15px] md:text-lg mb-2">
              Estás invitado/a al casamiento de
            </p>
            <h2 className="font-serif text-accent italic font-light text-2xl md:text-3xl mb-5 leading-tight">
              {weddingConfig.shortNames}
            </h2>
            <div className="h-px w-10 bg-primary/20 mb-5" />
            <button
              type="button"
              onClick={salir}
              disabled={!opened}
              className="px-6 py-2 bg-primary text-white font-sans tracking-[0.2em] text-[9px] uppercase rounded-full shadow-lg transition-all duration-700 hover:scale-105 active:scale-95 disabled:opacity-0 disabled:translate-y-1 whitespace-nowrap"
            >
              Ver Invitación
            </button>
          </div>

          {/* Bolsillo, por delante de la tarjeta */}
          <div
            aria-hidden
            className="absolute inset-0 z-30 pointer-events-none bg-contain bg-no-repeat bg-center"
            style={{ backgroundImage: `url("${assets.pocket}")` }}
          />

          {/* Solapa exterior (cerrada), bisagra arriba */}
          <div
            ref={flapClosedRef}
            aria-hidden
            className="absolute inset-x-0 top-0 z-40 pointer-events-none bg-top bg-contain bg-no-repeat"
            style={{
              height: `${FLAP_H}%`,
              transformOrigin: '50% 0',
              backfaceVisibility: 'hidden',
              backgroundImage: `url("${assets.flapClosed}")`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
