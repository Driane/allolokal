import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, X, Shield, CalendarOff, Eye, Headphones, Sparkles, ChefHat, Heart, Users, Hammer, Baby, Waves, Star } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import SEO from '../components/SEO';
import SubscriptionModal from '../components/SubscriptionModal';
import { supabase } from '../lib/supabase';

// ── Types & constants ─────────────────────────────────────────────────────────
type Tier = 'essential' | 'flex' | 'plus';
const PLAN_TIERS: Tier[] = ['essential', 'flex', 'plus'];
interface ModalPlan { tier: Tier; name: string; price: number | null; }
const TIER_DATA: Record<string, ModalPlan> = {
  essential: { tier: 'essential', name: 'Essential', price: null },
  flex:      { tier: 'flex',      name: 'Flex',      price: 39   },
  plus:      { tier: 'plus',      name: 'Plus',      price: 59   },
};

// ── Translations ──────────────────────────────────────────────────────────────
type Lang = 'fr' | 'en' | 'de' | 'hr';

// Couleurs alignées sur categoryConfig (beauté, premium, bien-être, famille, maison, famille, propreté, accent)
const WHO_COLORS = ['#ec4899','#eab308','#a855f7','#f97316','#22c55e','#f97316','#3b82f6','var(--color-accent)'];

const WHO: Record<Lang, { label: string; icon: React.ReactNode }[]> = {
  fr: [
    { label: 'Esthéticienne', icon: <Sparkles size={13} /> },
    { label: 'Cuisinier', icon: <ChefHat size={13} /> },
    { label: 'Masseur', icon: <Heart size={13} /> },
    { label: 'Aide aux personnes âgées', icon: <Users size={13} /> },
    { label: 'Artisan', icon: <Hammer size={13} /> },
    { label: 'Baby-sitter', icon: <Baby size={13} /> },
    { label: 'Société de ménage', icon: <Waves size={13} /> },
    { label: 'Passionné', icon: <Star size={13} /> },
  ],
  en: [
    { label: 'Beautician', icon: <Sparkles size={13} /> },
    { label: 'Cook', icon: <ChefHat size={13} /> },
    { label: 'Masseur', icon: <Heart size={13} /> },
    { label: 'Elderly care', icon: <Users size={13} /> },
    { label: 'Craftsman', icon: <Hammer size={13} /> },
    { label: 'Baby-sitter', icon: <Baby size={13} /> },
    { label: 'Cleaning company', icon: <Waves size={13} /> },
    { label: 'Enthusiast', icon: <Star size={13} /> },
  ],
  de: [
    { label: 'Kosmetikerin', icon: <Sparkles size={13} /> },
    { label: 'Koch', icon: <ChefHat size={13} /> },
    { label: 'Masseur', icon: <Heart size={13} /> },
    { label: 'Seniorenbetreuung', icon: <Users size={13} /> },
    { label: 'Handwerker', icon: <Hammer size={13} /> },
    { label: 'Babysitter', icon: <Baby size={13} /> },
    { label: 'Reinigungsfirma', icon: <Waves size={13} /> },
    { label: 'Enthusiast', icon: <Star size={13} /> },
  ],
  hr: [
    { label: 'Kozmetičarka', icon: <Sparkles size={13} /> },
    { label: 'Kuhar', icon: <ChefHat size={13} /> },
    { label: 'Maser', icon: <Heart size={13} /> },
    { label: 'Skrb za starije', icon: <Users size={13} /> },
    { label: 'Obrtnik', icon: <Hammer size={13} /> },
    { label: 'Dadilja', icon: <Baby size={13} /> },
    { label: 'Tvrtka za čišćenje', icon: <Waves size={13} /> },
    { label: 'Entuzijast', icon: <Star size={13} /> },
  ],
};

