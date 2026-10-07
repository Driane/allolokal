import React, { useEffect, useState } from 'react';
import { Loader2, TrendingUp, Users, FileText, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getCategoryColor } from '../../lib/categoryColors';

const BOOKING_COLORS: Record<string, string> = {
  'En attente':  '#f97316',
  'Confirmées':  '#3b82f6',
  'Terminées':   '#22c55e',
  'Annulées':    '#ef4444',
  'Litiges':     '#a855f7',
};

interface DayPoint  { date: string; users: number; }
interface CatPoint  { name: string; value: number; color: string; }
interface BookPoint { status: string; count: number; }

// ── Graphique barres verticales (SVG) ────────────────────────────────────────
const BarChartSVG: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 100 / data.length;
  return (
    <div className="flex items-end gap-1.5 h-40 w-full">
      {data.map(({ label, value, color }) => (
        <div key={label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
          <span className="text-[9px] font-black text-[var(--color-text-main)] tabular-nums">{value || ''}</span>
          <div
            className="w-full rounded-t-lg transition-all duration-700"
            style={{
              height: `${(value / max) * 100}%`,
              background: color,
              minHeight: value > 0 ? '4px' : '0',
              opacity: value === 0 ? 0.2 : 1,
            }}
          />
          <span className="text-[8px] font-black uppercase tracking-wider text-[var(--color-text-muted)] text-center leading-tight" style={{ color }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Graphique courbe (SVG) ────────────────────────────────────────────────────
const LineChartSVG: React.FC<{ data: DayPoint[]; color: string }> = ({ data, color }) => {
  if (!data.length) return null;
  const W = 600; const H = 140; const PAD = 10;
  const max = Math.max(...data.map(d => d.users), 1);
  const pts = data.map((d, i) => ({
    x: PAD + (i / (data.length - 1 || 1)) * (W - PAD * 2),
    y: H - PAD - (d.users / max) * (H - PAD * 2),
    v: d.users,
    label: d.date,
  }));

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `M${pts[0]?.x},${H - PAD} ` + pts.map(p => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length - 1]?.x},${H - PAD} Z`;

  // Ticks sur l'axe X : tous les 5 jours
  const xTicks = pts.filter((_, i) => i % 5 === 0 || i === pts.length - 1);

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grille horizontale */}
        {[0.25, 0.5, 0.75, 1].map(r => (
          <line key={r} x1={PAD} x2={W - PAD} y1={H - PAD - r * (H - PAD * 2)} y2={H - PAD - r * (H - PAD * 2)}
            stroke="var(--color-border)" strokeWidth="0.5" />
        ))}
        {/* Aire */}
        <path d={area} fill="url(#areaGrad)" />
        {/* Ligne */}
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* Points actifs */}
        {pts.filter(p => p.v > 0).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
        ))}
        {/* Labels X */}
        {xTicks.map((p, i) => (
          <text key={i} x={p.x} y={H + 15} textAnchor="middle" fontSize="8" fill="var(--color-text-muted)" fontWeight="700">
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
};

// ── Donut chart (SVG) ─────────────────────────────────────────────────────────
const DonutChart: React.FC<{ data: CatPoint[] }> = ({ data }) => {
  const total = data.reduce((a, c) => a + c.value, 0);
  if (!total) return <p className="text-center text-[var(--color-text-muted)] italic text-sm py-8">Aucune donnée</p>;

  const R = 60; const CX = 80; const CY = 80; const stroke = 22;
  let cumulative = 0;

  const slices = data.map(d => {
    const pct = d.value / total;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    cumulative += pct;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const x1 = CX + R * Math.cos(startAngle);
    const y1 = CY + R * Math.sin(startAngle);
    const x2 = CX + R * Math.cos(endAngle);
    const y2 = CY + R * Math.sin(endAngle);
    const largeArc = pct > 0.5 ? 1 : 0;
    return { ...d, pct, path: `M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${largeArc} 1 ${x2},${y2} Z` };
  });

  // Version stroke-dasharray (plus propre)
  const circ = 2 * Math.PI * R;
  let offset = 0;
  const arcs = data.map(d => {
    const pct = d.value / total;
    const dash = pct * circ;
    const gap  = circ - dash;
    const arc  = { ...d, pct, dash, gap, offset };
    offset += dash;
    return arc;
  });

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 160 160" className="w-36 h-36 shrink-0 -rotate-90">
        {/* Fond */}
        <circle cx="80" cy="80" r={R} fill="none" stroke="var(--color-bg-primary)" strokeWidth={stroke} />
        {arcs.map((arc, i) => (
          <circle key={i} cx="80" cy="80" r={R} fill="none"
            stroke={arc.color} strokeWidth={stroke}
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            strokeDashoffset={-arc.offset}
          />
        ))}
      </svg>
      <div className="flex-1 space-y-2">
        {data.map(cat => (
          <div key={cat.name} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.color }} />
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] flex-1 capitalize">{cat.name}</span>
            <span className="text-[11px] font-black text-[var(--color-text-main)] tabular-nums">{cat.value}</span>
            <span className="text-[9px] text-[var(--color-text-muted)] w-7 text-right">
              {total ? Math.round((cat.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Chart card wrapper ────────────────────────────────────────────────────────
const ChartCard: React.FC<{ title: string; sub?: string; children: React.ReactNode }> = ({ title, sub, children }) => (
  <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-3xl p-6">
    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5">{title}</p>
    {sub && <p className="text-[11px] text-[var(--color-text-muted)] italic mb-4">{sub}</p>}
    <div className="mt-5">{children}</div>
  </div>
);

// ── Page principale ───────────────────────────────────────────────────────────
const AdminAnalytics: React.FC = () => {
  const [registrations, setRegistrations] = useState<DayPoint[]>([]);
  const [categories,    setCategories]    = useState<CatPoint[]>([]);
  const [bookingStats,  setBookingStats]  = useState<BookPoint[]>([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Inscriptions 30 jours
      const { data: recentUsers } = await supabase
        .from('profiles').select('created_at')
        .gt('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: true });

      const byDay: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d   = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        byDay[key] = 0;
      }
      (recentUsers ?? []).forEach(u => {
        const key = new Date(u.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        byDay[key] = (byDay[key] ?? 0) + 1;
      });
      setRegistrations(Object.entries(byDay).map(([date, users]) => ({ date, users })));

      // Services par catégorie
      const { data: servicesData } = await supabase.from('services').select('category');
      const catCount: Record<string, number> = {};
      (servicesData ?? []).forEach(s => {
        if (s.category) catCount[s.category] = (catCount[s.category] ?? 0) + 1;
      });
      setCategories(
        Object.entries(catCount)
          .map(([name, value]) => ({ name, value, color: getCategoryColor(name) }))
          .sort((a, b) => b.value - a.value)
      );

      // Réservations par statut
      const statuses = ['pending', 'confirmed', 'completed', 'cancelled', 'disputed'];
      const labelMap: Record<string, string> = {
        pending: 'En attente', confirmed: 'Confirmées',
        completed: 'Terminées', cancelled: 'Annulées', disputed: 'Litiges',
      };
      const counts = await Promise.all(
        statuses.map(st => supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', st))
      );
      setBookingStats(statuses.map((st, i) => ({ status: labelMap[st], count: counts[i].count ?? 0 })));

      setLoading(false);
    };
    fetchAll();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="animate-spin text-[var(--color-accent)]" size={32} />
    </div>
  );

  const newUsersTotal = registrations.reduce((a, d) => a + d.users, 0);
  const totalServices = categories.reduce((a, c) => a + c.value, 0);
  const totalBookings = bookingStats.reduce((a, b) => a + b.count, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-10">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-accent)] mb-1">Administration</p>
        <h1 className="text-4xl font-black uppercase tracking-tight text-[var(--color-text-main)]">Analytique</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Données en temps réel — 30 derniers jours</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Nouveaux utilisateurs (30j)', value: newUsersTotal, icon: <Users size={18} />, color: 'var(--color-accent)' },
          { label: 'Services publiés total',       value: totalServices, icon: <FileText size={18} />, color: '#3b82f6' },
          { label: 'Réservations total',           value: totalBookings, icon: <Calendar size={18} />, color: '#22c55e' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-3xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}>
              {icon}
            </div>
            <div>
              <p className="text-2xl font-black text-[var(--color-text-main)] tabular-nums">{value}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Courbe inscriptions */}
      <div className="mb-6">
        <ChartCard title="Nouvelles inscriptions" sub="Utilisateurs enregistrés par jour sur les 30 derniers jours">
          <LineChartSVG data={registrations} color="var(--color-accent)" />
        </ChartCard>
      </div>

      {/* Catégories + Réservations */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <ChartCard title="Services par catégorie" sub={`${totalServices} annonces au total`}>
          <DonutChart data={categories} />
        </ChartCard>

        <ChartCard title="Réservations par statut" sub={`${totalBookings} réservations au total`}>
          <BarChartSVG
            data={bookingStats.map(b => ({
              label: b.status,
              value: b.count,
              color: BOOKING_COLORS[b.status] ?? '#6366f1',
            }))}
          />
        </ChartCard>
      </div>

    </div>
  );
};

export default AdminAnalytics;
