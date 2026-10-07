import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Loader2, Check, ChevronLeft, ChevronRight,
  AlertCircle,
  X, Lock, Plane, Stethoscope, ExternalLink,
  HelpCircle, Home, Store, UserCheck, Plus
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DisputeModal from '../DisputeModal';
import { isWithinDisputeWindow } from '../../lib/disputes';
import { useModalBackButton } from '../../hooks/useModalBackButton';
import { confirmNative } from '../../lib/nativeConfirm';

// ─── Types ─────────────────────────────────────────────────────────────────────
type BlockType = 'external_booking' | 'holiday' | 'sick_leave' | 'vacation' | 'personal' | 'other';

interface CalendarBlock {
  id: string;
  title: string | null;
  block_type: BlockType;
  starts_at: string;
  ends_at: string;
  is_all_day: boolean;
  color: string | null;
  notes: string | null;
}

interface AvailabilityPeriod {
  id: string;
  pro_id: string;
  starts_on: string;
  ends_on: string;
  location_type: 'home' | 'store' | 'both';
}

interface Employee { id: string; full_name: string; avatar_url: string | null; }

// ─── Couleurs par type de bloc ─────────────────────────────────────────────────
const BLOCK_COLORS: Record<BlockType, { bg: string; border: string; text: string }> = {
  external_booking: { bg: '#f39c1220', border: '#f39c1260', text: '#f39c12' },
  holiday:          { bg: '#e7404020', border: '#e7404060', text: '#e74040' },
  sick_leave:       { bg: '#f1c40f20', border: '#f1c40f60', text: '#f1c40f' },
  vacation:         { bg: '#f9731620', border: '#f9731660', text: '#f97316' },
  personal:         { bg: '#a29bfe20', border: '#a29bfe60', text: '#a29bfe' },
  other:            { bg: '#6b728020', border: '#6b728060', text: '#9ca3af' },
};

// Couleurs réservations : domicile = vert, salon = bleu, externe = orange
const BOOKING_COLORS = {
  home:      { bg: '#10b98120', border: '#10b98180', text: '#10b981' },
  store:     { bg: '#3b82f620', border: '#3b82f680', text: '#3b82f6' },
  pending:   { bg: '#f59e0b20', border: '#f59e0b80', text: '#f59e0b' },
  disputed:  { bg: '#ef444420', border: '#ef444480', text: '#ef4444' },
  cancelled: { bg: '#6b728020', border: '#6b728060', text: '#9ca3af' },
};

const BLOCK_ICONS: Record<BlockType, React.ReactNode> = {
  external_booking: <ExternalLink size={11} />,
  holiday:          <AlertCircle  size={11} />,
  sick_leave:       <Stethoscope  size={11} />,
  vacation:         <Plane        size={11} />,
  personal:         <Lock         size={11} />,
  other:            <HelpCircle   size={11} />,
};

const BLOCK_TILE_TYPES: BlockType[] = ['external_booking', 'holiday', 'sick_leave', 'vacation', 'personal', 'other'];

const SLOT_HEIGHT = 56; // px par heure (h-14)
const START_HOUR  = 7;
const END_HOUR    = 23;
const HOURS       = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

// ─── BlockModal ────────────────────────────────────────────────────────────────
interface BlockModalProps {
  initialStartsAt: string;
  initialEndsAt:   string;
  initialType?:    BlockType;
  existingBlock?:  CalendarBlock | null;
  onSave:   (b: Omit<CalendarBlock, 'id'>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose:  () => void;
}

const BlockModal: React.FC<BlockModalProps> = ({
  initialStartsAt, initialEndsAt, initialType, existingBlock, onSave, onDelete, onClose,
}) => {
  const { t }   = useTranslation();
  useModalBackButton(true, onClose);
  const [title, setTitle]       = useState(existingBlock?.title || '');
  const [type,  setType]        = useState<BlockType>(existingBlock?.block_type || initialType || 'other');
  const [start, setStart]       = useState((existingBlock?.starts_at || initialStartsAt).substring(0, 16));
  const [end,   setEnd]         = useState((existingBlock?.ends_at   || initialEndsAt).substring(0, 16));
  const [allDay,setAllDay]      = useState(existingBlock?.is_all_day || false);
  const [notes, setNotes]       = useState(existingBlock?.notes || '');
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);

