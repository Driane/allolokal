import React, { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, useLocation, useSearchParams, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

import Navbar        from './components/Navbar';
import Footer        from './components/Footer';
import BottomTabBar             from './components/BottomTabBar';
import NativeConfirmHost        from './components/NativeConfirmHost';
import NotificationOptInBanner  from './components/NotificationOptInBanner';
import ErrorBoundary            from './components/ErrorBoundary';
import CookieBanner              from './components/CookieBanner';
import PushNotificationHandler   from './components/PushNotificationHandler';
import { ThemeProvider } from './contexts/ThemeContext';
import { useIsNative } from './hooks/useIsNative';
import { useAndroidBackButton } from './hooks/useAndroidBackButton';
import { LazyMotion, domMax } from 'framer-motion';
import './index.css';

// ── Imports eagerly (petits, critiques au démarrage) ─────────────────────────
import Home from './pages/Home';

// ── Lazy imports (chargés à la demande, réduisent le bundle initial) ─────────
const Auth             = lazy(() => import('./pages/Auth'));
const FindPro          = lazy(() => import('./pages/FindPro'));
const ProfilePage      = lazy(() => import('./pages/ProfilePage'));
const Dashboard        = lazy(() => import('./pages/Dashboard'));
const BookingPage      = lazy(() => import('./pages/BookingPage'));
const AvailabilityPage = lazy(() => import('./pages/AvailabilityPage'));
const ProOnboarding    = lazy(() => import('./pages/ProOnboarding'));
const MapPage          = lazy(() => import('./pages/MapPage'));
const ResetPassword    = lazy(() => import('./pages/ResetPassword'));
const MessagesPage     = lazy(() => import('./pages/MessagesPage'));
const TermsPage             = lazy(() => import('./pages/TermsPage'));
const PrivacyPage           = lazy(() => import('./pages/PrivacyPage'));
const LegalNoticePage       = lazy(() => import('./pages/LegalNoticePage'));
const AccountDeletionPage   = lazy(() => import('./pages/AccountDeletionPage'));
const PricingPage      = lazy(() => import('./pages/PricingPage'));
const AboutPage        = lazy(() => import('./pages/AboutPage'));

const AdminLayout    = lazy(() => import('./pages/admin/AdminLayout'));
const AdminOverview  = lazy(() => import('./pages/admin/AdminOverview'));
const AdminUsers     = lazy(() => import('./pages/admin/AdminUsers'));
const AdminServices  = lazy(() => import('./pages/admin/AdminServices'));
const AdminBookings  = lazy(() => import('./pages/admin/AdminBookings'));
const AdminDisputes  = lazy(() => import('./pages/admin/AdminDisputes'));
const AdminReviews   = lazy(() => import('./pages/admin/AdminReviews'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));

// ── Fallback de chargement ────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-8 h-8 border-4 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
  </div>
);

// ── Helpers ──────────────────────────────────────────────────────────────────
const ADMIN_SLUG = import.meta.env.VITE_ADMIN_SLUG || 'panel';

const AuthRedirect = () => {
  const [sp] = useSearchParams();
  const from = sp.get('from');
  try {
    return <Navigate to={from ? decodeURIComponent(from) : '/dashboard'} replace />;
  } catch {
    return <Navigate to="/dashboard" replace />;
  }
};

