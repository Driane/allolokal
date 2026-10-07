import React, { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import HScroll from '../../components/ui/HScroll';

interface BookingRow {
  id:           string;
  status:       string | null;
  booking_date: string | null;
  booking_time: string | null;
  price:        number | null;
  created_at:   string;
  client_id:    string | null;
  pro_id:       string | null;
  service:      { title: string | null } | null;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'En attente',  cls: 'bg-orange-500/10 text-orange-400' },
  confirmed: { label: 'Confirmée',   cls: 'bg-blue-500/10 text-blue-400'    },
  completed: { label: 'Terminée',    cls: 'bg-green-500/10 text-green-500'  },
  cancelled: { label: 'Annulée',     cls: 'bg-red-500/10 text-red-400'      },
  disputed:  { label: 'En litige',   cls: 'bg-purple-500/10 text-purple-400'},
};

const AdminBookings: React.FC = () => {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('bookings')
      .select('id, status, booking_date, booking_time, price, created_at, client_id, pro_id, service:services(title)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (filterStatus !== 'all') q = q.eq('status', filterStatus);
    const { data, error } = await q;
    if (error) console.error('[AdminBookings] fetch error:', error);
    setBookings((data as unknown as BookingRow[]) ?? []);
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const filtered = bookings.filter(b => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      b.client_id?.toLowerCase().includes(s) ||
      b.pro_id?.toLowerCase().includes(s) ||
      b.service?.title?.toLowerCase().includes(s)
    );
  });

  const counts = Object.fromEntries(
    Object.keys(STATUS_MAP).map(st => [st, bookings.filter(b => b.status === st).length])
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-accent)] mb-1">Administration</p>
          <h1 className="text-4xl font-black uppercase tracking-tight text-[var(--color-text-main)]">Réservations</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{bookings.length} réservations chargées</p>
        </div>
        <button onClick={fetchBookings} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-all cursor-pointer text-[10px] font-black uppercase tracking-widest">
          <RefreshCw size={13} /> Actualiser
        </button>
      </div>

      {/* Status counters */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-6">
        {Object.entries(STATUS_MAP).map(([st, { label, cls }]) => (
          <button
            key={st}
            onClick={() => setFilterStatus(filterStatus === st ? 'all' : st)}
            className={`flex flex-col items-center p-4 rounded-2xl border cursor-pointer transition-all ${
              filterStatus === st ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent)]/40'
            }`}
          >
            <span className="text-2xl font-black text-[var(--color-text-main)] tabular-nums">{counts[st] ?? 0}</span>
            <span className={`text-[8px] font-black uppercase tracking-widest mt-1 px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl px-4 py-2.5 mb-5">
        <Search size={14} className="text-[var(--color-text-muted)] shrink-0" />
        <input
          type="text"
          placeholder="Rechercher par client, pro ou service…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] flex-1"
        />
      </div>

      {/* Table */}
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-3xl overflow-hidden">
        <HScroll bg="var(--color-bg-secondary)">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {['Service', 'Client', 'Pro', 'Date', 'Prix', 'Statut'].map(h => (
                  <th key={h} className="text-left px-5 py-4 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-16"><Loader2 className="animate-spin mx-auto text-[var(--color-accent)]" size={24} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-[var(--color-text-muted)] text-sm italic">Aucune réservation trouvée</td></tr>
              ) : filtered.map(b => {
                const { label, cls } = STATUS_MAP[b.status ?? ''] ?? { label: b.status, cls: '' };
                return (
                  <tr key={b.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-primary)]/50 transition-colors">
                    <td className="px-5 py-4 text-sm font-bold text-[var(--color-text-main)]">{b.service?.title || '—'}</td>
                    <td className="px-5 py-4 text-sm text-[var(--color-text-muted)] font-mono text-[10px]">{b.client_id?.substring(0, 8) || '—'}…</td>
                    <td className="px-5 py-4 text-sm text-[var(--color-text-muted)] font-mono text-[10px]">{b.pro_id?.substring(0, 8) || '—'}…</td>
                    <td className="px-5 py-4 text-[11px] text-[var(--color-text-muted)]">
                      {b.booking_date ? new Date(b.booking_date).toLocaleDateString('fr-FR') : '—'}
                      {b.booking_time ? ` · ${b.booking_time.substring(0, 5)}` : ''}
                    </td>
                    <td className="px-5 py-4 text-sm font-black text-[var(--color-text-main)]">
                      {b.price != null ? `${b.price} €` : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </HScroll>
      </div>
    </div>
  );
};

export default AdminBookings;
