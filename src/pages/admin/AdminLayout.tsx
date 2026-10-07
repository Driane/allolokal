import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, Calendar, Star,
  BarChart2, ArrowLeft, Shield, ChevronRight, Menu, X, AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ADMIN_SLUG = import.meta.env.VITE_ADMIN_SLUG || 'panel';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed]             = useState(false);
  const [unverifiedCount, setUnverifiedCount] = useState(0);
  const [disputeCount, setDisputeCount]       = useState(0);

  useEffect(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    Promise.all([
      supabase.from('services').select('*', { count: 'exact', head: true })
        .eq('admin_status', 'pending').gt('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('bookings').select('*', { count: 'exact', head: true })
        .eq('status', 'disputed'),
    ]).then(([{ count: svc }, { count: dis }]) => {
      setUnverifiedCount(svc ?? 0);
      setDisputeCount(dis ?? 0);
    });
  }, []);

  const nav = [
    { to: `/${ADMIN_SLUG}`,            label: 'Vue d\'ensemble', icon: LayoutDashboard, end: true },
    { to: `/${ADMIN_SLUG}/users`,      label: 'Utilisateurs',    icon: Users },
    { to: `/${ADMIN_SLUG}/services`,   label: 'Annonces',        icon: FileText, badge: unverifiedCount },
    { to: `/${ADMIN_SLUG}/bookings`,   label: 'Réservations',    icon: Calendar },
    { to: `/${ADMIN_SLUG}/disputes`,   label: 'Litiges',         icon: AlertTriangle, badge: disputeCount },
    { to: `/${ADMIN_SLUG}/reviews`,    label: 'Avis',            icon: Star },
    { to: `/${ADMIN_SLUG}/analytics`,  label: 'Analytique',      icon: BarChart2 },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={`
        fixed top-0 left-0 h-full z-50 flex flex-col
        bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)]
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[68px]' : 'w-64'}
      `}>

        {/* Header */}
        <div className={`flex items-center border-b border-[var(--color-border)] h-16 shrink-0 ${collapsed ? 'justify-center px-3' : 'justify-between px-5'}`}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center">
                <Shield size={14} className="text-white" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-[var(--color-text-main)]">
                Administration
              </span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-main)] transition-all border-none bg-transparent cursor-pointer shrink-0"
          >
            {collapsed ? <Menu size={15} /> : <X size={15} />}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon, badge, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `
                relative flex items-center gap-3 rounded-xl transition-all duration-150 no-underline group
                ${collapsed ? 'justify-center px-0 py-3' : 'px-3.5 py-2.5'}
                ${isActive
                  ? 'bg-[var(--color-accent)] text-white shadow-md shadow-[var(--color-accent)]/20'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-main)]'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className="shrink-0" />

                  {!collapsed && (
                    <>
                      <span className="flex-1 text-[11px] font-black uppercase tracking-widest">
                        {label}
                      </span>
                      {badge ? (
                        <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full leading-none min-w-[18px] text-center">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      ) : isActive ? (
                        <ChevronRight size={12} className="opacity-50" />
                      ) : null}
                    </>
                  )}

                  {/* Badge en mode collapsed */}
                  {collapsed && badge ? (
                    <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center leading-none">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  ) : null}

                  {/* Tooltip en mode collapsed */}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-main)] text-[10px] font-black uppercase tracking-widest rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-50">
                      {label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Retour au site */}
        <div className="p-2.5 border-t border-[var(--color-border)] shrink-0">
          <button
            onClick={() => navigate('/')}
            className={`
              w-full flex items-center gap-3 rounded-xl py-2.5 transition-all border-none bg-transparent cursor-pointer
              text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-main)] group
              ${collapsed ? 'justify-center px-0' : 'px-3.5'}
            `}
          >
            <ArrowLeft size={15} className="shrink-0 group-hover:-translate-x-0.5 transition-transform" />
            {!collapsed && (
              <span className="text-[10px] font-black uppercase tracking-widest">Retour au site</span>
            )}
            {collapsed && (
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-main)] text-[10px] font-black uppercase tracking-widest rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-50">
                Retour au site
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* ── Contenu principal ───────────────────────────────────────────── */}
      <main className={`flex-1 min-h-screen transition-all duration-300 ${collapsed ? 'ml-[68px]' : 'ml-64'}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
