import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck, ArrowRight, Building2, Landmark, Loader2,
  FileText, ExternalLink, CheckCircle, ChevronRight,
} from 'lucide-react';
import { useIsNative } from '../hooks/useIsNative';

// URL placeholder du contrat Google Doc — à remplacer par le vrai lien
const CONTRACT_URL = '#';

const ProOnboarding: React.FC = () => {
  const { t } = useTranslation();
  const isNative = useIsNative();
  const [step, setStep]             = useState<1 | 2>(1);
  const [cgvAccepted, setCgvAccepted] = useState(false);
  const [contractOpened, setContractOpened] = useState(false);
  const [loading, setLoading]       = useState(false);

  const handleOpenContract = () => {
    window.open(CONTRACT_URL, '_blank', 'noopener,noreferrer');
    setContractOpened(true);
  };

  const handleStartOnboarding = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.functions.invoke('create-connected-account', {
        body: { user: { email: user?.email }, appUrl: window.location.origin }
      });

      if (error) throw error;

      await supabase
        .from('profiles')
        .update({ stripe_connect_id: data.accountId })
        .eq('id', user?.id);

      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert(t('onboarding_pro.error_init'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-main)] flex items-center justify-center px-6 ${isNative ? 'py-6' : 'py-16'}`}>
      <div className="max-w-2xl w-full">

        {/* Indicateur d'étapes */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          {[1, 2].map((s) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                step === s
                  ? 'bg-[var(--color-accent)] text-white'
                  : step > s
                  ? 'bg-emerald-500/20 text-emerald-500'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'
              }`}>
                {step > s ? <CheckCircle size={12} /> : <span>{s}</span>}
                {s === 1 ? 'Contrat' : 'Paiement'}
              </div>
              {s < 2 && <ChevronRight size={14} className="text-[var(--color-text-muted)]" />}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[3rem] p-10 md:p-12 backdrop-blur-3xl shadow-2xl">

          {/* ── ÉTAPE 1 : CGV + Contrat ─────────────────────────────────────── */}
          {step === 1 && (
            <>
              <div className="w-16 h-16 bg-[var(--color-accent-light)] rounded-2xl flex items-center justify-center mb-8 border border-[var(--color-accent)]/30">
                <FileText className="text-[var(--color-accent)]" size={32} />
              </div>

              <h1 className="text-3xl font-black italic uppercase tracking-tight mb-3">
                Contrat <span className="text-[var(--color-accent)]">Prestataire</span>
              </h1>
              <p className="text-[var(--color-text-muted)] text-sm italic mb-6 leading-relaxed">
                Avant de configurer votre compte de paiement, veuillez lire et accepter
                nos conditions générales ainsi que le contrat de prestataire AlloLokal.
              </p>

              {/* ── Résumé des offres et commissions ──────────────────────────── */}
              <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl p-5 mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-accent)] mb-4">
                  Modèle de rémunération
                </p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { name: 'Essential', price: '0€/mois', r1: '14%', r2: '9%', color: 'var(--color-text-muted)' },
                    { name: 'Flex', price: '39€/mois', r1: '12%', r2: '8%', color: '#10b981' },
                    { name: 'Plus', price: '59€/mois', r1: '10%', r2: '7%', color: '#a29bfe' },
                  ].map(plan => (
                    <div key={plan.name} className="bg-[var(--color-bg-secondary)] rounded-xl p-3 text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: plan.color }}>{plan.name}</p>
                      <p className="text-xs font-bold text-[var(--color-text-main)] mb-2">{plan.price}</p>
                      <p className="text-[9px] text-[var(--color-text-muted)]">1er RDV : <span className="font-black" style={{ color: plan.color }}>{plan.r1}</span></p>
                      <p className="text-[9px] text-[var(--color-text-muted)]">Fidélisé : <span className="font-black" style={{ color: plan.color }}>{plan.r2}</span></p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                  La commission est déduite automatiquement à chaque réservation confirmée et payée.
                  Vous démarrez sur <strong className="text-[var(--color-text-main)]">Essential</strong> (gratuit) et pouvez évoluer vers Flex ou Plus à tout moment depuis votre espace Gestion.
                </p>
              </div>

              {/* CGV — Lorem ipsum en attendant la version finale */}
              <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl p-6 max-h-64 overflow-y-auto mb-6 text-xs text-[var(--color-text-muted)] leading-relaxed space-y-3">
                <p className="font-black uppercase tracking-widest text-[var(--color-text-main)] text-[10px] mb-4">
                  Conditions Générales de Vente — AlloLokal (v1.0)
                </p>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
                <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
                <p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.</p>
                <p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.</p>
                <p>Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio.</p>
              </div>

              {/* Bouton signer le contrat */}
              <button
                onClick={handleOpenContract}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-[var(--color-accent)] text-[var(--color-accent)] font-black uppercase text-xs tracking-widest hover:bg-[var(--color-accent-light)] transition-all cursor-pointer bg-transparent mb-4"
              >
                <ExternalLink size={15} />
                Signer le contrat de prestataire
                {contractOpened && <CheckCircle size={14} className="text-emerald-500 ml-1" />}
              </button>

              {/* Case à cocher CGV */}
              <div className="flex items-start gap-3 mb-8 p-4 bg-[var(--color-bg-tertiary)] rounded-2xl">
                <input
                  type="checkbox"
                  id="cgv-pro"
                  checked={cgvAccepted}
                  onChange={e => setCgvAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0 cursor-pointer accent-[var(--color-accent)]"
                />
                <label htmlFor="cgv-pro" className="text-xs text-[var(--color-text-muted)] leading-relaxed cursor-pointer select-none">
                  J'ai lu et j'accepte les <span className="font-bold text-[var(--color-text-main)]">conditions générales de vente</span> et le{' '}
                  <span className="font-bold text-[var(--color-text-main)]">contrat de prestataire AlloLokal</span>.
                  Je confirme avoir signé le contrat via le lien ci-dessus.
                </label>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!cgvAccepted}
                className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white py-5 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-4 group cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuer vers la configuration paiement
                <ArrowRight className="group-hover:translate-x-2 transition-transform" size={18} />
              </button>
            </>
          )}

          {/* ── ÉTAPE 2 : Stripe Onboarding ─────────────────────────────────── */}
          {step === 2 && (
            <>
              <div className="w-16 h-16 bg-[var(--color-accent-light)] rounded-2xl flex items-center justify-center mb-8 border border-[var(--color-accent)]/30">
                <ShieldCheck className="text-[var(--color-accent)]" size={32} />
              </div>

              <h1 className="text-3xl font-black italic uppercase tracking-tight mb-3">
                {t('onboarding_pro.title_part1')}{' '}
                <span className="text-[var(--color-accent)]">{t('onboarding_pro.title_part2')}</span>
              </h1>
              <p className="text-[var(--color-text-muted)] text-lg mb-10 leading-relaxed italic">
                {t('onboarding_pro.description')}
              </p>

              <div className="space-y-6 mb-12">
                <div className="flex gap-6 items-start">
                  <div className="mt-1 bg-[var(--color-bg-tertiary)] p-3 rounded-xl shrink-0">
                    <Building2 size={20} className="text-[var(--color-text-main)]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--color-text-main)] uppercase text-sm tracking-widest">
                      {t('onboarding_pro.tax_id_title')}
                    </h3>
                    <p className="text-[var(--color-text-muted)] text-xs text-pretty italic">
                      {t('onboarding_pro.tax_id_desc')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-6 items-start">
                  <div className="mt-1 bg-[var(--color-bg-tertiary)] p-3 rounded-xl shrink-0">
                    <Landmark size={20} className="text-[var(--color-text-main)]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--color-text-main)] uppercase text-sm tracking-widest">
                      {t('onboarding_pro.bank_account_title')}
                    </h3>
                    <p className="text-[var(--color-text-muted)] text-xs italic">
                      {t('onboarding_pro.bank_account_desc')}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartOnboarding}
                disabled={loading}
                className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white py-6 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-4 group cursor-pointer border-none disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : (
                  <>
                    {t('onboarding_pro.btn_start')}
                    <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                  </>
                )}
              </button>

              <p className="text-center text-[10px] text-[var(--color-text-muted)] uppercase mt-8 tracking-widest font-bold">
                {t('onboarding_pro.footer_security')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProOnboarding;
