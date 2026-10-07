import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { User, Briefcase, Loader2, Eye, EyeOff, Mail, CheckCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { useIsNative } from '../hooks/useIsNative';

const Blobs = () => (
  <div className="fixed inset-0 pointer-events-none z-0">
    <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[var(--color-accent-light)] blur-[120px] rounded-full" />
    <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-[var(--color-accent-light)] blur-[120px] rounded-full" />
  </div>
);

const PageWrapper = ({ children }: { children: React.ReactNode }) => {
  const isNative = useIsNative();
  return (
    <div className={`min-h-screen flex items-center justify-center px-4 bg-[var(--color-bg-primary)] ${isNative ? 'py-6' : 'pt-20 xl:pt-28'}`}>
      <Blobs />
      {children}
    </div>
  );
};

const Auth: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlMode = searchParams.get('mode');
  const urlRole = searchParams.get('role') as 'client' | 'pro' | null;
  const urlFrom = searchParams.get('from');

  // ── États principaux ──────────────────────────────────────────────────────
  const [loading, setLoading]               = useState(false);
  const [resendLoading, setResendLoading]   = useState(false);
  const [isSignUp, setIsSignUp]             = useState(urlMode === 'register');
  const [isForgotPwd, setIsForgotPwd]       = useState(false);
  const [showPassword, setShowPassword]     = useState(false);
  const [signupSuccess, setSignupSuccess]   = useState(false);
  const [forgotSuccess, setForgotSuccess]   = useState(false);
  const [resendSuccess, setResendSuccess]   = useState(false);

  // ── Champs ────────────────────────────────────────────────────────────────
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [oib, setOib]               = useState('');
  const [phone, setPhone]           = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole]             = useState<'client' | 'pro'>(urlRole ?? 'client');
  const [cgvAccepted, setCgvAccepted] = useState(false);
  const [cgvShake, setCgvShake]     = useState(false);
  const [formError, setFormError]   = useState('');

  // Doit être mise à jour si le contenu des CGU/CGV change (cf. lastUpdated dans TermsPage)
  const CGV_VERSION = '2026-06-01';

  useEffect(() => {
    if (urlMode === 'register') setIsSignUp(true);
    if (urlRole) setRole(urlRole);
  }, [urlMode, urlRole]);

  // ── Connexion / Inscription ───────────────────────────────────────────────
  const triggerCgvShake = () => {
    setCgvShake(true);
    setTimeout(() => setCgvShake(false), 600);
  };

  const handleAuth = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setFormError('');

    if (isSignUp) {
      if (firstName.trim().length < 2 || lastName.trim().length < 2) {
        setFormError(t('auth.errors.name_too_short', 'Prénom et nom doivent contenir au moins 2 lettres.'));
        return;
      }
      if (role === 'pro' && !/^\d{11}$/.test(oib.trim())) {
        setFormError(t('auth.errors.oib_invalid', 'Le numéro OIB doit contenir exactement 11 chiffres.'));
        return;
      }
      if (phone.trim().length < 6) {
        setFormError(t('auth.errors.phone_required', 'Un numéro de téléphone valide est requis.'));
        return;
      }
      if (!cgvAccepted) {
        triggerCgvShake();
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
        const language = i18n.language;
        const { data: signUpData, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName, first_name: firstName.trim(), last_name: lastName.trim(), company_name: companyName.trim() || null, role, language } }
        });
        if (error) throw error;
        if (signUpData.user) {
          supabase.functions.invoke('send-welcome', {
            body: { record: { id: signUpData.user.id, full_name: fullName, language } }
          }).catch(() => {});
          supabase.functions.invoke('finalize-signup', {
            body: {
              userId: signUpData.user.id,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              companyName: companyName.trim() || null,
              oib: role === 'pro' ? oib.trim() || null : null,
              phone: phone.trim(),
              documentVersion: CGV_VERSION,
            }
          }).catch(() => {});
        }
        setSignupSuccess(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(urlFrom ? decodeURIComponent(urlFrom) : '/dashboard');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('auth.alerts.error_generic');
      if (msg.toLowerCase().includes('email not confirmed')) {
        alert(t('auth.errors.email_not_confirmed', 'Votre email n\'est pas encore confirmé. Vérifiez vos spams.'));
      } else {
        alert(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Mot de passe oublié ───────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setForgotSuccess(true);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : t('auth.alerts.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  // ── Renvoyer l'email de confirmation ─────────────────────────────────────
  const handleResend = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      setResendSuccess(true);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : t('auth.alerts.error_generic'));
    } finally {
      setResendLoading(false);
    }
  };

  const switchToSignUp = (r: 'client' | 'pro') => {
    setRole(r); setIsSignUp(true); setShowPassword(false);
    setFirstName(''); setLastName(''); setCompanyName(''); setOib(''); setPhone('');
  };

  const resetToLogin = () => {
    setIsSignUp(false); setIsForgotPwd(false);
    setSignupSuccess(false); setForgotSuccess(false); setResendSuccess(false);
    setPassword(''); setShowPassword(false); setCgvAccepted(false); setFormError('');
  };

  // ══════════════════════════════════════════════════════════════════════════
  // Écran : confirmation email après inscription
  // ══════════════════════════════════════════════════════════════════════════
  if (signupSuccess) return (
    <PageWrapper>
      <div className="max-w-md w-full glass-card p-10 rounded-[2.5rem] shadow-2xl relative z-10 border border-[var(--color-border)] text-center">
        <div className="w-20 h-20 bg-[var(--color-accent-light)] rounded-full flex items-center justify-center mx-auto mb-6 border border-[var(--color-accent)]/20">
          <Mail size={36} className="text-[var(--color-accent)]" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-4">
          <CheckCircle size={16} className="text-emerald-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">
            {t('auth.confirm_account_created', 'Compte créé')}
          </span>
        </div>
        <h2 className="text-2xl font-black text-[var(--color-text-main)] mb-3 tracking-tight">
          {t('auth.confirm_title', 'Vérifiez votre email')}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-2">
          {t('auth.confirm_message', 'Un lien de confirmation a été envoyé à')}
        </p>
        <p className="font-black text-[var(--color-accent)] mb-6 text-sm">{email}</p>
        <p className="text-xs text-[var(--color-text-muted)] italic mb-8 leading-relaxed">
          {t('auth.confirm_hint', 'Cliquez sur le lien dans l\'email pour activer votre compte. Pensez à vérifier vos spams.')}
        </p>

        {/* Renvoyer l'email */}
        <div className="mb-4">
          {resendSuccess ? (
            <div className="flex items-center justify-center gap-2 text-emerald-500 text-xs font-black uppercase tracking-widest py-3">
              <CheckCircle size={14} /> {t('auth.resend_success', 'Email renvoyé !')}
            </div>
          ) : (
            <button onClick={handleResend} disabled={resendLoading}
              className="w-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] font-black py-3 rounded-2xl text-xs uppercase tracking-[0.2em] bg-transparent cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {resendLoading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
              {t('auth.resend_email', 'Renvoyer l\'email')}
            </button>
          )}
        </div>

        <button onClick={resetToLogin}
          className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black py-4 rounded-2xl text-xs uppercase tracking-[0.2em] border-none cursor-pointer transition-colors">
          {t('auth.back_to_login', 'Retour à la connexion')}
        </button>
      </div>
    </PageWrapper>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Écran : email de reset envoyé
  // ══════════════════════════════════════════════════════════════════════════
  if (forgotSuccess) return (
    <PageWrapper>
      <div className="max-w-md w-full glass-card p-10 rounded-[2.5rem] shadow-2xl relative z-10 border border-[var(--color-border)] text-center">
        <div className="w-20 h-20 bg-[var(--color-accent-light)] rounded-full flex items-center justify-center mx-auto mb-6 border border-[var(--color-accent)]/20">
          <Mail size={36} className="text-[var(--color-accent)]" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-4">
          <CheckCircle size={16} className="text-emerald-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">
            {t('auth.forgot_sent_badge', 'Email envoyé')}
          </span>
        </div>
        <h2 className="text-2xl font-black text-[var(--color-text-main)] mb-3 tracking-tight">
          {t('auth.forgot_sent_title', 'Vérifiez votre boîte mail')}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-2">
          {t('auth.forgot_sent_message', 'Un lien de réinitialisation a été envoyé à')}
        </p>
        <p className="font-black text-[var(--color-accent)] mb-6 text-sm">{email}</p>
        <p className="text-xs text-[var(--color-text-muted)] italic mb-8 leading-relaxed">
          {t('auth.forgot_sent_hint', 'Le lien est valable 1 heure. Pensez à vérifier vos spams.')}
        </p>
        <button onClick={resetToLogin}
          className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black py-4 rounded-2xl text-xs uppercase tracking-[0.2em] border-none cursor-pointer transition-colors">
          {t('auth.back_to_login', 'Retour à la connexion')}
        </button>
      </div>
    </PageWrapper>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Écran : formulaire mot de passe oublié
  // ══════════════════════════════════════════════════════════════════════════
  if (isForgotPwd) return (
    <PageWrapper>
      <div className="max-w-md w-full glass-card p-10 rounded-[2.5rem] shadow-2xl relative z-10 border border-[var(--color-border)]">
        <button onClick={() => setIsForgotPwd(false)}
          className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] text-[10px] font-black uppercase tracking-widest mb-8 bg-transparent border-none cursor-pointer transition-colors">
          <ArrowLeft size={14} /> {t('auth.back_to_login', 'Retour à la connexion')}
        </button>

        <div className="w-14 h-14 bg-[var(--color-accent-light)] rounded-2xl flex items-center justify-center mb-6 border border-[var(--color-accent)]/20">
          <KeyRound size={24} className="text-[var(--color-accent)]" />
        </div>
        <h2 className="text-3xl font-black text-[var(--color-text-main)] mb-2 tracking-tight">
          {t('auth.forgot_title', 'Mot de passe oublié ?')}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] italic mb-8">
          {t('auth.forgot_subtitle', 'Entrez votre email, nous vous enverrons un lien de réinitialisation.')}
        </p>

        <form onSubmit={handleForgotPassword} className="space-y-5">
          <div>
            <label className="block text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest mb-2 ml-1">
              {t('auth.labels.email')}
            </label>
            <input type="email" required autoFocus
              className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl px-5 py-4 text-[var(--color-text-main)] focus:border-[var(--color-accent)] outline-none transition-all text-sm"
              placeholder={t('auth.placeholders.email')}
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black py-4 rounded-2xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase text-xs tracking-[0.2em]">
            {loading ? <Loader2 className="animate-spin" size={18} /> : t('auth.forgot_submit', 'Envoyer le lien')}
          </button>
        </form>
      </div>
    </PageWrapper>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Écran principal : connexion / inscription
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <PageWrapper>
      <div className="max-w-md w-full glass-card p-10 rounded-[2.5rem] shadow-2xl relative z-10 border border-[var(--color-border)]">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black mb-2 tracking-tighter text-[var(--color-text-main)]">
            Allo<span className="text-[var(--color-accent)]">Lokal</span>
          </h1>
          <h2 className="text-3xl font-black text-[var(--color-text-main)] mb-2">
            {isSignUp ? t('auth.title_signup') : t('auth.title_login')}
          </h2>
          <p className="text-[var(--color-text-muted)] text-sm italic">
            {isSignUp ? t('auth.subtitle_signup') : t('auth.subtitle_login')}
          </p>
        </div>

        <form onSubmit={handleAuth} noValidate className="space-y-5">
          {isSignUp && (
            <>
              {/* Sélection rôle */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {(['client', 'pro'] as const).map(r => (
                  <button key={r} type="button" onClick={() => setRole(r)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                      role === r
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-text-main)]'
                        : 'border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-muted)]'
                    }`}>
                    {r === 'client' ? <User size={20} /> : <Briefcase size={20} />}
                    <span className="text-[10px] font-black uppercase tracking-widest">{t(`auth.roles.${r}`)}</span>
                  </button>
                ))}
              </div>

              {/* Prénom + Nom */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest mb-2 ml-1">
                    {t('auth.labels.first_name', 'Prénom')}
                  </label>
                  <input type="text" required
                    className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl px-5 py-4 text-[var(--color-text-main)] focus:border-[var(--color-accent)] outline-none transition-all text-sm"
                    placeholder={t('auth.placeholders.first_name', 'Jean')}
                    value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest mb-2 ml-1">
                    {t('auth.labels.last_name', 'Nom')}
                  </label>
                  <input type="text" required
                    className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl px-5 py-4 text-[var(--color-text-main)] focus:border-[var(--color-accent)] outline-none transition-all text-sm"
                    placeholder={t('auth.placeholders.last_name', 'Dupont')}
                    value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
              </div>

              {/* OIB (pro uniquement) + Téléphone */}
              <div className={role === 'pro' ? 'grid grid-cols-2 gap-3' : ''}>
                {role === 'pro' && (
                  <div>
                    <label className="block text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest mb-2 ml-1">
                      {t('auth.labels.oib', 'OIB')}
                    </label>
                    <input type="text" required inputMode="numeric" maxLength={11}
                      className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl px-5 py-4 text-[var(--color-text-main)] focus:border-[var(--color-accent)] outline-none transition-all text-sm"
                      placeholder={t('auth.placeholders.oib', '12345678901')}
                      value={oib} onChange={e => setOib(e.target.value.replace(/\D/g, ''))} />
                  </div>
                )}
                <div>
                  <label className="block text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest mb-2 ml-1">
                    {t('auth.labels.phone', 'Téléphone')}
                  </label>
                  <input type="tel" required
                    className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl px-5 py-4 text-[var(--color-text-main)] focus:border-[var(--color-accent)] outline-none transition-all text-sm"
                    placeholder={t('auth.placeholders.phone', '+385 91 234 5678')}
                    value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>

              {/* Nom d'entreprise — pro uniquement */}
              {role === 'pro' && (
                <div>
                  <label className="block text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest mb-2 ml-1">
                    {t('auth.labels.company_name', 'Nom de l\'entreprise')}
                    <span className="ml-2 normal-case font-bold text-[8px] opacity-60">{t('auth.labels.optional', 'optionnel')}</span>
                  </label>
                  <input type="text"
                    className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl px-5 py-4 text-[var(--color-text-main)] focus:border-[var(--color-accent)] outline-none transition-all text-sm"
                    placeholder={t('auth.placeholders.company_name', 'Mon Salon, SARL...')}
                    value={companyName} onChange={e => setCompanyName(e.target.value)} />
                </div>
              )}
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest mb-2 ml-1">
              {t('auth.labels.email')}
            </label>
            <input type="email" required
              className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl px-5 py-4 text-[var(--color-text-main)] focus:border-[var(--color-accent)] outline-none transition-all text-sm"
              placeholder={t('auth.placeholders.email')}
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          {/* Mot de passe */}
          <div>
            <div className="flex justify-between items-center mb-2 ml-1">
              <label className="block text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest">
                {t('auth.labels.password')}
              </label>
              {/* Lien mot de passe oublié — visible uniquement en mode connexion */}
              {!isSignUp && (
                <button type="button" onClick={() => setIsForgotPwd(true)}
                  className="text-[9px] font-black uppercase tracking-widest text-[var(--color-accent)] hover:opacity-70 transition-opacity bg-transparent border-none cursor-pointer">
                  {t('auth.forgot_link', 'Mot de passe oublié ?')}
                </button>
              )}
            </div>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} required
                className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl px-5 py-4 text-[var(--color-text-main)] focus:border-[var(--color-accent)] outline-none transition-all text-sm pr-12"
                placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors bg-transparent border-none cursor-pointer"
                aria-label={showPassword ? 'Masquer' : 'Afficher'}>
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Case CGV — inscription uniquement */}
          {isSignUp && (
            <div className={`flex items-start gap-3 pt-1 -m-2 p-2 rounded-xl transition-colors ${cgvShake ? 'animate-shake bg-red-500/10' : ''}`}>
              <input
                type="checkbox"
                id="cgv-accept"
                checked={cgvAccepted}
                onChange={e => setCgvAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 cursor-pointer accent-[var(--color-accent)]"
              />
              <label htmlFor="cgv-accept" className="text-xs text-[var(--color-text-muted)] leading-relaxed cursor-pointer select-none">
                {t('auth.cgv_prefix', "J'accepte les")}{' '}
                <Link to="/terms" target="_blank" rel="noopener noreferrer"
                  className="text-[var(--color-accent)] font-bold hover:underline">
                  {t('auth.cgv_link', 'conditions générales de vente')}
                </Link>
                {' '}{t('auth.cgv_and', 'et la')}{' '}
                <Link to="/privacy" target="_blank" rel="noopener noreferrer"
                  className="text-[var(--color-accent)] font-bold hover:underline">
                  {t('auth.privacy_link', 'politique de confidentialité')}
                </Link>
              </label>
            </div>
          )}

          {formError && (
            <p className="text-xs font-bold text-red-500 -mt-2">{formError}</p>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black py-4 rounded-2xl shadow-lg transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase text-xs tracking-[0.2em]">
            {loading ? <Loader2 className="animate-spin" size={18} /> : (isSignUp ? t('auth.buttons.signup') : t('auth.buttons.login'))}
          </button>
        </form>

        {/* Switch login ↔ signup */}
        <div className="mt-6 text-center">
          <button onClick={() => { setIsSignUp(!isSignUp); setShowPassword(false); }}
            className="text-[11px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors uppercase tracking-widest bg-transparent border-none cursor-pointer">
            {isSignUp ? t('auth.switch.to_login') : t('auth.switch.to_signup')}
          </button>
        </div>

        {/* Créer un compte — visible uniquement en mode connexion */}
        {!isSignUp && (
          <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
            <p className="text-center text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-4">
              {t('auth.no_account')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => switchToSignUp('client')}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-all text-[10px] font-black uppercase tracking-wider cursor-pointer">
                <User size={14} /> {t('auth.create_client')}
              </button>
              <button type="button" onClick={() => switchToSignUp('pro')}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-all text-[10px] font-black uppercase tracking-wider cursor-pointer">
                <Briefcase size={14} /> {t('auth.create_pro')}
              </button>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default Auth;
