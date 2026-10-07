import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2, CheckCircle, Lock, ShieldCheck } from 'lucide-react';
import { useIsNative } from '../hooks/useIsNative';

const ResetPassword: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isNative = useIsNative();
  const wrapperClass = `min-h-screen flex items-center justify-center px-4 bg-[var(--color-bg-primary)] ${isNative ? 'py-6' : 'pt-20 xl:pt-28'}`;

  const [ready, setReady]               = useState(false); // token reconnu par Supabase
  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [done, setDone]                 = useState(false);
  const [error, setError]               = useState('');

  // Supabase intercepte le token dans l'URL hash et émet PASSWORD_RECOVERY
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError(t('auth.reset_error_length', 'Le mot de passe doit faire au moins 6 caractères.'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.reset_error_match', 'Les mots de passe ne correspondent pas.'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate('/dashboard'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.alerts.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  // ── Blobs décoratifs ──────────────────────────────────────────────────────
  const Blobs = () => (
    <div className="fixed inset-0 pointer-events-none z-0">
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[var(--color-accent-light)] blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-[var(--color-accent-light)] blur-[120px] rounded-full" />
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Succès — mot de passe changé
  // ══════════════════════════════════════════════════════════════════════════
  if (done) return (
    <div className={wrapperClass}>
      <Blobs />
      <div className="max-w-md w-full glass-card p-10 rounded-[2.5rem] shadow-2xl relative z-10 border border-[var(--color-border)] text-center">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
          <CheckCircle size={36} className="text-emerald-500" />
        </div>
        <h2 className="text-2xl font-black text-[var(--color-text-main)] mb-3 tracking-tight">
          {t('auth.reset_done_title', 'Mot de passe mis à jour !')}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-2">
          {t('auth.reset_done_message', 'Vous allez être redirigé vers votre dashboard…')}
        </p>
        <div className="flex items-center justify-center mt-6">
          <Loader2 size={20} className="animate-spin text-[var(--color-accent)]" />
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Attente du token (page chargée sans hash valide)
  // ══════════════════════════════════════════════════════════════════════════
  if (!ready) return (
    <div className={wrapperClass}>
      <Blobs />
      <div className="max-w-md w-full glass-card p-10 rounded-[2.5rem] shadow-2xl relative z-10 border border-[var(--color-border)] text-center">
        <Loader2 size={36} className="animate-spin text-[var(--color-accent)] mx-auto mb-6" />
        <h2 className="text-xl font-black text-[var(--color-text-main)] mb-3">
          {t('auth.reset_loading', 'Vérification du lien…')}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          {t('auth.reset_loading_hint', 'Si rien ne se passe, le lien est peut-être expiré. Recommencez la procédure.')}
        </p>
        <button onClick={() => navigate('/auth')}
          className="mt-8 text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)] hover:opacity-70 transition-opacity bg-transparent border-none cursor-pointer">
          {t('auth.back_to_login', 'Retour à la connexion')}
        </button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Formulaire de nouveau mot de passe
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className={wrapperClass}>
      <Blobs />
      <div className="max-w-md w-full glass-card p-10 rounded-[2.5rem] shadow-2xl relative z-10 border border-[var(--color-border)]">

        <div className="w-14 h-14 bg-[var(--color-accent-light)] rounded-2xl flex items-center justify-center mb-6 border border-[var(--color-accent)]/20">
          <Lock size={24} className="text-[var(--color-accent)]" />
        </div>

        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">
            {t('auth.reset_verified', 'Lien vérifié')}
          </span>
        </div>

        <h2 className="text-3xl font-black text-[var(--color-text-main)] mb-2 tracking-tight">
          {t('auth.reset_title', 'Nouveau mot de passe')}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] italic mb-8">
          {t('auth.reset_subtitle', 'Choisissez un mot de passe sécurisé d\'au moins 6 caractères.')}
        </p>

        <form onSubmit={handleReset} className="space-y-5">
          {/* Nouveau mot de passe */}
          <div>
            <label className="block text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest mb-2 ml-1">
              {t('auth.reset_new_password', 'Nouveau mot de passe')}
            </label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} required autoFocus
                className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl px-5 py-4 text-[var(--color-text-main)] focus:border-[var(--color-accent)] outline-none transition-all text-sm pr-12"
                placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors bg-transparent border-none cursor-pointer">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Confirmation */}
          <div>
            <label className="block text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest mb-2 ml-1">
              {t('auth.reset_confirm_password', 'Confirmer le mot de passe')}
            </label>
            <div className="relative">
              <input type={showConfirm ? 'text' : 'password'} required
                className={`w-full bg-[var(--color-bg-primary)] border rounded-2xl px-5 py-4 text-[var(--color-text-main)] focus:border-[var(--color-accent)] outline-none transition-all text-sm pr-12 ${
                  confirm && confirm !== password ? 'border-red-500' : 'border-[var(--color-border)]'
                }`}
                placeholder="••••••••"
                value={confirm} onChange={e => setConfirm(e.target.value)} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors bg-transparent border-none cursor-pointer">
                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {confirm && confirm !== password && (
              <p className="text-red-500 text-[10px] font-black mt-1.5 ml-1">
                {t('auth.reset_error_match', 'Les mots de passe ne correspondent pas.')}
              </p>
            )}
          </div>

          {error && (
            <p className="text-red-500 text-xs font-bold bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading || (!!confirm && confirm !== password)}
            className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black py-4 rounded-2xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase text-xs tracking-[0.2em]">
            {loading ? <Loader2 className="animate-spin" size={18} /> : t('auth.reset_submit', 'Mettre à jour le mot de passe')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