const T = {
  fr: {
    heroTitle: 'Monétisez ce que vous savez faire,\nce que vous avez, qui vous êtes ici',
    heroSub: 'Allolokal connecte les voyageurs et sédentaires aux services locaux. Pros ou particuliers, proposez vos services en quelques minutes.',
    stat1: 'Inscription gratuite', stat2: 'Pour créer votre profil', stat3: 'Frais fixes',
    stepsLabel: 'Simple comme bonjour', stepsTitle: '3 étapes et c\'est parti',
    s1t: 'Créez votre compte', s1d: 'Vos infos + paiement Stripe configuré en quelques secondes.',
    s2t: 'Publiez vos offres', s2d: 'Décrivez ce que vous proposez, fixez votre prix, ajoutez des photos.',
    s3t: 'Recevez des réservations', s3d: 'Les clients vous trouvent et réservent. Vous confirmez, vous êtes payé.',
    plansLabel: 'Tarifs', plansTitle: 'Choisissez votre formule',
    plansSub: 'Sans engagement · Changez à tout moment · 100% transparent',
    b0: 'Gratuit', b1: '⭐ Recommandé', b2: '✦ Premium',
    mo: 'mois', nc: 'sans engagement',
    tgt0: 'Je débute, je teste', tgt1: 'Je suis actif, je veux payer moins', tgt2: 'J\'ai une clientèle, je veux scaler',
    d0: 'Zéro frais fixes. Payez uniquement une commission sur vos réservations confirmées.',
    d1: 'Moins de commission sur chaque prestation. Rentabilisé en quelques réservations par mois.',
    d2: 'Visibilité maximale et commissions réduites. Pour ceux qui veulent accélérer.',
    cLabel: 'Commission plateforme', c1: '1er RDV client', c2: 'RDV fidélisé',
    f: ['Profil complet', 'Offres illimitées', 'Paiements Stripe sécurisés', 'Badge ★ Top Pro', 'Statistiques & KPI', 'Profil boosté dans les résultats', 'Support prioritaire'],
    cta0: 'Commencer gratuitement', cta1: 'Choisir Flex', cta2: 'Choisir Plus',
    simTitle: 'Calculez votre gain net',
    simDesc: 'Montant moyen, nombre de RDV et part de nouveaux clients — abonnement déduit.',
    simAmt: 'Montant (€)', simRdv: 'RDV / mois', simSplit: 'Répartition',
    split50: '50/50', split30: '30% 1er', split20: '20% 1er', split80: '80% 1er',
    rOk: 'remboursé +', rKo: 'manque', brut: 'brut', net: 'net',
    t1h: 'Paiements 100% sécurisés', t1d: 'Stripe gère les transactions. Vous êtes payé automatiquement après chaque prestation confirmée.',
    t2h: 'Sans engagement', t2d: 'Résiliez ou changez d\'offre quand vous voulez. Aucun frais caché.',
    t3h: 'Transparence totale', t3d: 'La commission est déduite automatiquement. Vous voyez exactement ce que vous percevez.',
    t4h: 'Support dédié', t4d: 'Une question ? Notre équipe internationale vous accompagne à chaque étape.',
    bottomSub: 'Rejoignez les premiers locaux Allolokal — gratuit, en moins de 3 minutes.',
    bottomCta: 'Créer mon profil',
    currentPlan: 'Plan actuel',
  },
  en: {
    heroTitle: 'Monetise what you know,\nwhat you have, who you are here',
    heroSub: 'Allolokal connects travellers and locals to local services. Professionals or individuals, list your services in minutes.',
    stat1: 'Free registration', stat2: 'To build your profile', stat3: 'Fixed fees',
    stepsLabel: 'As simple as it gets', stepsTitle: '3 steps and you\'re live',
    s1t: 'Create your account', s1d: 'Your details + Stripe payment set up in seconds.',
    s2t: 'Publish your services', s2d: 'Describe what you offer, set your price, add photos.',
    s3t: 'Get bookings', s3d: 'Clients find you and book. You confirm, you get paid.',
    plansLabel: 'Pricing', plansTitle: 'Choose your plan',
    plansSub: 'No commitment · Switch anytime · 100% transparent',
    b0: 'Free', b1: '⭐ Recommended', b2: '✦ Premium',
    mo: 'month', nc: 'no commitment',
    tgt0: 'Just starting out', tgt1: 'Active, want to pay less', tgt2: 'Have clients, want to scale',
    d0: 'Zero fixed fees. Only pay a commission on confirmed bookings.',
    d1: 'Lower commission on every service. Pays for itself in a few bookings.',
    d2: 'Maximum visibility and reduced commissions. For those ready to accelerate.',
    cLabel: 'Platform commission', c1: '1st booking', c2: 'Repeat booking',
    f: ['Complete profile', 'Unlimited listings', 'Secure Stripe payments', '★ Top Pro badge', 'Stats & KPIs', 'Boosted profile in results', 'Priority support'],
    cta0: 'Get started for free', cta1: 'Choose Flex', cta2: 'Choose Plus',
    simTitle: 'Calculate your net earnings',
    simDesc: 'Average amount, monthly bookings and new client ratio — subscription deducted.',
    simAmt: 'Amount (€)', simRdv: 'Bookings / month', simSplit: 'Split',
    split50: '50/50', split30: '30% new', split20: '20% new', split80: '80% new',
    rOk: 'recovered +', rKo: 'short by', brut: 'gross', net: 'net',
    t1h: '100% secure payments', t1d: 'Stripe handles all transactions. You\'re paid automatically after each confirmed service.',
    t2h: 'No commitment', t2d: 'Cancel or switch plans whenever you want. No hidden fees.',
    t3h: 'Full transparency', t3d: 'Commission is deducted automatically. You see exactly what you receive.',
    t4h: 'Dedicated support', t4d: 'Any questions? Our international team is here every step of the way.',
    bottomSub: 'Join Allolokal\'s first locals — free, in less than 3 minutes.',
    bottomCta: 'Create my profile',
    currentPlan: 'Current plan',
  },
  de: {
    heroTitle: 'Verdienen Sie mit dem,\nwas Sie können, haben und sind',
    heroSub: 'Allolokal verbindet Reisende und Einheimische mit lokalen Dienstleistungen. Profis oder Privatpersonen — bieten Sie Ihre Dienste in Minuten an.',
    stat1: 'Kostenlose Anmeldung', stat2: 'Profil erstellen', stat3: 'Keine Fixkosten',
    stepsLabel: 'So einfach geht\'s', stepsTitle: '3 Schritte und Sie sind dabei',
    s1t: 'Konto erstellen', s1d: 'Daten + Stripe-Zahlung in Sekunden einrichten.',
    s2t: 'Angebote veröffentlichen', s2d: 'Leistung beschreiben, Preis festlegen, Fotos hinzufügen.',
    s3t: 'Buchungen erhalten', s3d: 'Kunden finden und buchen Sie. Sie bestätigen, Sie erhalten Ihr Geld.',
    plansLabel: 'Tarife', plansTitle: 'Tarif wählen',
    plansSub: 'Keine Bindung · Jederzeit wechseln · 100% transparent',
    b0: 'Kostenlos', b1: '⭐ Empfohlen', b2: '✦ Premium',
    mo: 'Monat', nc: 'ohne Bindung',
    tgt0: 'Ich fange an', tgt1: 'Aktiv, weniger zahlen', tgt2: 'Ich habe Kunden, ich will wachsen',
    d0: 'Keine Fixkosten. Provision nur auf bestätigte Buchungen.',
    d1: 'Niedrigere Provision bei jeder Leistung. Rentabel nach wenigen Buchungen.',
    d2: 'Maximale Sichtbarkeit und reduzierte Provision. Für alle, die beschleunigen wollen.',
    cLabel: 'Plattformprovision', c1: '1. Buchung', c2: 'Folgebuchung',
    f: ['Vollständiges Profil', 'Unbegrenzte Angebote', 'Sichere Stripe-Zahlungen', '★ Top Pro Badge', 'Statistiken & KPIs', 'Profil geboostet', 'Prioritäts-Support'],
    cta0: 'Kostenlos starten', cta1: 'Flex wählen', cta2: 'Plus wählen',
    simTitle: 'Nettogewinn berechnen',
    simDesc: 'Durchschnittsbetrag, monatliche Buchungen und Neukundenanteil — Abonnement abgezogen.',
    simAmt: 'Betrag (€)', simRdv: 'Buchungen / Monat', simSplit: 'Aufteilung',
    split50: '50/50', split30: '30% Neu', split20: '20% Neu', split80: '80% Neu',
    rOk: 'zurück +', rKo: 'fehlen noch', brut: 'brutto', net: 'netto',
    t1h: '100% sichere Zahlungen', t1d: 'Stripe verwaltet Transaktionen. Automatische Zahlung nach jeder bestätigten Leistung.',
    t2h: 'Keine Bindung', t2d: 'Kündigen oder wechseln Sie jederzeit. Keine versteckten Gebühren.',
    t3h: 'Volle Transparenz', t3d: 'Provision automatisch abgezogen. Sie sehen genau, was Sie erhalten.',
    t4h: 'Dedizierter Support', t4d: 'Fragen? Unser internationales Team begleitet Sie auf jedem Schritt.',
    bottomSub: 'Werden Sie einer der ersten Allolokal-Locals — kostenlos, in unter 3 Minuten.',
    bottomCta: 'Mein Profil erstellen',
    currentPlan: 'Aktueller Plan',
  },
  hr: {
    heroTitle: 'Zaradite od onoga što znate,\nimate i jeste ovdje',
    heroSub: 'Allolokal spaja turiste i lokalno stanovništvo s lokalnim uslugama. Stručnjaci ili privatne osobe — ponudite svoje usluge za nekoliko minuta.',
    stat1: 'Besplatna registracija', stat2: 'Za izradu profila', stat3: 'Bez fiksnih naknada',
    stepsLabel: 'Jednostavno', stepsTitle: '3 koraka i krenuli ste',
    s1t: 'Stvorite račun', s1d: 'Vaši podaci + Stripe plaćanje za nekoliko sekundi.',
    s2t: 'Objavite usluge', s2d: 'Opišite što nudite, postavite cijenu, dodajte fotografije.',
    s3t: 'Primajte rezervacije', s3d: 'Klijenti vas pronalaze i rezerviraju. Vi potvrdite, vi primite uplatu.',
    plansLabel: 'Cijene', plansTitle: 'Odaberite paket',
    plansSub: 'Bez obveza · Promijenite kada želite · 100% transparentno',
    b0: 'Besplatno', b1: '⭐ Preporučeno', b2: '✦ Premium',
    mo: 'mj.', nc: 'bez obveza',
    tgt0: 'Počinjem, testiram', tgt1: 'Aktivan sam, želim platiti manje', tgt2: 'Imam klijente, želim rasti',
    d0: 'Nula fiksnih troškova. Plaćate samo proviziju na potvrđene rezervacije.',
    d1: 'Niža provizija na svaku uslugu. Isplati se već nakon nekoliko rezervacija.',
    d2: 'Maksimalna vidljivost i snižena provizija. Za one koji žele ubrzati.',
    cLabel: 'Provizija platforme', c1: '1. rezervacija', c2: 'Ponovna rezervacija',
    f: ['Potpuni profil', 'Neograničene usluge', 'Sigurna Stripe plaćanja', '★ Top Pro oznaka', 'Statistike & KPI', 'Profil istaknut u rezultatima', 'Prioritetna podrška'],
    cta0: 'Počni besplatno', cta1: 'Odaberi Flex', cta2: 'Odaberi Plus',
    simTitle: 'Izračunajte svoju neto zaradu',
    simDesc: 'Prosječni iznos, broj rezervacija i udio novih klijenata — pretplata odbijena.',
    simAmt: 'Iznos (€)', simRdv: 'Rezervacije / mj.', simSplit: 'Omjer',
    split50: '50/50', split30: '30% novi', split20: '20% novi', split80: '80% novi',
    rOk: 'pokriveno +', rKo: 'nedostaje', brut: 'bruto', net: 'neto',
    t1h: '100% sigurna plaćanja', t1d: 'Stripe upravlja transakcijama. Automatski primate uplatu nakon svake potvrde.',
    t2h: 'Bez obveza', t2d: 'Otkažite ili promijenite paket kada god želite. Bez skrivenih naknada.',
    t3h: 'Potpuna transparentnost', t3d: 'Provizija se automatski oduzima. Točno vidite što primate.',
    t4h: 'Posvećena podrška', t4d: 'Imate pitanje? Naš međunarodni tim prati vas na svakom koraku.',
    bottomSub: 'Pridružite se prvim lokalcima Allolokala — besplatno, za manje od 3 minute.',
    bottomCta: 'Stvorite moj profil',
    currentPlan: 'Trenutni plan',
  },
};

