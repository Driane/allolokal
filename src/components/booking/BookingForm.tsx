import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BookingFormProps {
  serviceId: string;
  proId: string;
  price: number;
  serviceTitle: string;
  onSuccess: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ serviceId, proId, price, serviceTitle, onSuccess }) => {
  const { t } = useTranslation();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // SÉCURITÉ : getUser() valide le token côté serveur (vs getSession() qui lit le cache local)
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) { navigate('/auth'); return; }

      // SÉCURITÉ : récupérer le prix réel du service depuis la base, ne jamais faire confiance au prop
      const { data: serviceData, error: serviceErr } = await supabase
        .from('services')
        .select('price, price_unit, is_active')
        .eq('id', serviceId)
        .single();

      if (serviceErr || !serviceData) throw new Error('Service introuvable.');
      if (!serviceData.is_active) throw new Error('Ce service n\'est plus disponible.');

      const verifiedPrice = serviceData.price; // prix vérifié côté serveur

      const bookingDateTime = `${date}T${time}:00`;

      const { error: bookingError } = await supabase
        .from('bookings')
        .insert([{
          client_id:   user.id,
          service_id:  serviceId,
          pro_id:      proId,
          booking_date: bookingDateTime,
          total_price:  verifiedPrice,  // ← prix serveur, pas le prop
          status:      'pending',
        }]);

      if (bookingError) {
        if (bookingError.message.includes('start_time')) {
          throw new Error("Erreur de base de données : ancienne colonne 'start_time' encore référencée.");
        }
        throw bookingError;
      }

      onSuccess();
      setTimeout(() => { navigate('/dashboard'); }, 1500);

    } catch (err: unknown) {
      console.error('Booking Error:', err);
      const msg = err instanceof Error ? err.message : '';
      const userFriendlyMsg = msg.includes('non autorisé') || msg.includes('introuvable') || msg.includes('disponible')
        ? msg
        : t('booking.error_default', 'Une erreur est survenue. Veuillez réessayer.');
      setError(userFriendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-10 border border-[var(--color-border)] shadow-2xl relative overflow-hidden bg-[var(--color-bg-secondary)] rounded-[2rem]">
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-[var(--color-accent-light)] blur-[60px] rounded-full"></div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1.5 h-10 bg-[var(--color-accent)] rounded-full"></div>
          <div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-[var(--color-text-main)]">
              {t('booking.title')}
            </h3>
            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em]">{serviceTitle}</p>
          </div>
        </div>

        <form onSubmit={handleBooking} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Date */}
            <div>
              <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
                {t('booking.label_date')}
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-accent)]" size={18} />
                <input
                  type="date" required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl py-4 pl-12 pr-4 text-[var(--color-text-main)] font-bold outline-none focus:border-[var(--color-accent)] transition-all cursor-pointer"
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            {/* Heure */}
            <div>
              <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
                {t('booking.label_time')}
              </label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-accent)]" size={18} />
                <input
                  type="time" required
                  className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl py-4 pl-12 pr-4 text-[var(--color-text-main)] font-bold outline-none focus:border-[var(--color-accent)] transition-all cursor-pointer"
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Résumé prix — affiche le prix prop en attendant la vérification serveur */}
          <div className="bg-[var(--color-accent-light)] p-5 rounded-2xl border border-[var(--color-border)] flex justify-between items-center">
            <span className="text-[var(--color-text-muted)] font-bold text-[10px] uppercase tracking-widest">
              {t('booking.total_label')}
            </span>
            <span className="text-2xl font-black text-[var(--color-text-main)]">
              {price}{t('common.currency')}
            </span>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-400 bg-red-400/10 p-3 rounded-xl border border-red-400/20">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <p className="text-[10px] font-bold uppercase leading-tight">{error}</p>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50 border-none cursor-pointer"
          >
            {loading
              ? <Loader2 className="animate-spin" />
              : (<><CheckCircle2 size={16} /> {t('booking.btn_confirm')}</>)
            }
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookingForm;