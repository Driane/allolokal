import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, RotateCcw, Star, Users } from 'lucide-react';

const TrustSection: React.FC = () => {
  const { t } = useTranslation();

  const trustItems = [
    {
      icon: <ShieldCheck className="text-blue-500" size={32} />,
      title: t('home.trust.items.confidence.label'),
      desc: t('home.trust.items.confidence.text'),
    },
    {
      icon: <RotateCcw className="text-blue-500" size={32} />,
      title: t('home.trust.items.simplicity.label'),
      desc: t('home.trust.items.simplicity.text'),
    },
    {
      icon: <Star className="text-blue-500" size={32} />,
      title: t('home.trust.items.security.label'),
      desc: t('home.trust.items.security.text'),
    },
    {
      icon: <Users className="text-blue-500" size={32} />,
      title: t('home.trust.items.proximity.label'),
      desc: t('home.trust.items.proximity.text'),
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background light effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white">
            {t('home.trust.title_start')} 
            <span className="text-blue-500">{t('home.trust.title_accent')}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {trustItems.map((item, index) => (
            <div 
              key={index}
              /* SOLUTION RADICALE : pointer-events-none empêche la souris d'interagir avec le bloc.
                 Le hover CSS ne peut PHYSIQUEMENT plus se déclencher.
              */
              className="p-8 bg-white/[0.03] border border-white/10 backdrop-blur-md rounded-[2.5rem] relative overflow-hidden pointer-events-none select-none"
              style={{ 
                transform: 'none !important',
                transition: 'none !important',
                boxShadow: 'none !important'
              }}
            >
              {/* Internal static light decor */}
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-600/5 blur-[50px]"></div>
              
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-white/5">
                {item.icon}
              </div>

              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-4">
                {item.title}
              </h3>

              <p className="text-gray-400 font-medium leading-relaxed italic text-sm md:text-base">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;