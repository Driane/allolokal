import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DISPUTE_REASONS_CLIENT } from '../lib/disputes';
import { useModalBackButton } from '../hooks/useModalBackButton';

interface DisputeModalProps {
  bookingId: string;
  onClose: () => void;
  onSuccess: () => void;
  reporterRole?: 'client' | 'pro';
}

const OTHER_REASON = 'Autre';

const DisputeModal: React.FC<DisputeModalProps> = ({ bookingId, onClose, onSuccess, reporterRole = 'client' }) => {
  const { t } = useTranslation();
  useModalBackButton(true, onClose);
  const [reasonCategory, setReasonCategory] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const isOther     = reasonCategory === OTHER_REASON;
  const canSubmit   = reporterRole === 'client'
    ? reasonCategory && (!isOther || details.trim())
    : details.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const reason = reporterRole === 'client' && reasonCategory && !isOther
        ? (details.trim() ? `${reasonCategory} — ${details.trim()}` : reasonCategory)
        : details.trim();

      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'disputed',
          dispute_reason: reason,
          disputed_at: new Date().toISOString(),
          disputed_by: user.id
        })
        .eq('id', bookingId);

      if (error) throw error;
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert(t('dispute.error_submit'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/90 backdrop-blur-md flex items-start justify-center px-4 sm:px-6 pt-20 xl:pt-28 pb-8">
      <div className="bg-[var(--color-bg-secondary)] border border-red-500/30 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl">
        <div className="flex justify-between items-start mb-8">
          <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
            <AlertTriangle size={28} />
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-bg-tertiary)] rounded-xl transition-colors text-[var(--color-text-muted)] border-none bg-transparent cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        <h3 className="text-3xl font-black italic uppercase tracking-tighter text-[var(--color-text-main)] mb-3">
          {t('dispute.modal_title')}
        </h3>
        <p className="text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-[0.2em] mb-8 leading-relaxed">
          {t('dispute.warning')}
        </p>

        {reporterRole === 'client' && (
          <div className="mb-5">
            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2 ml-1">
              {t('dispute.reason_label', 'Motif')}
            </label>
            <select
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl p-5 text-[var(--color-text-main)] text-sm outline-none focus:border-red-500/50 transition-all cursor-pointer"
            >
              <option value="" disabled>{t('dispute.reason_placeholder', 'Sélectionnez un motif')}</option>
              {DISPUTE_REASONS_CLIENT.map(group => (
                <optgroup key={group.groupKey} label={t(`dispute.reasons.groups.${group.groupKey}`)}>
                  {group.items.map(item => (
                    <option key={item.key} value={item.fr}>{t(`dispute.reasons.items.${item.key}`, item.fr)}</option>
                  ))}
                </optgroup>
              ))}
              <option value={OTHER_REASON}>{t('dispute.reasons.other', OTHER_REASON)}</option>
            </select>
          </div>
        )}

        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={t('dispute.placeholder_reason')}
          className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl p-5 text-[var(--color-text-main)] text-sm outline-none focus:border-red-500/50 transition-all resize-none mb-8 min-h-[120px] italic"
        />

        <button
          onClick={handleSubmit}
          disabled={loading || !canSubmit}
          className="w-full bg-red-600 hover:bg-red-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all disabled:opacity-20 flex items-center justify-center gap-3 border-none cursor-pointer"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : t('dispute.btn_confirm')}
        </button>
      </div>
    </div>
  );
};

export default DisputeModal;
