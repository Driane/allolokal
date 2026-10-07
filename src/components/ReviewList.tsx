import React, { useState } from 'react';
import { Star, User, MessageSquare, Loader2, Reply } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { formatReviewerName } from '../lib/displayName';

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles?: { full_name?: string; avatar_url?: string };
  pro_reply?: string | null;
  pro_replied_at?: string | null;
}

interface ReviewListProps {
  reviews: Review[];
  proId?: string;
  currentUserId?: string | null;
  onReplyAdded?: () => void;
}

const ReviewList: React.FC<ReviewListProps> = ({ reviews, proId, currentUserId, onReplyAdded }) => {
  const { t } = useTranslation();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isProOwner = !!proId && !!currentUserId && proId === currentUserId;

  const submitReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').update({
        pro_reply:        replyText.trim(),
        pro_replied_at:   new Date().toISOString(),
      }).eq('id', reviewId);
      if (error) throw error;
      setReplyingTo(null);
      setReplyText('');
      onReplyAdded?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (reviews.length === 0) return (
    <div className="py-10 text-center border border-dashed border-[var(--color-border)] rounded-[2rem]">
      <p className="text-[var(--color-text-muted)] font-black uppercase text-[10px] tracking-widest italic">
        {t('review.empty')}
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div key={review.id}
          className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-8 rounded-[2.5rem] hover:border-[var(--color-border-strong)] transition-all">

          {/* Header : avatar + étoiles */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-light)] border border-[var(--color-accent)]/20 overflow-hidden flex items-center justify-center text-[var(--color-accent)]">
                {review.profiles?.avatar_url
                  ? <img src={review.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                  : <User size={18} />}
              </div>
              <div>
                <h4 className="text-[var(--color-text-main)] font-black text-sm uppercase italic">
                  {formatReviewerName(review.profiles?.full_name, t('review.anonymous'))}
                </h4>
                <p className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest">
                  {new Date(review.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={12}
                  className={i < review.rating
                    ? 'fill-[var(--color-accent)] text-[var(--color-accent)]'
                    : 'text-[var(--color-border-strong)]'} />
              ))}
            </div>
          </div>

          {/* Commentaire */}
          <p className="text-[var(--color-text-muted)] text-sm italic leading-relaxed">
            "{review.comment}"
          </p>

          {/* Réponse existante du pro */}
          {review.pro_reply && (
            <div className="mt-5 ml-4 pl-4 border-l-2 border-[var(--color-accent)]/30 bg-[var(--color-accent-light)] rounded-r-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Reply size={12} className="text-[var(--color-accent)]" />
                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-accent)]">
                  {t('review.pro_response', 'Réponse du professionnel')}
                </span>
                {review.pro_replied_at && (
                  <span className="text-[9px] text-[var(--color-text-muted)]">
                    — {new Date(review.pro_replied_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--color-text-main)] italic leading-relaxed">
                {review.pro_reply}
              </p>
            </div>
          )}

          {/* Zone de réponse pour le pro connecté */}
          {isProOwner && !review.pro_reply && (
            <div className="mt-4">
              {replyingTo === review.id ? (
                <div className="space-y-3">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder={t('review.reply_placeholder', 'Votre réponse...')}
                    rows={3}
                    autoFocus
                    className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl px-4 py-3 text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)]/50 transition-colors resize-none italic"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setReplyingTo(null); setReplyText(''); }}
                      className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer bg-transparent"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={() => submitReply(review.id)}
                      disabled={submitting || !replyText.trim()}
                      className="px-4 py-2 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border-none disabled:opacity-40 flex items-center gap-2"
                    >
                      {submitting ? <Loader2 size={12} className="animate-spin" /> : <Reply size={12} />}
                      {t('review.submit_reply', 'Publier la réponse')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setReplyingTo(review.id); setReplyText(''); }}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors bg-transparent border-none cursor-pointer mt-2"
                >
                  <MessageSquare size={12} />
                  {t('review.reply_btn', 'Répondre à cet avis')}
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ReviewList;