  const blockTypes: { value: BlockType; label: string; icon: React.ReactNode }[] = [
    { value: 'external_booking', label: t('calendar_block.types.external_booking'), icon: <ExternalLink size={13} /> },
    { value: 'holiday',          label: t('calendar_block.types.holiday'),          icon: <AlertCircle  size={13} /> },
    { value: 'sick_leave',       label: t('calendar_block.types.sick_leave'),       icon: <Stethoscope  size={13} /> },
    { value: 'vacation',         label: t('calendar_block.types.vacation'),         icon: <Plane        size={13} /> },
    { value: 'personal',         label: t('calendar_block.types.personal'),         icon: <Lock         size={13} /> },
    { value: 'other',            label: t('calendar_block.types.other'),            icon: <HelpCircle   size={13} /> },
  ];

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        title: title.trim() || null, block_type: type,
        starts_at: start + ':00', ends_at: end + ':00',
        is_all_day: allDay, color: null,
        notes: notes.trim() || null,
      });
      onClose();
    } finally { setSaving(false); }
  };

  const del = async () => {
    if (!onDelete || !await confirmNative({ message: t('calendar_block.delete_confirm'), danger: true })) return;
    setDeleting(true);
    try { await onDelete(); onClose(); }
    finally { setDeleting(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/80 backdrop-blur-md flex items-start justify-center px-4 pt-20 xl:pt-28 pb-8">
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-7 right-7 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] bg-transparent border-none cursor-pointer"><X size={22} /></button>

        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-[var(--color-text-main)] mb-1">{t('calendar_block.modal_title')}</h3>
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-7">{t('calendar_block.modal_subtitle')}</p>

        <div className="space-y-5">
          {/* Type */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2 block">{t('calendar_block.field_type')}</label>
            <div className="grid grid-cols-2 gap-2">
              {blockTypes.map(opt => {
                const c = BLOCK_COLORS[opt.value];
                const active = type === opt.value;
                return (
                  <button key={opt.value} type="button" onClick={() => setType(opt.value)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer"
                    style={active
                      ? { backgroundColor: c.bg, borderColor: c.border, color: c.text }
                      : { backgroundColor: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                    {opt.icon} {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Titre */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2 block">{t('calendar_block.field_title')}</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={100}
              placeholder={t('calendar_block.field_title_placeholder')}
              className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl px-4 py-3 text-sm text-[var(--color-text-main)] outline-none focus:border-[var(--color-accent)]/50" />
          </div>

          {/* All day toggle */}
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setAllDay(!allDay)}
              className={`relative w-10 h-6 rounded-full transition-colors border-none cursor-pointer ${allDay ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-strong)]'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${allDay ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
            <span className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{t('calendar_block.field_all_day')}</span>
          </div>

          {/* Dates */}
          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 block">{t('calendar_block.field_start')}</label>
                <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)}
                  className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-main)] outline-none focus:border-[var(--color-accent)]/50" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 block">{t('calendar_block.field_end')}</label>
                <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)}
                  className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-main)] outline-none focus:border-[var(--color-accent)]/50" />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2 block">{t('calendar_block.field_notes')}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={500}
              placeholder={t('calendar_block.field_notes_placeholder')}
              className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl px-4 py-3 text-sm text-[var(--color-text-main)] outline-none focus:border-[var(--color-accent)]/50 resize-none italic" />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          {existingBlock && onDelete && (
            <button onClick={del} disabled={deleting}
              className="p-3 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-2xl transition-all border-none cursor-pointer disabled:opacity-40">
              {deleting ? <Loader2 size={18} className="animate-spin" /> : <X size={18} />}
            </button>
          )}
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest text-[var(--color-text-muted)] border border-[var(--color-border)] bg-transparent hover:border-[var(--color-border-strong)] cursor-pointer transition-all">
            {t('calendar_block.btn_cancel')}
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white border-none cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : t('calendar_block.btn_save')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── BookingDetailModal ────────────────────────────────────────────────────────
interface ProBooking {
  id: string;
  booking_date: string;
  status: string;
  total_price?: number;
  pro_id?: string;
  employee_id?: string;
  services?: { title?: string; allow_home?: boolean; allow_store?: boolean; description?: string; category?: string };
  profiles?: { full_name?: string; avatar_url?: string };
}

interface BookingDetailModalProps {
  booking: ProBooking;
  onClose: () => void;
  onCancel: () => Promise<void>;
}

const BookingDetailModal: React.FC<BookingDetailModalProps> = ({ booking, onClose, onCancel }) => {
  const { t, i18n } = useTranslation();
  useModalBackButton(true, onClose);
  const [cancelling, setCancelling] = useState(false);

  const locType = booking.services?.allow_home ? 'home' : 'store';
  const colors  = locType === 'home' ? BOOKING_COLORS.home : BOOKING_COLORS.store;

  const doCancel = async () => {
    if (!await confirmNative({ message: t('pro.manage.cancel_confirm'), danger: true })) return;
    setCancelling(true);
    try { await onCancel(); onClose(); }
    finally { setCancelling(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/80 backdrop-blur-md flex items-start justify-center px-4 pt-20 xl:pt-28 pb-8">
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-7 right-7 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] bg-transparent border-none cursor-pointer"><X size={20} /></button>

        {/* Badge lieu */}
        <div className="flex items-center gap-2 mb-5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border"
            style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}>
            {locType === 'home' ? <Home size={11} /> : <Store size={11} />}
            {locType === 'home' ? t('service_form.location_home') : t('service_form.location_store')}
          </div>
          <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
            booking.status === 'confirmed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
            booking.status === 'pending'   ? 'bg-amber-500/10  border-amber-500/30  text-amber-400'  :
            'bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-muted)]'
          }`}>
            {t(`pro.status.${booking.status}`, booking.status)}
          </div>
        </div>

        <h3 className="text-xl font-black italic uppercase tracking-tighter text-[var(--color-text-main)] mb-1">{booking.services?.title}</h3>
        <p className="text-[var(--color-text-muted)] text-sm mb-6">{booking.profiles?.full_name}</p>

        <div className="space-y-3 mb-8 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest">{t('booking.label_date')}</span>
            <span className="font-bold text-[var(--color-text-main)]">
              {new Date(booking.booking_date).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest">{t('booking.label_time')}</span>
            <span className="font-bold text-[var(--color-text-main)]">
              {new Date(booking.booking_date).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest">{t('pro.booking_detail.amount')}</span>
            <span className="font-black text-[var(--color-text-main)] text-lg">{booking.total_price}€</span>
          </div>
        </div>

        {booking.status !== 'cancelled' && booking.status !== 'completed' && (
          <button onClick={doCancel} disabled={cancelling}
            className="w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 cursor-pointer transition-all disabled:opacity-40 flex items-center justify-center gap-2">
            {cancelling ? <Loader2 size={16} className="animate-spin" /> : <><X size={14} /> {t('pro.actions.cancel', 'Annuler le RDV')}</>}
          </button>
        )}
      </div>
    </div>
  );
};

// ─── ProView principal ─────────────────────────────────────────────────────────
interface ProViewProps { view?: 'calendar' | 'manage'; }

const ProView: React.FC<ProViewProps> = ({ view = 'manage' }) => {
  const { t, i18n } = useTranslation();
  const activeTab = view;
  const [bookings, setBookings]               = useState<ProBooking[]>([]);
  const [calendarBlocks, setCalendarBlocks]   = useState<CalendarBlock[]>([]);
  const [profile, setProfile]                 = useState<{ id?: string; full_name?: string; avatar_url?: string } | null>(null);
  const [employees, setEmployees]             = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [loading, setLoading]                 = useState(true);
  const [actionLoading, setActionLoading]     = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [currentWeekStart, setCurrentWeekStart]   = useState(new Date());

  // Modales
  const [blockModal, setBlockModal] = useState<{
    open: boolean; initialStartsAt: string; initialEndsAt: string; initialType?: BlockType; existingBlock?: CalendarBlock | null;
  }>({ open: false, initialStartsAt: '', initialEndsAt: '' });

  const [bookingDetailModal, setBookingDetailModal] = useState<{ open: boolean; booking: ProBooking | null }>({ open: false, booking: null });
  const [availabilityPeriods, setAvailabilityPeriods] = useState<AvailabilityPeriod[]>([]);
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [periodForm, setPeriodForm] = useState({ starts_on: '', ends_on: '', location_type: 'both' as 'home' | 'store' | 'both' });
  const [savingPeriod, setSavingPeriod] = useState(false);

  // Drag state — calculé depuis la position Y exacte dans la colonne
  const dragRef  = useRef<{ active: boolean; dayIndex: number; startHour: number; startMinute: number; endHour: number; endMinute: number }>({
    active: false, dayIndex: -1, startHour: -1, startMinute: 0, endHour: -1, endMinute: 0,
  });
  const [dragOverlay, setDragOverlay] = useState<{ dayIndex: number; startH: number; startM: number; endH: number; endM: number } | null>(null);

  // ── Chargement ───────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const [p, b, bl, ap] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('bookings').select(`*, services(title, allow_home, allow_store, description, category), profiles:client_id(full_name, avatar_url)`).eq('pro_id', user.id),
        supabase.from('calendar_blocks').select('*').eq('pro_id', user.id),
        supabase.from('availability_periods').select('*').eq('pro_id', user.id).order('starts_on'),
      ]);
      if (p.data) setProfile(p.data);
      setBookings(b.data || []);
      setCalendarBlocks(bl.data || []);
      setAvailabilityPeriods(ap.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Semaine ──────────────────────────────────────────────────────────────────
  const getDaysOfWeek = (start: Date) => {
    const days: Date[] = [];
    const curr = new Date(start);
    const d = curr.getDay();
    curr.setDate(curr.getDate() - d + (d === 0 ? -6 : 1));
    for (let i = 0; i < 7; i++) { days.push(new Date(curr)); curr.setDate(curr.getDate() + 1); }
    return days;
  };
  const days = getDaysOfWeek(currentWeekStart);

  const prevWeek = () => setCurrentWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const nextWeek = () => setCurrentWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });

  // ── Filtrage par employé ─────────────────────────────────────────────────────
  const filteredBookings = useMemo(() =>
    selectedEmployee === 'all'
      ? bookings
      : bookings.filter(b => b.employee_id === selectedEmployee || (!b.employee_id && selectedEmployee === profile?.id)),
  [bookings, selectedEmployee, profile]);

  // ── Données calendrier ────────────────────────────────────────────────────────
  const getBookingsForHour = (day: Date, hour: number) =>
    filteredBookings.filter(b => {
      const d = new Date(b.booking_date);
      return d.toDateString() === day.toDateString() && d.getHours() === hour;
    });

  // Les timestamps des blocs sont stockés sans fuseau → Supabase les traite comme UTC.
  // On compare donc la date UTC du bloc avec la date locale du jour du calendrier.
  const blockOnDay = (s: Date, e: Date, day: Date): boolean => {
    const lY = day.getFullYear(); const lM = day.getMonth(); const lD = day.getDate();
    const matchUTC = (d: Date) => d.getUTCFullYear() === lY && d.getUTCMonth() === lM && d.getUTCDate() === lD;
    return matchUTC(s) || matchUTC(e) || (s.getTime() < day.getTime() && e.getTime() > day.getTime());
  };

  const getBlocksForDay = (day: Date) =>
    calendarBlocks.filter(b => {
      const s = new Date(b.starts_at); const e = new Date(b.ends_at);
      return blockOnDay(s, e, day);
    });

  // ── Drag-to-create — calcul précis depuis offsetY dans la colonne ─────────────
  const hourMinFromY = (offsetY: number): [number, number] => {
    const totalMins = (offsetY / SLOT_HEIGHT) * 60 + START_HOUR * 60;
    const mins30    = Math.round(totalMins / 30) * 30; // snap aux 30 min
    const h = Math.floor(mins30 / 60);
    const m = mins30 % 60;
    return [Math.max(START_HOUR, Math.min(END_HOUR - 1, h)), m];
  };

  const getColumnY = (e: React.MouseEvent, colEl: HTMLDivElement): number => {
    const rect = colEl.getBoundingClientRect();
    return e.clientY - rect.top;
  };

  const toOverlayEnd = (h: number, m: number): [number, number] => {
    const raw = h * 60 + m + 30;
    return [Math.floor(raw / 60), raw % 60];
  };

  const onColumnMouseDown = (e: React.MouseEvent, dayIndex: number, colEl: HTMLDivElement) => {
    if ((e.target as HTMLElement).closest('[data-block]')) return; // clic sur un bloc existant
    e.preventDefault();
    const y = getColumnY(e, colEl);
    const [h, m] = hourMinFromY(y);
    dragRef.current = { active: true, dayIndex, startHour: h, startMinute: m, endHour: h, endMinute: m };
    const [eH, eM] = toOverlayEnd(h, m);
    setDragOverlay({ dayIndex, startH: h, startM: m, endH: eH, endM: eM });
  };

  const onColumnMouseMove = (e: React.MouseEvent, dayIndex: number, colEl: HTMLDivElement) => {
    if (!dragRef.current.active || dragRef.current.dayIndex !== dayIndex) return;
    const y = getColumnY(e, colEl);
    const [h, m] = hourMinFromY(y);
    dragRef.current.endHour   = h;
    dragRef.current.endMinute = m;
    const startTotal = dragRef.current.startHour * 60 + dragRef.current.startMinute;
    const endTotal   = h * 60 + m;
    if (endTotal >= startTotal) {
      const [eH, eM] = toOverlayEnd(h, m);
      setDragOverlay({ dayIndex, startH: dragRef.current.startHour, startM: dragRef.current.startMinute, endH: eH, endM: eM });
    }
  };

  const onColumnMouseUp = (dayIndex: number) => {
    if (!dragRef.current.active || dragRef.current.dayIndex !== dayIndex) return;
    const { startHour, startMinute, endHour, endMinute } = dragRef.current;
    const startTotal = startHour * 60 + startMinute;
    let   endTotal   = endHour * 60 + endMinute + 30;

    // Minimum 30 min
    if (endTotal - startTotal < 30) endTotal = startTotal + 30;

    const day     = days[dayIndex];
    const dateStr = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
    const pad     = (n: number) => String(n).padStart(2, '0');

    const sH = Math.floor(startTotal / 60); const sM = startTotal % 60;
    const eH = Math.floor(endTotal   / 60); const eM = endTotal   % 60;

    setBlockModal({
      open: true,
      initialStartsAt: `${dateStr}T${pad(sH)}:${pad(sM)}:00`,
      initialEndsAt:   `${dateStr}T${pad(eH)}:${pad(eM)}:00`,
    });
    dragRef.current.active = false;
    setDragOverlay(null);
  };

  const onCalendarMouseLeave = () => {
    if (dragRef.current.active) { dragRef.current.active = false; setDragOverlay(null); }
  };

  // Mouseup anywhere inside the calendar area completes the drag (even between columns)
  const onCalendarMouseUp = () => {
    if (!dragRef.current.active) return;
    onColumnMouseUp(dragRef.current.dayIndex);
  };

  // ── CRUD blocs ───────────────────────────────────────────────────────────────
  const saveBlock = async (data: Omit<CalendarBlock, 'id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Session expirée');
    if (blockModal.existingBlock) {
      const { error } = await supabase.from('calendar_blocks').update(data).eq('id', blockModal.existingBlock.id).eq('pro_id', user.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('calendar_blocks').insert({ ...data, pro_id: user.id });
      if (error) throw error;
    }
    await loadData();
  };

  const deleteBlock = async () => {
    if (!blockModal.existingBlock) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Session expirée');
    const { error } = await supabase.from('calendar_blocks').delete().eq('id', blockModal.existingBlock.id).eq('pro_id', user.id);
    if (error) throw error;
    await loadData();
  };

  // ── CRUD plages d'ouverture ────────────────────────────────────────────────────
  const savePeriod = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !periodForm.starts_on || !periodForm.ends_on) return;
    setSavingPeriod(true);
    const { data } = await supabase
      .from('availability_periods')
      .insert({ pro_id: user.id, ...periodForm })
      .select()
      .single();
    if (data) {
      setAvailabilityPeriods(prev => [...prev, data].sort((a, b) => a.starts_on.localeCompare(b.starts_on)));
      setShowPeriodForm(false);
      setPeriodForm({ starts_on: '', ends_on: '', location_type: 'both' });
    }
    setSavingPeriod(false);
  };

  const deletePeriod = async (id: string) => {
    await supabase.from('availability_periods').delete().eq('id', id);
    setAvailabilityPeriods(prev => prev.filter(p => p.id !== id));
  };

  // ── Statut réservations ───────────────────────────────────────────────────────
  const updateBookingStatus = async (bookingId: string, newStatus: 'confirmed' | 'cancelled') => {
    if (actionLoading) return;
    setActionLoading(bookingId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Session expirée');
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking || booking.pro_id !== user.id) throw new Error('Non autorisé');
      const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId).eq('pro_id', user.id);
      if (error) throw error;
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
    } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Erreur'); }
    finally { setActionLoading(null); }
  };

  const cancelBookingFromCalendar = async () => {
    if (!bookingDetailModal.booking) return;
    await updateBookingStatus(bookingDetailModal.booking.id, 'cancelled');
  };

  const canReportDispute = (bookingDate: string, status: string, category?: string) => {
    if (status === 'disputed' || status === 'cancelled') return false;
    return isWithinDisputeWindow(bookingDate, category);
  };

  const sortedBookings = useMemo(() => {
    const p = filteredBookings.filter(b => b.status === 'pending').sort((a,b) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime());
    const o = filteredBookings.filter(b => b.status !== 'pending').sort((a,b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime());
    return [...p, ...o];
  }, [filteredBookings]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--color-accent)]" size={48} /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-14">
      {/* ── Sélecteur de vue ─────────────────────────────────────────────────── */}

      {/* ── VUE AGENDA ─────────────────────────────────────────────────────────── */}
      {activeTab === 'calendar' && (<>

        {/* ── Plages d'ouverture ──────────────────────────────────────────────── */}
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[3rem] p-6 md:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-text-main)]">
              Plages d&apos;ouverture
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPeriodForm(v => !v)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:opacity-80 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-none cursor-pointer"
              >
                {showPeriodForm ? <X size={13} /> : <Plus size={13} />}
                {showPeriodForm ? 'Annuler' : 'Ajouter une plage'}
              </button>
            </div>
          </div>

          {showPeriodForm && (
            <div className="flex flex-wrap gap-3 items-end mb-4 p-4 bg-[var(--color-bg-primary)] rounded-2xl border border-[var(--color-border)]">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Du</label>
                <input type="date" value={periodForm.starts_on}
                  onChange={e => setPeriodForm(f => ({ ...f, starts_on: e.target.value }))}
                  className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-main)] rounded-xl px-3 py-2 text-xs font-black outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Au</label>
                <input type="date" value={periodForm.ends_on}
                  onChange={e => setPeriodForm(f => ({ ...f, ends_on: e.target.value }))}
                  className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-main)] rounded-xl px-3 py-2 text-xs font-black outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Type</label>
                <div className="flex gap-1">
                  {(['home', 'store', 'both'] as const).map(type => (
                    <button key={type} onClick={() => setPeriodForm(f => ({ ...f, location_type: type }))}
                      className="px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border-none cursor-pointer transition-all"
                      style={{
                        backgroundColor: periodForm.location_type === type
                          ? type === 'home' ? '#10b981' : type === 'store' ? '#3b82f6' : 'var(--color-accent)'
                          : 'var(--color-bg-secondary)',
                        color: periodForm.location_type === type ? 'white' : 'var(--color-text-muted)',
                      }}>
                      {type === 'home' ? 'Domicile' : type === 'store' ? 'Salon' : 'Les deux'}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={savePeriod} disabled={savingPeriod || !periodForm.starts_on || !periodForm.ends_on}
                className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] hover:opacity-80 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border-none cursor-pointer transition-all disabled:opacity-40">
                {savingPeriod ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Enregistrer
              </button>
            </div>
          )}

          {availabilityPeriods.length === 0 && !showPeriodForm && (
            <p className="text-[11px] text-[var(--color-text-muted)] italic">
              Aucune plage définie — les clients peuvent réserver à n&apos;importe quelle date.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {availabilityPeriods.map(period => {
              const color = period.location_type === 'home' ? '#10b981' : period.location_type === 'store' ? '#3b82f6' : 'var(--color-accent)';
              const label = period.location_type === 'home' ? 'Domicile' : period.location_type === 'store' ? 'Salon' : 'Les deux';
              return (
                <div key={period.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider"
                  style={{ borderColor: color + '60', backgroundColor: color + '18', color }}>
                  <span>{period.starts_on} → {period.ends_on}</span>
                  <span className="opacity-50">·</span>
                  <span>{label}</span>
                  <button onClick={() => deletePeriod(period.id)}
                    className="ml-1 hover:opacity-60 transition-opacity border-none bg-transparent cursor-pointer p-0"
                    style={{ color }}>
                    <X size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[3rem] p-6 md:p-10 shadow-2xl">

          {/* Contrôles */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
            <h2 className="text-3xl font-black italic uppercase text-[var(--color-text-main)] tracking-tighter">
              {days[0].toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
            </h2>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Légende couleurs */}
              <div className="hidden lg:flex items-center gap-3 mr-2">
                {[
                  { label: t('service_form.location_home'), color: BOOKING_COLORS.home.text, icon: <Home size={10} /> },
                  { label: t('service_form.location_store'), color: BOOKING_COLORS.store.text, icon: <Store size={10} /> },
                  { label: 'Congés', color: '#f97316', icon: <Plane size={10} /> },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider" style={{ color: l.color }}>
                    {l.icon}{l.label}
                  </div>
                ))}
              </div>

              {/* Filtre employé */}
              {employees.length > 0 && (
                <div className="flex items-center gap-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-xl px-3 py-2">
                  <UserCheck size={14} className="text-[var(--color-accent)]" />
                  <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}
                    className="bg-transparent text-[10px] font-black uppercase tracking-widest text-[var(--color-text-main)] outline-none border-none cursor-pointer">
                    <option value="all">{t('pro.calendar.all_employees')}</option>
                    <option value={profile?.id}>{profile?.full_name} {t('pro.calendar.me_suffix')}</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Nav semaine */}
              <div className="flex gap-2 bg-[var(--color-bg-primary)] p-1.5 rounded-2xl border border-[var(--color-border)]">
                <button onClick={prevWeek} className="p-3 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] text-[var(--color-text-main)] rounded-xl border-none cursor-pointer"><ChevronLeft size={20} /></button>
                <button onClick={() => setCurrentWeekStart(new Date())} className="px-6 py-1 bg-[var(--color-bg-tertiary)] text-[var(--color-text-main)] rounded-xl text-[10px] font-black uppercase border-none cursor-pointer hover:bg-[var(--color-border)]">{t('pro.calendar.today')}</button>
                <button onClick={nextWeek} className="p-3 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] text-[var(--color-text-main)] rounded-xl border-none cursor-pointer"><ChevronRight size={20} /></button>
              </div>
            </div>
          </div>

          {/* Grille calendrier + Sidebar blocs */}
          <div className="flex gap-6 items-start">
          <div className="flex-1 overflow-x-auto pb-4" onMouseLeave={onCalendarMouseLeave} onMouseUp={onCalendarMouseUp}>
            <div className="min-w-[860px] grid gap-2" style={{ gridTemplateColumns: '64px repeat(7, 1fr)' }}>

              {/* Colonne heures */}
              <div className="pt-[68px]">
                {HOURS.map(h => (
                  <div key={h} style={{ height: `${SLOT_HEIGHT}px` }} className="flex items-start justify-end pr-3 pt-1">
                    <span className="text-[10px] font-black text-[var(--color-text-muted)] italic">{h}:00</span>
                  </div>
                ))}
              </div>

              {/* Colonnes jours */}
              {days.map((day, dayIdx) => {
                const isToday = day.toDateString() === new Date().toDateString();
                const dayBlocks = getBlocksForDay(day);

                return (
                  <div key={dayIdx} className="relative flex flex-col">
                    {/* En-tête */}
                    <div className={`text-center p-3 rounded-2xl mb-1 h-[68px] flex flex-col items-center justify-center ${isToday ? 'bg-[var(--color-accent)] shadow-xl' : 'bg-[var(--color-bg-tertiary)]'}`}>
                      <div className="text-[9px] font-black uppercase text-[var(--color-text-muted)]">{day.toLocaleDateString(i18n.language, { weekday: 'short' })}</div>
                      <div className={`text-2xl font-black italic ${isToday ? 'text-white' : 'text-[var(--color-text-main)]'}`}>{day.getDate()}</div>
                    </div>

                    {/* Zone drag */}
                    {(() => {
                      return (
                        <div
                          className="relative bg-[var(--color-bg-primary)] rounded-2xl border border-[var(--color-border)] overflow-hidden select-none"
                          style={{ minHeight: `${HOURS.length * SLOT_HEIGHT}px` }}
                          onMouseDown={e => { const el = e.currentTarget; onColumnMouseDown(e, dayIdx, el); }}
                          onMouseMove={e => { const el = e.currentTarget; onColumnMouseMove(e, dayIdx, el); }}
                          onMouseUp={() => onColumnMouseUp(dayIdx)}
                          onDragOver={e => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'copy';
                            const [h, m] = hourMinFromY(e.clientY - e.currentTarget.getBoundingClientRect().top);
                            const [eH, eM] = toOverlayEnd(h, m);
                            setDragOverlay({ dayIndex: dayIdx, startH: h, startM: m, endH: eH, endM: eM });
                          }}
                          onDragLeave={e => {
                            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverlay(null);
                          }}
                          onDrop={e => {
                            e.preventDefault();
                            const blockType = e.dataTransfer.getData('blockType') as BlockType;
                            if (!blockType) { setDragOverlay(null); return; }
                            const [h, m] = hourMinFromY(e.clientY - e.currentTarget.getBoundingClientRect().top);
                            const dropDay = days[dayIdx];
                            const dateStr = `${dropDay.getFullYear()}-${String(dropDay.getMonth()+1).padStart(2,'0')}-${String(dropDay.getDate()).padStart(2,'0')}`;
                            const pad = (n: number) => String(n).padStart(2, '0');
                            const rawEnd = h * 60 + m + 60;
                            const eH = Math.floor(rawEnd / 60);
                            const eM = rawEnd % 60;
                            setBlockModal({ open: true, initialStartsAt: `${dateStr}T${pad(h)}:${pad(m)}:00`, initialEndsAt: `${dateStr}T${pad(eH)}:${pad(eM)}:00`, initialType: blockType });
                            setDragOverlay(null);
                          }}
                        >
                          {/* Lignes heure */}
                          {HOURS.map((h, hIdx) => (
                            <div key={h} className="absolute inset-x-0 border-b border-[var(--color-border)]/20 pointer-events-none"
                              style={{ top: `${hIdx * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }} />
                          ))}

                          {/* Overlay plage d'ouverture */}
                          {(() => {
                            const dateStr = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
                            const period = availabilityPeriods.find(p => p.starts_on <= dateStr && dateStr <= p.ends_on);
                            if (!period) return null;
                            const style: React.CSSProperties = period.location_type === 'both'
                              ? { background: 'linear-gradient(to right, #10b98115 0%, #10b98115 50%, #3b82f615 50%, #3b82f615 100%)' }
                              : { backgroundColor: period.location_type === 'home' ? '#10b98110' : '#3b82f610' };
                            return <div className="absolute inset-0 pointer-events-none z-0 rounded-2xl" style={style} />;
                          })()}

                          {/* Curseur drag */}
                          <div className="absolute inset-0 cursor-crosshair pointer-events-none" />

                          {/* Overlay drag en cours */}
                          {dragOverlay && dragOverlay.dayIndex === dayIdx && (() => {
                            const sTotal = dragOverlay.startH * 60 + dragOverlay.startM;
                            const eTotal = dragOverlay.endH   * 60 + dragOverlay.endM;
                            const top    = ((sTotal - START_HOUR * 60) / 60) * SLOT_HEIGHT;
                            const height = ((eTotal - sTotal) / 60) * SLOT_HEIGHT;
                            return (
                              <div className="absolute inset-x-1 bg-[var(--color-accent)]/25 border-2 border-[var(--color-accent)] rounded-xl pointer-events-none z-20"
                                style={{ top: `${Math.max(0, top)}px`, height: `${Math.max(28, height)}px` }}>
                                <div className="p-1.5 text-[8px] font-black uppercase text-[var(--color-accent)]">
                                  {dragOverlay.startH}:{String(dragOverlay.startM).padStart(2,'0')} → {dragOverlay.endH}:{String(dragOverlay.endM).padStart(2,'0')}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Blocs calendrier */}
                          {dayBlocks.map(block => {
                            const s = new Date(block.starts_at); const e = new Date(block.ends_at);
                            // Les timestamps sont stockés UTC = heure horloge → getUTCHours pour l'affichage
                            const sTotal = block.is_all_day ? START_HOUR * 60 : s.getUTCHours() * 60 + s.getUTCMinutes();
                            const eTotal = block.is_all_day ? END_HOUR   * 60 : e.getUTCHours() * 60 + e.getUTCMinutes();
                            const top    = Math.max(0, ((sTotal - START_HOUR * 60) / 60) * SLOT_HEIGHT);
                            const height = block.is_all_day
                              ? HOURS.length * SLOT_HEIGHT
                              : Math.max(24, ((eTotal - sTotal) / 60) * SLOT_HEIGHT);
                            const c = BLOCK_COLORS[block.block_type];
                            return (
                              <div key={block.id} data-block="true"
                                style={{ top: `${top}px`, height: `${height}px`, backgroundColor: c.bg, borderColor: c.border, color: c.text }}
                                className="absolute inset-x-1 rounded-xl border p-1.5 z-20 cursor-pointer hover:brightness-125 transition-all overflow-hidden"
                                onClick={e => { e.stopPropagation(); setBlockModal({ open: true, initialStartsAt: block.starts_at, initialEndsAt: block.ends_at, existingBlock: block }); }}>
                                <div className="flex items-center gap-1">
                                  {BLOCK_ICONS[block.block_type]}
                                  <span className="text-[8px] font-black uppercase truncate">{block.title || t(`calendar_block.types.${block.block_type}`)}</span>
                                </div>
                              </div>
                            );
                          })}

                          {/* Réservations clients — couleur selon home/store */}
                          {HOURS.map(h => getBookingsForHour(day, h).map(booking => {
                            const locType = booking.services?.allow_store && !booking.services?.allow_home ? 'store' : 'home';
                            const c = booking.status === 'pending'
                              ? BOOKING_COLORS.pending
                              : booking.status === 'cancelled'
                              ? BOOKING_COLORS.cancelled
                              : booking.status === 'disputed'
                              ? BOOKING_COLORS.disputed
                              : locType === 'home'
                              ? BOOKING_COLORS.home
                              : BOOKING_COLORS.store;

                            const top = ((h - START_HOUR) * SLOT_HEIGHT);
                            return (
                              <div key={booking.id} data-block="true"
                                style={{ top: `${top}px`, height: `${SLOT_HEIGHT - 4}px`, backgroundColor: c.bg, borderColor: c.border, color: c.text }}
                                className="absolute inset-x-1 rounded-xl border p-2 z-30 cursor-pointer hover:brightness-125 transition-all overflow-hidden"
                                onClick={e => { e.stopPropagation(); setBookingDetailModal({ open: true, booking }); }}>
                                <div className="flex items-center gap-1 mb-0.5">
                                  {locType === 'home' ? <Home size={9} /> : <Store size={9} />}
                                  <span className="text-[8px] font-black uppercase truncate">{booking.services?.title}</span>
                                </div>
                                <div className="text-[8px] opacity-70">{booking.total_price}€</div>
                              </div>
                            );
                          }))}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar blocs — drag-to-calendar */}
          <div className="w-44 shrink-0 self-start space-y-2 pt-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] pb-2">
              {t('pro.calendar.drag_to_block', 'Blocs')}
            </p>
            {BLOCK_TILE_TYPES.map(value => {
              const c = BLOCK_COLORS[value];
              return (
                <div
                  key={value}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('blockType', value);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border cursor-grab active:cursor-grabbing select-none transition-all hover:brightness-125"
                  style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
                >
                  {BLOCK_ICONS[value]}
                  <span className="truncate">{t(`calendar_block.types.${value}`)}</span>
                </div>
              );
            })}
          </div>
          </div>

        </div>
      </>)}

      {/* ── VUE LISTE ───────────────────────────────────────────────────────────── */}
      {activeTab === 'manage' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-text-main)]">
              {t('pro.manage.title', 'Réservations')}
              <span className="ml-3 text-[var(--color-accent)]">({sortedBookings.length})</span>
            </h3>
          </div>

          {sortedBookings.length === 0 ? (
            <div className="text-center py-16 text-[var(--color-text-muted)] text-sm italic">
              {t('pro.manage.empty', 'Aucune réservation pour le moment.')}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedBookings.map(booking => {
                const d = new Date(booking.booking_date);
                const statusColors: Record<string, string> = {
                  pending:   'bg-amber-500/10 border-amber-500/30 text-amber-400',
                  confirmed: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                  completed: 'bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-muted)]',
                  cancelled: 'bg-red-500/10 border-red-500/30 text-red-400',
                  disputed:  'bg-red-500/10 border-red-500/30 text-red-400',
                };
                const sc = statusColors[booking.status] ?? statusColors.completed;
                return (
                  <div key={booking.id} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-xl border ${sc}`}>
                          {t(`pro.manage.status.${booking.status}`, booking.status)}
                        </span>
                        <span className="text-[10px] font-black text-[var(--color-text-muted)]">
                          {d.toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })} · {d.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="font-black text-[var(--color-text-main)] text-sm truncate">
                        {booking.services?.title ?? '—'}
                      </p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">
                        {booking.profiles?.full_name ?? ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {booking.total_price != null && (
                        <span className="text-base font-black text-[var(--color-text-main)]">
                          {booking.total_price}€
                        </span>
                      )}
                      {booking.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest border-none cursor-pointer transition-all disabled:opacity-50"
                          >
                            {actionLoading === booking.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                            {t('pro.manage.confirm', 'Confirmer')}
                          </button>
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/30 cursor-pointer transition-all disabled:opacity-50"
                          >
                            <X size={11} />
                            {t('pro.manage.decline', 'Refuser')}
                          </button>
                        </>
                      )}
                      {canReportDispute(booking.booking_date, booking.status, booking.services?.category) && (
                        <button
                          onClick={() => setSelectedBookingId(booking.id)}
                          className="p-2 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)] rounded-xl border-none cursor-pointer transition-all"
                          title={t('pro.manage.dispute', 'Signaler un litige')}
                        >
                          <AlertCircle size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      {selectedBookingId && (
        <DisputeModal bookingId={selectedBookingId} onClose={() => setSelectedBookingId(null)} onSuccess={loadData} reporterRole="pro" />
      )}
      {blockModal.open && (
        <BlockModal
          initialStartsAt={blockModal.initialStartsAt} initialEndsAt={blockModal.initialEndsAt}
          initialType={blockModal.initialType}
          existingBlock={blockModal.existingBlock}
          onSave={saveBlock}
          onDelete={blockModal.existingBlock ? deleteBlock : undefined}
          onClose={() => setBlockModal({ open: false, initialStartsAt: '', initialEndsAt: '' })}
        />
      )}
      {bookingDetailModal.open && bookingDetailModal.booking && (
        <BookingDetailModal
          booking={bookingDetailModal.booking}
          onClose={() => setBookingDetailModal({ open: false, booking: null })}
          onCancel={cancelBookingFromCalendar}
        />
      )}
    </div>
  );
};

export default ProView;