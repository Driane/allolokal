import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { m } from 'framer-motion';
import TypewriterSearch from './TypewriterSearch';

interface HeroProps {
  onCategoryHighlight?: (category: string | null) => void;
}

const Hero: React.FC<HeroProps> = ({ onCategoryHighlight }) => {
  const { t } = useTranslation();

  return (
    <div className="relative flex flex-col items-center justify-start overflow-hidden pt-2 md:pt-4 pb-2 md:pb-4">
      {/* Background blob */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none z-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[var(--color-accent-light)] blur-[140px] rounded-full opacity-60" />
      </div>

      <div className="max-w-5xl mx-auto px-6 relative z-20 text-center w-full">
        {/* Titre */}
        <m.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-2xl sm:text-4xl md:text-7xl font-black text-[var(--color-text-main)] italic uppercase tracking-tight leading-[1.2] mb-2 md:mb-3"
        >
          {t('hero.title_top')} <br />
          <span className="text-[var(--color-text-muted)]/25">{t('hero.title_bottom')}</span>
        </m.h1>

        {/* Barre de recherche animée */}
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-3 md:mb-3"
        >
          <TypewriterSearch onCategoryChange={onCategoryHighlight} />
        </m.div>

        {/* Lien secondaire "Devenir pro" */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Link
            to="/auth"
            className="hidden sm:inline-flex items-center gap-3 px-8 py-4 border border-[var(--color-border)] rounded-2xl font-black uppercase tracking-widest text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-tertiary)] transition-all no-underline backdrop-blur-sm group"
          >
            {t('hero.actions.become_pro')}
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </m.div>
      </div>
    </div>
  );
};

export default Hero;