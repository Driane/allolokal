import React from 'react';
import { useTranslation } from 'react-i18next';

const HowItWorks: React.FC = () => {
  const { t } = useTranslation();
  
  const steps = [
    { number: '01', title: t('how_it_works.step1_title'), desc: t('how_it_works.step1_desc') },
    { number: '02', title: t('how_it_works.step2_title'), desc: t('how_it_works.step2_desc') },
    { number: '03', title: t('how_it_works.step3_title'), desc: t('how_it_works.step3_desc') }
  ];

  return (
    <section className="container" style={{ padding: '4rem 1rem 8rem' }}>
      <h2 className="text-center" style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '3rem' }}>
        {t('how_it_works.title')}
      </h2>
      <div className="grid grid-2 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        {steps.map((step) => (
          <div key={step.number} className="text-center relative">
            <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--primary)', opacity: 0.3, marginBottom: '-1rem', position: 'relative', zIndex: -1 }}>
              {step.number}
            </div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>{step.title}</h3>
            <p style={{ color: 'var(--text-muted)' }}>{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;