const PrivateRoute = ({ session, children }: { session: Session | null; children: React.ReactNode }) => {
  const location = useLocation();
  if (!session) {
    const from = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?from=${from}`} replace />;
  }
  return <>{children}</>;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const AndroidBackButton = () => {
  useAndroidBackButton();
  return null;
};

interface SiteLayoutProps {
  session:             Session | null;
  isAdmin:             boolean;
  highlightedCategory: string | null;
}
const SiteLayout: React.FC<SiteLayoutProps> = ({ session, isAdmin, highlightedCategory }) => {
  const isNative = useIsNative();
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex flex-col">
      <Navbar session={session} highlightedCategory={highlightedCategory} isAdmin={isAdmin} />
      <main className={`flex-grow overflow-x-hidden w-full relative z-10 ${isNative ? 'pt-14' : 'pt-16 xl:pt-24'}`}
        style={isNative ? { paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' } : undefined}>
        {isNative && <NotificationOptInBanner loggedIn={!!session} />}
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      {!isNative && <Footer />}
      <BottomTabBar session={session} />
      <ErrorBoundary fallback={null}>
        <CookieBanner />
      </ErrorBoundary>
    </div>
  );
};

// ── App ──────────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [session, setSession]                          = useState<Session | null>(null);
  const [loading, setLoading]                          = useState(true);
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);

  useEffect(() => {
    let settled = false;
    const finish = (s: Session | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      setSession(s);
      setLoading(false);
    };
    // Délai de secours : si Supabase ne répond pas en 5 s, on débloque l'app
    const timeoutId = setTimeout(() => finish(null), 5000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => finish(session))
      .catch(() => finish(null));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => {
      settled = true;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const handleCategoryHighlight = useCallback((cat: string | null) => {
    setHighlightedCategory(cat);
  }, []);

  const isAdmin = session?.user?.app_metadata?.role === 'admin';

  if (loading) return (
    <div className="h-screen w-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <LazyMotion features={domMax} strict>
    <ThemeProvider>
      <Router>
        <ScrollToTop />
        <AndroidBackButton />
        <NativeConfirmHost />
        <PushNotificationHandler />
        <Routes>

          {/* ── Panel Admin ── */}
          <Route
            path={`/${ADMIN_SLUG}`}
            element={isAdmin ? (
              <Suspense fallback={<PageLoader />}><AdminLayout /></Suspense>
            ) : <Navigate to="/" replace />}
          >
            <Route index            element={<AdminOverview />}  />
            <Route path="users"     element={<AdminUsers />}     />
            <Route path="services"  element={<AdminServices />}  />
            <Route path="bookings"  element={<AdminBookings />}  />
            <Route path="disputes"  element={<AdminDisputes />}  />
            <Route path="reviews"   element={<AdminReviews />}   />
            <Route path="analytics" element={<AdminAnalytics />} />
          </Route>

          {/* ── Site normal ── */}
          <Route element={
            <SiteLayout
              session={session}
              isAdmin={isAdmin}
              highlightedCategory={highlightedCategory}
            />
          }>
            <Route path="/"                       element={<Home onCategoryHighlight={handleCategoryHighlight} />} />
            <Route path="/auth"                   element={!session ? <Auth /> : <AuthRedirect />} />
            <Route path="/findpro"                element={<FindPro />} />
            <Route path="/profile/:id"            element={<ProfilePage />} />
            <Route path="/booking/:id"            element={<PrivateRoute session={session}><BookingPage /></PrivateRoute>} />
            <Route path="/dashboard"              element={<PrivateRoute session={session}><Dashboard /></PrivateRoute>} />
            <Route path="/onboarding"             element={<PrivateRoute session={session}><ProOnboarding /></PrivateRoute>} />
            <Route path="/dashboard/availability" element={<PrivateRoute session={session}><AvailabilityPage /></PrivateRoute>} />
            <Route path="/map"                    element={<MapPage />} />
            <Route path="/reset-password"         element={<ResetPassword />} />
            <Route path="/messages"               element={<PrivateRoute session={session}><MessagesPage /></PrivateRoute>} />
            <Route path="/terms"                  element={<TermsPage />} />
            <Route path="/privacy"                element={<PrivacyPage />} />
            <Route path="/legal"                  element={<LegalNoticePage />} />
            <Route path="/account-deletion"       element={<AccountDeletionPage />} />
            <Route path="/pricing"                element={<PricingPage />} />
            <Route path="/about"                  element={<AboutPage />} />
            <Route path="*"                       element={<Navigate to="/" replace />} />
          </Route>

        </Routes>
      </Router>
    </ThemeProvider>
    </LazyMotion>
  );
};

export default App;
