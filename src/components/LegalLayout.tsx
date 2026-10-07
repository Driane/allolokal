import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface Section { id: string; title: string; }

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  sections: Section[];
  children: React.ReactNode;
}

const LEGAL_NAV = [
  { href: '/terms',             label: 'Conditions générales' },
  { href: '/privacy',           label: 'Confidentialité' },
  { href: '/legal',             label: 'Mentions légales' },
  { href: '/account-deletion',  label: 'Supprimer mon compte' },
];

const LegalLayout: React.FC<LegalLayoutProps> = ({ title, lastUpdated, sections, children }) => {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Hero */}
      <div className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] px-4 sm:px-8 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Fil d'Ariane */}
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-6">
            <Link to="/" className="hover:text-[var(--color-accent)] transition-colors no-underline text-[var(--color-text-muted)]">Accueil</Link>
            <ChevronRight size={10} />
            <span className="text-[var(--color-accent)]">{title}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter text-[var(--color-text-main)] mb-3">
            {title}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Dernière mise à jour : <span className="font-bold text-[var(--color-text-main)]">{lastUpdated}</span>
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-12">
        {/* Navigation entre pages légales */}
        <div className="flex gap-2 flex-wrap mb-10">
          {LEGAL_NAV.map(n => (
            <Link key={n.href} to={n.href}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest no-underline transition-all border ${
                pathname === n.href
                  ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)]'
              }`}>
              {n.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sommaire — desktop */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-32">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-4">Sommaire</p>
              <nav className="flex flex-col gap-1">
                {sections.map(s => (
                  <a key={s.id} href={`#${s.id}`}
                    className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors no-underline py-1.5 px-3 rounded-xl hover:bg-[var(--color-bg-secondary)] border border-transparent hover:border-[var(--color-border)]">
                    {s.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Contenu */}
          <article className="flex-1 min-w-0 prose-legal">
            {children}
          </article>
        </div>
      </div>

      <style>{`
        .prose-legal h2 {
          font-size: 1.25rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-main);
          margin-top: 3rem;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--color-border);
          scroll-margin-top: 7rem;
        }
        .prose-legal h3 {
          font-size: 0.875rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-main);
          margin-top: 1.75rem;
          margin-bottom: 0.5rem;
        }
        .prose-legal p {
          font-size: 0.9375rem;
          color: var(--color-text-muted);
          line-height: 1.75;
          margin-bottom: 1rem;
        }
        .prose-legal ul {
          margin: 0.75rem 0 1rem 1.5rem;
          list-style: disc;
        }
        .prose-legal li {
          font-size: 0.9375rem;
          color: var(--color-text-muted);
          line-height: 1.75;
          margin-bottom: 0.25rem;
        }
        .prose-legal strong {
          color: var(--color-text-main);
          font-weight: 700;
        }
        .prose-legal a {
          color: var(--color-accent);
          text-decoration: underline;
        }
        .prose-legal .placeholder {
          background: var(--color-accent-light);
          color: var(--color-accent);
          padding: 0 0.3rem;
          border-radius: 0.25rem;
          font-weight: 700;
          font-size: 0.8em;
        }
      `}</style>
    </div>
  );
};

export default LegalLayout;