// ── Simulator ─────────────────────────────────────────────────────────────────
interface SimResult { net: number; gross: number; saving: number; sub: number; }

function calcSim(amount: number, rdv: number, split: number): SimResult[] {
  const n1 = Math.max(1, Math.round(rdv * split));
  const n2 = rdv - n1;
  const plans = [
    { r1: 0.14, r2: 0.09, sub: 0 },
    { r1: 0.12, r2: 0.08, sub: 39 },
    { r1: 0.10, r2: 0.07, sub: 59 },
  ];
  const freeGross = n1 * amount * (1 - 0.14) + n2 * amount * (1 - 0.09);
  return plans.map(p => {
    const gross = n1 * amount * (1 - p.r1) + n2 * amount * (1 - p.r2);
    return { net: gross - p.sub, gross, saving: gross - freeGross, sub: p.sub };
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { i18n } = useTranslation();
  const lang: Lang = (['fr', 'en', 'de', 'hr'] as const).includes(i18n.language as Lang) ? (i18n.language as Lang) : 'fr';
  const t = T[lang];

  const [amount, setAmount]   = useState(60);
  const [rdv, setRdv]         = useState(40);
  const [split, setSplit]     = useState(0.8);
  const [sim, setSim]         = useState<SimResult[]>([]);

  const [session,   setSession]   = useState<Session | null>(null);
  const [userTier,  setUserTier]  = useState<Tier>('essential');
  const [modalPlan, setModalPlan] = useState<ModalPlan | null>(null);

  useEffect(() => { setSim(calcSim(amount, rdv, split)); }, [amount, rdv, split]);

  // Load session + current tier, then auto-open modal if ?plan= param present (post-auth redirect)
  useEffect(() => {
    const init = async () => {
      const { data: { session: sess } } = await supabase.auth.getSession();
      setSession(sess);
      if (!sess) return;

      const { data } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', sess.user.id)
        .single();

      const currentTier: Tier = (data?.subscription_tier as Tier) ?? 'essential';
      setUserTier(currentTier);

      const planParam = searchParams.get('plan');
      if (planParam && TIER_DATA[planParam] && planParam !== currentTier) {
        setModalPlan(TIER_DATA[planParam]);
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlanClick = (tier: Tier) => {
    if (!session) {
      navigate('/auth?from=' + encodeURIComponent('/pricing?plan=' + tier));
      return;
    }
    if (userTier === tier) return;
    setModalPlan(TIER_DATA[tier]);
  };

  const STEPS = [
    { n: '1', title: t.s1t, desc: t.s1d },
    { n: '2', title: t.s2t, desc: t.s2d },
    { n: '3', title: t.s3t, desc: t.s3d },
  ];

  const PLANS = [
    {
      badge: t.b0, badgeStyle: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]',
      name: 'Essential', target: t.tgt0, price: null, desc: t.d0,
      r1: '14%', r2: '9%', r1Color: 'text-[var(--color-text-main)]', r2Color: 'text-[var(--color-text-main)]',
      included: [true, true, true, false, false, false, false],
      cta: t.cta0, ctaStyle: 'bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] text-[var(--color-text-main)]',
      featured: false,
    },
    {
      badge: t.b1, badgeStyle: 'bg-[#10b98120] text-[#10b981]',
      name: 'Flex', target: t.tgt1, price: '39', desc: t.d1,
      r1: '12%', r2: '8%', r1Color: 'text-[#10b981]', r2Color: 'text-[#10b981]',
      included: [true, true, true, true, true, false, false],
      cta: t.cta1, ctaStyle: 'bg-[var(--color-accent)] hover:opacity-90 text-white',
      featured: true,
    },
    {
      badge: t.b2, badgeStyle: 'bg-[#a29bfe20] text-[#a29bfe]',
      name: 'Plus', target: t.tgt2, price: '59', desc: t.d2,
      r1: '10%', r2: '7%', r1Color: 'text-[#a29bfe]', r2Color: 'text-[#a29bfe]',
      included: [true, true, true, true, true, true, true],
      cta: t.cta2, ctaStyle: 'bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] text-[var(--color-text-main)]',
      featured: false,
    },
  ];

  const TRUST = [
    { icon: <Shield size={20} className="text-[var(--color-accent)] shrink-0 mt-0.5" />, title: t.t1h, desc: t.t1d },
    { icon: <CalendarOff size={20} className="text-[var(--color-accent)] shrink-0 mt-0.5" />, title: t.t2h, desc: t.t2d },
    { icon: <Eye size={20} className="text-[var(--color-accent)] shrink-0 mt-0.5" />, title: t.t3h, desc: t.t3d },
    { icon: <Headphones size={20} className="text-[var(--color-accent)] shrink-0 mt-0.5" />, title: t.t4h, desc: t.t4d },
  ];

  const SPLITS: { value: number; label: string }[] = [
    { value: 0.5, label: t.split50 },
    { value: 0.3, label: t.split30 },
    { value: 0.2, label: t.split20 },
    { value: 0.8, label: t.split80 },
  ];

  const SIM_NAMES = [`Essential`, `Flex · 39€/${t.mo}`, `Plus · 59€/${t.mo}`];
  const SIM_COLORS = ['text-[var(--color-text-main)]', 'text-[#10b981]', 'text-[#a29bfe]'];

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-main)]">
      <SEO url="/pricing" />

      <div className="max-w-4xl mx-auto px-4 sm:px-8 pb-20">

        {/* Hero */}
        <div className="text-center pt-3 pb-2">
          <div className="inline-flex items-center gap-1.5 bg-[var(--color-accent-light)] text-[var(--color-accent)] text-xs font-semibold px-4 py-1 rounded-full mb-1.5">
            📍 Allolokal
          </div>
          <h1 className="text-lg sm:text-xl font-semibold text-[var(--color-text-main)] leading-snug mb-1.5">
            {t.heroTitle.replace('\n', ' ')}
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] max-w-lg mx-auto leading-relaxed mb-2">
            {t.heroSub}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {WHO[lang].map((w, i) => {
              const color = WHO_COLORS[i] ?? 'var(--color-accent)';
              return (
                <span key={w.label}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                  style={{ background: `${color}15`, border: `1px solid ${color}40`, color }}>
                  {w.icon}{w.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-8 py-2 border-y border-[var(--color-border)]">
          {[['100%', t.stat1], ['3 min', t.stat2], ['0€', t.stat3]].map(([num, label]) => (
            <div key={label} className="text-center">
              <div className="text-xl font-semibold text-[var(--color-text-main)]">{num}</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Plans */}
        <div className="py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] text-center mb-0.5">{t.plansLabel}</p>
          <h2 className="text-base font-semibold text-[var(--color-text-main)] text-center mb-0.5">{t.plansTitle}</h2>
          <p className="text-xs text-[var(--color-text-muted)] text-center mb-3">{t.plansSub}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PLANS.map((plan, idx) => (
              <div key={idx} className={`bg-[var(--color-bg-secondary)] rounded-2xl p-4 flex flex-col ${plan.featured ? 'border-2 border-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/10' : 'border border-[var(--color-border)]'}`}>
                <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full self-start mb-2 ${plan.badgeStyle}`}>{plan.badge}</span>
                <div className="text-base font-semibold text-[var(--color-text-main)]">{plan.name}</div>
                <div className="text-xs text-[var(--color-text-muted)] italic mb-2">{plan.target}</div>
                <div className="mb-2">
                  {plan.price
                    ? <><span className="text-2xl font-semibold text-[var(--color-text-main)]">{plan.price}€</span><span className="text-xs text-[var(--color-text-muted)]"> / {t.mo} · {t.nc}</span></>
                    : <span className="text-xl font-semibold text-[var(--color-accent)]">0€ / {t.mo}</span>
                  }
                </div>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-3 pb-3 border-b border-[var(--color-border)]">{plan.desc}</p>

                <div className="mb-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">{t.cLabel}</p>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-[var(--color-text-muted)]">{t.c1}</span>
                    <span className={`text-sm font-semibold ${plan.r1Color}`}>{plan.r1}{idx > 0 && <span className="text-[9px] ml-1 opacity-60">−{idx === 1 ? '2' : '4'}%</span>}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--color-text-muted)]">{t.c2}</span>
                    <span className={`text-sm font-semibold ${plan.r2Color}`}>{plan.r2}{idx > 0 && <span className="text-[9px] ml-1 opacity-60">−{idx === 1 ? '2' : '4'}%</span>}</span>
                  </div>
                </div>

                <ul className="space-y-1.5 mb-4 flex-1">
                  {t.f.map((feat, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
                      {plan.included[fi]
                        ? <Check size={13} className={`shrink-0 mt-0.5 ${idx === 2 && fi >= 3 ? 'text-[#a29bfe]' : 'text-[#10b981]'}`} />
                        : <X size={13} className="shrink-0 mt-0.5 opacity-25" />
                      }
                      {feat}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlanClick(PLAN_TIERS[idx])}
                  disabled={!!session && userTier === PLAN_TIERS[idx]}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all border-none ${
                    session && userTier === PLAN_TIERS[idx]
                      ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] opacity-60 cursor-not-allowed'
                      : `${plan.ctaStyle} cursor-pointer`
                  }`}
                >
                  {session && userTier === PLAN_TIERS[idx] ? t.currentPlan : plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[var(--color-border)]" />

        {/* Steps */}
        <div className="py-8">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] text-center mb-1">{t.stepsLabel}</p>
          <h2 className="text-lg font-semibold text-[var(--color-text-main)] text-center mb-5">{t.stepsTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {STEPS.map((s, i) => (
              <div key={i} className="relative bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-4">
                <div className="w-6 h-6 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] text-xs font-semibold flex items-center justify-center mb-3">{s.n}</div>
                <h3 className="text-sm font-semibold text-[var(--color-text-main)] mb-1">{s.title}</h3>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{s.desc}</p>
                {i < 2 && <span className="hidden sm:block absolute top-5 -right-2 text-[var(--color-text-muted)] text-base z-10">→</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[var(--color-border)]" />

        {/* Simulator */}
        <div className="py-8">
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-5">
            <h2 className="text-base font-semibold text-[var(--color-text-main)] mb-1">{t.simTitle}</h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">{t.simDesc}</p>

            <div className="flex flex-wrap gap-4 items-center mb-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">{t.simAmt}</label>
                <input type="number" value={amount} min={10} step={10} onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-main)] outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">{t.simRdv}</label>
                <input type="number" value={rdv} min={1} max={200} onChange={e => setRdv(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-main)] outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">{t.simSplit}</label>
                <select value={split} onChange={e => setSplit(parseFloat(e.target.value))}
                  className="px-2 py-1 text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-main)] outline-none cursor-pointer">
                  {SPLITS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {sim.map((r, i) => {
                const isPos = i > 0 && r.saving >= r.sub;
                return (
                  <div key={i} className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl p-3 text-center">
                    <div className="text-[10px] font-semibold text-[var(--color-text-muted)] mb-1">{SIM_NAMES[i]}</div>
                    <div className={`text-lg font-semibold ${SIM_COLORS[i]}`}>{Math.round(r.net)}€ <span className="text-[11px] font-normal text-[var(--color-text-muted)]">{t.net}</span></div>
                    <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{t.brut} {Math.round(r.gross)}€</div>
                    {i > 0 && (
                      <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-md mt-1 ${isPos ? 'bg-[#10b98118] text-[#10b981]' : 'bg-red-500/10 text-red-400'}`}>
                        {isPos ? `${t.rOk} ${Math.round(r.saving - r.sub)}€` : `${t.rKo} ${Math.round(r.sub - r.saving)}€`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--color-border)]" />

        {/* Trust */}
        <div className="py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TRUST.map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-4">
                {item.icon}
                <div>
                  <div className="text-sm font-semibold text-[var(--color-text-main)] mb-0.5">{item.title}</div>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center py-4 pb-8">
          <p className="text-sm text-[var(--color-text-muted)] mb-4">{t.bottomSub}</p>
          <button
            onClick={() => session ? navigate('/dashboard') : navigate('/auth')}
            className="inline-block bg-[var(--color-accent)] hover:opacity-90 text-white text-sm font-semibold px-8 py-3 rounded-xl cursor-pointer border-none transition-all"
          >
            {t.bottomCta}
          </button>
        </div>

      </div>

      {/* Subscription modal */}
      {modalPlan && session && (
        <SubscriptionModal
          plan={modalPlan}
          userId={session.user.id}
          onClose={() => setModalPlan(null)}
        />
      )}
    </div>
  );
};

export default PricingPage;
