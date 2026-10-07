import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import type { StripeElementLocale } from '@stripe/stripe-js';
import {
  ArrowLeft, Calendar as CalendarIcon, Clock, MessageSquare,
  CheckCircle, Loader2, ChevronLeft, ChevronRight,
  Timer, Camera, Trash2, Package, RefreshCw, Navigation
} from 'lucide-react';

// --- AJOUTS STRIPE ---
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { StripePaymentForm } from '../components/StripePaymentForm';
import { useIsNative } from '../hooks/useIsNative';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface BookingService {
  id: string;
  user_id?: string;
  title?: string;
  price?: number;
  price_unit?: string;
  price_type?: string;
  allow_home?: boolean;
  allow_store?: boolean;
  description?: string;
  cover_image_url?: string | null;
  profiles?: { full_name?: string; avatar_url?: string; location?: string };
  travel_fee_free_km?: number | null;
  travel_fee_per_km?: number | null;
}

interface ServiceAddon { id: string; name: string; price: number; }

interface Availability {
  day_of_week: number;
  slot1_start: string | null;
  slot1_end: string | null;
  slot2_start: string | null;
  slot2_end: string | null;
}

interface BookingAvailabilityPeriod {
  starts_on: string;
  ends_on: string;
  location_type: 'home' | 'store' | 'both';
}

