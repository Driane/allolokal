import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Star, X, Loader2, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useModalBackButton } from '../hooks/useModalBackButton';

interface Booking {
  id: string;
  client_id: string;
  pro_id: string;
  service_id: string;
  pro?: { full_name?: string };
}

interface ReviewModalProps {
  booking: Booking;
  onClose: () => void;
  onSuccess: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ booking, onClose, onSuccess }) => {
  const { t } = useTranslation();
  useModalBackButton(true, onClose);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error(t('review.error_session'));

      if (user.id !== booking.client_id) throw new Error(t('review.error_unauthorized'));

      const { error: insertError } = await supabase.from('reviews').insert({
        booking_id:  booking.id,
        client_id:   user.id,        // ← session, jamais les props
        pro_id:      booking.pro_id,
        service_id:  booking.service_id,
        rating,
        comment:     comment.trim() || null,
      });

      if (insertError) throw insertError;
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : t('review.error_submit'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/95 backdrop-blur-xl flex items-start justify-center px-4 sm:px-6 pt-20 xl:pt-28 pb-8">
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-accent)]/30 w-full max-w-lg rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--color-accent-light)] blur-[80px] rounded-full" />

        <button onClick={onClose} className="absolute top-8 right-8 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors border-none bg-transparent cursor-pointer">
          <X size={24} />
        </button>

        <h3 className="text-4xl font-black italic uppercase tracking-tighter text-[var(--color-text-main)] mb-2">
          {t('review.modal_title_part1')} <span className="text-[var(--color-accent)]">{t('review.modal_title_part2')}</span>
        </h3>
        <p className="text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-[0.2em] mb-10">
          {t('review.description', { name: booking.pro?.full_name ?? '' })}
        </p>

        <div className="flex gap-3 mb-10">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)} onClick={() => setRating(star)}
              className="bg-transparent border-none cursor-pointer transition-transform hover:scale-110">
              <Star size={36} className={`${star <= (hover || rating) ? 'fill-[var(--color-accent)] text-[var(--color-accent)]' : 'text-[var(--color-border-strong)]'} transition-colors duration-200`} />
            </button>
          ))}
        </div>

        <div className="space-y-4 mb-6">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-2">{t('review.label_comment')}</label>
          <textarea
            value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000}
            placeholder={t('review.placeholder_comment')}
            className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl p-6 text-[var(--color-text-main)] text-sm outline-none focus:border-[var(--color-accent)]/50 transition-all resize-none min-h-[140px] italic"
          />
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold uppercase">
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading || rating === 0}
          className="w-full bg-[var(--color-text-main)] hover:bg-[var(--color-accent)] hover:text-white text-[var(--color-bg-primary)] py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all disabled:opacity-20 flex items-center justify-center gap-3 border-none cursor-pointer group">
          {loading ? <Loader2 className="animate-spin" size={18} /> : (<>{t('review.btn_submit')} <Send size={16} className="group-hover:translate-x-1 transition-transform" /></>)}
        </button>
      </div>
    </div>
  );
};

export default ReviewModal;