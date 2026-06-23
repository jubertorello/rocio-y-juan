'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import EnvelopeIntro from '@/components/EnvelopeIntro';
import RSVPForm from '@/components/RSVPForm';
import type { RSVPState } from '@/components/RSVPForm';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { weddingConfig } from '@/lib/config';
import {
  MapPin,
  Calendar,
  Clock,
  Music,
  Heart,
  Plane,
  Gift,
  MessageSquare,
  Users,
  Check,
  Copy,
  ChevronRight,
  X,
  PhoneCall,
  Sparkles,
  Info,
  Volume2,
  VolumeX,
  Church,
  Wine,
  Utensils,
  PartyPopper,
  Menu
} from 'lucide-react';

// Custom Type for Song Suggestions
interface SuggestedSong {
  id: string;
  title: string;
  artist: string;
  votes: number;
}

const weddingPhotos = [
  "https://res.cloudinary.com/djqtkbyez/image/upload/v1779325282/PHOTO-2026-05-17-16-41-18_yxwhdd.jpg",
  "https://res.cloudinary.com/djqtkbyez/image/upload/v1779325282/PHOTO-2026-05-17-16-47-47_gvmlkc.jpg", // grande central
  "https://res.cloudinary.com/djqtkbyez/image/upload/v1779325282/PHOTO-2026-05-17-16-41-17_w4a3qm.jpg",
  "https://res.cloudinary.com/djqtkbyez/image/upload/v1779325282/PHOTO-2026-05-17-16-41-17_2_zhvxcp.jpg",
  "https://res.cloudinary.com/djqtkbyez/image/upload/v1780340179/74ea0529-8ba3-4380-b687-f34ced26c06d_vw7cs1.jpg",
  "https://res.cloudinary.com/djqtkbyez/image/upload/v1780340179/c62f8ae5-e96b-46bb-b6ce-27a6dfa36272_ztmret.jpg",
];