const BookingPage: React.FC = () => {
  const { id: serviceId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isNative = useIsNative();
  const summaryRef = useRef<HTMLDivElement>(null);

  // States
  const [service, setService] = useState<BookingService | null>(null);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [duration, setDuration] = useState(1);
  const [note, setNote] = useState('');
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [allPossibleSlots, setAllPossibleSlots] = useState<string[]>([]);
  const [takenSlots, setTakenSlots] = useState<string[]>([]);

  const [proAvailabilityPeriods, setProAvailabilityPeriods] = useState<BookingAvailabilityPeriod[]>([]);

  // Add-ons
  const [addons, setAddons] = useState<ServiceAddon[]>([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  // Réservation récurrente
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  // ── Réservation temporaire (hold 5 min) ──────────────────────────────────────
  const HOLD_DURATION = 5 * 60 * 1000; // 5 minutes
  const [slotHoldExpiry, setSlotHoldExpiry] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const weekDays = [
    t('days_short.mon'), t('days_short.tue'), t('days_short.wed'), 
    t('days_short.thu'), t('days_short.fri'), t('days_short.sat'), t('days_short.sun')
  ];

  const totalPrice = useMemo(() => {
    if (!service) return 0;
    const isHourly = service.price_unit === 'hour' || service.price_type === 'hourly';
    const base = Number(service.price) || 0;
    const baseTotal = isHourly ? base * duration : base;
    const addonTotal = addons
      .filter(a => selectedAddonIds.includes(a.id))
      .reduce((sum, a) => sum + Number(a.price), 0);
    return +(baseTotal + addonTotal).toFixed(2);
  }, [service, duration, addons, selectedAddonIds]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const days = [];
    for (let i = 0; i < startOffset; i++) { days.push(null); }
    for (let i = 1; i <= daysInMonth; i++) { days.push(new Date(year, month, i)); }
    return days;
  }, [currentMonth]);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!serviceId) return;
      try {
        const { data: serviceData, error: sError } = await supabase
          .from('services')
          .select('*, profiles!services_user_id_fkey(full_name, avatar_url)')
          .eq('id', serviceId)
          .single();

        if (sError) throw sError;
        setService(serviceData);

        const [availRes, addonsRes, periodsRes] = await Promise.all([
          supabase.from('availabilities').select('*').eq('pro_id', serviceData.user_id).eq('is_enabled', true),
          supabase.from('service_addons').select('id, name, price').eq('service_id', serviceData.id).order('created_at'),
          supabase.from('availability_periods').select('starts_on, ends_on, location_type').eq('pro_id', serviceData.user_id),
        ]);

        setAvailabilities(availRes.data || []);
        if (addonsRes.data) setAddons(addonsRes.data);
        setProAvailabilityPeriods(periodsRes.data || []);
      } catch (err) {
        console.error("Error loading:", err);
        navigate('/findpro');
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [serviceId, navigate]);

  useEffect(() => {
    const updateSlots = async () => {
      if (!selectedDate || !service) return;

      const dateParts = selectedDate.split('-').map(Number);
      const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      const dayOfWeek = dateObj.getDay(); 
      const rule = availabilities.find(a => a.day_of_week === dayOfWeek);

      if (rule) {
        const slots: string[] = [];
        const fillRange = (startStr: string | null, endStr: string | null) => {
          if (!startStr || !endStr) return;
          const [h, m] = startStr.split(':').map(Number);
          const [endH, endM] = endStr.split(':').map(Number);
          let currentMinutes = h * 60 + m;
          const endMinutes = endH * 60 + endM;
          while (currentMinutes < endMinutes) {
            const hours = Math.floor(currentMinutes / 60);
            const mins = currentMinutes % 60;
            slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
            currentMinutes += 30; 
          }
        };
        fillRange(rule.slot1_start, rule.slot1_end);
        fillRange(rule.slot2_start, rule.slot2_end);
        setAllPossibleSlots(slots);
      }

      const { data: existingBookings } = await supabase
        .from('bookings')
        .select('booking_date, duration')
        .eq('pro_id', service.user_id)
        .neq('status', 'cancelled')
        .gte('booking_date', `${selectedDate}T00:00:00`)
        .lte('booking_date', `${selectedDate}T23:59:59`);

      const taken: string[] = [];
      existingBookings?.forEach(b => {
        const start = new Date(b.booking_date);
        const bDuration = b.duration || 1;
        const totalMinutes = bDuration * 60;
        for(let i=0; i < totalMinutes; i += 30) {
          const slotDate = new Date(start.getTime() + i * 60000);
          const hh = slotDate.getHours().toString().padStart(2, '0');
          const mm = slotDate.getMinutes().toString().padStart(2, '0');
          taken.push(`${hh}:${mm}`);
        }
      });
      setTakenSlots([...new Set(taken)]);
    };
    updateSlots();
  }, [selectedDate, availabilities, service]);

  const isSlotPathClear = (startSlot: string, hDuration: number) => {
    const startIndex = allPossibleSlots.indexOf(startSlot);
    if (startIndex === -1) return false;
    const slotsNeeded = hDuration * 2; 
    for (let i = 0; i < slotsNeeded; i++) {
      const currentSlot = allPossibleSlots[startIndex + i];
      if (!currentSlot || takenSlots.includes(currentSlot)) return false;
    }
    return true;
  };

  // ── Validation plages d'ouverture ────────────────────────────────────────────
  const getPeriodForDate = (dateStr: string): BookingAvailabilityPeriod | null =>
    proAvailabilityPeriods.find(p => p.starts_on <= dateStr && dateStr <= p.ends_on) ?? null;

  const isDateBlockedByPeriod = (dateStr: string): boolean => {
    if (proAvailabilityPeriods.length === 0) return false;
    const period = getPeriodForDate(dateStr);
    if (!period) return true;
    const allowHome = service?.allow_home ?? true;
    const allowStore = service?.allow_store ?? false;
    if (allowHome && !allowStore) return period.location_type === 'store';
    if (allowStore && !allowHome) return period.location_type === 'home';
    return false;
  };

  // Timer d'expiration du créneau
  useEffect(() => {
    if (!slotHoldExpiry) { setTimeLeft(null); return; }
    const interval = setInterval(() => {
      const remaining = slotHoldExpiry - Date.now();
      if (remaining <= 0) {
        setSelectedSlot(null);
        setSlotHoldExpiry(null);
        setTimeLeft(null);
        setClientSecret(null);
        alert(t('booking.slot_expired', 'Votre réservation temporaire a expiré. Veuillez sélectionner un nouveau créneau.'));
      } else {
        setTimeLeft(Math.ceil(remaining / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [slotHoldExpiry, t]);

  const handleSelectSlot = (slot: string) => {
    setSelectedSlot(slot);
    setClientSecret(null);
    setSlotHoldExpiry(Date.now() + HOLD_DURATION);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // --- MODIFICATION ICI : APPEL AVEC NOUVELLE LOGIQUE DE COMMISSION ---
  const handleInitiatePayment = async () => {
    if (!selectedSlot || !service) return;
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/auth'); return; }

      // Vérifie si le pro est temporairement suspendu suite à un litige
      const { data: proStatus } = await supabase
        .from('profiles')
        .select('is_paused_for_dispute')
        .eq('id', service.user_id)
        .single();
      if (proStatus?.is_paused_for_dispute) {
        throw new Error(t('booking.error_pro_paused', 'Ce prestataire est temporairement indisponible suite à un litige en cours. Veuillez réessayer ultérieurement.'));
      }

      // Le montant, le pro et le client sont déterminés côté serveur : on n'envoie que la sélection
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          serviceId: service.id,
          duration,
          addonIds: selectedAddonIds,
        }
      });

      if (error) {
        // Extraire le vrai message d'erreur retourné par la fonction edge
        let message = error.message;
        try {
          const body = await (error as { context?: { json?: () => Promise<{ error?: string }> } }).context?.json?.();
          if (body?.error) message = body.error;
        } catch { /* ignore */ }
        throw new Error(message);
      }
      setClientSecret(data.clientSecret);
    } catch (err: unknown) {
      setPaymentError(err instanceof Error ? err.message : t('booking.error_payment_generic', 'Erreur de paiement, veuillez réessayer.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmBooking = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/auth'); return; }

      let imageUrl = null;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('booking-attachments')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('booking-attachments')
          .getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      if (!service) throw new Error('Service introuvable');

      // Vérification de dernière minute : le créneau est-il encore disponible ?
      const { data: latestBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('pro_id', service.user_id)
        .neq('status', 'cancelled')
        .eq('booking_date', `${selectedDate}T${selectedSlot}:00`);

      if (latestBookings && latestBookings.length > 0) {
        throw new Error(t('booking.slot_just_taken', 'Ce créneau vient d\'être pris par quelqu\'un d\'autre. Veuillez en choisir un autre.'));
      }

      if (isDateBlockedByPeriod(selectedDate)) {
        throw new Error(t('booking.error_period_location', 'Ce créneau n\'est pas disponible pour ce type de service à cette date.'));
      }

      const bookingDuration = (service.price_unit === 'hour' || service.price_type === 'hourly') ? duration : 1;
      const baseBooking = {
        service_id:    service.id,
        client_id:     session.user.id,
        pro_id:        service.user_id,
        booking_date:  `${selectedDate}T${selectedSlot}:00`,
        duration:      bookingDuration,
        total_price:   totalPrice,
        notes:         note,
        image_url:     imageUrl,
        is_recurring:  isRecurring,
        recurrence_interval: isRecurring ? recurrenceInterval : null,
      };

      // Insérer le premier (ou unique) booking
      const { data: firstBooking, error } = await supabase.from('bookings').insert([{
        ...baseBooking,
        status:         'pending',
        payment_status: 'paid',
      }]).select().single();
      if (error) throw error;

      // Si récurrent : créer les occurrences futures
      if (isRecurring && recurrenceEndDate && firstBooking) {
        const seriesId = firstBooking.id;
        // Marquer le premier booking avec recurrence_series_id
        await supabase.from('bookings').update({ recurrence_series_id: seriesId, recurrence_end_date: recurrenceEndDate }).eq('id', seriesId);

        const intervalDays = recurrenceInterval === 'weekly' ? 7 : recurrenceInterval === 'biweekly' ? 14 : 30;
        const endDate = new Date(recurrenceEndDate);
        const futureBookings = [];
        let nextDate = new Date(`${selectedDate}T${selectedSlot}:00`);

        while (true) {
          nextDate = new Date(nextDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
          if (nextDate > endDate) break;
          const dateStr = nextDate.toISOString().slice(0, 10);
          futureBookings.push({
            ...baseBooking,
            booking_date:          `${dateStr}T${selectedSlot}:00`,
            status:                'pending',
            payment_status:        'scheduled',
            recurrence_series_id:  seriesId,
            recurrence_end_date:   recurrenceEndDate,
          });
        }

        if (futureBookings.length > 0) {
          await supabase.from('bookings').insert(futureBookings);
        }
      }

      setStep(2);
    } catch (err: unknown) {
      alert(t('booking.error_booking') + (err instanceof Error ? err.message : 'Erreur'));
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0b0e14] flex flex-col items-center justify-center text-white italic font-black">
      <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
      {t('booking.loading')}
    </div>
  );

  if (step === 2) return (
    <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center px-6">
      <div className="bg-white/[0.02] border border-blue-500/30 p-12 rounded-[3rem] text-center max-w-lg backdrop-blur-3xl shadow-[0_0_50px_rgba(59,130,246,0.15)]">
        <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-blue-600/40">
          <CheckCircle size={48} className="text-white" />
        </div>
        <h2 className="text-4xl font-black italic mb-4 text-white uppercase tracking-tighter">{t('booking.success_title')}</h2>
        <button onClick={() => navigate('/dashboard')} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest mt-6 border-none cursor-pointer">
          {t('booking.back_dashboard')}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-[#0b0e14] text-white px-6 font-sans ${isNative ? 'pt-6 pb-28' : 'pt-32 pb-20'}`}>
      <div className="container max-w-6xl mx-auto">
        <div className="flex items-center gap-6 mb-12">
          <button onClick={() => navigate(-1)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all border border-white/5 cursor-pointer text-white">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">
            {t('booking.title_main')} <span className="text-blue-500">{t('booking.title_span')}</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            {/* DATE SELECTION */}
            <section className="bg-white/[0.02] border border-white/5 p-8 rounded-[3rem] backdrop-blur-md">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-10">
                <h3 className="text-sm font-black italic flex items-center gap-4 uppercase tracking-widest text-blue-500">
                  <CalendarIcon size={18} /> {t('booking.step_1')}
                </h3>
                <div className="flex items-center gap-4 bg-black/40 p-2 rounded-2xl border border-white/5">
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-2 hover:text-blue-500 transition-colors bg-transparent border-none cursor-pointer text-white"><ChevronLeft size={20} /></button>
                  <span className="font-black uppercase text-[11px] min-w-[120px] text-center italic tracking-widest">
                    {currentMonth.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
                  </span>
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-2 hover:text-blue-500 transition-colors bg-transparent border-none cursor-pointer text-white"><ChevronRight size={20} /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 mb-4 text-center">
                {weekDays.map(d => <span key={d} className="text-[9px] font-black uppercase text-gray-600 tracking-widest mb-4">{d}</span>)}
                {calendarDays.map((date, i) => {
                  if (!date) return <div key={`empty-${i}`} />;
                  const dateStr = date.toLocaleDateString('en-CA');
                  const isSelected = selectedDate === dateStr;
                  const isPast = date < new Date(new Date().setHours(0,0,0,0));
                  const isDayOff = !availabilities.some(a => a.day_of_week === date.getDay());
                  const isOutOfPeriod = isDateBlockedByPeriod(dateStr);
                  const period = getPeriodForDate(dateStr);
                  const isBlocked = isDayOff || isOutOfPeriod;
                  const periodDot = !isPast && !isBlocked && period
                    ? period.location_type === 'home' ? '#10b981'
                    : period.location_type === 'store' ? '#3b82f6'
                    : undefined
                    : undefined;
                  return (
                    <button
                      key={dateStr}
                      disabled={isPast || (isBlocked && !isSelected)}
                      onClick={() => { setSelectedDate(dateStr); setSelectedSlot(null); setClientSecret(null); setSlotHoldExpiry(null); }}
                      className={`aspect-square flex flex-col items-center justify-center rounded-2xl font-black text-sm transition-all border cursor-pointer relative
                        ${isPast ? 'opacity-10 cursor-not-allowed border-transparent' : ''}
                        ${isBlocked && !isPast ? 'opacity-20 bg-black/40 border-dashed border-white/10 cursor-not-allowed' : ''}
                        ${isSelected ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/20 scale-110 z-10' :
                          (!isPast && !isBlocked) ? 'bg-white/5 border-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10' : ''}`}
                    >
                      {date.getDate()}
                      {periodDot && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: periodDot }} />}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* DURATION SELECTION */}
            {(service?.price_unit === 'hour' || service?.price_type === 'hourly') && (
              <section className="bg-white/[0.02] border border-white/5 p-8 rounded-[3rem] backdrop-blur-md">
                <h3 className="text-sm font-black italic mb-8 flex items-center gap-4 uppercase tracking-widest text-blue-500">
                  <Timer size={18} /> {t('booking.step_duration')}
                </h3>
                <div className="flex flex-wrap gap-4">
                  {[1, 2, 3, 4, 5].map((h) => (
                    <button 
                      key={h} 
                      onClick={() => { setDuration(h); setSelectedSlot(null); setClientSecret(null); setSlotHoldExpiry(null); }} 
                      className={`px-8 py-4 rounded-xl font-black transition-all border cursor-pointer text-xs ${duration === h ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* TIME SLOTS */}
            <section className="bg-white/[0.02] border border-white/5 p-8 rounded-[3rem] backdrop-blur-md">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black italic flex items-center gap-4 uppercase tracking-widest text-blue-500">
                  <Clock size={18} /> {t('booking.step_2')}
                </h3>
                {selectedSlot && timeLeft !== null && (
                  <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${
                    timeLeft <= 60
                      ? 'text-red-400 border-red-500/30 bg-red-500/10 animate-pulse'
                      : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                  }`}>
                    <Timer size={12} />
                    {String(Math.floor(timeLeft / 60)).padStart(2,'0')}:{String(timeLeft % 60).padStart(2,'0')}
                    <span className="hidden sm:inline">{t('booking.slot_hold_label', '— créneau réservé')}</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-8">
                {allPossibleSlots.map((slot) => {
                  const isTaken = takenSlots.includes(slot);
                  const isBlocked = !isSlotPathClear(slot, (service?.price_unit === 'hour' || service?.price_type === 'hourly') ? duration : 1);
                  return (
                    <button 
                      key={slot}
                      disabled={isTaken || isBlocked}
                      onClick={() => handleSelectSlot(slot)}
                      className={`py-4 rounded-xl font-black transition-all border cursor-pointer text-[12px] ${
                        isTaken || isBlocked ? 'opacity-20 cursor-not-allowed' : selectedSlot === slot ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      {slot.replace(':', 'h')}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ADD-ONS */}
            {addons.length > 0 && (
              <section className="bg-white/[0.02] border border-white/5 p-8 rounded-[3rem]">
                <h3 className="text-sm font-black italic mb-6 flex items-center gap-4 uppercase tracking-widest text-blue-500">
                  <Package size={18} /> {t('booking.step_addons', 'Options supplémentaires')}
                </h3>
                <div className="space-y-3">
                  {addons.map(addon => {
                    const isSelected = selectedAddonIds.includes(addon.id);
                    return (
                      <div key={addon.id}
                        onClick={() => setSelectedAddonIds(prev =>
                          isSelected ? prev.filter(id => id !== addon.id) : [...prev, addon.id]
                        )}
                        className={`flex items-center justify-between p-5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected ? 'bg-blue-500/10 border-blue-500/40' : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                        }`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-white/30'}`}>
                            {isSelected && <CheckCircle size={12} className="text-white" />}
                          </div>
                          <span className="font-bold text-white text-sm">{addon.name}</span>
                        </div>
                        <span className="font-black text-blue-400 text-sm">+{addon.price}€</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* RÉCURRENCE */}
            <section className="bg-white/[0.02] border border-white/5 p-8 rounded-[3rem]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black italic flex items-center gap-4 uppercase tracking-widest text-blue-500">
                  <RefreshCw size={18} /> {t('booking.recurring_toggle', 'Réservation récurrente')}
                </h3>
                <button type="button" onClick={() => setIsRecurring(!isRecurring)}
                  className={`relative w-12 h-6 rounded-full border-none cursor-pointer transition-colors ${isRecurring ? 'bg-blue-500' : 'bg-white/10'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isRecurring ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
              {isRecurring && (
                <div className="space-y-5">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">{t('booking.recurring_interval', 'Fréquence')}</label>
                    <div className="flex gap-3">
                      {([
                        { value: 'weekly',   label: t('booking.recurring_weekly',   'Chaque semaine') },
                        { value: 'biweekly', label: t('booking.recurring_biweekly', 'Toutes les 2 sem.') },
                        { value: 'monthly',  label: t('booking.recurring_monthly',  'Chaque mois') },
                      ] as const).map(opt => (
                        <button key={opt.value} type="button"
                          onClick={() => setRecurrenceInterval(opt.value)}
                          className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border cursor-pointer transition-all ${
                            recurrenceInterval === opt.value ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                          }`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">{t('booking.recurring_end_date', 'Date de fin')}</label>
                    <input type="date"
                      value={recurrenceEndDate}
                      min={selectedDate}
                      onChange={e => setRecurrenceEndDate(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all text-sm" />
                    {recurrenceEndDate && selectedDate && recurrenceInterval && (() => {
                      const intervalDays = recurrenceInterval === 'weekly' ? 7 : recurrenceInterval === 'biweekly' ? 14 : 30;
                      const start = new Date(selectedDate);
                      const end = new Date(recurrenceEndDate);
                      const count = Math.floor((end.getTime() - start.getTime()) / (intervalDays * 24 * 60 * 60 * 1000));
                      if (count <= 0) return null;
                      return <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mt-2">
                        {t('booking.recurring_count', '{{count}} séances au total', { count: count + 1 })} — {(totalPrice * (count + 1)).toFixed(2)}€
                      </p>;
                    })()}
                  </div>
                </div>
              )}
            </section>

            {/* NOTES AND PHOTOS */}
            <section className="bg-white/[0.02] border border-white/5 p-8 rounded-[3rem]">
              <h3 className="text-sm font-black italic mb-6 flex items-center gap-4 uppercase tracking-widest text-blue-500">
                <MessageSquare size={18} /> {t('booking.step_3')}
              </h3>
              <div className="space-y-6">
                <textarea 
                  rows={3} 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 outline-none focus:border-blue-500 transition-all text-white italic text-sm resize-none"
                  placeholder={t('booking.placeholder_note')}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />

                <div className="relative">
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
                  {!imagePreview ? (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-3 bg-white/5 border border-dashed border-white/20 w-full py-6 rounded-2xl justify-center hover:bg-white/10 transition-all cursor-pointer text-gray-400"
                    >
                      <Camera size={20} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{t('booking.add_photo')}</span>
                    </button>
                  ) : (
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 group">
                      <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                      <button 
                        onClick={() => { setImagePreview(null); setImageFile(null); }}
                        className="absolute top-4 right-4 bg-red-500 p-2 rounded-xl text-white hover:bg-red-600 transition-colors border-none cursor-pointer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* SUMMARY ASIDE */}
          <aside className="lg:col-span-1">
            <div ref={summaryRef} className="bg-[#161923] p-10 rounded-[3.5rem] border border-blue-500/20 sticky top-32 shadow-2xl">

              {/* Service cover + info */}
              {service?.cover_image_url && (
                <div className="rounded-2xl overflow-hidden mb-6 -mx-2 aspect-video">
                  <img src={service.cover_image_url} className="w-full h-full object-cover" alt={service.title ?? ''} />
                </div>
              )}
              <h2 className="text-base font-black italic uppercase tracking-tight text-white mb-1">{service?.title}</h2>
              <p className="text-[var(--color-text-muted)] text-[11px] font-bold uppercase tracking-widest mb-1">
                {service?.profiles?.full_name}
              </p>
              {service?.description && (
                <p className="text-gray-400 text-xs italic leading-relaxed mb-6 border-b border-white/5 pb-6">
                  {service.description}
                </p>
              )}

              <h3 className="text-xl font-black italic mb-10 border-b border-white/5 pb-6 uppercase tracking-widest">{t('booking.summary')}</h3>
              
              <div className="space-y-3 mb-8">
                <div className="flex justify-between items-center bg-white/5 p-5 rounded-2xl border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-1">{t('booking.label_details')}</span>
                    <span className="font-black text-xs uppercase">{duration}h @ {service?.price}€</span>
                  </div>
                  <div className="w-[1px] h-6 bg-white/10"></div>
                  <div className="flex flex-col text-right">
                    <span className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-1">{t('booking.label_time')}</span>
                    <span className="font-black text-white text-xs">{selectedSlot ? selectedSlot.replace(':', 'h') : '--'}</span>
                  </div>
                </div>

                {/* Add-ons sélectionnés */}
                {selectedAddonIds.length > 0 && addons.filter(a => selectedAddonIds.includes(a.id)).map(a => (
                  <div key={a.id} className="flex justify-between items-center bg-blue-500/5 border border-blue-500/20 px-5 py-3 rounded-2xl">
                    <span className="text-[10px] font-bold text-gray-300">{a.name}</span>
                    <span className="text-[10px] font-black text-blue-400">+{a.price}€</span>
                  </div>
                ))}

                {/* Frais de déplacement info */}
                {service?.travel_fee_per_km && (
                  <div className="flex items-start gap-3 bg-white/5 border border-white/10 px-5 py-3 rounded-2xl">
                    <Navigation size={12} className="text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{t('service_form.travel_fee_section', 'Frais de déplacement')}</p>
                      <p className="text-[10px] text-gray-300 mt-0.5">
                        {service.travel_fee_free_km ? `${service.travel_fee_free_km} km offerts, ` : ''}
                        {service.travel_fee_per_km}€{t('service_form.travel_fee_per_km_short', '/km')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Récurrence info */}
                {isRecurring && (
                  <div className="flex items-center gap-2 bg-blue-500/5 border border-blue-500/20 px-5 py-3 rounded-2xl">
                    <RefreshCw size={12} className="text-blue-400" />
                    <span className="text-[9px] font-black text-blue-300 uppercase tracking-widest">
                      {recurrenceInterval === 'weekly' ? t('booking.recurring_weekly') : recurrenceInterval === 'biweekly' ? t('booking.recurring_biweekly') : t('booking.recurring_monthly')}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-end pt-4 border-t border-white/5">
                  <span className="font-black text-gray-500 uppercase tracking-widest text-[9px] pb-1">{t('booking.label_total')}</span>
                  <span className="text-5xl font-black italic text-white tracking-tighter">{totalPrice}€</span>
                </div>
              </div>

              {paymentError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl px-4 py-3 text-xs font-semibold leading-relaxed">
                  {paymentError}
                </div>
              )}
              {!clientSecret ? (
                <button
                  className="w-full bg-blue-600 hover:bg-white hover:text-black text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-xl shadow-blue-600/20 disabled:opacity-20 disabled:cursor-not-allowed border-none cursor-pointer active:scale-95"
                  disabled={!selectedSlot || isSubmitting}
                  onClick={() => { setPaymentError(null); handleInitiatePayment(); }}
                >
                  {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : t('booking.btn_confirm')}
                </button>
              ) : (
                <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
                  <Elements 
                    stripe={stripePromise} 
                    options={{ 
                      clientSecret, 
                      locale: i18n.language as StripeElementLocale,
                      appearance: { 
                        theme: 'night',
                        variables: { colorPrimary: '#3b82f6' }
                      } 
                    }}
                  >
                    <StripePaymentForm 
                      totalPrice={totalPrice} 
                      onConfirm={handleConfirmBooking} 
                    />
                  </Elements>
                  <button 
                    onClick={() => setClientSecret(null)}
                    className="w-full mt-4 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors border-none bg-transparent cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Barre de prix flottante — mobile uniquement, le résumé complet est en bas de page */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full z-[60] bg-[#161923] border-t border-blue-500/20 px-6 py-4 flex items-center justify-between gap-4"
        style={isNative ? { paddingBottom: 'calc(1rem + 64px + env(safe-area-inset-bottom))' } : undefined}>
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-gray-500">{t('booking.label_total')}</p>
          <p className="text-2xl font-black italic text-white tracking-tighter">{totalPrice}€</p>
        </div>
        <button
          onClick={async () => {
            if (!clientSecret) await handleInitiatePayment();
            summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          disabled={!selectedSlot || isSubmitting}
          className="bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] border-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0 flex items-center gap-2"
        >
          {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : clientSecret ? t('booking.scroll_to_payment', 'Voir le paiement') : t('booking.btn_confirm')}
        </button>
      </div>
    </div>
  );
};

export default BookingPage;