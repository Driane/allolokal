import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';
import { Home, Search, LayoutDashboard, MessageSquare, User, LogIn, Briefcase } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Session } from '@supabase/supabase-js';
import { useIsNative } from '../hooks/useIsNative';
import { useUnreadMessages } from '../hooks/useUnreadMessages';
import { useIsAnyModalOpen } from '../lib/backButtonStack';

interface BottomTabBarProps {
  session: Session | null;
}

interface Tab {
  key:   string;
  to:    string;
  label: string;
  icon:  React.ReactNode;
  isActive: (pathname: string, tabParam: string | null) => boolean;
  badge?: number;
}

// Barre d'onglets Material Design — natif uniquement (Android/iOS), jamais affichée sur le web.
const BottomTabBar: React.FC<BottomTabBarProps> = ({ session }) => {
  const isNative = useIsNative();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const user = session?.user ?? null;
  const unread = useUnreadMessages(user?.id);
  const anyModalOpen = useIsAnyModalOpen();

  if (!isNative || anyModalOpen) return null;

  const tabParam = new URLSearchParams(location.search).get('tab');

  const tabs: Tab[] = user ? [
    { key: 'home',     to: '/',                                         label: t('nav.tabs.home', 'Accueil'),       icon: <Home size={22} />,           isActive: p => p === '/' },
    { key: 'search',   to: '/findpro',                                  label: t('nav.tabs.search', 'Recherche'),   icon: <Search size={22} />,         isActive: p => p.startsWith('/findpro') },
    { key: 'bookings', to: `/profile/${user.id}?tab=dashboard`,         label: t('nav.tabs.bookings', 'Réservations'), icon: <LayoutDashboard size={22} />, isActive: (p, tab) => p.startsWith('/profile/') && tab !== 'about' },
    { key: 'messages', to: '/messages',                                 label: t('nav.tabs.messages', 'Messages'),  icon: <MessageSquare size={22} />,  isActive: p => p.startsWith('/messages'), badge: unread },
    { key: 'profile',  to: `/profile/${user.id}?tab=about`,             label: t('nav.tabs.profile', 'Profil'),     icon: <User size={22} />,           isActive: (p, tab) => p.startsWith('/profile/') && tab === 'about' },
  ] : [
    { key: 'home',     to: '/',         label: t('nav.tabs.home', 'Accueil'),       icon: <Home size={22} />,     isActive: p => p === '/' },
    { key: 'search',   to: '/findpro',  label: t('nav.tabs.search', 'Recherche'),   icon: <Search size={22} />,   isActive: p => p.startsWith('/findpro') },
    { key: 'pro',      to: '/pricing',  label: t('nav.tabs.become_pro', 'Pro'),     icon: <Briefcase size={22} />, isActive: p => p.startsWith('/pricing') },
    { key: 'login',    to: '/auth',     label: t('nav.tabs.login', 'Connexion'),    icon: <LogIn size={22} />,    isActive: p => p.startsWith('/auth') },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 w-full z-[1000] bg-[var(--color-bg-nav)] backdrop-blur-md border-t border-[var(--color-border)] flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(tab => {
        const active = tab.isActive(location.pathname, tabParam);
        return (
          <Link
            key={tab.key}
            to={tab.to}
            onClick={e => { e.preventDefault(); navigate(tab.to); }}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 no-underline relative select-none"
          >
            <m.div
              whileTap={{ scale: 0.88 }}
              className="flex flex-col items-center gap-1"
            >
              <div className="relative px-4 py-1 rounded-full transition-colors duration-200"
                style={{ backgroundColor: active ? 'var(--color-accent-light)' : 'transparent' }}>
                <span style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                  {tab.icon}
                </span>
                {!!tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-[var(--color-accent)] text-white text-[8px] font-black rounded-full flex items-center justify-center px-1">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </div>
              <span
                className="text-[9px] font-black uppercase tracking-wide"
                style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
              >
                {tab.label}
              </span>
            </m.div>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomTabBar;
