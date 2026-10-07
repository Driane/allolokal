import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Clock, ArrowLeft, AlertCircle, Loader2, Calendar, Plus, X, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useIsNative } from '../hooks/useIsNative';
import HScroll from '../components/ui/HScroll';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TimeSlot {
  id?: string;
  tempId: string;
  slot_start: string;
  slot_end: string;
}

interface DayAvailability {
  day_of_week: number;
  is_enabled: boolean;
  slots: TimeSlot[];
}

// Résultat de validation : liste de paires en conflit (par tempId)
interface OverlapConflict {
  dayOfWeek: number;
  slotA: string; // tempId
  slotB: string; // tempId
}

const MAX_SLOTS = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────
let _counter = 0;
const uid = () => `tmp_${++_counter}`;

const timeToMins = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

const minsToTime = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const defaultSlots = (): TimeSlot[] => [
  { tempId: uid(), slot_start: '09:00', slot_end: '12:00' },
  { tempId: uid(), slot_start: '14:00', slot_end: '18:00' },
];

const defaultDay = (dow: number): DayAvailability => ({
  day_of_week: dow, is_enabled: true, slots: defaultSlots(),
});

// Détecte les chevauchements pour un jour donné
const detectOverlaps = (slots: TimeSlot[]): Array<[string, string]> => {
  const conflicts: Array<[string, string]> = [];
  const enabled = slots.filter(s => s.slot_start && s.slot_end && s.slot_start < s.slot_end);
  for (let i = 0; i < enabled.length; i++) {
    for (let j = i + 1; j < enabled.length; j++) {
      const aStart = timeToMins(enabled[i].slot_start);
      const aEnd   = timeToMins(enabled[i].slot_end);
      const bStart = timeToMins(enabled[j].slot_start);
      const bEnd   = timeToMins(enabled[j].slot_end);
      // Chevauchement si les intervalles se croisent
      if (aStart < bEnd && bStart < aEnd) {
        conflicts.push([enabled[i].tempId, enabled[j].tempId]);
      }
    }
  }
  return conflicts;
};



