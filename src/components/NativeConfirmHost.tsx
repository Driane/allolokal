import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useConfirmRequest, answerConfirm } from '../lib/nativeConfirm';
import { useModalBackButton } from '../hooks/useModalBackButton';

// Monté une seule fois (App.tsx) : affiche le dialogue Material correspondant
// à toute confirmNative() en attente, n'importe où dans l'app native.
const NativeConfirmHost: React.FC = () => {
  const request = useConfirmRequest();
  useModalBackButton(!!request, () => answerConfirm(false));

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center px-6 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] w-full max-w-sm rounded-[1.75rem] p-6 shadow-2xl">
        {request.danger && (
          <div className="w-11 h-11 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
        )}
        {request.title && (
          <h3 className="text-base font-black uppercase tracking-tight text-[var(--color-text-main)] mb-2">
            {request.title}
          </h3>
        )}
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-6">
          {request.message}
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => answerConfirm(false)}
            className="px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] border-none bg-transparent cursor-pointer transition-colors"
          >
            {request.cancelLabel ?? 'Annuler'}
          </button>
          <button
            onClick={() => answerConfirm(true)}
            className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border-none cursor-pointer transition-colors ${
              request.danger ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white'
            }`}
          >
            {request.confirmLabel ?? 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NativeConfirmHost;