export default function Home() {
  const [showMain, setShowMain] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sectionVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);

  // Play video only when visible in viewport
  useEffect(() => {
    const video = sectionVideoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(video);
    return () => {
      observer.unobserve(video);
    };
  }, []);

  // Play audio on first user interaction — only until audioStarted
  useEffect(() => {
    if (audioStarted) return;
    const tryPlay = () => {
      if (audioRef.current) {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            setAudioStarted(true);
          })
          .catch(() => { });
      }
    };
    document.addEventListener('click', tryPlay);
    document.addEventListener('touchstart', tryPlay);
    return () => {
      document.removeEventListener('click', tryPlay);
      document.removeEventListener('touchstart', tryPlay);
    };
  }, [audioStarted]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error("Audio play failed:", err);
        });
    }
  };

  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedSwift, setCopiedSwift] = useState(false);
  const [showIbanModal, setShowIbanModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [showAllSongsModal, setShowAllSongsModal] = useState(false);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [musicList, setMusicList] = useState<SuggestedSong[]>([]);
  const [newSongTitle, setNewSongTitle] = useState('');
  const [newSongArtist, setNewSongArtist] = useState('');
  const [showAddSongSuccess, setShowAddSongSuccess] = useState(false);

  // Form State
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [rsvpData, setRsvpData] = useState<RSVPState | null>(null);
  const [formKey, setFormKey] = useState(0);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    completed: false
  });

  // Load localStorage data client-side safely on mount
  useEffect(() => {
    const loadSavedData = async () => {
      // 1. Read localStorage synchronously first so the page renders immediately
      const storedRsvp = localStorage.getItem('wedding_rsvp_status');
      if (storedRsvp) {
        try {
          const parsed = JSON.parse(storedRsvp);
          const normalized: RSVPState = {
            attending: parsed.attending !== undefined ? parsed.attending : true,
            guestName: parsed.guestName || '',
            hasIntolerance: parsed.hasIntolerance || !!(parsed.dietaryRestrictions),
            dietaryRestrictions: parsed.dietaryRestrictions || '',
            busIda: parsed.busIda === true,
            busVuelta: parsed.busVuelta === true,
            companions: Array.isArray(parsed.companions) ? parsed.companions : [],
            message: parsed.message || '',
            submittedAt: parsed.submittedAt
          };
          setRsvpData(normalized);
          setFormSubmitted(true);
        } catch (e) {
          console.error(e);
        }
      }

      // 2. Allow page to render now, before any async network call
      setMounted(true);

      // 3. Load songs from Supabase (non-blocking — page is already visible)
      const { data: songsData, error: songsError } = await supabase
        .from('songs')
        .select('*')
        .eq('client_id', 'rocio-y-juan')
        .order('votes', { ascending: false });

      if (songsData && !songsError) {
        setMusicList(songsData);
      }
    };

    const timer = setTimeout(loadSavedData, 0);
    return () => clearTimeout(timer);
  }, []);

  // Timer interval
  useEffect(() => {
    // September 12, 2026 at 17:00:00 CET / UTC
    const weddingDate = new Date('2026-09-12T17:00:00+02:00').getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = weddingDate - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, completed: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, completed: false });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // Copy IBAN handler
  const handleCopyIban = () => {
    const iban = weddingConfig.bankDetails.iban;
    navigator.clipboard.writeText(iban);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Copy Swift handler
  const handleCopySwift = () => {
    const swift = weddingConfig.bankDetails.swift;
    navigator.clipboard.writeText(swift);
    setCopiedSwift(true);
    setTimeout(() => setCopiedSwift(false), 2000);
  };

  // Handle smooth scroll to section with offset for fixed header
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setShowMobileMenu(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Add Song Suggestion
  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSongTitle.trim() || !newSongArtist.trim()) return;

    const newSong = {
      client_id: 'rocio-y-juan',
      title: newSongTitle.trim(),
      artist: newSongArtist.trim(),
      votes: 1
    };

    const { data, error } = await supabase
      .from('songs')
      .insert([newSong])
      .select()
      .single();

    if (data && !error) {
      const updated = [data, ...musicList].sort((a, b) => b.votes - a.votes);
      setMusicList(updated);
      setShowAddSongSuccess(true);
      setTimeout(() => {
        setShowAddSongSuccess(false);
      }, 3000);
    }

    setNewSongTitle('');
    setNewSongArtist('');
  };

  // Upvote Music
  const handleVoteSong = async (id: string) => {
    const song = musicList.find(s => s.id === id);
    if (!song) return;

    const newVotes = song.votes + 1;

    const updated = musicList.map(s => {
      if (s.id === id) {
        return { ...s, votes: newVotes };
      }
      return s;
    });
    const sorted = [...updated].sort((a, b) => b.votes - a.votes);
    setMusicList(sorted);

    await supabase
      .from('songs')
      .update({ votes: newVotes })
      .eq('id', id);
  };

  const handleRsvpSubmitted = (data: RSVPState) => {
    setRsvpData(data);
    setFormSubmitted(true);
  };

  const handleEditRsvp = () => {
    setFormSubmitted(false);
    setRsvpData(null);
    setFormKey((k) => k + 1);
    localStorage.removeItem('wedding_rsvp_status');
  };

  if (!mounted) {
    return null;
  }

  return (
    <main className={`min-h-screen relative selection:bg-primary/20 select-none md:select-text ${!showMain ? 'h-screen overflow-hidden' : ''}`}>
      <audio ref={audioRef} loop preload="auto">
        <source src="https://res.cloudinary.com/djqtkbyez/video/upload/v1782214795/ViolinTribution_-_Felicita%CC%80_-_Violino_-_64_Kbps_phmbcm.mp3" type="audio/mpeg" />
      </audio>

      {/* Botón mute flotante — visible desde que arranca el audio */}
      {audioStarted && !showMain && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          onClick={togglePlay}
          className="fixed bottom-6 right-6 z-[70] flex items-center gap-2 px-4 py-2 rounded-full bg-black/20 backdrop-blur-sm text-white/80 hover:bg-black/30 hover:text-white transition-all duration-200 text-[11px] font-sans uppercase tracking-[0.2em]"
        >
          {isPlaying ? <Volume2 size={14} /> : <VolumeX size={14} />}
          {isPlaying ? '' : ''}
        </motion.button>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showMain ? 1 : 0 }}
        transition={{ duration: 0.8 }}
        className="relative text-primary font-serif"
      >
        {/* STICKY HEADER NAVIGATION */}
        <nav className="fixed top-0 inset-x-0 bg-primary text-bg-light border-b border-white/10 z-40 transition-all duration-300 shadow-md">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <a
              href="#inicio"
              onClick={(e) => handleNavClick(e, 'inicio')}
              className="text-2xl md:text-3xl font-light tracking-[0.2em] uppercase text-bg-light hover:opacity-80 transition-opacity cursor-pointer"

            >
              {weddingConfig.monogram}
            </a>
            <div className="hidden md:flex items-center space-x-6 lg:space-x-8 text-[11px] uppercase tracking-[0.25em] font-sans text-[#e8e4da] font-medium">
              <a href="#lugar" onClick={(e) => handleNavClick(e, 'lugar')} className="hover:text-white transition-colors duration-200">Lugar</a>
              <a href="#itinerario" onClick={(e) => handleNavClick(e, 'itinerario')} className="hover:text-white transition-colors duration-200">Itinerario</a>
              <a href="#viaje" onClick={(e) => handleNavClick(e, 'viaje')} className="hover:text-white transition-colors duration-200">Viaje · Regalo</a>
              <a href="#informacion" onClick={(e) => handleNavClick(e, 'informacion')} className="hover:text-white transition-colors duration-200">Información</a>
            </div>
            <div className="flex items-center space-x-3">
              {/* Control de Música de Fondo */}
              <button
                onClick={togglePlay}
                className="p-2 text-bg-light/90 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200 flex items-center justify-center focus:outline-none relative"
                title={isPlaying ? "Pausar música" : "Reproducir música"}
                aria-label={isPlaying ? "Pausar música de fondo" : "Reproducir música de fondo"}
              >
                {isPlaying ? (
                  <>
                    <span className="absolute top-1 right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bg-dark opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-bg-dark"></span>
                    </span>
                    <Volume2 size={18} className="animate-pulse text-bg-dark brightness-125" />
                  </>
                ) : (
                  <>
                    <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-stone-400/80"></span>
                    <VolumeX size={18} className="opacity-60 text-bg-light" />
                  </>
                )}
              </button>

              {/* Desktop Confirmar button */}
              <a
                href="#confirmacion"
                onClick={(e) => handleNavClick(e, 'confirmacion')}
                className="hidden md:inline-block px-4 py-1.5 border border-white/30 text-bg-light hover:bg-bg-light hover:text-primary transition-all duration-300 rounded-full text-[10px] uppercase font-sans tracking-[0.2em]"
              >
                Confirma tu asistencia
              </a>

              {/* Mobile Menu button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden flex items-center space-x-1 px-3 py-1.5 border border-white/35 text-bg-light hover:bg-white/10 transition-all rounded-full text-[10px] uppercase font-sans tracking-[0.15em] cursor-pointer"
                aria-label="Menú de secciones"
              >
                <span>Menú</span>
                {showMobileMenu ? <X size={12} /> : <Menu size={12} />}
              </button>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          <AnimatePresence>
            {showMobileMenu && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="md:hidden overflow-hidden bg-primary border-t border-white/10"
              >
                <div className="px-6 py-4 flex flex-col space-y-4 text-center text-xs uppercase tracking-[0.2em] font-sans text-[#e8e4da] font-medium">
                  <a
                    href="#lugar"
                    onClick={(e) => handleNavClick(e, 'lugar')}
                    className="py-1 hover:text-white transition-colors duration-200"
                  >
                    Lugar
                  </a>
                  <a
                    href="#itinerario"
                    onClick={(e) => handleNavClick(e, 'itinerario')}
                    className="py-1 hover:text-white transition-colors duration-200"
                  >
                    Itinerario
                  </a>
                  <a
                    href="#musica"
                    onClick={(e) => handleNavClick(e, 'musica')}
                    className="py-1 hover:text-white transition-colors duration-200"
                  >
                    Música
                  </a>
                  <a
                    href="#viaje"
                    onClick={(e) => handleNavClick(e, 'viaje')}
                    className="py-1 hover:text-white transition-colors duration-200"
                  >
                    Viaje · Regalo
                  </a>
                  <a
                    href="#informacion"
                    onClick={(e) => handleNavClick(e, 'informacion')}
                    className="py-1 hover:text-white transition-colors duration-200"
                  >
                    Más Información
                  </a>
                  <div className="pt-2">
                    <a
                      href="#confirmacion"
                      onClick={(e) => handleNavClick(e, 'confirmacion')}
                      className="inline-block w-full py-2.5 bg-bg-light text-primary hover:bg-bg-warm transition-colors rounded-full text-[10px] tracking-[0.2em] font-bold"
                    >
                      Confirma tu asistencia
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>


        {/* 1. HERO - INITIALS & INVITATION + NOMBRES & FECHA */}
        <section
          id="inicio"
          className="w-full relative py-24 flex flex-col items-center justify-center text-center overflow-hidden"
          style={{
            backgroundImage: 'url("https://res.cloudinary.com/djqtkbyez/image/upload/v1782138238/7afade95-eee3-4d2c-92f0-c27559a51b4c_pfpmft.webp")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#afb5a6',
          }}
        >
          {/* Ambient mask overlay to ensure perfect contrast and depth */}
          <div className="absolute inset-0 bg-primary/15 pointer-events-none z-0" />

          <motion.div
            initial="hidden"
            animate={showMain ? "visible" : "hidden"}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.2,
                  delayChildren: 0.3
                }
              }
            }}
            className="max-w-4xl mx-auto px-6 w-full flex flex-col items-center relative z-10"
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 35, scale: 0.96 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 1.4, ease: "easeOut" } }
              }}
              className="bg-[#fbf9f4] p-8 md:p-12 rounded-3xl shadow-xl max-w-xl w-full mx-auto flex flex-col items-center border border-primary/10"
            >
              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 1.2, ease: "easeOut" } }
                }}
                className="font-serif text-secondary text-base md:text-lg italic leading-relaxed max-w-md mx-auto mb-6 text-center px-4 md:px-0"
              >
                Nos cruzamos durante 5 años de lunes a viernes en los pasillos de ingeniería de la UCC sin imaginarnos lo que el futuro nos tenía preparado. Pero, el destino finalmente hizo de las suyas… Nos fuimos cada uno por su cuenta a vivir a Madrid, a solo media cuadra de distancia uno del otro, para que empezara a escribirse una vida juntos.
              </motion.p>

              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 1.2, ease: "easeOut" } }
                }}
                className="font-serif text-secondary text-base md:text-lg italic leading-relaxed max-w-md mx-auto mb-8 text-center px-4 md:px-0"
              >
                En la distancia nos convertimos en “nuestro complemento perfecto”, como nos gusta decir. Después de prometer frente a la virgencita de Medjugore estar juntos para toda la vida, llegó el momento de festejarlo con la gente que tanto queremos y nos ha ido acompañando en estos 29 años de vida.
              </motion.p>

              <motion.h2
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 1.2, ease: "easeOut" } }
                }}
                className="tracking-[0.25em] uppercase text-[24px] leading-[24px] text-primary mb-6 text-center no-underline"
              >
                ¡Nos casamos!
              </motion.h2>

              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 1.2, ease: "easeOut" } }
                }}
                className="font-serif text-secondary text-lg md:text-xl italic leading-relaxed max-w-sm mx-auto text-center px-9 md:px-0"
              >
                ¡Y queremos que seas parte de este día tan especial!
              </motion.p>
            </motion.div>
          </motion.div>
        </section>

        {/* Section for Couple Names & Date */}
        <section
          id="bienvenida"
          className="w-full relative py-20 flex flex-col items-center justify-center text-center overflow-hidden"
          style={{
            backgroundImage: 'url("https://res.cloudinary.com/djqtkbyez/image/upload/v1777711072/texturapapel-limoncello-scaled_cgfzov.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#fbf9f4',
          }}
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.2, delayChildren: 0.1 }
              }
            }}
            className="max-w-4xl mx-auto px-6 w-full flex flex-col items-center relative z-10"
          >

            {/* Couple names - Elegant Stacked Layout styled like screenshot */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 1.4, ease: "easeOut" } }
              }}
              className="my-10 md:my-14 mb-12 flex flex-col items-center select-text"
            >
              <div className="flex flex-col items-center">
                <h1 className="font-serif tracking-[0.1em] text-[32px] leading-[32px] text-accent uppercase font-light">
                  {weddingConfig.brideFirstName}
                </h1>
                <span className="font-serif tracking-[0.05em] text-[20px] text-accent uppercase mt-1 font-light">
                  {weddingConfig.brideLastName}
                </span>
              </div>

              <div className="font-serif text-2xl md:text-3xl my-4 text-accent font-light">
                &
              </div>

              <div className="flex flex-col items-center">
                <h1 className="font-serif tracking-[0.1em] text-[32px] leading-[32px] text-accent uppercase font-light">
                  {weddingConfig.groomFirstName}
                </h1>
                <span className="font-serif tracking-[0.05em] text-[20px] leading-[30px] text-accent uppercase mt-1 font-light">
                  {weddingConfig.groomLastName}
                </span>
              </div>
            </motion.div>

            <motion.p
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 1.2, ease: "easeOut" } }
              }}
              className="font-serif text-secondary text-lg md:text-xl lg:text-xl italic leading-relaxed max-w-sm mx-auto mb-5 text-center px-8 md:px-0"
            >
              queremos celebrar este "Sí" rodeados de quienes formaron parte de nuestra historia desde el principio
            </motion.p>

            {/* DATE REPRESENTATION */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 25 },
                visible: { opacity: 1, y: 0, transition: { duration: 1.4, ease: "easeOut" } }
              }}
              className="flex flex-col items-center mt-4 select-none"
            >
              <div className="flex items-center justify-center gap-3 sm:gap-6 md:gap-8">
                {/* Month with borders */}
                <div className="border-y border-accent/40 py-2 text-center w-[110px] sm:w-[150px] flex-shrink-0">
                  <span
                    className="tracking-[0.2em] uppercase text-accent font-light block"
                    style={{ fontSize: '14px', lineHeight: '14px', textAlign: 'center' }}
                  >
                    {weddingConfig.weddingMonth}
                  </span>
                </div>

                {/* Big Day */}
                <div className="text-5xl sm:text-6xl md:text-7xl font-serif font-light text-accent leading-none px-1 flex-shrink-0">
                  {weddingConfig.weddingDay}
                </div>

                {/* Year with borders */}
                <div className="border-y border-accent/40 py-2 text-center w-[110px] sm:w-[150px] flex-shrink-0">
                  <span
                    className="tracking-[0.2em] text-accent font-light block"
                    style={{ fontSize: '18px', lineHeight: '18px', textAlign: 'center' }}
                  >
                    {weddingConfig.weddingYear}
                  </span>
                </div>
              </div>

              {/* Time below */}
              <div className="mt-6 text-center">
                <span
                  className="font-serif tracking-[0.25em] text-accent uppercase font-light"
                  style={{ fontSize: '16px', lineHeight: '16px' }}
                >
                  {weddingConfig.weddingTimeText}
                </span>
              </div>
            </motion.div>
          </motion.div>


        </section>

        {/* 2. LUGAR / LOCATION CARDS (Ubicaciones) */}
        <section
          id="lugar"
          className="w-full pt-20 pb-20 md:py-40 relative"
          style={{
            backgroundImage: 'url("https://res.cloudinary.com/djqtkbyez/image/upload/v1777711072/texturapapel-limoncello-scaled_cgfzov.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#fbf9f4',
          }}
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.15 }
              }
            }}
            className="max-w-5xl mx-auto px-6 relative z-10"
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
              }}
              className="text-center mb-16"
            >
              <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-secondary mb-2 block">Ubicaciones</span>
              <h2 className="font-serif text-3xl md:text-4xl text-primary font-light italic">
                Dónde y Cuándo
              </h2>
              <div className="h-px w-10 bg-primary/20 mx-auto mt-4" />
            </motion.div>

            <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-stretch">

              {/* CARD 1: CEREMONIA */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 40 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } }
                }}
                whileHover={{ y: -4 }}
                className="flex flex-col justify-between relative px-2 md:px-6"
              >
                <div>
                  <div className="mb-6 text-center">
                    <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-secondary font-medium">La Ceremonia</span>
                  </div>

                  <h3
                    className="text-2xl text-primary mb-4 font-normal tracking-wide text-center"

                  >
                    {weddingConfig.churchName}
                  </h3>

                  <p className="font-serif text-secondary text-sm italic mb-6 leading-relaxed text-center">
                    {weddingConfig.churchAddress}
                  </p>

                  <div className="relative h-64 md:h-72 w-full">
                    <Image
                      src="https://res.cloudinary.com/djqtkbyez/image/upload/v1782205830/capilla.png"
                      alt="Lugar de la Ceremonia"
                      fill
                      priority
                      className="object-contain object-center"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="flex items-center justify-center space-x-2 mt-6 mb-8 text-secondary text-sm md:text-base">
                    <Clock size={16} className="opacity-85" />
                    <span>{weddingConfig.churchTime}</span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <a
                    href={weddingConfig.churchMapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center space-x-2 w-[220px] py-3 bg-primary hover:bg-primary/90 text-white rounded-full font-sans text-[10px] uppercase tracking-[0.2em] transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.02]"
                  >
                    <span>Ver ubicación</span>
                    <ChevronRight size={12} />
                  </a>
                </div>
              </motion.div>

              {/* CARD 2: CELEBRACIÓN */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 40 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } }
                }}
                whileHover={{ y: -4 }}
                className="flex flex-col justify-between relative px-2 md:px-6"
              >
                <div>
                  <div className="mb-6 text-center">
                    <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-secondary font-medium">La Celebración</span>
                  </div>

                  <h3
                    className="text-2xl text-primary mb-4 font-normal tracking-wide text-center"

                  >
                    {weddingConfig.celebrationName}
                  </h3>

                  <p className="font-serif text-secondary text-sm italic mb-6 leading-relaxed text-center">
                    {weddingConfig.celebrationAddress}
                  </p>

                  <div className="relative h-64 md:h-72 w-full">
                    <Image
                      src="https://res.cloudinary.com/djqtkbyez/image/upload/v1779822783/hacienda-v1_transpa_axivb6.png"
                      alt="Lugar de la Celebración"
                      fill
                      priority
                      className="object-contain object-center"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="flex items-center justify-center space-x-2 mt-6 mb-8 text-secondary text-sm md:text-base">
                    <Clock size={16} className="opacity-85" />
                    <span>{weddingConfig.celebrationTime}</span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <a
                    href={weddingConfig.celebrationMapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center space-x-2 w-[220px] py-3 bg-primary hover:bg-primary/90 text-white rounded-full font-sans text-[10px] uppercase tracking-[0.2em] transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.02]"
                  >
                    <span>Ver ubicación</span>
                    <ChevronRight size={12} />
                  </a>
                </div>
              </motion.div>

            </div>
          </motion.div>
        </section>

        <section
          id="fotos"
          className="py-24 relative overflow-hidden"
          style={{
            backgroundImage: 'url("https://res.cloudinary.com/djqtkbyez/image/upload/v1782138238/7afade95-eee3-4d2c-92f0-c27559a51b4c_pfpmft.webp")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#afb5a6',
          }}
        >
          {/* Ambient mask overlay to ensure perfect contrast and depth */}
          <div className="absolute inset-0 bg-primary/15 pointer-events-none z-0" />

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.15
                }
              }
            }}
            className="max-w-4xl mx-auto px-6 relative z-10 flex flex-col items-center"
          >

            {/* Solo título unificado */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 35 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
              }}
              className="text-center mb-12"
            >
              <h3 className="font-serif text-3xl md:text-4xl text-bg-light font-light italic">
                ¡Empieza la cuenta atrás!
              </h3>
              <div className="h-px w-10 bg-bg-light/35 mx-auto mt-4" />
            </motion.div>

            {/* Temporizador Section */}
            <div className="text-center w-full mb-16">
              <motion.div
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.12,
                      delayChildren: 0.05
                    }
                  }
                }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 max-w-[240px] sm:max-w-[280px] md:max-w-[540px] mx-auto"
              >
                {/* Days */}
                <motion.div
                  variants={{
                    hidden: { opacity: 0, scale: 0.5, y: 40 },
                    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 14 } }
                  }}
                  className="bg-[#C9CEBA] aspect-square rounded-full shadow-md border border-primary/10 flex flex-col items-center justify-center p-2 sm:p-3"
                >
                  <span className="text-3xl sm:text-4xl md:text-5xl font-serif text-accent font-medium leading-none">{timeLeft.days}</span>
                  <span className="text-xs sm:text-sm md:text-base uppercase tracking-widest text-accent/90 mt-1 sm:mt-1.5 font-light">Días</span>
                </motion.div>

                {/* Hours */}
                <motion.div
                  variants={{
                    hidden: { opacity: 0, scale: 0.5, y: 40 },
                    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 14 } }
                  }}
                  className="bg-[#C9CEBA] aspect-square rounded-full shadow-md border border-primary/10 flex flex-col items-center justify-center p-2 sm:p-3"
                >
                  <span className="text-3xl sm:text-4xl md:text-5xl font-serif text-accent font-medium leading-none">{timeLeft.hours}</span>
                  <span className="text-xs sm:text-sm md:text-base uppercase tracking-widest text-accent/90 mt-1 sm:mt-1.5 font-light">Horas</span>
                </motion.div>

                {/* Minutes */}
                <motion.div
                  variants={{
                    hidden: { opacity: 0, scale: 0.5, y: 40 },
                    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 14 } }
                  }}
                  className="bg-[#C9CEBA] aspect-square rounded-full shadow-md border border-primary/10 flex flex-col items-center justify-center p-2 sm:p-3"
                >
                  <span className="text-3xl sm:text-4xl md:text-5xl font-serif text-accent font-medium leading-none">{timeLeft.minutes}</span>
                  <span className="text-xs sm:text-sm md:text-base uppercase tracking-widest text-accent/90 mt-1 sm:mt-1.5 font-light">Minutos</span>
                </motion.div>

                {/* Seconds */}
                <motion.div
                  variants={{
                    hidden: { opacity: 0, scale: 0.5, y: 40 },
                    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 14 } }
                  }}
                  className="bg-[#C9CEBA] aspect-square rounded-full shadow-md border border-primary/10 flex flex-col items-center justify-center p-2 sm:p-3"
                >
                  <span className="text-3xl sm:text-4xl md:text-5xl font-serif text-accent font-medium leading-none">{timeLeft.seconds}</span>
                  <span className="text-xs sm:text-sm md:text-base uppercase tracking-widest text-accent/90 mt-1 sm:mt-1.5 font-light">Segundos</span>
                </motion.div>
              </motion.div>
            </div>

            {/* Video de la Ceremonia — en formato cuadrado, reproducido en bucle y silenciado */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 45, scale: 0.96 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 60, damping: 14 } }
              }}
              className="relative w-full max-w-[340px] md:max-w-[420px] mx-auto aspect-square rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-black/5"
            >
              <video
                ref={sectionVideoRef}
                src="https://res.cloudinary.com/djqtkbyez/video/upload/v1782232543/WhatsApp_Video_2026-06-23_at_16.03.52_nospat.mp4"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="w-full h-full object-cover"
              />
            </motion.div>

          </motion.div>
        </section>


        {/* 4. ITINERARIO SECTION */}
        <section
          id="itinerario"
          className="py-24 pt-16 pb-16 text-primary itinerario-section"
          style={{
            backgroundImage: 'url("https://res.cloudinary.com/djqtkbyez/image/upload/v1777711072/texturapapel-limoncello-scaled_cgfzov.jpg")',
            backgroundSize: 'contain',
            backgroundPosition: 'top center',
            backgroundRepeat: 'repeat',
            backgroundColor: '#fbf9f4',
          }}
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.15 }
              }
            }}
            className="max-w-4xl mx-auto px-6"
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
              }}
              className="text-center mb-16"
            >
              <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-secondary mb-2 block font-medium">Plan del Día</span>
              <h2 className="font-serif text-3xl md:text-4xl text-primary font-medium italic">
                Itinerario
              </h2>
              <p
                className="font-serif text-secondary mt-2 italic"
                style={{ fontSize: '14px' }}
              >
                Hemos preparado todo para un día inolvidable
              </p>
              <div className="h-px w-10 bg-primary/20 mx-auto mt-4" />
            </motion.div>

            {/* TIMELINE TRACK */}
            <div className="relative mt-12 pl-8 md:pl-0">
              {/* Center line */}
              <div className="absolute left-[60px] md:left-1/2 top-0 bottom-0 w-px bg-primary/20 transform md:-translate-x-1/2" />

              <div className="space-y-16">
                {/* Event 1: Ceremonia */}
                <motion.div
                  initial={{ opacity: 0, y: 60, scale: 0.92 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ type: "spring", stiffness: 90, damping: 13 }}
                  className="relative flex flex-col md:flex-row items-start md:items-center min-h-[48px]"
                >
                  <div className="absolute left-[60px] md:left-1/2 transform -translate-x-1/2 flex items-center justify-center z-10">
                    <div className="relative w-28 h-28 md:w-36 md:h-36">
                      <Image
                        src="https://res.cloudinary.com/djqtkbyez/image/upload/v1782206513/ceremonia-itinerario.png"
                        alt="La Ceremonia"
                        fill
                        className="object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  <div className="w-full md:w-1/2 md:pr-28 md:text-right mt-1 pl-[130px] md:pl-0">
                    <div className="inline-block px-3 py-1 bg-primary/5 border border-primary/15 rounded-full text-primary font-sans font-medium text-xs mb-2">
                      16:00 H
                    </div>
                    <h4 className="font-serif text-xl text-primary font-medium font-serif" >La Ceremonia</h4>
                  </div>
                  {/* Spacer for desktop layout alignment */}
                  <div className="w-full md:w-1/2 hidden md:block" />
                </motion.div>

                {/* Event 2: Coctail */}
                <motion.div
                  initial={{ opacity: 0, y: 60, scale: 0.92 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ type: "spring", stiffness: 90, damping: 13 }}
                  className="relative flex flex-col md:flex-row items-start md:items-center min-h-[48px]"
                >
                  <div className="absolute left-[60px] md:left-1/2 transform -translate-x-1/2 flex items-center justify-center z-10">
                    <div className="relative w-28 h-28 md:w-36 md:h-36">
                      <Image
                        src="https://res.cloudinary.com/djqtkbyez/image/upload/v1782205927/coctel.png"
                        alt="El Cóctel"
                        fill
                        className="object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  {/* Left blank on desktop */}
                  <div className="w-full md:w-1/2 hidden md:block" />

                  <div className="w-full md:w-1/2 md:pl-28 mt-1 pl-[130px]">
                    <div className="inline-block px-3 py-1 bg-primary/5 border border-primary/15 rounded-full text-primary font-sans font-medium text-xs mb-2">
                      17:45 H
                    </div>
                    <h4 className="font-serif text-xl text-primary font-medium font-serif" >El Cóctel</h4>
                  </div>
                </motion.div>

                {/* Event 3: Boda Civil */}
                <motion.div
                  initial={{ opacity: 0, y: 60, scale: 0.92 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ type: "spring", stiffness: 90, damping: 13 }}
                  className="relative flex flex-col md:flex-row items-start md:items-center min-h-[48px]"
                >
                  <div className="absolute left-[60px] md:left-1/2 transform -translate-x-1/2 flex items-center justify-center z-10">
                    <div className="relative w-28 h-28 md:w-36 md:h-36">
                      <Image
                        src="https://res.cloudinary.com/djqtkbyez/image/upload/v1780068415/WhatsApp_Image_2026-05-29_at_16.26.02-removebg-preview_xyaohc.png"
                        alt="Boda Civil"
                        fill
                        className="object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  <div className="w-full md:w-1/2 md:pr-28 md:text-right mt-1 pl-[130px] md:pl-0">
                    <div className="inline-block px-3 py-1 bg-primary/5 border border-primary/15 rounded-full text-primary font-sans font-medium text-xs mb-2">
                      19:00 H
                    </div>
                    <h4 className="font-serif text-xl text-primary font-medium font-serif" >Boda Civil</h4>
                  </div>
                  {/* Spacer for desktop layout alignment */}
                  <div className="w-full md:w-1/2 hidden md:block" />
                </motion.div>

                {/* Event 4: Cena */}
                <motion.div
                  initial={{ opacity: 0, y: 60, scale: 0.92 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ type: "spring", stiffness: 90, damping: 13 }}
                  className="relative flex flex-col md:flex-row items-start md:items-center min-h-[48px]"
                >
                  <div className="absolute left-[60px] md:left-1/2 transform -translate-x-1/2 flex items-center justify-center z-10">
                    <div className="relative w-28 h-28 md:w-36 md:h-36">
                      <Image
                        src="https://res.cloudinary.com/djqtkbyez/image/upload/v1780067585/WhatsApp_Image_2026-05-26_at_23.44.58-removebg-preview_auvopz.png"
                        alt="La Cena"
                        fill
                        className="object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  {/* Left blank on desktop */}
                  <div className="w-full md:w-1/2 hidden md:block" />

                  <div className="w-full md:w-1/2 md:pl-28 mt-1 pl-[130px]">
                    <div className="inline-block px-3 py-1 bg-primary/5 border border-primary/15 rounded-full text-primary font-sans font-medium text-xs mb-2">
                      20:00 H
                    </div>
                    <h4 className="font-serif text-xl text-primary font-medium font-serif" >La Cena</h4>
                  </div>
                </motion.div>

                {/* Event 5: Baile */}
                <motion.div
                  initial={{ opacity: 0, y: 60, scale: 0.92 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ type: "spring", stiffness: 90, damping: 13 }}
                  className="relative flex flex-col md:flex-row items-start md:items-center min-h-[48px]"
                >
                  <div className="absolute left-[60px] md:left-1/2 transform -translate-x-1/2 flex items-center justify-center z-10">
                    <div className="relative w-28 h-28 md:w-36 md:h-36">
                      <Image
                        src="https://res.cloudinary.com/djqtkbyez/image/upload/v1780067739/WhatsApp_Image_2026-05-28_at_00.18.22-removebg-preview_mpdsw2.png"
                        alt="El Baile & Fiesta"
                        fill
                        className="object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  <div className="w-full md:w-1/2 md:pr-28 md:text-right mt-1 pl-[130px] md:pl-0">
                    <div className="inline-block px-3 py-1 bg-primary/5 border border-primary/15 rounded-full text-primary font-sans font-medium text-xs mb-2">
                      21:30 H
                    </div>
                    <h4 className="font-serif text-xl text-primary font-medium font-serif" >El Baile & Fiesta</h4>
                  </div>
                  <div className="w-full md:w-1/2 hidden md:block" />
                </motion.div>

              </div>
            </div>
          </motion.div>
        </section>

        {/* 5. PLAYLIST / MUSIC SUGGESTIONS */}
        <section
          id="musica"
          className="w-full py-24 pt-16 pb-16 relative"
          style={{
            backgroundImage: 'url("https://res.cloudinary.com/djqtkbyez/image/upload/v1777711072/texturapapel-limoncello-scaled_cgfzov.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#fbf9f4',
          }}
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.15 }
              }
            }}
            className="max-w-4xl mx-auto px-6 text-center relative z-10"
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 40 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
              }}
              className="bg-bg-light border border-primary/10 rounded-sm p-10 md:p-14 shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-48 h-1 bg-primary/10" />
              <div className="flex justify-center mb-6">
                <div className="relative w-28 h-28 md:w-36 md:h-36">
                  <Image
                    src="https://res.cloudinary.com/djqtkbyez/image/upload/v1780226276/ChatGPT_Image_31_may_2026_13_17_09_xdrx3s.png"
                    alt="Música"
                    fill
                    className="object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <h3 className="font-serif text-2xl md:text-3xl text-primary mb-4 font-light italic">
                Ayúdanos con la música
              </h3>

              <p className="text-secondary text-[15px] italic leading-relaxed max-w-lg mx-auto mb-10">
                ¿Qué canciones te gustaría que sonaran en la fiesta? Compártelas con nosotros y las añadiremos a la playlist para darlo todo en la pista 💃
              </p>

              <button
                onClick={() => setShowMusicModal(true)}
                className="inline-flex items-center space-x-3 px-8 py-3 bg-primary hover:bg-primary/90 text-white font-sans text-[10px] uppercase tracking-[0.2em] rounded-full transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Music size={13} />
                <span>Sugerir Canciones</span>
              </button>

              {musicList.length > 0 && (
                <div className="mt-12 text-left max-w-md mx-auto">
                  <span className="text-[10px] uppercase tracking-wider text-secondary block mb-4 border-b border-primary/10 pb-2 font-sans font-semibold">
                    Top canciones sugeridas:
                  </span>
                  <div className="space-y-3">
                    {musicList.slice(0, 3).map((song, index) => (
                      <div
                        key={song.id}
                        className="flex items-center justify-between text-xs bg-bg-warm/30 p-2.5 rounded-md border border-primary/5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[10px] font-bold text-primary/40 font-sans w-4 shrink-0">#{index + 1}</span>
                          <div className="min-w-0">
                            <span className="font-bold text-primary block truncate">{song.title}</span>
                            <span className="text-secondary">{song.artist}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleVoteSong(song.id)}
                          className="flex items-center space-x-1.5 px-2 py-1 hover:bg-primary/5 rounded font-sans text-[10px] uppercase text-secondary border border-primary/10 transition-colors shrink-0 ml-2"
                        >
                          <Heart size={10} className="fill-primary/20 text-primary" />
                          <span>{song.votes}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  {musicList.length > 3 && (
                    <button
                      onClick={() => setShowAllSongsModal(true)}
                      className="mt-4 w-full py-2 text-[10px] uppercase tracking-wider font-sans font-semibold text-secondary border border-primary/15 rounded-full hover:bg-primary/5 transition-colors cursor-pointer"
                    >
                      Ver todas las canciones ({musicList.length})
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        </section>

        {/* 6. NEXT ADVENTURE / LUNA DE MIEL */}
        <section
          id="viaje"
          className="py-24 pt-16 pb-16 relative text-accent"
          style={{
            backgroundImage: 'url("https://res.cloudinary.com/djqtkbyez/image/upload/v1777711072/texturapapel-limoncello-scaled_cgfzov.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#C9CEBA',
          }}
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.12 }
              }
            }}
            className="max-w-3xl mx-auto px-6 text-center"
          >
            <motion.span
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
              }}
              className="font-sans text-[10px] uppercase tracking-[0.3em] text-accent/80 mb-2 block font-medium"
            >
              Luna de Miel · Regalo
            </motion.span>
            <motion.h2
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.7 } }
              }}
              className="font-serif text-3xl md:text-4xl text-accent font-medium mb-6 italic"
            >
              Nuestra próxima aventura
            </motion.h2>
            <motion.div
              variants={{
                hidden: { opacity: 0, scaleX: 0 },
                visible: { opacity: 1, scaleX: 1, transition: { duration: 0.6 } }
              }}
              className="h-px w-10 bg-accent/40 mx-auto mb-3"
            />

            <motion.p
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
              }}
              className="text-[15px] text-accent/90 leading-relaxed max-w-xl mx-auto mb-2"
            >
              Emprendemos juntos el viaje más importante de nuestras vidas, que continuará con una luna de miel soñada entre Japón y la Polinesia Francesa.
            </motion.p>

            <motion.p
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
              }}
              className="text-[15px] text-accent leading-relaxed max-w-lg mx-auto mb-1"
            >
              Si deseáis acompañarnos de una forma especial en esta experiencia inolvidable, podéis hacerlo rellenando vuestro granito de arena aquí:
            </motion.p>

            <div className="flex justify-center">
              <motion.div
                variants={{
                  hidden: { opacity: 0, scale: 0.92, rotate: -2 },
                  visible: { opacity: 1, scale: 1, rotate: 0, transition: { type: "spring", stiffness: 60, damping: 15 } }
                }}
                className="relative w-84 h-52 md:w-106 md:h-80"
              >
                <Image
                  src="https://res.cloudinary.com/djqtkbyez/image/upload/v1780068415/WhatsApp_Image_2026-05-29_at_16.26.02-removebg-preview_xyaohc.png"
                  alt="Japón y Polinesia Francesa"
                  fill
                  className="object-contain"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            </div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 90, damping: 14 } }
              }}
              className="flex flex-col items-center gap-2"
            >
              <p className="font-serif text-accent/75 text-sm italic">
                ¿Quieres hacernos un regalo? Haz click aquí:
              </p>
              <button
                onClick={() => setShowIbanModal(true)}
                className="inline-flex items-center space-x-2 px-8 py-3.5 bg-white text-primary hover:bg-white/90 font-sans text-[11px] uppercase tracking-[0.22em] rounded-full transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 cursor-pointer font-semibold"
              >
                <Gift size={13} />
                <span>Ver datos regalo</span>
              </button>
            </motion.div>
          </motion.div>
        </section>

        {/* 7. CONFIRMA TU ASISTENCIA (RSVP Form) */}
        <section
          id="confirmacion"
          className="w-full py-24 pt-16 pb-16 confirmacion-section"
          style={{
            backgroundImage: 'url("https://res.cloudinary.com/djqtkbyez/image/upload/v1777711072/texturapapel-limoncello-scaled_cgfzov.jpg")',
            backgroundSize: 'contain',
            backgroundPosition: 'top center',
            backgroundRepeat: 'repeat',
            backgroundColor: '#fbf9f4',
          }}
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.15 }
              }
            }}
            className="max-w-4xl mx-auto px-6"
          >
            <div className="text-center mb-12">
              <div className="flex justify-center mb-6">
                <motion.div
                  variants={{
                    hidden: { opacity: 0, scale: 0.8 },
                    visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 70, damping: 15 } }
                  }}
                  className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10"
                >
                  <Check size={32} className="text-primary" />
                </motion.div>
              </div>
              <motion.h2
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
                }}
                className="font-serif text-3xl md:text-4xl text-primary font-light italic"
              >
                Confirma tu asistencia
              </motion.h2>
              <motion.div
                variants={{
                  hidden: { opacity: 0, scaleX: 0 },
                  visible: { opacity: 1, scaleX: 1, transition: { duration: 0.6 } }
                }}
                className="h-px w-10 bg-primary/20 mx-auto mt-4 mb-6"
              />
              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
                }}
                className="text-[13px] md:text-sm text-secondary leading-relaxed max-w-md mx-auto"

              >
                Para poder organizar con cariño y detalle este día, por favor, agradeceríamos que rellenarais este formulario antes del <strong className="text-primary">15 de agosto</strong>, gracias.
              </motion.p>
            </div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 35 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
              }}
              className="bg-bg-light border border-primary/10 rounded-sm p-8 md:p-12 shadow-sm max-w-2xl mx-auto"
            >
              <RSVPForm
                key={formKey}
                onSubmitted={handleRsvpSubmitted}
                onEdit={handleEditRsvp}
                rsvpData={rsvpData}
                formSubmitted={formSubmitted}
              />
            </motion.div>
          </motion.div>
        </section>

        {/* 8. INFORMACIÓN DE INTERÉS */}
        <section
          id="informacion"
          className="py-20 pt-16 pb-16 relative"
          style={{
            backgroundImage: 'url("https://res.cloudinary.com/djqtkbyez/image/upload/v1777711072/texturapapel-limoncello-scaled_cgfzov.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#fbf9f4',
          }}
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.15 }
              }
            }}
            className="max-w-4xl mx-auto px-6 relative z-10"
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
              }}
              className="text-center mb-12"
            >
              <span className="font-sans text-[9px] uppercase tracking-[0.3em] font-bold text-primary/70">Información</span>
              <h3 className="font-serif text-2xl md:text-3xl text-primary mt-1 font-light italic">
                Datos de Interés
              </h3>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 40 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } }
                }}
                whileHover={{ y: -4, boxShadow: "0 10px 25px -10px rgba(90,90,64,0.2)" }}
                className="bg-[#C9CEBA] p-8 border border-white/10 rounded shadow-sm flex flex-col justify-between items-start text-left"
              >
                <div>
                  <h4
                    className="text-[17px] text-accent font-medium mb-3"
                  >
                    Recomendación de Hoteles
                  </h4>
                  <p
                    className="text-xs text-accent/85 leading-relaxed"
                  >
                    Respecto a los hoteles, os recomendamos reservar por la zona de la Parroquia, ya que los autobuses de vuelta tendrán ahí una de las paradas principales de regreso.
                  </p>
                </div>
              </motion.div>

              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 40 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } }
                }}
                whileHover={{ y: -4, boxShadow: "0 10px 25px -10px rgba(90,90,64,0.2)" }}
                className="bg-[#C9CEBA] p-8 border border-white/10 rounded shadow-sm flex flex-col justify-between items-start text-left"
              >
                <div>
                  <h4
                    className="text-[17px] text-accent font-medium mb-3"
                  >
                    Servicio de Autobuses
                  </h4>
                  <p
                    className="text-xs text-accent/85 leading-relaxed"
                  >
                    Dispondremos de autobuses para los traslados del evento:
                    <span className="block mt-2 font-semibold">
                      • Ida: Parroquia Corpus Christi (18:15h) &rarr; Hacienda de Orán
                    </span>
                    <span className="block mt-1.5 font-semibold">
                      • Vuelta: Hacienda de Orán &rarr; Sevilla (varios horarios)
                    </span>
                  </p>
                </div>
              </motion.div>

              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 40 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } }
                }}
                whileHover={{ y: -4, boxShadow: "0 10px 25px -10px rgba(90,90,64,0.2)" }}
                className="bg-[#C9CEBA] p-8 border border-white/10 rounded shadow-sm flex flex-col justify-between items-start text-left"
              >
                <div>
                  <h4
                    className="text-[17px] text-accent font-medium mb-3"
                  >
                    Celebración de Adultos
                  </h4>
                  <p
                    className="text-xs text-accent/85 leading-relaxed"
                  >
                    Aunque adoramos y apreciamos con todo el alma a los más pequeños, por temas organizativos del espacio y dinámica, esta será una celebración reservada solo para mayores de 18 años.
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* 9. ¿DUDAS? (WHATSAPP INVITADOS CHAT LINKS) */}
        <section
          className="py-20 pt-16 pb-16 dudas-section"
          style={{
            backgroundImage: 'url("https://res.cloudinary.com/djqtkbyez/image/upload/v1777711072/texturapapel-limoncello-scaled_cgfzov.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#fbf9f4',
          }}
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
            className="max-w-4xl mx-auto px-6 text-center"
          >
            <motion.h3
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
              }}
              className="font-serif text-2xl text-primary mb-4 font-light italic"
            >
              ¿Dudas?
            </motion.h3>

            <motion.p
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
              }}
              className="text-sm text-secondary leading-relaxed mb-10 max-w-md mx-auto"

            >
              Si tenéis alguna duda, pregunta o necesitáis consultarnos algo, no dudéis en llamarnos o escribirnos por WhatsApp:
            </motion.p>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
              }}
              className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-md mx-auto"
            >
              <a
                href="https://wa.me/5493512161616?text=Hola%20Roc%C3%ADo!%20Tengo%20una%20duda%20sobre%20la%20boda..."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center space-x-3 w-full sm:w-auto px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-full font-sans text-[10px] uppercase tracking-[0.2em] transition-all duration-300 shadow-md hover:scale-105 active:scale-95"
              >
                <PhoneCall size={12} />
                <span>WhatsApp Rocío</span>
              </a>

              <a
                href="https://wa.me/5493534224505?text=Hola%20Juan!%20Tengo%20una%20duda%20sobre%20la%20boda..."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center space-x-3 w-full sm:w-auto px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-full font-sans text-[10px] uppercase tracking-[0.2em] transition-all duration-300 shadow-md hover:scale-105 active:scale-95"
              >
                <PhoneCall size={12} />
                <span>WhatsApp Juan</span>
              </a>
            </motion.div>
          </motion.div>
        </section>

        {/* 10. FOOTER: TE ESPERAMOS */}
        <footer
          className="pt-28 pb-16 md:pt-32 md:pb-20 text-center relative overflow-hidden bg-bg-dark"
          style={{
            backgroundImage: 'url("https://res.cloudinary.com/djqtkbyez/image/upload/v1782138238/7afade95-eee3-4d2c-92f0-c27559a51b4c_pfpmft.webp")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#afb5a6',
          }}
        >
          {/* Ambient mask overlay to ensure perfect contrast and depth */}
          <div className="absolute inset-0 bg-primary/15 pointer-events-none z-0" />

          <div className="max-w-2xl mx-auto px-6 relative z-10">
            <span
              className="text-4xl md:text-5xl block mb-6 text-bg-light drop-shadow-sm font-serif"

            >
              ¡Te esperamos!
            </span>
            <p className="font-serif text-[12px] md:text-xs uppercase tracking-[0.3em] text-bg-light mb-2 font-bold drop-shadow-xs">
              {weddingConfig.shortNames}
            </p>
            <p className="font-sans font-bold text-[9px] md:text-[10px] text-bg-light/85 tracking-widest uppercase drop-shadow-xs">
              {weddingConfig.weddingDateText} • Córdoba
            </p>
          </div>

          {/* Bottom thin bar */}
          <div className="absolute bottom-0 left-0 right-0 py-3 bg-primary/30 border-t border-bg-light/10 z-10">
            <p className="font-sans font-bold text-[11px] md:text-[12px] text-bg-light/80 tracking-widest">
              <a
                href="https://wa.me/34660104026"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-bg-light transition-colors"
              >
                By Jules
              </a>
              . Todos los derechos reservados.
            </p>
          </div>
        </footer>

        {/* ========================================================= */}
        {/* MODALS / OVERLAYS & PORTALS */}
        {/* ========================================================= */}

        {/* MODAL 1: DATOS IBAN / REGALOS */}
        <AnimatePresence>
          {showIbanModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 select-text">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowIbanModal(false)}
                className="absolute inset-0 bg-primary/45 backdrop-blur-xs"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-bg-light border border-primary/20 rounded-md shadow-2xl p-8 relative z-50 max-w-md w-full text-center"
              >
                <button
                  onClick={() => setShowIbanModal(false)}
                  className="absolute top-4 right-4 p-1.5 text-primary/60 hover:text-primary hover:bg-primary/5 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>

                <div className="flex justify-center mb-4 text-secondary">
                  <Plane size={32} className="animate-bounce" />
                </div>

                <h3 className="font-serif text-2xl text-primary mb-3">Luna de Miel · Regalo</h3>

                <p className="text-xs text-secondary leading-relaxed mb-6">
                  Tu presencia es nuestro mayor regalo. Sin embargo, si deseas acompañarnos de una forma diferente y ayudarnos a construir momentos mágicos en Japón y la Polinesia Francesa, ponemos a tu disposición nuestra cuenta bancaria:
                </p>

                <div className="bg-bg-warm/60 p-4 rounded-md border border-primary/10 mb-6 relative text-left">
                  {/* IBAN Section */}
                  <span className="block text-[8px] font-sans uppercase tracking-[0.2em] text-secondary mb-2 font-bold">
                    Número de cuenta (IBAN):
                  </span>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-sans text-xs md:text-sm text-primary select-all font-bold tracking-wider">
                      {weddingConfig.bankDetails.iban}
                    </span>
                    <button
                      onClick={handleCopyIban}
                      className="p-2 bg-primary/5 hover:bg-primary/10 text-primary rounded transition-all active:scale-95 cursor-pointer"
                      title="Copiar IBAN"
                    >
                      {copied ? (
                        <span className="text-[10px] font-sans uppercase tracking-wider font-semibold">¡Copiado!</span>
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>

                  {/* SWIFT/BIC Section */}
                  <span className="block text-[8px] font-sans uppercase tracking-[0.2em] text-secondary mb-2 font-bold">
                    Código Swift/BIC:
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-xs md:text-sm text-primary select-all font-bold tracking-wider">
                      {weddingConfig.bankDetails.swift}
                    </span>
                    <button
                      onClick={handleCopySwift}
                      className="p-2 bg-primary/5 hover:bg-primary/10 text-primary rounded transition-all active:scale-95 cursor-pointer"
                      title="Copiar Swift/BIC"
                    >
                      {copiedSwift ? (
                        <span className="text-[10px] font-sans uppercase tracking-wider font-semibold">¡Copiado!</span>
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>

                  {/* Info notice */}
                  <div className="flex items-start gap-1.5 mt-3 text-[9px] text-secondary leading-snug">
                    <Info size={11} className="mt-0.5 flex-shrink-0 text-secondary" />
                    <span>Con este código podrás recibir transferencias internacionales</span>
                  </div>

                  <span className="block text-[8px] text-secondary mt-3 pt-2 border-t border-primary/5">
                    Titulares: {weddingConfig.bankDetails.holders}
                  </span>
                </div>

                <p className="text-[10px] text-secondary uppercase tracking-wider italic">
                  ¡Muchísimas gracias por formar parte de este sueño! ❤️
                </p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 2: SUGERIR CANCIONES */}
        <AnimatePresence>
          {showMusicModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 select-text">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMusicModal(false)}
                className="absolute inset-0 bg-primary/45 backdrop-blur-xs"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-bg-light border border-primary/20 rounded-md shadow-2xl p-8 relative z-50 max-w-sm w-full"
              >
                <button
                  onClick={() => setShowMusicModal(false)}
                  className="absolute top-4 right-4 p-1.5 text-primary/60 hover:text-primary hover:bg-primary/5 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>

                <div className="text-center mb-6">
                  <Music size={26} className="text-secondary mx-auto mb-2" />
                  <h3 className="font-serif text-xl text-primary">Sugerir Canción</h3>
                  <p className="text-xs text-secondary mt-1">Queremos que la pista de baile no pare de sonar</p>
                </div>

                <AnimatePresence>
                  {showAddSongSuccess && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-primary/10 border border-primary/25 rounded text-primary p-3 text-center mb-4 font-sans text-xs font-semibold flex items-center justify-center gap-1.5 overflow-hidden"
                    >
                      <Check size={14} />
                      <span>¡Canción añadida con éxito!</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleAddSong} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider font-sans text-secondary mb-1 font-semibold">
                      Título de la Canción
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. La Camisa Negra"
                      value={newSongTitle}
                      onChange={(e) => setNewSongTitle(e.target.value)}
                      className="w-full bg-bg-warm/30 border border-primary/20 rounded p-2 text-primary focus:outline-none focus:border-primary focus:bg-bg-warm/50 transition-colors font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-wider font-sans text-secondary mb-1 font-semibold">
                      Artista
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juanes"
                      value={newSongArtist}
                      onChange={(e) => setNewSongArtist(e.target.value)}
                      className="w-full bg-bg-warm/30 border border-primary/20 rounded p-2 text-primary focus:outline-none focus:border-primary focus:bg-bg-warm/50 transition-colors font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-primary hover:bg-primary/90 text-white tracking-[0.2em] font-sans text-[10px] uppercase rounded-full transition-all duration-300 shadow hover:shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Añadir a la lista
                  </button>
                </form>

                <div className="mt-6 border-t border-primary/10 pt-4 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  <span className="block text-[9px] uppercase font-bold tracking-wider text-secondary mb-2 font-sans">
                    Sugiriendo actualmente ({musicList.length}):
                  </span>
                  <div className="space-y-2">
                    {musicList.map(song => (
                      <div key={song.id} className="flex justify-between items-center bg-bg-warm/30 p-2 rounded text-[11px] border border-primary/5">
                        <div className="truncate pr-4">
                          <span className="font-bold text-primary">{song.title}</span> - <span className="text-secondary">{song.artist}</span>
                        </div>
                        <span className="text-[10px] font-sans font-bold bg-primary/5 px-2 py-0.5 rounded text-primary">
                          {song.votes} votos
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ALL SONGS MODAL */}
        <AnimatePresence>
          {showAllSongsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 select-text">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAllSongsModal(false)}
                className="absolute inset-0 bg-primary/45 backdrop-blur-xs"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-bg-light border border-primary/20 rounded-md shadow-2xl p-8 relative z-50 max-w-sm w-full"
              >
                <button
                  onClick={() => setShowAllSongsModal(false)}
                  className="absolute top-4 right-4 p-1.5 text-primary/60 hover:text-primary hover:bg-primary/5 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
                <div className="text-center mb-6">
                  <Music size={26} className="text-secondary mx-auto mb-2" />
                  <h3 className="font-serif text-xl text-primary">Playlist de los invitados</h3>
                  <p className="text-xs text-secondary mt-1">{musicList.length} canciones sugeridas</p>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  {musicList.map((song, index) => (
                    <div key={song.id} className="flex items-center justify-between bg-bg-warm/30 p-2.5 rounded text-[11px] border border-primary/5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[10px] font-bold text-primary/40 font-sans w-4 shrink-0">#{index + 1}</span>
                        <div className="min-w-0 truncate">
                          <span className="font-bold text-primary">{song.title}</span>
                          <span className="text-secondary"> — {song.artist}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleVoteSong(song.id)}
                        className="flex items-center space-x-1 px-2 py-1 hover:bg-primary/5 rounded font-sans text-[10px] text-secondary border border-primary/10 transition-colors shrink-0 ml-2"
                      >
                        <Heart size={9} className="fill-primary/20 text-primary" />
                        <span>{song.votes}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* LIGHTBOX FOR PHOTOS */}
        <AnimatePresence>
          {activePhoto && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 select-none"
              onClick={() => setActivePhoto(null)}
            >
              {/* Backdrop overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#1e1e12]/92 backdrop-blur-md"
              />

              {/* Main image container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="relative max-w-4xl w-full h-[70vh] md:h-[80vh] z-50 flex items-center justify-center cursor-default"
              >
                <div className="relative w-full h-full rounded border border-white/10 overflow-hidden shadow-2xl">
                  <Image
                    src={activePhoto}
                    alt="Nuestros momentos ampliada"
                    fill
                    sizes="100vw"
                    className="object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Close button */}
                <button
                  onClick={() => setActivePhoto(null)}
                  className="absolute -top-12 right-0 md:-top-10 md:-right-10 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                >
                  <X size={24} />
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </motion.div>

      <AnimatePresence>
        {!showMain && (
          <EnvelopeIntro
            onStartExit={() => setShowMain(true)}
            onComplete={() => setShowMain(true)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
