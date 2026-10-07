import React, { useEffect, useState } from 'react';
import { Users, FileText, Calendar, Star, TrendingUp, Clock, UserCheck, AlertCircle, UserX } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Stats {
  totalUsers:         number;
  totalPros:          number;
  totalClients:       number;
  newUsersWeek:       number;
  totalServices:      number;
  pendingServices:    number;
  totalBookings:      number;
  pendingBookings:    number;
  completedBookings:  number;
  totalReviews:       number;
  avgRating:          number;
  recentSuspensions:  number;
  recentDeletions:    number;
}

const KPICard: React.FC<{
  label:    string;
  value:    number | string;
  icon:     React.ReactNode;
  accent:   string;
  sub?:     string;
  alert?:   boolean;
}> = ({ label, value, icon, accent, sub, alert }) => (
  <div className={`
    bg-[var(--color-bg-secondary)] border rounded-3xl p-6 flex flex-col gap-4 transition-all hover:shadow-lg
    ${alert ? 'border-red-500/40 bg-red-500/5' : 'border-[var(--color-border)]'}
  `}>
    <div className="flex items-start justify-between">
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center"
        style={{ background: `${accent}18`, color: accent }}
      >
        {icon}
      </div>
      {alert && <span className="text-[8px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 px-2 py-1 rounded-full">Action requise</span>}
    </div>
    <div>
      <p className="text-3xl font-black text-[var(--color-text-main)] tabular-nums">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mt-1">{label}</p>
      {sub && <p className="text-[11px] text-[var(--color-text-muted)] mt-2 italic">{sub}</p>}
    </div>
  </div>
);

const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalPros: 0, totalClients: 0, newUsersWeek: 0,
    totalServices: 0, pendingServices: 0,
    totalBookings: 0, pendingBookings: 0, completedBookings: 0,
    totalReviews: 0, avgRating: 0,
    recentSuspensions: 0, recentDeletions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const weekAgo      = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        { count: totalUsers },
        { count: totalPros },
        { count: totalClients },
        { count: newUsersWeek },
        { count: totalServices },
        { count: pendingServices },
        { count: totalBookings },
        { count: pendingBookings },
        { count: completedBookings },
        { data: reviewData },
        { count: recentSuspensions },
        { count: recentDeletions },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'pro'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gt('updated_at', weekAgo.toISOString()),
        supabase.from('services').select('*', { count: 'exact', head: true }),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('admin_status', 'pending').gt('created_at', thirtyDaysAgo.toISOString()),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('reviews').select('rating'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_suspended', true).gt('suspended_at', weekAgo.toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gt('deleted_at', weekAgo.toISOString()),
      ]);

      const ratings = (reviewData ?? []).map(r => r.rating as number);
      const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

      setStats({
        totalUsers:        totalUsers        ?? 0,
        totalPros:         totalPros         ?? 0,
        totalClients:      totalClients      ?? 0,
        newUsersWeek:      newUsersWeek      ?? 0,
        totalServices:     totalServices     ?? 0,
        pendingServices:   pendingServices   ?? 0,
        totalBookings:     totalBookings     ?? 0,
        pendingBookings:   pendingBookings   ?? 0,
        completedBookings: completedBookings ?? 0,
        totalReviews:      ratings.length,
        avgRating,
        recentSuspensions: recentSuspensions ?? 0,
        recentDeletions:   recentDeletions   ?? 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const now = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-10">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-accent)] mb-2">{now}</p>
        <h1 className="text-4xl font-black uppercase tracking-tight text-[var(--color-text-main)]">
          Vue d'ensemble
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Tableau de bord administrateur — données en temps réel</p>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Utilisateurs total"
          value={stats.totalUsers}
          icon={<Users size={20} />}
          accent="var(--color-accent)"
          sub={`+${stats.newUsersWeek} cette semaine`}
        />
        <KPICard
          label="Professionnels"
          value={stats.totalPros}
          icon={<UserCheck size={20} />}
          accent="#ec4899"
          sub={`${stats.totalClients} clients`}
        />
        <KPICard
          label="Annonces actives"
          value={stats.totalServices}
          icon={<FileText size={20} />}
          accent="#3b82f6"
          sub={`${stats.pendingServices} à vérifier`}
          alert={stats.pendingServices > 0}
        />
        <KPICard
          label="Réservations"
          value={stats.totalBookings}
          icon={<Calendar size={20} />}
          accent="#22c55e"
          sub={`${stats.pendingBookings} en attente`}
        />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
        <KPICard
          label="Réservations terminées"
          value={stats.completedBookings}
          icon={<TrendingUp size={20} />}
          accent="#a855f7"
          sub={`Taux : ${stats.totalBookings ? Math.round((stats.completedBookings / stats.totalBookings) * 100) : 0}%`}
        />
        <KPICard
          label="Avis clients"
          value={stats.totalReviews}
          icon={<Star size={20} />}
          accent="#eab308"
          sub={`Moyenne : ${stats.avgRating.toFixed(1)} / 5`}
        />
        <KPICard
          label="En attente de confirmation"
          value={stats.pendingBookings}
          icon={<Clock size={20} />}
          accent="#f97316"
          alert={stats.pendingBookings > 5}
        />
        <KPICard
          label="Annonces à modérer"
          value={stats.pendingServices}
          icon={<AlertCircle size={20} />}
          accent="#ef4444"
          alert={stats.pendingServices > 0}
          sub="Auto-approuvées après 30j"
        />
        <KPICard
          label="Suspensions / suppressions (7j)"
          value={stats.recentSuspensions + stats.recentDeletions}
          icon={<UserX size={20} />}
          accent="#ef4444"
          alert={(stats.recentSuspensions + stats.recentDeletions) > 0}
          sub={`${stats.recentSuspensions} suspendu(s) · ${stats.recentDeletions} supprimé(s)`}
        />
      </div>

      {/* Ratio pros / clients */}
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-3xl p-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-4">Répartition des comptes</p>
        <div className="flex gap-3 items-center mb-3">
          <span className="text-sm font-bold text-[var(--color-text-main)]">Professionnels</span>
          <span className="ml-auto text-sm font-black text-[var(--color-accent)]">
            {stats.totalUsers ? Math.round((stats.totalPros / stats.totalUsers) * 100) : 0}%
          </span>
        </div>
        <div className="w-full h-3 bg-[var(--color-bg-primary)] rounded-full overflow-hidden mb-5">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-700"
            style={{ width: `${stats.totalUsers ? (stats.totalPros / stats.totalUsers) * 100 : 0}%` }}
          />
        </div>
        <div className="flex gap-3 items-center mb-3">
          <span className="text-sm font-bold text-[var(--color-text-main)]">Clients</span>
          <span className="ml-auto text-sm font-black text-pink-500">
            {stats.totalUsers ? Math.round((stats.totalClients / stats.totalUsers) * 100) : 0}%
          </span>
        </div>
        <div className="w-full h-3 bg-[var(--color-bg-primary)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-pink-500 transition-all duration-700"
            style={{ width: `${stats.totalUsers ? (stats.totalClients / stats.totalUsers) * 100 : 0}%` }}
          />
        </div>
      </div>

    </div>
  );
};

export default AdminOverview;