// ─── Component ────────────────────────────────────────────────────────────────
const AvailabilityPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isNative = useIsNative();
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const DAYS_LABELS = [
    t('days.sunday'), t('days.monday'), t('days.tuesday'),
    t('days.wednesday'), t('days.thursday'), t('days.friday'), t('days.saturday'),
  ];
  const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

  const [days, setDays] = useState<DayAvailability[]>(
    [0,1,2,3,4,5,6].map(defaultDay)
  );

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAvailabilities = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: newSlots, error } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('pro_id', user.id)
      .order('slot_start', { ascending: true });

    if (!error && newSlots && newSlots.length > 0) {
      const grouped: Record<number, TimeSlot[]> = {};
      for (const row of newSlots) {
        if (!grouped[row.day_of_week]) grouped[row.day_of_week] = [];
        grouped[row.day_of_week].push({
          id: row.id, tempId: row.id,
          slot_start: row.slot_start.substring(0, 5),
          slot_end:   row.slot_end.substring(0, 5),
        });
      }
      const { data: legacy } = await supabase.from('availabilities').select('day_of_week, is_enabled').eq('pro_id', user.id);
      const disabled = new Set((legacy || []).filter(d => !d.is_enabled).map(d => d.day_of_week));
      setDays([0,1,2,3,4,5,6].map(dow => ({
        day_of_week: dow,
        is_enabled: !disabled.has(dow),
        slots: grouped[dow]?.length ? grouped[dow] : [{ tempId: uid(), slot_start: '09:00', slot_end: '17:00' }],
      })));
    } else {
      // Fallback ancienne table
      const { data: legacy } = await supabase.from('availabilities').select('*').eq('pro_id', user.id);
      if (legacy?.length) {
        setDays([0,1,2,3,4,5,6].map(dow => {
          const found = legacy.find(d => d.day_of_week === dow);
          if (!found) return defaultDay(dow);
          const slots: TimeSlot[] = [];
          if (found.slot1_start && found.slot1_end) slots.push({ tempId: uid(), slot_start: found.slot1_start.substring(0,5), slot_end: found.slot1_end.substring(0,5) });
          if (found.slot2_start && found.slot2_end) slots.push({ tempId: uid(), slot_start: found.slot2_start.substring(0,5), slot_end: found.slot2_end.substring(0,5) });
          return { day_of_week: dow, is_enabled: found.is_enabled, slots: slots.length ? slots : [{ tempId: uid(), slot_start: '09:00', slot_end: '17:00' }] };
        }));
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAvailabilities(); }, [fetchAvailabilities]);

  // ── Mutations locales ──────────────────────────────────────────────────────
  const toggleDay = (dow: number) =>
    setDays(prev => prev.map(d => d.day_of_week === dow ? { ...d, is_enabled: !d.is_enabled } : d));

  const addSlot = (dow: number) => {
    setDays(prev => prev.map(d => {
      if (d.day_of_week !== dow || d.slots.length >= MAX_SLOTS) return d;
      const last = d.slots[d.slots.length - 1];
      const endMins  = timeToMins(last.slot_end);
      const newStart = minsToTime(Math.min(endMins + 30, 22 * 60));
      const newEnd   = minsToTime(Math.min(endMins + 90, 23 * 60));
      return { ...d, slots: [...d.slots, { tempId: uid(), slot_start: newStart, slot_end: newEnd }] };
    }));
  };

  const removeSlot = (dow: number, tempId: string) =>
    setDays(prev => prev.map(d => {
      if (d.day_of_week !== dow || d.slots.length <= 1) return d;
      return { ...d, slots: d.slots.filter(s => s.tempId !== tempId) };
    }));

  const updateSlotTime = (dow: number, tempId: string, field: 'slot_start' | 'slot_end', value: string) => {
    setDays(prev => prev.map(d => {
      if (d.day_of_week !== dow) return d;
      return {
        ...d,
        slots: d.slots.map(s => {
          if (s.tempId !== tempId) return s;
          const updated = { ...s, [field]: value };
          // Auto-correct end < start (sans créer de chevauchement automatiquement)
          if (field === 'slot_start' && timeToMins(value) >= timeToMins(updated.slot_end)) {
            const newEndMins = timeToMins(value) + 60;
            updated.slot_end = minsToTime(Math.min(newEndMins, 23 * 60));
          }
          if (field === 'slot_end' && timeToMins(value) <= timeToMins(updated.slot_start)) {
            const newStartMins = timeToMins(value) - 60;
            updated.slot_start = minsToTime(Math.max(newStartMins, 0));
          }
          return updated;
        }),
      };
    }));
  };

  // ── Validation globale ────────────────────────────────────────────────────
  const allConflicts: OverlapConflict[] = [];
  const conflictsByDay: Record<number, Set<string>> = {};

  for (const day of days) {
    if (!day.is_enabled) continue;
    const pairs = detectOverlaps(day.slots);
    if (pairs.length) {
      const set = new Set<string>();
      pairs.forEach(([a, b]) => {
        set.add(a); set.add(b);
        allConflicts.push({ dayOfWeek: day.day_of_week, slotA: a, slotB: b });
      });
      conflictsByDay[day.day_of_week] = set;
    }
  }

  const hasConflicts = allConflicts.length > 0;

  // ── Récap semaine ─────────────────────────────────────────────────────────
  const activeDaysCount = days.filter(d => d.is_enabled).length;
  const totalMins = days.reduce((acc, d) => {
    if (!d.is_enabled) return acc;
    return acc + d.slots.reduce((sum, s) => {
      const diff = timeToMins(s.slot_end) - timeToMins(s.slot_start);
      return sum + Math.max(0, diff);
    }, 0);
  }, 0);
  const totalH = Math.floor(totalMins / 60);
  const totalM = totalMins % 60;
  const todayDow = new Date().getDay();

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  const saveAvailabilities = async () => {
    if (hasConflicts) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert(t('errors.session_expired')); return; }

      await supabase.from('availability_slots').delete().eq('pro_id', user.id);

      const toInsert = days.flatMap(day =>
        day.is_enabled
          ? day.slots
              .filter(s => s.slot_start && s.slot_end && s.slot_start < s.slot_end)
              .map(s => ({ pro_id: user.id, day_of_week: day.day_of_week, slot_start: s.slot_start, slot_end: s.slot_end, is_enabled: true }))
          : []
      );

      if (toInsert.length) {
        const { error } = await supabase.from('availability_slots').insert(toInsert);
        if (error) throw error;
      }

      // Rétro-compat ancienne table
      await supabase.from('availabilities').upsert(
        days.map(d => ({
          pro_id: user.id, day_of_week: d.day_of_week, is_enabled: d.is_enabled,
          slot1_start: d.slots[0]?.slot_start || '09:00', slot1_end: d.slots[0]?.slot_end || '12:00',
          slot2_start: d.slots[1]?.slot_start || '14:00', slot2_end: d.slots[1]?.slot_end || '18:00',
        })),
        { onConflict: 'pro_id,day_of_week' }
      );

      setShowSuccess(true);
      await fetchAvailabilities();
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: unknown) {
      alert(`${t('errors.save_failed')}: ${err instanceof Error ? err.message : 'Erreur'}`);
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className={embedded ? 'flex items-center justify-center py-16' : 'min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center'}>
      <Loader2 className="w-12 h-12 text-[var(--color-accent)] animate-spin" />
    </div>
  );

  const inner = (
    <>
      {/* HEADER — affiché uniquement en mode page standalone */}
      {!embedded && (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <button onClick={() => navigate(-1)}
              className="group flex items-center gap-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-all bg-transparent border-none cursor-pointer font-black uppercase text-[10px] tracking-[0.3em]">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              {t('availability.back_dashboard')}
            </button>
            <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tight leading-[1.2]">
              {t('availability.title_my')} <span className="text-[var(--color-accent)]">{t('availability.title_planning')}</span>
            </h1>
          </div>
          <div className="hidden md:block text-right">
            <Calendar className="text-[var(--color-accent)]/20 mb-2 ml-auto" size={40} />
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{t('availability.recurring_config')}</p>
          </div>
        </div>
      )}

        {/* ─── RÉCAP SEMAINE ─────────────────────────────────────────────── */}
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-6 rounded-[2.5rem] mb-6">

          {/* Stats row */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[var(--color-accent-light)] flex items-center justify-center shrink-0">
                <Clock size={13} className="text-[var(--color-accent)]" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--color-text-muted)]">
                {t('availability.week_recap', 'Aperçu de la semaine')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                {activeDaysCount}&nbsp;{activeDaysCount > 1 ? t('availability.days_active', 'jours actifs') : t('availability.day_active', 'jour actif')}
              </span>
              <span className="bg-[var(--color-bg-primary)] text-[var(--color-text-muted)] text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-[var(--color-border)]">
                {totalH}h{totalM > 0 ? totalM : ''}&nbsp;/&nbsp;{t('availability.per_week', 'sem.')}
              </span>
            </div>
          </div>

          {/* Days grid — pleine largeur sur desktop, défilement horizontal sur petit écran
              plutôt que de comprimer 7 colonnes jusqu'à devenir illisible */}
          <HScroll className="-mx-1 px-1">
          <div className="grid grid-cols-7 gap-3 min-w-[560px] sm:min-w-0">
            {DISPLAY_ORDER.map(dow => {
              const dayData = days.find(d => d.day_of_week === dow)!;
              const label   = DAYS_LABELS[dow].substring(0, 3);
              const isToday = todayDow === dow;
              return (
                <div key={dow} className={`flex flex-col items-center gap-2.5 rounded-2xl py-4 px-2 transition-all duration-300 ${
                  dayData.is_enabled
                    ? isToday
                      ? 'bg-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/20'
                      : 'bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/25'
                    : 'bg-[var(--color-bg-primary)] border border-[var(--color-border)] opacity-25'
                }`}>

                  {/* Nom du jour + indicateur "aujourd'hui" */}
                  <div className="flex flex-col items-center gap-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      dayData.is_enabled
                        ? isToday ? 'text-white' : 'text-[var(--color-accent)]'
                        : 'text-[var(--color-text-muted)]'
                    }`}>
                      {label}
                    </span>
                    {isToday && dayData.is_enabled && (
                      <span className="text-[6px] font-black uppercase tracking-widest text-white/60 leading-none">
                        {t('availability.today', 'auj.')}
                      </span>
                    )}
                  </div>

                  {/* Créneaux */}
                  {dayData.is_enabled ? (
                    <div className="flex flex-col items-center gap-1.5 w-full">
                      {dayData.slots.map((slot, idx) => (
                        <div key={slot.tempId} className={`flex flex-col items-center w-full ${
                          idx > 0 ? `pt-1.5 border-t ${isToday ? 'border-white/15' : 'border-[var(--color-border)]'}` : ''
                        }`}>
                          <span className={`text-[11px] font-black tabular-nums leading-snug ${isToday ? 'text-white' : 'text-[var(--color-text-main)]'}`}>
                            {slot.slot_start}
                          </span>
                          <span className={`text-[9px] leading-none my-0.5 ${isToday ? 'text-white/40' : 'text-[var(--color-text-muted)]'}`}>↓</span>
                          <span className={`text-[11px] font-black tabular-nums leading-snug ${isToday ? 'text-white' : 'text-[var(--color-text-main)]'}`}>
                            {slot.slot_end}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-base text-[var(--color-text-muted)] leading-none">—</span>
                  )}
                </div>
              );
            })}
          </div>
          </HScroll>
        </div>

        {/* INFO BOX */}
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-8 rounded-[2.5rem] mb-8 flex items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent-light)] flex items-center justify-center shrink-0">
            <AlertCircle className="text-[var(--color-accent)]" size={24} />
          </div>
          <p className="text-sm text-[var(--color-text-muted)] italic leading-relaxed">
            {t('availability.info_text_1')}<br />{t('availability.info_text_3')}
          </p>
        </div>

        {/* BANDEAU ERREUR CHEVAUCHEMENT GLOBAL */}
        {hasConflicts && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 mb-8 flex items-center gap-4">
            <AlertTriangle size={20} className="text-red-400 shrink-0" />
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-red-400 mb-1">
                {t('availability.overlap_error', 'Chevauchement détecté')}
              </p>
              <p className="text-xs text-red-300/70 italic">
                {t('availability.overlap_hint', 'Corrigez les plages en conflit avant de sauvegarder.')}
              </p>
            </div>
          </div>
        )}

        {/* GRILLE JOURS */}
        <div className="grid gap-5 mb-20">
          {DISPLAY_ORDER.map(dow => {
            const dayData = days.find(d => d.day_of_week === dow)!;
            const dayConflicts = conflictsByDay[dow] ?? new Set<string>();
            const hasDayConflict = dayConflicts.size > 0;
            const canAdd = dayData.is_enabled && dayData.slots.length < MAX_SLOTS;

            return (
              <div key={dow}
                className={`p-8 rounded-[3rem] border transition-all duration-300 ${
                  !dayData.is_enabled
                    ? 'bg-transparent border-[var(--color-border)] opacity-30 grayscale'
                    : hasDayConflict
                    ? 'bg-red-500/5 border-red-500/40 shadow-lg'
                    : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)] shadow-xl'
                }`}>

                <div className="flex flex-col xl:flex-row xl:items-start gap-6">

                  {/* Toggle switch + Nom du jour */}
                  <div className="flex items-center gap-5 min-w-[200px] shrink-0">
                    <button
                      role="switch"
                      aria-checked={dayData.is_enabled}
                      onClick={() => toggleDay(dow)}
                      className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer border-none shrink-0 ${
                        dayData.is_enabled
                          ? hasDayConflict ? 'bg-red-500' : 'bg-[var(--color-accent)]'
                          : 'bg-[var(--color-bg-tertiary)]'
                      }`}
                    >
                      <span className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-md transition-transform duration-200 ${
                        dayData.is_enabled ? 'translate-x-[23px]' : 'translate-x-[3px]'
                      }`} />
                    </button>
                    <div>
                      <span className={`block text-2xl font-black italic uppercase tracking-tighter ${hasDayConflict ? 'text-red-400' : 'text-[var(--color-text-main)]'}`}>
                        {DAYS_LABELS[dow]}
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${hasDayConflict ? 'text-red-400' : 'text-[var(--color-accent)]/50'}`}>
                        {!dayData.is_enabled
                          ? t('availability.status_off')
                          : hasDayConflict
                          ? t('availability.overlap_error', 'Conflit détecté')
                          : `${dayData.slots.length} ${dayData.slots.length > 1 ? 'plages' : 'plage'}`
                        }
                      </span>
                    </div>
                  </div>

                  {/* Slots */}
                  {dayData.is_enabled && (
                    <div className="flex-1 space-y-3">
                      {dayData.slots.map((slot) => {
                        const isConflicting = dayConflicts.has(slot.tempId);
                        return (
                          <div key={slot.tempId}
                            className="flex items-center gap-3 flex-wrap">

                            {/* Bloc horaire avec X en coin supérieur droit */}
                            <div className={`relative flex items-center gap-2 bg-[var(--color-bg-primary)] p-2.5 rounded-2xl border shadow-inner transition-colors ${
                              isConflicting ? 'border-red-500/50 ring-1 ring-red-500/30' : 'border-[var(--color-border)]'
                            }`}>
                              <div className="flex items-center gap-3 px-3 py-1.5">
                                <Clock size={14} className={isConflicting ? 'text-red-400' : 'text-[var(--color-accent)]'} />
                                <input type="time" value={slot.slot_start}
                                  onChange={e => updateSlotTime(dow, slot.tempId, 'slot_start', e.target.value)}
                                  className="bg-transparent border-none text-base text-[var(--color-text-main)] font-black outline-none cursor-pointer hover:text-[var(--color-accent)] w-[88px]" />
                              </div>
                              <span className="text-[var(--color-text-muted)] font-bold text-sm">→</span>
                              <div className="flex items-center gap-3 px-3 py-1.5">
                                <input type="time" value={slot.slot_end}
                                  onChange={e => updateSlotTime(dow, slot.tempId, 'slot_end', e.target.value)}
                                  className="bg-transparent border-none text-base text-[var(--color-text-main)] font-black outline-none cursor-pointer hover:text-[var(--color-accent)] w-[88px]" />
                              </div>
                              {dayData.slots.length > 1 && (
                                <button onClick={() => removeSlot(dow, slot.tempId)} title={t('availability.remove_slot')}
                                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center transition-all cursor-pointer shadow-sm">
                                  <X size={10} />
                                </button>
                              )}
                            </div>

                            {/* Message conflit inline */}
                            {isConflicting && (
                              <span className="text-[9px] font-black text-red-400 uppercase tracking-wider flex items-center gap-1">
                                <AlertTriangle size={10} /> {t('availability.overlap_inline', 'Chevauchement')}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* Bouton ajouter */}
                      {canAdd ? (
                        <button onClick={() => addSlot(dow)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-accent-light)] border border-[var(--color-accent)]/30 text-[var(--color-accent)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-accent)] hover:text-white transition-all border-none cursor-pointer mt-1">
                          <Plus size={13} /> {t('availability.add_slot')}
                        </button>
                      ) : dayData.slots.length >= MAX_SLOTS ? (
                        <span className="text-[9px] text-[var(--color-text-muted)] italic ml-1 mt-1 block">
                          {t('availability.max_slots_reached')}
                        </span>
                      ) : null}
                    </div>
                  )}

                  {!dayData.is_enabled && (
                    <div className="flex-1 flex items-center">
                      <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest italic">
                        {t('availability.status_off')} — cliquez sur le bouton pour activer
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* BARRE SAVE FIXE — décalée au-dessus de la BottomTabBar en natif pour ne pas être masquée */}
        <div className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-4xl z-50"
          style={{ bottom: isNative ? 'calc(64px + env(safe-area-inset-bottom) + 0.75rem)' : '3rem' }}>
          <div className={`backdrop-blur-2xl border p-4 rounded-[3rem] flex justify-between items-center shadow-2xl transition-colors ${
            hasConflicts
              ? 'bg-red-950/80 border-red-500/30'
              : 'bg-[var(--color-bg-secondary)]/90 border-[var(--color-border)]'
          }`}>
            <div className="hidden sm:flex items-center gap-4 ml-8">
              <div className={`w-3 h-3 rounded-full transition-colors ${
                hasConflicts ? 'bg-red-500 animate-pulse' : showSuccess ? 'bg-emerald-500 animate-ping' : 'bg-[var(--color-accent)]'
              }`} />
              <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${hasConflicts ? 'text-red-400' : 'text-[var(--color-text-muted)]'}`}>
                {hasConflicts
                  ? t('availability.overlap_error', 'Chevauchements à corriger')
                  : showSuccess
                  ? t('availability.saved_msg')
                  : t('availability.planner_label')
                }
              </p>
            </div>

            <button onClick={saveAvailabilities} disabled={saving || hasConflicts}
              title={hasConflicts ? t('availability.overlap_error', 'Corrigez les chevauchements') : ''}
              className={`w-full sm:w-auto group px-12 py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-4 border-none cursor-pointer active:scale-95 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed ${
                hasConflicts
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-[var(--color-text-main)] hover:bg-[var(--color-accent)] text-[var(--color-bg-primary)] hover:text-white'
              }`}>
              {saving
                ? <Loader2 className="animate-spin" size={20} />
                : hasConflicts
                ? <AlertTriangle size={20} />
                : <Save size={20} className="group-hover:rotate-12 transition-transform" />
              }
              {hasConflicts
                ? t('availability.fix_conflicts', 'Corriger les conflits')
                : t('availability.save_button')
              }
            </button>
          </div>
        </div>
    </>
  );

  if (embedded) {
    return <div className="pb-40">{inner}</div>;
  }

  return (
    <div className={`min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-main)] px-6 md:px-12 ${isNative ? 'pt-6 pb-10' : 'pt-32 pb-40'}`}>
      <div className="max-w-6xl mx-auto">
        {inner}
      </div>
    </div>
  );
};

export default AvailabilityPage;