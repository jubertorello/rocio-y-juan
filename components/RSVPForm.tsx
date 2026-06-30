'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Check, ChevronLeft, ChevronRight, Info, Minus, Plus, Smile, Frown, Heart } from 'lucide-react';
import { weddingConfig } from '@/lib/config';

export interface CompanionData {
  name: string;
  hasIntolerance: boolean;
  intolerance: string;
  busIda: boolean;
  busVuelta: boolean;
}

export interface RSVPState {
  attending: boolean;
  guestName: string;
  hasIntolerance: boolean;
  dietaryRestrictions: string;
  busIda: boolean;
  busVuelta: boolean;
  companions: CompanionData[];
  message: string;
  submittedAt: string;
}

interface RSVPFormProps {
  onSubmitted: (data: RSVPState) => void;
  onEdit?: () => void;
  rsvpData: RSVPState | null;
  formSubmitted: boolean;
}

function YesNoToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`flex-1 py-2.5 rounded text-xs font-sans uppercase tracking-[0.15em] transition-all duration-200 border ${value ? 'bg-primary text-white border-primary' : 'bg-white text-secondary border-primary/20 hover:border-primary/50'
          }`}
      >
        Sí
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`flex-1 py-2.5 rounded text-xs font-sans uppercase tracking-[0.15em] transition-all duration-200 border ${!value ? 'bg-primary text-white border-primary' : 'bg-white text-secondary border-primary/20 hover:border-primary/50'
          }`}
      >
        No
      </button>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] uppercase tracking-wider font-sans text-secondary font-semibold mb-2">
      {children}
    </label>
  );
}

