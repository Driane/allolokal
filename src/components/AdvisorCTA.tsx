import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, X, Send, Loader2, ChevronRight } from 'lucide-react';
import { useModalBackButton } from '../hooks/useModalBackButton';
import { getCategoryColor } from '../lib/categoryColors';

interface AdvisorCTAProps {
  category: string | null;
  variant?: 'banner' | 'card';
}

const AdvisorCTA: React.FC<AdvisorCTAProps> = ({ category, variant = 'card' }) => {
  const { t } = useTranslation();
  const [open, setOpen]         = useState(false);
  const [proName, setProName]   = useState('');
  const [proPhone, setProPhone] = useState('');
  const [yourName, setYourName] = useState('');
  const [message, setMessage]   = useState('');
  const [sent, setSent]         = useState(false);
  const [sending, setSending]   = useState(false);

  const color    = category ? getCategoryColor(category) : 'var(--color-accent)';
  const catLabel = category ? t(`categories.main.${category}`, category) : t('advisor.generic_label');

  const handleSend = async () => {
    if (!proName.trim() || !proPhone.trim()) return;
    setSending(true);
    // TODO: brancher sur une edge function ou mailto
    await new Promise(r => setTimeout(r, 1000));
    setSent(true);
    setSending(false);
  };

  const resetAndClose = () => {
    setOpen(false);
    setSent(false);
    setProName(''); setProPhone(''); setYourName(''); setMessage('');
  };

  if (variant === 'banner') {
    return (
      <div
        className="w-full rounded-3xl border p-6 flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 backdrop-blur-md"
        style={{ backgroundColor: `${color}10`, borderColor: `${color}30` }}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
            <UserPlus size={20} style={{ color }} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
              {t('advisor.banner_label')}
            </p>
            <p className="text-sm font-bold text-[var(--color-text-main)]">
              {t('advisor.banner_title', { catLabel })}
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border-none cursor-pointer transition-all text-white"
          style={{ backgroundColor: color }}
        >
          {t('advisor.btn_cta')} <ChevronRight size={14} />
        </button>

        {open && (
          <SuggestModal
            catLabel={catLabel} color={color}
            proName={proName} setProName={setProName}
            proPhone={proPhone} setProPhone={setProPhone}
            yourName={yourName} setYourName={setYourName}
            message={message} setMessage={setMessage}
            sent={sent} sending={sending}
            onSend={handleSend} onClose={resetAndClose}
            t={t}
          />
        )}
      </div>
    );
  }

  // Variante card
  return (
    <>
      <div
        className="w-full rounded-3xl border overflow-hidden backdrop-blur-md relative"
        style={{ backgroundColor: `${color}08`, borderColor: `${color}25` }}
      >
        <div className="h-1 w-full" style={{ backgroundColor: color, opacity: 0.6 }} />

        <div className="p-7 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
            <UserPlus size={28} style={{ color }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.3em] mb-1" style={{ color }}>
              {t('advisor.card_badge')}
            </div>
            <h4 className="text-base font-black uppercase tracking-tight text-[var(--color-text-main)] mb-1">
              {t('advisor.card_title')}
            </h4>
            <p className="text-[12px] text-[var(--color-text-muted)] italic">
              {t('advisor.card_desc')}
            </p>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="shrink-0 flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest border-none cursor-pointer transition-all hover:brightness-110 text-white whitespace-nowrap"
            style={{ backgroundColor: color }}
          >
            {t('advisor.btn_cta')} <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {open && (
        <SuggestModal
          catLabel={catLabel} color={color}
          proName={proName} setProName={setProName}
          proPhone={proPhone} setProPhone={setProPhone}
          yourName={yourName} setYourName={setYourName}
          message={message} setMessage={setMessage}
          sent={sent} sending={sending}
          onSend={handleSend} onClose={resetAndClose}
          t={t}
        />
      )}
    </>
  );
};

// ── Modal suggestion pro ───────────────────────────────────────────────────────
interface ModalProps {
  catLabel: string; color: string;
  proName: string;  setProName:  (v: string) => void;
  proPhone: string; setProPhone: (v: string) => void;
  yourName: string; setYourName: (v: string) => void;
  message: string;  setMessage:  (v: string) => void;
  sent: boolean; sending: boolean;
  onSend:  () => void;
  onClose: () => void;
  t: (key: string, opts?: Record<string, string>) => string;
}

const SuggestModal: React.FC<ModalProps> = ({
  catLabel, color,
  proName, setProName, proPhone, setProPhone,
  yourName, setYourName, message, setMessage,
  sent, sending, onSend, onClose, t,
}) => {
  useModalBackButton(true, onClose);
  return (
  <div className="fixed inset-0 z-[300] flex items-start justify-center p-4 pt-20 xl:pt-28 pb-10 bg-black/80 backdrop-blur-md overflow-y-auto">
    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative">
      <button onClick={onClose} className="absolute top-7 right-7 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] bg-transparent border-none cursor-pointer">
        <X size={22} />
      </button>

      {sent ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
            <UserPlus size={28} style={{ color }} />
          </div>
          <h3 className="text-2xl font-black italic uppercase tracking-tighter text-[var(--color-text-main)] mb-3">
            {t('advisor.success_title')}
          </h3>
          <p className="text-[var(--color-text-muted)] text-sm italic">
            {t('advisor.success_desc')}
          </p>
        </div>
      ) : (
        <>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: `${color}15` }}>
            <UserPlus size={22} style={{ color }} />
          </div>
          <h3 className="text-2xl font-black italic uppercase tracking-tighter text-[var(--color-text-main)] mb-2">
            {t('advisor.modal_title')}
          </h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-8">
            {t('advisor.modal_subtitle')}
          </p>

          <form onSubmit={e => { e.preventDefault(); onSend(); }} className="space-y-4">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 block">
                {t('advisor.field_pro_name')}
              </label>
              <input
                type="text" required value={proName} onChange={e => setProName(e.target.value)} maxLength={100}
                placeholder="Jean Dupont"
                className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl px-4 py-3 text-[var(--color-text-main)] text-sm outline-none focus:border-[var(--color-accent)]/50 transition-colors"
              />
            </div>

            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 block">
                {t('advisor.field_pro_phone')}
              </label>
              <input
                type="tel" required value={proPhone} onChange={e => setProPhone(e.target.value)}
                placeholder="+33 6 ..."
                className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl px-4 py-3 text-[var(--color-text-main)] text-sm outline-none focus:border-[var(--color-accent)]/50 transition-colors"
              />
            </div>

            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 block">
                {t('advisor.field_your_name')}
              </label>
              <input
                type="text" value={yourName} onChange={e => setYourName(e.target.value)} maxLength={80}
                placeholder="Marie"
                className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl px-4 py-3 text-[var(--color-text-main)] text-sm outline-none focus:border-[var(--color-accent)]/50 transition-colors"
              />
            </div>

            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 block">
                {t('advisor.field_message')}
              </label>
              <textarea
                value={message} onChange={e => setMessage(e.target.value)} rows={2} maxLength={300}
                placeholder={t('advisor.message_placeholder', { catLabel })}
                className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl px-4 py-3 text-[var(--color-text-main)] text-sm outline-none focus:border-[var(--color-accent)]/50 transition-colors resize-none italic"
              />
            </div>

            <button
              type="submit" disabled={sending}
              className="w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:brightness-110"
              style={{ backgroundColor: color }}
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <><Send size={14} /> {t('advisor.btn_send')}</>}
            </button>
          </form>
        </>
      )}
    </div>
  </div>
  );
};

export default AdvisorCTA;
