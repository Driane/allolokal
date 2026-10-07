import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  LogOut, LayoutDashboard, ChevronDown, User, Briefcase,
  LogIn, Shield, Menu, X, ChevronRight, Search, MessageSquare,
  CalendarClock, Star, ImageIcon, Wrench, Settings, Info,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Session } from '@supabase/supabase-js';
import ThemeToggle from './ui/ThemeToggle';
import { useUnreadMessages } from '../hooks/useUnreadMessages';
import { useIsNative } from '../hooks/useIsNative';

const ADMIN_SLUG = import.meta.env.VITE_ADMIN_SLUG || 'panel';

interface NavbarProps {
  session:              Session | null;
  highlightedCategory?: string | null;
  isAdmin?:             boolean;
}

const Navbar: React.FC<NavbarProps> = ({ session, highlightedCategory, isAdmin = false }) => {
  const { t, i18n }  = useTranslation();
  const navigate     = useNavigate();
  const location     = useLocation();
  const isNative     = useIsNative();
  const [langOpen,    setLangOpen]    = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const dropdownRef  = useRef<HTMLDivElement>(null);
  const user         = session?.user ?? null;
  const unreadMsgs   = useUnreadMessages(user?.id);

  const urlCategory  = new URLSearchParams(location.search).get('category');
  const isHome       = location.pathname === '/';
  const activeCategory = urlCategory || (isHome ? highlightedCategory : null) || null;

  // Ferme tous les menus sur changement de route
  useEffect(() => {
    setMobileOpen(false);
    setExpandedCat(null);
    setProfileOpen(false);
    setLangOpen(false);
  }, [location.pathname, location.search]);

  // Ferme les dropdowns au clic en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Empêche le scroll du body quand le drawer est ouvert
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const categoryConfig: Record<string, {
    hoverColor: string; activeColor: string; activeBg: string; border: string;
    color: string; subs: string[];
  }> = {
    beauty:   { hoverColor: 'hover:text-pink-500',   activeColor: 'text-pink-500',   activeBg: 'bg-pink-500/10',   border: 'border-pink-500',   color: '#ec4899', subs: ['nails','waxing','hairdressing','makeup','face_care'] },
    home:     { hoverColor: 'hover:text-green-500',  activeColor: 'text-green-500',  activeBg: 'bg-green-500/10',  border: 'border-green-500',  color: '#22c55e', subs: ['plumbing','electricity','painting_coatings','assembly_installation','gardening','pool_spa'] },
    cleaning: { hoverColor: 'hover:text-blue-500',   activeColor: 'text-blue-500',   activeBg: 'bg-blue-500/10',   border: 'border-blue-500',   color: '#3b82f6', subs: ['housekeeping','ironing_laundry','vehicles','disinfection'] },
    wellbeing:{ hoverColor: 'hover:text-purple-500', activeColor: 'text-purple-500', activeBg: 'bg-purple-500/10', border: 'border-purple-500', color: '#a855f7', subs: ['massage','sport_coaching','paramedical_care'] },
    family:   { hoverColor: 'hover:text-orange-500', activeColor: 'text-orange-500', activeBg: 'bg-orange-500/10', border: 'border-orange-500', color: '#f97316', subs: ['children','seniors','pets'] },
    premium:  { hoverColor: 'hover:text-yellow-500', activeColor: 'text-yellow-500', activeBg: 'bg-yellow-500/10', border: 'border-yellow-500', color: '#eab308', subs: ['cooking_meals','transport','events','lifestyle'] },
  };

  const getSubItems = (subKey: string): string[] => {
    const map: Record<string, string[]> = {
      nails: ['manicure','pedicure','gel_acrylic','nail_art'],
      waxing: ['wax','thread','laser','pulsed_light'],
      hairdressing: ['cut','coloring','brushing','extensions'],
      makeup: ['events_weddings','lessons','eyelashes','microblading'],
      face_care: ['facial_treatments'],
      plumbing: ['leak_repair','unclogging','sanitary'],
      electricity: ['small_jobs','outlets_cabling','home_automation'],
      painting_coatings: ['interior','exterior','parquet','tiling'],
      assembly_installation: ['furniture','tv_home_cinema','ac','locksmith'],
      gardening: ['mowing','hedge_trimming','pruning','planting'],
      pool_spa: ['maintenance','water_treatment','winterizing'],
      housekeeping: ['regular','deep_cleaning','move_out','windows','sofas_carpets'],
      ironing_laundry: ['ironing','folding_storage'],
      vehicles: ['car_wash','interior_car','polishing','boat'],
      disinfection: ['deep_clean','pest_control'],
      massage: ['relaxing_swedish','sports','thai','californian','hot_stones','prenatal'],
      sport_coaching: ['fitness_coach','yoga','pilates','martial_arts'],
      paramedical_care: ['physiotherapy','osteopathy','nurse','sophrology','nutritionist'],
      children: ['babysitter','regular_care','tutoring','private_lessons'],
      seniors: ['home_help','accompaniment','daily_care'],
      pets: ['pet_sitter','walking','grooming','training'],
      cooking_meals: ['private_chef','meal_prep','cooking_lessons','sommelier'],
      transport: ['private_driver','airport_transfer','rental_with_driver'],
      events: ['photographer','videographer','private_dj','organization','decoration','flowers'],
      lifestyle: ['personal_shopper','private_concierge'],
    };
    return map[subKey] || [];
  };

  const languages = [
    { code: 'hr', label: 'Hrvatski', flag: 'hr' },
    { code: 'en', label: 'English',  flag: 'gb' },
    { code: 'de', label: 'Deutsch',  flag: 'de' },
    { code: 'fr', label: 'Français', flag: 'fr' },
  ];
  const currentLanguage = languages.find(l => l.code === i18n.language) || languages[0];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfileOpen(false);
    setMobileOpen(false);
    navigate('/');
  };

  // App native : la navigation principale vit dans la BottomTabBar, le header se limite
  // au logo + langue (pas de mega-menu, pas de drawer — tout redondant avec les onglets).
  if (isNative) {
    return (
      <header
        className="fixed top-0 left-0 w-full z-[1000] bg-[var(--color-bg-nav)] backdrop-blur-md border-b border-[var(--color-border)]"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center no-underline">
            <img src="/logo.png" alt="AlloLokal" className="h-9 w-auto" />
          </Link>
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] px-3 py-2 rounded-xl cursor-pointer"
            >
              <img src={`https://flagcdn.com/w20/${currentLanguage.flag}.png`} className="h-3.5 w-5 object-cover rounded-sm shrink-0" alt="" />
              <ChevronDown size={12} className={`text-[var(--color-text-muted)] transition-transform ${langOpen ? 'rotate-180' : ''}`} />
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-3 w-44 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden z-20">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false); }}
                    className={`w-full flex items-center gap-3 px-5 py-4 text-xs font-black uppercase tracking-widest transition-colors border-none bg-transparent cursor-pointer ${i18n.language === lang.code ? 'text-[var(--color-accent)] bg-[var(--color-accent-light)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-main)]'}`}
                  >
                    <img src={`https://flagcdn.com/w20/${lang.flag}.png`} className="h-3.5 w-5 object-cover rounded-sm shrink-0" alt="" /> {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-[1000] bg-[var(--color-bg-nav)] backdrop-blur-md border-b border-[var(--color-border)] transition-colors duration-300">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 xl:h-24 flex items-center justify-between">

          {/* LOGO */}
          <Link to="/" className="flex items-center group shrink-0 no-underline">
            <img src="/logo.png" alt="AlloLokal" className="h-12 xl:h-16 w-auto transition-transform group-hover:scale-105" />
          </Link>

          {/* LIEN FINDPRO — mobile/tablette uniquement (< xl) */}
          <Link
            to="/findpro"
            className="xl:hidden flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-[10px] font-black uppercase tracking-widest no-underline transition-all shadow-md"
          >
            <Search size={13} />
            <span className="hidden sm:inline">{t('nav.find_pro', 'Trouver un pro')}</span>
          </Link>

          {/* MEGA MENU — desktop uniquement (xl+) */}
          <nav className="hidden xl:flex items-center gap-2 h-full">
            <Link
              to="/findpro"
              className={`text-[11px] font-black uppercase tracking-[0.15em] transition-all px-3 py-2 rounded-xl no-underline ${!activeCategory ? 'text-[var(--color-accent)] bg-[var(--color-accent-light)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
            >
              {t('categories.view_all', 'Voir tout')}
            </Link>
            {Object.keys(categoryConfig).map((catKey) => {
              const cfg = categoryConfig[catKey];
              const isActive = activeCategory === catKey;
              return (
                <div key={catKey} className="group flex items-center h-full relative">
                  <Link
                    to={`/findpro?category=${catKey}`}
                    className={`text-[11px] font-black uppercase tracking-[0.15em] transition-all cursor-pointer bg-transparent border-none py-2 px-3 rounded-xl no-underline ${cfg.hoverColor} ${isActive ? `${cfg.activeColor} ${cfg.activeBg} ring-1 ring-current` : 'text-[var(--color-text-muted)]'}`}
                  >
                    {t(`categories.main.${catKey}`)}
                    {isActive && highlightedCategory === catKey && !urlCategory && (
                      <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse align-middle" />
                    )}
                  </Link>
                  {/* Mega-menu dropdown — fixed au viewport pour éviter le débordement à gauche */}
                  <div className="fixed top-24 left-0 right-0 bg-[var(--color-bg-nav)] backdrop-blur-xl border-b border-[var(--color-border)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 shadow-2xl z-50">
                    <div className={`max-w-[1600px] mx-auto px-8 sm:px-12 lg:px-16 py-12 border-t-2 ${cfg.border}`}>
                      <div className="grid grid-cols-6 gap-y-10 gap-x-6">
                        {cfg.subs.map((subKey) => (
                          <div key={subKey} className="space-y-3">
                            <Link
                              to={`/findpro?category=${catKey}&sub=${subKey}`}
                              className="block text-[var(--color-text-main)] text-[10px] font-black uppercase tracking-[0.2em] pb-2 border-b border-[var(--color-border)] opacity-80 hover:opacity-100 no-underline transition-opacity"
                            >
                              {t(`categories.sub.${subKey}`)}
                            </Link>
                            <ul className="space-y-1.5 list-none p-0 m-0">
                              {getSubItems(subKey).map((itemKey) => (
                                <li key={itemKey}>
                                  <Link
                                    to={`/findpro?category=${catKey}&sub=${subKey}&item=${itemKey}`}
                                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] text-[12px] font-medium transition-all no-underline block hover:translate-x-1"
                                  >
                                    {t(`categories.items.${itemKey}`)}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>

          {/* ACTIONS DROITE */}
          <div className="flex items-center gap-2 sm:gap-3" ref={dropdownRef}>

            {/* Messages — visible si connecté */}
            {user && (
              <Link to="/messages"
                className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 transition-all no-underline">
                <MessageSquare size={16} />
                {unreadMsgs > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-[var(--color-accent)] text-white text-[8px] font-black rounded-full flex items-center justify-center px-1">
                    {unreadMsgs > 9 ? '9+' : unreadMsgs}
                  </span>
                )}
              </Link>
            )}

            {/* Qui sommes-nous — desktop uniquement */}
            <Link
              to="/about"
              className="hidden xl:flex text-[11px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors no-underline whitespace-nowrap"
            >
              {t('nav.about', 'Qui sommes-nous')}
            </Link>
            <span className="hidden xl:block w-px h-5 bg-[var(--color-border)]" />

            {/* Profil — desktop */}
            {user ? (
              <div className="relative hidden xl:block">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-3 bg-transparent border-none cursor-pointer group"
                >
                  <div className="hidden lg:flex flex-col items-end">
                    <span className="text-[10px] font-black text-[var(--color-accent)] uppercase tracking-widest leading-none mb-1 group-hover:text-[var(--color-text-main)] transition-colors">
                      {t('nav.my_profile')}
                    </span>
                    <span className="text-sm font-bold text-[var(--color-text-main)] leading-none flex items-center gap-2">
                      {user.user_metadata?.full_name || t('nav.default_user')}
                      <ChevronDown size={14} className={`text-[var(--color-text-muted)] transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                    </span>
                  </div>
                  <div className="w-9 h-9 xl:w-10 xl:h-10 rounded-full bg-[var(--color-accent)] flex items-center justify-center font-black italic text-xs border border-[var(--color-border)] text-white">
                    {user.user_metadata?.full_name?.charAt(0) || 'U'}
                  </div>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-3xl shadow-2xl overflow-hidden z-20">
                    <div className="p-2">
                      {isAdmin && (
                        <>
                          <Link to={`/${ADMIN_SLUG}`} onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-white hover:bg-red-500/80 rounded-2xl transition-all no-underline">
                            <Shield size={16} /> Administration
                          </Link>
                          <div className="h-px bg-[var(--color-border)] my-1 mx-2" />
                        </>
                      )}

                      {/* Liens vers les onglets du profil */}
                      {(() => {
                        const role = user.user_metadata?.role;
                        const isPro = role === 'pro';
                        const uid = user.id;
                        const link = (tab: string, Icon: React.ElementType, label: string) => (
                          <Link key={tab} to={`/profile/${uid}?tab=${tab}`} onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-tertiary)] rounded-2xl transition-all no-underline">
                            <Icon size={16} className="text-[var(--color-accent)]" /> {label}
                          </Link>
                        );
                        return (
                          <>
                            {link('dashboard', LayoutDashboard, t('profile.tabs.dashboard', 'Dashboard'))}
                            {isPro && link('agenda',    CalendarClock,  t('profile.tabs.agenda',    'Agenda'))}
                            {link('about',     User,           t('profile.tabs.about',     'À propos'))}
                            {isPro && link('services',  Briefcase,      t('profile.tabs.services',  'Services'))}
                            {isPro && link('portfolio', ImageIcon,      t('profile.tabs.portfolio', 'Portfolio'))}
                            {isPro && link('reviews',   Star,           t('profile.tabs.reviews',   'Avis'))}
                            {link('comptabilite', Settings,    t('profile.tabs.comptabilite', 'Comptabilité'))}
                          </>
                        );
                      })()}

                      <div className="h-px bg-[var(--color-border)] my-2 mx-2" />
                      <div className="px-2 pb-2">
                        <ThemeToggle variant="pill" />
                      </div>
                      <div className="h-px bg-[var(--color-border)] my-2 mx-2" />
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-2xl transition-all border-none bg-transparent cursor-pointer">
                        <LogOut size={16} /> {t('nav.logout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Boutons connexion — desktop */
              <div className="hidden xl:flex items-center gap-3">
                <Link
                  to="/pricing"
                  className="flex items-center gap-2 border border-[var(--color-accent)]/40 bg-[var(--color-accent-light)] hover:bg-[var(--color-accent)]/20 text-[var(--color-accent)] px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] transition-all no-underline"
                >
                  <Briefcase size={13} /> {t('nav.become_pro')}
                </Link>
                <Link
                  to="/auth"
                  className="flex items-center gap-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] transition-all no-underline shadow-lg"
                >
                  <LogIn size={13} /> {t('nav.login')}
                </Link>
              </div>
            )}

            {/* Langue — après les boutons connexion */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-3 py-2 rounded-xl transition-all cursor-pointer"
              >
                <img src={`https://flagcdn.com/w20/${currentLanguage.flag}.png`} className="h-3.5 w-5 object-cover rounded-sm shrink-0" alt="" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-main)] hidden md:inline">
                  {currentLanguage.code}
                </span>
                <ChevronDown size={12} className={`text-[var(--color-text-muted)] transition-transform hidden md:inline ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              {langOpen && (
                <div className="absolute right-0 mt-3 w-44 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden z-20">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false); }}
                      className={`w-full flex items-center gap-3 px-5 py-4 text-xs font-black uppercase tracking-widest transition-colors border-none bg-transparent cursor-pointer ${i18n.language === lang.code ? 'text-[var(--color-accent)] bg-[var(--color-accent-light)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-main)]'}`}
                    >
                      <img src={`https://flagcdn.com/w20/${lang.flag}.png`} className="h-3.5 w-5 object-cover rounded-sm shrink-0" alt="" /> {lang.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Avatar mobile (si connecté) — visible uniquement sous xl */}
            {user && (
              <button
                onClick={() => setMobileOpen(true)}
                className="xl:hidden w-11 h-11 rounded-full bg-[var(--color-accent)] flex items-center justify-center font-black italic text-xs border border-[var(--color-border)] text-white"
              >
                {user.user_metadata?.full_name?.charAt(0) || 'U'}
              </button>
            )}

            {/* Hamburger — visible sous xl */}
            <button
              onClick={() => setMobileOpen(true)}
              className="xl:hidden flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-all cursor-pointer"
              aria-label="Menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBILE DRAWER ────────────────────────────────────────────────────────── */}
      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[1001] bg-black/60 backdrop-blur-sm xl:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={`
        fixed top-0 right-0 h-[100dvh] w-[min(340px,90vw)] z-[1002] xl:hidden
        bg-[var(--color-bg-secondary)] border-l border-[var(--color-border)]
        flex flex-col overflow-y-auto
        transition-transform duration-300 ease-out
        ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header drawer */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] shrink-0">
          <img src="/logo.png" alt="AlloLokal" className="h-9 w-auto" />
          <button
            onClick={() => setMobileOpen(false)}
            className="w-11 h-11 rounded-xl bg-[var(--color-bg-tertiary)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border-none cursor-pointer transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 px-4 py-4 space-y-1">

          {/* Compte utilisateur */}
          {user ? (
            <div className="bg-[var(--color-bg-tertiary)] rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-accent)] flex items-center justify-center font-black italic text-sm text-white">
                  {user.user_metadata?.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="text-sm font-black text-[var(--color-text-main)]">{user.user_metadata?.full_name || t('nav.default_user')}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] font-mono">{user.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {isAdmin && (
                  <Link to={`/${ADMIN_SLUG}`} onClick={() => setMobileOpen(false)}
                    className="col-span-2 flex items-center gap-2 px-3 py-2.5 bg-red-500/10 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest no-underline">
                    <Shield size={14} /> Admin
                  </Link>
                )}
                {(() => {
                  const isPro = user.user_metadata?.role === 'pro';
                  const uid = user.id;
                  const mlink = (tab: string, Icon: React.ElementType, label: string) => (
                    <Link key={tab} to={`/profile/${uid}?tab=${tab}`} onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 bg-[var(--color-bg-secondary)] rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] no-underline">
                      <Icon size={13} className="text-[var(--color-accent)]" /> {label}
                    </Link>
                  );
                  return (
                    <>
                      {mlink('dashboard', LayoutDashboard, t('profile.tabs.dashboard', 'Dashboard'))}
                      {isPro && mlink('agenda', CalendarClock, t('profile.tabs.agenda', 'Agenda'))}
                      {mlink('about', User, t('profile.tabs.about', 'À propos'))}
                      {isPro && mlink('services', Briefcase, t('profile.tabs.services', 'Services'))}
                      {isPro && mlink('portfolio', ImageIcon, t('profile.tabs.portfolio', 'Portfolio'))}
                      {isPro && mlink('reviews', Star, t('profile.tabs.reviews', 'Avis'))}
                      {mlink('comptabilite', Settings, t('profile.tabs.comptabilite', 'Comptabilité'))}
                    </>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Link to="/pricing" onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-[var(--color-accent)]/40 bg-[var(--color-accent-light)] text-[var(--color-accent)] rounded-2xl font-black text-[10px] uppercase tracking-widest no-underline">
                <Briefcase size={13} /> Pro
              </Link>
              <Link to="/auth" onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-accent)] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest no-underline">
                <LogIn size={13} /> {t('nav.login')}
              </Link>
            </div>
          )}

          {/* FindPro */}
          <Link to="/findpro" onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl font-black text-sm text-white no-underline transition-all bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] shadow-md">
            <Search size={16} /> {t('nav.find_pro', 'Trouver un pro')}
          </Link>

          {/* Qui sommes-nous */}
          <Link to="/about" onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-tertiary)] no-underline transition-all">
            <Info size={15} /> {t('nav.about', 'Qui sommes-nous')}
          </Link>

          <div className="h-px bg-[var(--color-border)] my-2" />
          <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-4 pb-1">Catégories</p>

          <Link to="/findpro" onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-tertiary)] no-underline transition-all">
            {t('categories.view_all', 'Toutes les catégories')}
          </Link>

          {/* Catégories accordion */}
          {Object.entries(categoryConfig).map(([catKey, cfg]) => (
            <div key={catKey}>
              <button
                onClick={() => setExpandedCat(expandedCat === catKey ? null : catKey)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-black uppercase tracking-wider transition-all cursor-pointer border-none bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-main)]"
                style={{ color: expandedCat === catKey ? cfg.color : undefined }}
              >
                <span className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                  {t(`categories.main.${catKey}`)}
                </span>
                <ChevronRight size={14} className={`transition-transform ${expandedCat === catKey ? 'rotate-90' : ''}`} />
              </button>

              {expandedCat === catKey && (
                <div className="ml-4 mt-1 mb-2 pl-3 border-l-2 space-y-1" style={{ borderColor: `${cfg.color}40` }}>
                  <Link
                    to={`/findpro?category=${catKey}`}
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl no-underline transition-all hover:bg-[var(--color-bg-tertiary)]"
                    style={{ color: cfg.color }}
                  >
                    → Tous les {t(`categories.main.${catKey}`)}
                  </Link>
                  {cfg.subs.map(subKey => (
                    <Link
                      key={subKey}
                      to={`/findpro?category=${catKey}&sub=${subKey}`}
                      onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2 text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] rounded-xl no-underline transition-all hover:bg-[var(--color-bg-tertiary)]"
                    >
                      {t(`categories.sub.${subKey}`)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="h-px bg-[var(--color-border)] my-2" />

          {/* Langue */}
          <div className="px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-3">Langue</p>
            <div className="grid grid-cols-2 gap-2">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { i18n.changeLanguage(lang.code); }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border cursor-pointer transition-all ${
                    i18n.language === lang.code
                      ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] text-[var(--color-accent)]'
                      : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  <img src={`https://flagcdn.com/w20/${lang.flag}.png`} className="h-3.5 w-5 object-cover rounded-sm shrink-0" alt="" /> {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer drawer */}
        <div className="shrink-0 px-4 py-4 border-t border-[var(--color-border)] space-y-2">
          {user && (
            <button onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-2xl transition-all border border-red-500/20 bg-transparent cursor-pointer">
              <LogOut size={14} /> {t('nav.logout')}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default Navbar;
