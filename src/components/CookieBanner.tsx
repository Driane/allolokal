import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X, ChevronDown, ChevronUp, ShieldCheck, BarChart2, Megaphone } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCookieConsent } from '../hooks/useCookieConsent';

const Toggle: React.FC<{ checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }> = ({
  checked, disabled = false, onChange,
}) => (
  <button type="button" role="switch" aria-checked={checked} disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={`relative w-10 h-6 rounded-full transition-colors shrink-0 border-none cursor-pointer ${
      disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
    } ${checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'}`}
  >
    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
  </button>
);

const CookieBanner: React.FC = () => {
  const { t } = useTranslation();
  const { consent, acceptAll, rejectAll, saveCustom } = useCookieConsent();
  const [showPanel, setShowPanel]         = useState(false);
  const [showDetails, setShowDetails]     = useState(false);
  const [analytics, setAnalytics]         = useState(false);
  const [marketing, setMarketing]         = useState(false);

  // Ne rien afficher si l'utilisateur a déjà décidé
  if (consent.decided) return null;

  const handleSaveCustom = () => { saveCustom(analytics, marketing); setShowPanel(false); };

  const categories = [
    {
      key: 'essential',
      icon: <ShieldCheck size={16} className="text-emerald-500" />,
      label: t('cookies.cat_essential', 'Essentiels'),
      desc: t('cookies.cat_essential_desc', 'Authentification, session, langue, thème. Toujours actifs, nécessaires au fonctionnement.'),
      checked: true,
      disabled: true,
      onChange: () => {},
    },
    {
      key: 'analytics',
      icon: <BarChart2 size={16} className="text-blue-400" />,
      label: t('cookies.cat_analytics', 'Analytiques'),
      desc: t('cookies.cat_analytics_desc', 'Nous aident à comprendre comment vous utilisez le site pour l\'améliorer. Aucune donnée vendue.'),
      checked: analytics,
      disabled: false,
      onChange: setAnalytics,
    },
    {
      key: 'marketing',
      icon: <Megaphone size={16} className="text-purple-400" />,
      label: t('cookies.cat_marketing', 'Marketing'),
      desc: t('cookies.cat_marketing_desc', 'Personnalisation des publicités et mesure de leur efficacité.'),
      checked: marketing,
      disabled: false,
      onChange: setMarketing,
    },
  ];

  return (
    <AnimatePresence>
      {/* Overlay si le panel est ouvert */}
      {showPanel && (
        <m.div key="overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[900]"
          onClick={() => setShowPanel(false)}
        />
      )}

      {/* Panel de préférences */}
      {showPanel && (
        <m.div key="panel"
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-[901] bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] shadow-2xl max-h-[85vh] overflow-y-auto rounded-t-[2rem]"
        >
          <div className="max-w-2xl mx-auto px-6 pt-6 pb-8">
            {/* Header panel */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--color-accent-light)] rounded-2xl flex items-center justify-center">
                  <Cookie size={18} className="text-[var(--color-accent)]" />
                </div>
                <h2 className="text-lg font-black italic uppercase tracking-tighter text-[var(--color-text-main)]">
                  {t('cookies.pref_title', 'Préférences cookies')}
                </h2>
              </div>
              <button onClick={() => setShowPanel(false)}
                className="w-8 h-8 rounded-xl bg-[var(--color-bg-tertiary)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border-none cursor-pointer transition-colors">
                <X size={16} />
              </button>
            </div>

            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-6">
              {t('cookies.pref_desc', 'Nous utilisons des cookies pour vous offrir la meilleure expérience possible. Vous pouvez personnaliser vos préférences ci-dessous.')}{' '}
              <Link to="/privacy" className="text-[var(--color-accent)] underline" onClick={() => setShowPanel(false)}>
                {t('cookies.learn_more', 'En savoir plus')}
              </Link>
            </p>

            {/* Catégories */}
            <div className="flex flex-col gap-3 mb-6">
              {categories.map(cat => (
                <div key={cat.key}
                  className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
                  {/* Row principale */}
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div className="w-8 h-8 bg-[var(--color-bg-secondary)] rounded-xl flex items-center justify-center shrink-0">
                      {cat.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-black text-[var(--color-text-main)]">{cat.label}</span>
                      {cat.disabled && (
                        <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          {t('cookies.always_on', 'Toujours actif')}
                        </span>
                      )}
                    </div>
                    <Toggle checked={cat.checked} disabled={cat.disabled} onChange={cat.onChange} />
                  </div>
                  {/* Description */}
                  <div className="px-5 pb-4">
                    <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{cat.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Détails techniques */}
            <button onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors bg-transparent border-none cursor-pointer mb-4">
              {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {t('cookies.technical_details', 'Détails techniques')}
            </button>

            {showDetails && (
              <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl p-5 mb-6 text-xs text-[var(--color-text-muted)] space-y-2">
                <p><strong className="text-[var(--color-text-main)]">sb-access-token, sb-refresh-token</strong> — Session Supabase. Durée : 1h (auto-renouvelé). Essentiel.</p>
                <p><strong className="text-[var(--color-text-main)]">i18next</strong> — Préférence de langue. Durée : 1 an. Essentiel.</p>
                <p><strong className="text-[var(--color-text-main)]">allolokal_theme</strong> — Thème clair/sombre. Durée : 1 an. Essentiel.</p>
                <p><strong className="text-[var(--color-text-main)]">allolokal_cookie_consent</strong> — Mémorisation de vos préférences. Durée : 13 mois. Essentiel.</p>
                <p><strong className="text-[var(--color-text-main)]">_ga, _gid</strong> — Google Analytics (si activé). Durée : 13 mois. Analytique.</p>
              </div>
            )}

            {/* Boutons panel */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={handleSaveCustom}
                className="flex-1 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-widest border-none cursor-pointer transition-colors">
                {t('cookies.save_pref', 'Enregistrer mes préférences')}
              </button>
              <button onClick={acceptAll}
                className="flex-1 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-primary)] text-[var(--color-text-main)] font-black py-3.5 rounded-2xl text-xs uppercase tracking-widest border border-[var(--color-border)] cursor-pointer transition-colors">
                {t('cookies.accept_all', 'Tout accepter')}
              </button>
            </div>
          </div>
        </m.div>
      )}

      {/* Bannière principale (visible si pas de panel) */}
      {!showPanel && (
        <m.div key="banner"
          initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.8 }}
          className="fixed bottom-4 left-4 right-4 z-[900] max-w-3xl mx-auto"
        >
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[2rem] shadow-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Icône + texte */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 bg-[var(--color-accent-light)] rounded-2xl flex items-center justify-center shrink-0 mt-0.5">
                <Cookie size={18} className="text-[var(--color-accent)]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-[var(--color-text-main)] mb-1">
                  {t('cookies.banner_title', 'Nous respectons votre vie privée')}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  {t('cookies.banner_desc', 'Nous utilisons des cookies essentiels au fonctionnement du site et, avec votre accord, des cookies analytiques pour l\'améliorer.')}{' '}
                  <Link to="/privacy" className="text-[var(--color-accent)] underline hover:opacity-70 transition-opacity">
                    {t('cookies.learn_more', 'En savoir plus')}
                  </Link>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col xs:flex-row sm:flex-col lg:flex-row gap-2 shrink-0 w-full sm:w-auto">
              <button onClick={acceptAll}
                className="px-5 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black text-[10px] uppercase tracking-widest rounded-xl border-none cursor-pointer transition-colors whitespace-nowrap">
                {t('cookies.accept_all', 'Tout accepter')}
              </button>
              <button onClick={rejectAll}
                className="px-5 py-3 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-primary)] text-[var(--color-text-muted)] font-black text-[10px] uppercase tracking-widest rounded-xl border border-[var(--color-border)] cursor-pointer transition-colors whitespace-nowrap">
                {t('cookies.reject_all', 'Refuser')}
              </button>
              <button onClick={() => setShowPanel(true)}
                className="px-5 py-3 text-[var(--color-accent)] hover:opacity-70 font-black text-[10px] uppercase tracking-widest rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent-light)] cursor-pointer transition-opacity whitespace-nowrap">
                {t('cookies.customize', 'Personnaliser')}
              </button>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
};

export default CookieBanner;
