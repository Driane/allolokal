import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, RotateCcw, Star, Users, ArrowRight, MapPin } from 'lucide-react';
import { m } from 'framer-motion';
import Hero from '../components/Hero';
import SEO from '../components/SEO';

interface HomeProps {
  onCategoryHighlight?: (category: string | null) => void;
}

const Home: React.FC<HomeProps> = ({ onCategoryHighlight }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ⚠️ Ces bornes décrivent l'emprise exacte de /public/croatia-map.jpg + .webp
  //    Toute modification de l'image impose de recalculer ces valeurs.
  // Image: tuiles OSM z=8 x[137-141] y[90-94], recadrées sur la Croatie (845×789 px)
  // Bbox: lon 13.0°E → 19.6°E ; lat 42.2°N → 46.6°N
  // Mercator: yMerc_top=0.921433  yMerc_bottom=0.813872
  // Projection: x% = (lon − 13.0) / 6.6 × 100
  //             y% = (0.921433 − ln(tan(π/4 + lat_rad/2))) / 0.107561 × 100
  // Ratio W/H Mercator = 1.0709 → aspect-ratio: 845/789
  const croatianCities: {
    name: string; xPct: number; yPct: number;
    labelPos: 'right' | 'left' | 'top' | 'bottom';
  }[] = [
    { name: 'Zagreb',    xPct: 45.2, yPct: 18.4, labelPos: 'right'  },
    { name: 'Split',     xPct: 52.1, yPct: 71.0, labelPos: 'right'  },
    { name: 'Rijeka',    xPct: 21.9, yPct: 29.7, labelPos: 'top'    },
    { name: 'Zadar',     xPct: 33.8, yPct: 57.3, labelPos: 'left'   },
    { name: 'Osijek',    xPct: 86.3, yPct: 24.5, labelPos: 'left'   },
    { name: 'Dubrovnik', xPct: 77.2, yPct: 90.1, labelPos: 'left'   },
    { name: 'Pula',      xPct: 12.9, yPct: 40.3, labelPos: 'right'  },
    { name: 'Šibenik',   xPct: 43.9, yPct: 66.0, labelPos: 'bottom' },
  ];

  // ── IDs alignés sur categoryConfig Navbar + FindPro (FIX traductions) ──────
  const quickCategories = [
    { id: 'beauty',    icon: 'fa-sparkles', color: '#FF2D78' },
    { id: 'home',      icon: 'fa-house',    color: '#1DB954' },
    { id: 'cleaning',  icon: 'fa-soap',     color: '#0066FF' }, // était 'cleanliness' → corrigé
    { id: 'wellbeing', icon: 'fa-heart',    color: '#6C27FF' },
    { id: 'family',    icon: 'fa-users',    color: '#FF5722' },
    { id: 'premium',   icon: 'fa-crown',    color: '#F59E0B' },
  ];

  const trustItems = [
    { icon: <ShieldCheck size={32} />, title: t('home.trust.items.confidence.label'), desc: t('home.trust.items.confidence.text') },
    { icon: <RotateCcw size={32} />,   title: t('home.trust.items.simplicity.label'), desc: t('home.trust.items.simplicity.text') },
    { icon: <Star size={32} />,        title: t('home.trust.items.security.label'),   desc: t('home.trust.items.security.text')   },
    { icon: <Users size={32} />,       title: t('home.trust.items.proximity.label'),  desc: t('home.trust.items.proximity.text')  },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-main)] selection:bg-[var(--color-accent-light)] relative overflow-hidden">
      <SEO url="/" />

      {/* BACKGROUND BLOBS */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full opacity-10 blur-[120px]"  style={{ backgroundColor: '#FF2D78' }} />
        <div className="absolute top-[30%] right-[-15%] w-[650px] h-[650px] rounded-full opacity-5 blur-[150px]"  style={{ backgroundColor: '#1DB954' }} />
        <div className="absolute top-[60%] left-[-10%] w-[550px] h-[550px] rounded-full opacity-10 blur-[130px]" style={{ backgroundColor: '#0066FF' }} />
        <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] rounded-full opacity-10 blur-[120px]" style={{ backgroundColor: '#6C27FF' }} />
        <div className="absolute bottom-[-5%] left-[20%] w-[450px] h-[450px] rounded-full opacity-10 blur-[110px]" style={{ backgroundColor: '#F59E0B' }} />
      </div>

      <div className="relative z-10">
        {/* Hero reçoit le callback pour surbrillance Navbar */}
        <Hero onCategoryHighlight={onCategoryHighlight} />

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">

          {/* CATÉGORIES */}
          <section className="relative z-40 pb-16 md:pb-24">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
              {quickCategories.map((cat) => (
                <m.div
                  key={cat.id}
                  whileHover={{ y: -8, scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <Link
                    to={`/findpro?category=${cat.id}`}
                    className="group relative flex flex-col justify-end rounded-[2rem] md:rounded-[2.5rem] border border-[var(--color-border)] no-underline transition-all min-h-[180px] sm:min-h-[220px] md:min-h-[260px] overflow-hidden shadow-2xl"
                  >
                    {/* Photo de fond */}
                    <img
                      src={`/categories/${cat.id}.jpg`}
                      alt={t(`categories.main.${cat.id}`, cat.id)}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />

                    {/* Dégradé sombre pour lisibilité du texte */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 transition-opacity duration-300 group-hover:from-black/90" />

                    {/* Reflet coloré en haut à droite */}
                    <div
                      className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: cat.color }}
                    />

                    {/* Barre couleur en bas */}
                    <div
                      className="absolute bottom-0 left-0 w-full h-1 opacity-70 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: cat.color }}
                    />

                    {/* Texte */}
                    <div className="relative z-10 p-4 md:p-5">
                      <h3 className="text-sm md:text-base font-black uppercase tracking-[0.15em] text-white mb-1 leading-tight">
                        {t(`categories.main.${cat.id}`, cat.id)}
                      </h3>
                      <p className="text-[9px] uppercase tracking-[0.1em] text-white/55 group-hover:text-white/80 transition-colors">
                        {t(`categories.examples.${cat.id}`, '')}
                      </p>
                    </div>
                  </Link>
                </m.div>
              ))}
            </div>
          </section>

          {/* VILLES */}
          <section className="py-14 md:py-24 border-t border-[var(--color-border)] relative">
            <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-10 md:mb-14 relative z-10">
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-black italic uppercase tracking-tight leading-[1.2]">
                {t('home.cities_section.title_start')} <br />
                <span className="text-[var(--color-accent)]">{t('home.cities_section.title_accent')}</span>
              </h2>
              <p className="text-[var(--color-text-muted)] text-sm md:text-base md:max-w-xs md:text-right">
                {t('home.cities_section.subtitle')}
              </p>
            </div>

            {/* Carte OSM — visible sm+ (≥640px), cachée sur mobile */}
            <div className="hidden sm:flex flex-col items-center mb-10 relative z-10 w-full">
              {/*
                Image: OSM z=8 x[137-141] y[90-94], recadrée sur la Croatie (845x789px)
                Bbox: lon 13.0°E-19.6°E ; lat 42.2°N-46.6°N  (Mercator W/H=1.0709)
                © OpenStreetMap contributors (ODbL) — openstreetmap.org/copyright
              */}
              <div
                className="relative w-full max-w-[900px] rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
                style={{ aspectRatio: '845 / 789' }}
              >
                <picture>
                  <source srcSet="/croatia-map.webp" type="image/webp" />
                  <img
                    src="/croatia-map.jpg"
                    alt="Carte de Croatie"
                    width={845}
                    height={789}
                    loading="lazy"
                    draggable={false}
                    className="w-full h-full select-none"
                  />
                </picture>

                {croatianCities.map(city => (
                  <button
                    key={city.name}
                    onClick={() => navigate(`/findpro?city=${encodeURIComponent(city.name)}`)}
                    onKeyDown={e => e.key === 'Enter' && navigate(`/findpro?city=${encodeURIComponent(city.name)}`)}
                    aria-label={city.name}
                    style={{ left: `${city.xPct}%`, top: `${city.yPct}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center z-[5] hover:z-20 focus-visible:z-20 border-none bg-transparent cursor-pointer group focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 rounded-full"
                  >
                    {/* Halo 44px (zone cliquable WCAG) */}
                    <span className="absolute inset-0 rounded-full bg-[var(--color-accent)] opacity-0 group-hover:opacity-20 group-focus-visible:opacity-20 transition-opacity" />
                    {/* Pastille */}
                    <span className="relative block w-3.5 h-3.5 rounded-full bg-[var(--color-accent)] shadow-[0_0_0_2px_rgba(255,255,255,0.85),0_2px_8px_rgba(0,0,0,0.5)] flex-shrink-0" />
                    {/* Libellé — pointer-events:none, positionné selon labelPos */}
                    <span
                      aria-hidden="true"
                      className={`absolute whitespace-nowrap pointer-events-none
                        bg-black/65 group-hover:bg-black/85 backdrop-blur-[2px]
                        text-white text-[9px] font-black uppercase tracking-wider
                        px-1.5 py-[3px] rounded transition-colors
                        ${city.labelPos === 'right'  ? 'left-[34px] top-1/2 -translate-y-1/2' : ''}
                        ${city.labelPos === 'left'   ? 'right-[34px] top-1/2 -translate-y-1/2' : ''}
                        ${city.labelPos === 'top'    ? 'bottom-[34px] left-1/2 -translate-x-1/2' : ''}
                        ${city.labelPos === 'bottom' ? 'top-[34px] left-1/2 -translate-x-1/2' : ''}
                      `}
                    >
                      {city.name}
                    </span>
                  </button>
                ))}
              </div>

              {/* Attribution légale OSM (obligation ODbL) */}
              <p className="text-[9px] text-[var(--color-text-muted)] mt-2 text-center w-full max-w-[900px]">
                ©{' '}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-[var(--color-accent)] transition-colors"
                >
                  OpenStreetMap contributors
                </a>
              </p>
            </div>

            {/* Chips — toujours visibles (seul mode sur mobile) */}
            <div className="flex flex-wrap gap-3 justify-center sm:justify-start relative z-10">
              {croatianCities.map(city => (
                <m.div key={city.name} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to={`/findpro?city=${encodeURIComponent(city.name)}`}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest no-underline hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-all"
                  >
                    <MapPin size={11} />
                    {city.name}
                  </Link>
                </m.div>
              ))}
            </div>
          </section>

          {/* TRUST SECTION */}
          <section className="py-14 md:py-24 border-t border-[var(--color-border)] relative">
            <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20 relative z-10">
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-black italic uppercase tracking-tight leading-[1.2]">
                {t('home.trust.title_start')} <br />
                <span className="text-[var(--color-accent)]">{t('home.trust.title_accent')}</span>
              </h2>
              <div className="h-px flex-1 bg-[var(--color-border)] mb-4 hidden md:block" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
              {trustItems.map((item, index) => (
                <div
                  key={index}
                  className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/30 backdrop-blur-sm transition-all group relative overflow-hidden"
                >
                  <div className="absolute -right-8 -top-8 w-24 h-24 bg-[var(--color-accent-light)] blur-2xl" />
                  <div className="text-[var(--color-accent)] mb-8 group-hover:scale-110 transition-transform origin-left">{item.icon}</div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--color-accent)] mb-6">{item.title}</h3>
                  <p className="text-[var(--color-text-muted)] italic text-base leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA PRO */}
          <section className="pb-14 md:pb-24 relative">
            <div className="relative z-10 p-8 sm:p-12 md:p-20 rounded-[2.5rem] md:rounded-[4rem] bg-[var(--color-bg-secondary)] backdrop-blur-md border border-[var(--color-accent)]/20 overflow-hidden">
              <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[var(--color-accent-light)] blur-[100px] rounded-full" />

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 md:gap-12 text-center lg:text-left">
                <div className="max-w-2xl">
                  <h2 className="text-3xl sm:text-4xl md:text-6xl font-black italic uppercase mb-4 md:mb-6 tracking-tight leading-[1.2] text-[var(--color-text-main)]">
                    {t('home.cta_pro_title')}
                  </h2>
                  <p className="text-[var(--color-text-muted)] text-base md:text-xl font-medium italic">
                    {t('home.cta_pro_desc')}
                  </p>
                </div>
                <Link
                  to="/auth"
                  className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-10 md:px-14 py-5 md:py-7 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl flex items-center gap-4 group no-underline whitespace-nowrap"
                >
                  {t('home.cta_pro_btn')} <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                </Link>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default Home;