function GuestFields({
  nameLabel, name, onName,
  hasIntolerance, onHasIntolerance, intolerance, onIntolerance,
  busIda, onBusIda, busVuelta, onBusVuelta,
}: {
  nameLabel: string; name: string; onName: (v: string) => void;
  hasIntolerance: boolean; onHasIntolerance: (v: boolean) => void;
  intolerance: string; onIntolerance: (v: string) => void;
  busIda: boolean; onBusIda: (v: boolean) => void;
  busVuelta: boolean; onBusVuelta: (v: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <FieldLabel>{nameLabel} *</FieldLabel>
        <input
          type="text"
          placeholder="Nombre y apellidos"
          value={name}
          onChange={(e) => onName(e.target.value)}
          className="w-full bg-bg-warm/30 border border-primary/20 rounded p-3 text-primary focus:outline-none focus:border-primary focus:bg-bg-warm/50 transition-colors text-[16px] font-sans"
        />
      </div>
      <div>
        <FieldLabel>¿Tienes intolerancia o alergia alimentaria?</FieldLabel>
        <YesNoToggle value={hasIntolerance} onChange={onHasIntolerance} />
        <AnimatePresence>
          {hasIntolerance && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <input
                type="text"
                placeholder="Ej. celíaco, alergia a frutos secos..."
                value={intolerance}
                onChange={(e) => onIntolerance(e.target.value)}
                className="w-full mt-2 bg-bg-warm/30 border border-primary/20 rounded p-3 text-primary focus:outline-none focus:border-primary focus:bg-bg-warm/50 transition-colors text-[16px] font-sans"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function RSVPForm({ onSubmitted, onEdit, rsvpData, formSubmitted }: RSVPFormProps) {
  const topRef = useRef<HTMLDivElement>(null);
  const [attending, setAttending] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [guestName, setGuestName] = useState('');
  const [hasIntolerance, setHasIntolerance] = useState(false);
  const [intolerance, setIntolerance] = useState('');
  const [busIda, setBusIda] = useState(false);
  const [busVuelta, setBusVuelta] = useState(false);

  const [companionCount, setCompanionCount] = useState(0);
  const [companions, setCompanions] = useState<CompanionData[]>([]);
  const [message, setMessage] = useState('');

  const updateCompanionCount = (delta: number) => {
    const next = Math.max(0, Math.min(7, companionCount + delta));
    setCompanionCount(next);
    setCompanions((prev) => {
      if (next > prev.length) {
        const added: CompanionData[] = Array.from({ length: next - prev.length }, () => ({
          name: '', hasIntolerance: false, intolerance: '', busIda: false, busVuelta: false,
        }));
        return [...prev, ...added];
      }
      return prev.slice(0, next);
    });
  };

  const updateCompanion = (index: number, field: keyof CompanionData, value: string | boolean) => {
    setCompanions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const dataToSave = {
        client_id: 'rocio-y-juan',
        attending: attending ?? true,
        guest_name: guestName.trim() || null,
        dietary_restrictions: attending && hasIntolerance ? intolerance.trim() : '',
        bus_ida: attending ? busIda : false,
        bus_vuelta: attending ? busVuelta : false,
        message: message.trim(),
      };

      const { data, error } = await supabase.from('rsvps').insert([dataToSave]).select().single();

      if (!error && data) {
        if (attending && companions.length > 0) {
          await supabase.from('rsvps').insert(
            companions.map((c) => ({
              client_id: 'rocio-y-juan',
              parent_rsvp_id: data.id,
              attending: true,
              guest_name: c.name.trim(),
              dietary_restrictions: c.hasIntolerance ? c.intolerance.trim() : '',
              bus_ida: c.busIda,
              bus_vuelta: c.busVuelta,
              message: '',
            }))
          );
        }

        const savedState: RSVPState = {
          attending: data.attending ?? true,
          guestName: data.guest_name || '',
          hasIntolerance,
          dietaryRestrictions: data.dietary_restrictions || '',
          busIda: data.bus_ida === true,
          busVuelta: data.bus_vuelta === true,
          companions,
          message: data.message || '',
          submittedAt: data.created_at,
        };
        localStorage.setItem('wedding_rsvp_status', JSON.stringify(savedState));
        onSubmitted(savedState);
      } else {
        alert('Hubo un error al enviar tu confirmación. Por favor, inténtalo de nuevo.');
        console.error(error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Submitted confirmation screen
  if (formSubmitted && rsvpData) {
    return (
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center p-3.5 bg-primary/10 text-primary rounded-full mb-6">
          <Heart size={28} className="fill-primary/20" />
        </div>
        {rsvpData.attending ? (
          <>
            <h4 className="font-serif text-xl text-primary mb-3">¡Confirmado con éxito!</h4>
            <p className="font-sans text-sm text-secondary mb-6 leading-relaxed">
              ¡Tenemos muchísima ilusión por vivir este día tan bonito a tu lado!
            </p>
            <div className="bg-bg-warm/40 p-4 rounded text-left font-sans text-xs text-primary mb-8 space-y-2 border border-primary/5">
              <div><span className="font-semibold uppercase tracking-wider text-[10px] text-secondary">Invitado</span><br />{rsvpData.guestName}</div>
              <div><span className="font-semibold uppercase tracking-wider text-[10px] text-secondary">Intolerancia</span><br />{rsvpData.dietaryRestrictions || 'Ninguna'}</div>
              {rsvpData.companions.length > 0 && (
                <div>
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-secondary">Acompañantes</span>
                  <ul className="mt-1 space-y-1 pl-2">
                    {rsvpData.companions.map((c, i) => (
                      <li key={i} className="text-secondary">
                        {c.name}
                        {c.hasIntolerance && c.intolerance ? ` · ${c.intolerance}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {rsvpData.message && (
                <div><span className="font-semibold uppercase tracking-wider text-[10px] text-secondary">Mensaje</span><br />{rsvpData.message}</div>
              )}
            </div>
          </>
        ) : (
          <>
            <h4 className="font-serif text-xl text-primary mb-3">Gracias por avisarnos</h4>
            <p className="font-sans text-sm text-secondary mb-6 leading-relaxed">
              Lamentamos que no puedas acompañarnos, ¡te echaremos de menos!
            </p>
            {rsvpData.message && (
              <div className="bg-bg-warm/40 p-4 rounded text-left font-sans text-xs text-primary mb-8 border border-primary/5">
                <span className="font-semibold uppercase tracking-wider text-[10px] text-secondary">Tu mensaje</span><br />{rsvpData.message}
              </div>
            )}
          </>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="mt-4 w-full py-3 border border-primary/25 text-primary hover:bg-bg-warm/50 font-sans text-[10px] uppercase tracking-[0.2em] rounded-full transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
          >
            Rellenar otro formulario
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 text-sm" ref={topRef}>
      <div className="text-center">
        <p className="font-serif text-lg text-primary mb-1">¿Podrás acompañarnos?</p>
        <p className="text-xs text-secondary mb-5">
          Por favor, confirma tu asistencia antes del 24 de septiembre
        </p>
      </div>

      {/* Attendance selection */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={() => setAttending(true)}
          className={`flex-1 py-4 font-sans text-xs uppercase tracking-[0.2em] rounded-full transition-all duration-300 shadow border cursor-pointer ${attending === true
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-primary border-primary/20 hover:border-primary/50'
            }`}
        >
          Sí, asistiré 🎉
        </button>
        <button
          type="button"
          onClick={() => setAttending(false)}
          className={`flex-1 py-4 font-sans text-xs uppercase tracking-[0.2em] rounded-full transition-all duration-300 shadow border cursor-pointer ${attending === false
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-primary border-primary/20 hover:border-primary/50'
            }`}
        >
          No podré asistir
        </button>
      </div>

      <AnimatePresence mode="wait">
        {attending === true && (
          <motion.div
            key="attending-fields"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Guest Name & Intolerances */}
            <GuestFields
              nameLabel="Nombre y Apellidos"
              name={guestName}
              onName={setGuestName}
              hasIntolerance={hasIntolerance}
              onHasIntolerance={setHasIntolerance}
              intolerance={intolerance}
              onIntolerance={setIntolerance}
              busIda={busIda}
              onBusIda={setBusIda}
              busVuelta={busVuelta}
              onBusVuelta={setBusVuelta}
            />

            {/* Companions Section */}
            <div className="border-t border-primary/10 pt-6">
              <p className="text-[11px] uppercase tracking-wider font-sans text-secondary font-semibold text-center mb-1">
                ¿Vendrás con acompañante(s)?
              </p>

              <div className="flex items-center justify-center gap-5 mb-5">
                <button
                  type="button"
                  onClick={() => updateCompanionCount(-1)}
                  disabled={companionCount === 0}
                  className="w-9 h-9 rounded-full border border-primary/25 flex items-center justify-center text-primary hover:bg-bg-warm transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Minus size={14} />
                </button>
                <span className="font-serif text-2xl text-primary w-8 text-center">{companionCount}</span>
                <button
                  type="button"
                  onClick={() => updateCompanionCount(1)}
                  disabled={companionCount === 7}
                  className="w-9 h-9 rounded-full border border-primary/25 flex items-center justify-center text-primary hover:bg-bg-warm transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Plus size={14} />
                </button>
              </div>
              <p className="text-center text-[10px] text-secondary mt-2 mb-4 font-sans">
                {companionCount === 0 ? 'Sin acompañantes' : companionCount === 1 ? '1 acompañante' : `${companionCount} acompañantes`}
              </p>
            </div>

            {/* Companions Fields */}
            <div className="space-y-4">
              <AnimatePresence>
                {companions.map((c, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.2, delay: i * 0.05 }}
                    className="border border-primary/10 rounded p-4 bg-white/60 space-y-4 text-left"
                  >
                    <p className="text-[10px] uppercase tracking-wider font-sans text-secondary font-semibold">
                      Acompañante {i + 1}
                    </p>
                    <GuestFields
                      nameLabel="Nombre y Apellidos"
                      name={c.name}
                      onName={(v) => updateCompanion(i, 'name', v)}
                      hasIntolerance={c.hasIntolerance}
                      onHasIntolerance={(v) => updateCompanion(i, 'hasIntolerance', v)}
                      intolerance={c.intolerance}
                      onIntolerance={(v) => updateCompanion(i, 'intolerance', v)}
                      busIda={c.busIda}
                      onBusIda={(v) => updateCompanion(i, 'busIda', v)}
                      busVuelta={c.busVuelta}
                      onBusVuelta={(v) => updateCompanion(i, 'busVuelta', v)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Message input */}
            <div className="border-t border-primary/10 pt-6">
              <FieldLabel>¿Quieres dejar un mensaje a los novios? (opcional)</FieldLabel>
              <textarea
                rows={3}
                placeholder="Alguna dedicatoria, comentario adicional..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-bg-warm/30 border border-primary/20 rounded p-3 text-primary focus:outline-none focus:border-primary focus:bg-bg-warm/50 transition-colors text-[16px] font-sans"
              />
            </div>

            {/* Submit Button */}
            <button
              type="button"
              disabled={submitting || !guestName.trim() || companions.some((c) => !c.name.trim())}
              onClick={handleSubmit}
              className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white tracking-[0.2em] font-sans text-[10px] uppercase rounded-full transition-all duration-300 shadow hover:shadow-md flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-bold"
            >
              {submitting ? 'Enviando...' : 'Confirmar Asistencia'}
            </button>
          </motion.div>
        )}

        {attending === false && (
          <motion.div
            key="not-attending-fields"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {/* Guest Name */}
            <div>
              <FieldLabel>Nombre y Apellidos *</FieldLabel>
              <input
                type="text"
                placeholder="Nombre y apellidos"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full bg-bg-warm/30 border border-primary/20 rounded p-3 text-primary focus:outline-none focus:border-primary focus:bg-bg-warm/50 transition-colors text-[16px] font-sans"
              />
            </div>

            {/* Message input */}
            <div>
              <FieldLabel>¿Quieres dejar un mensaje a los novios? (opcional)</FieldLabel>
              <textarea
                rows={3}
                placeholder="Alguna dedicatoria o comentario..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-bg-warm/30 border border-primary/20 rounded p-3 text-primary focus:outline-none focus:border-primary focus:bg-bg-warm/50 transition-colors text-[16px] font-sans"
              />
            </div>

            {/* Submit Button */}
            <button
              type="button"
              disabled={submitting || !guestName.trim()}
              onClick={handleSubmit}
              className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white tracking-[0.2em] font-sans text-[10px] uppercase rounded-full transition-all duration-300 shadow hover:shadow-md flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-bold"
            >
              {submitting ? 'Enviando...' : 'Confirmar'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
