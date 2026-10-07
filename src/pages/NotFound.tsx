import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="not-found-page">
      {/* Background décoratif */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: -1 }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '500px', height: '500px', background: 'var(--primary)', opacity: 0.15, filter: 'blur(100px)', borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '400px', height: '400px', background: 'var(--secondary)', opacity: 0.15, filter: 'blur(100px)', borderRadius: '50%' }}></div>
      </div>

      <div className="container flex flex-col items-center justify-center text-center" style={{ minHeight: '80vh', paddingTop: '4rem' }}>
        <div className="glass-card animate-fade-in" style={{ padding: '4rem 2rem', width: '100%', maxWidth: '600px' }}>
          <h1 style={{ fontSize: '6rem', fontWeight: 800, lineHeight: 1, color: 'var(--primary)', opacity: 0.2 }}>
            {t('error.title_404')}
          </h1>
          <h2 style={{ fontSize: '2rem', margin: '1rem 0' }}>
            {t('error.subtitle_404')}
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 2rem' }}>
            {t('error.description_404')}
          </p>
          <Link to="/" className="btn btn-primary">
            {t('error.back_home')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;