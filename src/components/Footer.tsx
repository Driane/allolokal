import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] px-4 sm:px-6 pt-12 pb-8">
      <div className="max-w-[1600px] mx-auto">

        {/* Contenu principal */}
        <div className="flex flex-col sm:flex-row justify-between gap-10 mb-10">

          {/* Logo + description */}
          <div className="max-w-xs">
            <Link to="/" className="text-xl font-black tracking-tighter text-[var(--color-text-main)] no-underline mb-3 inline-block">
              Allo<span className="text-[var(--color-logo-accent)]">Lokal</span>
            </Link>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
              {t('footer.description')}
            </p>
          </div>

          {/* Liens */}
          <div className="flex flex-wrap gap-10">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-main)] mb-4">
                {t('footer.titles.company')}
              </h4>
              <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
                {[
                  { to: '/about',   label: t('footer.links.about') },
                  { to: '/contact', label: t('footer.links.contact') },
                ].map(l => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors no-underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)] mb-4">
                {t('footer.titles.for_pros', 'Pour les pros')}
              </h4>
              <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
                <li>
                  <Link to="/pricing" className="text-sm text-[var(--color-accent)] hover:opacity-80 transition-opacity no-underline font-semibold">
                    {t('footer.links.pricing', 'Tarifs & formules')} →
                  </Link>
                </li>
                <li>
                  <Link to="/auth?mode=register&role=pro" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors no-underline">
                    {t('footer.links.become_pro')}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-main)] mb-4">
                {t('footer.titles.help')}
              </h4>
              <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
                {[
                  { to: '/terms',   label: t('footer.links.terms') },
                  { to: '/privacy', label: t('footer.links.privacy') },
                  { to: '/legal',   label: t('footer.links.legal_notice', 'Mentions légales') },
                ].map(l => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors no-underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-[var(--color-border)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-[var(--color-text-muted)]">
            &copy; {new Date().getFullYear()} AlloLokal. {t('home.footer_rights')}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
