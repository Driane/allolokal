import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { m } from 'framer-motion';
import { Target, History, Heart, ArrowRight } from 'lucide-react';
import SEO from '../components/SEO';

const SECTION_ICONS = [Target, History, Heart] as const;

const AboutPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-main)]">
      <SEO url="/about" title={t('about.seo_title')} description={t('about.seo_desc')} />

      {/* ── HERO ────────────────────────────────────────────────────────────────── */}
      <section className="max-w-[1200px] mx-auto px-6 sm:px-10 pt-14 pb-20">
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--color-accent)] mb-5">
            AlloLokal
          </p>
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-[0.9] mb-8 text-[var(--color-text-main)]">
            {t('about.hero_title')}
          </h1>
          <p className="text-lg sm:text-xl text-[var(--color-text-muted)] max-w-2xl leading-relaxed">
            {t('about.hero_sub')}
          </p>
        </m.div>
      </section>

      {/* ── MISSION ──────────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-bg-secondary)] border-y border-[var(--color-border)]">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10 py-16 sm:py-24 grid md:grid-cols-2 gap-12 items-center">
          <m.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent-light)] flex items-center justify-center mb-6">
              <Target size={24} className="text-[var(--color-accent)]" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter mb-5">
              {t('about.mission_title')}
            </h2>
            <p className="text-[var(--color-text-muted)] leading-relaxed text-base">
              {t('about.mission_text')}
            </p>
          </m.div>
          <div className="hidden md:flex items-center justify-center">
            <div className="w-52 h-52 rounded-[3rem] bg-[var(--color-accent)]/10 flex items-center justify-center">
              <Target size={88} className="text-[var(--color-accent)] opacity-20" />
            </div>
          </div>
        </div>
      </section>

      {/* ── HISTOIRE ─────────────────────────────────────────────────────────────── */}
      <section className="max-w-[1200px] mx-auto px-6 sm:px-10 py-16 sm:py-24 grid md:grid-cols-2 gap-12 items-center">
        <div className="hidden md:flex items-center justify-center">
          <div className="w-52 h-52 rounded-[3rem] bg-[var(--color-accent)]/10 flex items-center justify-center">
            <History size={88} className="text-[var(--color-accent)] opacity-20" />
          </div>
        </div>
        <m.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent-light)] flex items-center justify-center mb-6">
            <History size={24} className="text-[var(--color-accent)]" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter mb-5">
            {t('about.story_title')}
          </h2>
          <p className="text-[var(--color-text-muted)] leading-relaxed text-base">
            {t('about.story_text')}
          </p>
        </m.div>
      </section>

      {/* ── VALEURS ──────────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-bg-secondary)] border-y border-[var(--color-border)]">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <h2 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter mb-12 text-center">
            {t('about.values_title')}
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {([1, 2, 3] as const).map(i => {
              const Icon = SECTION_ICONS[i - 1];
              return (
                <m.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (i - 1) * 0.1 }}
                  className="bg-[var(--color-bg-primary)] rounded-3xl p-8 border border-[var(--color-border)]"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-light)] flex items-center justify-center mb-5">
                    <Icon size={20} className="text-[var(--color-accent)]" />
                  </div>
                  <h3 className="text-[13px] font-black uppercase tracking-wider mb-3 text-[var(--color-text-main)]">
                    {t(`about.value${i}_title`)}
                  </h3>
                  <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                    {t(`about.value${i}_text`)}
                  </p>
                </m.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────────── */}
      <section className="max-w-[1200px] mx-auto px-6 sm:px-10 py-20 text-center">
        <m.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter mb-8">
            {t('about.cta_title')}
          </h2>
          <Link
            to="/findpro"
            className="inline-flex items-center gap-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] transition-all no-underline shadow-lg"
          >
            {t('about.cta_btn')} <ArrowRight size={14} />
          </Link>
        </m.div>
      </section>
    </div>
  );
};

export default AboutPage;
