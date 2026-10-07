import React, { useEffect, useState, useCallback } from 'react';
import { Search, UserCheck, UserX, Trash2, Loader2, RefreshCw, Flag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import HScroll from '../../components/ui/HScroll';

interface UserRow {
  id:           string;
  full_name:    string | null;
  role:         string | null;
  location:     string | null;
  is_verified?: boolean | null;
  is_suspended?: boolean | null;
  updated_at:   string;
  avg_rating:   number | null;
}

interface ProStats { revenue: number; total: number; cancelled: number; }

// Seuils d'alerte précoce avant l'obligation légale de déclaration (2000€ ou 30 transactions/an)
const REVENUE_FLAG_THRESHOLD = 1500;
const BOOKINGS_FLAG_THRESHOLD = 30;

type FilterRole = 'all' | 'pro' | 'client';

const AdminUsers: React.FC = () => {
  const [users, setUsers]         = useState<UserRow[]>([]);
  const [proStats, setProStats]   = useState<Record<string, ProStats>>({});
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [actionId, setActionId]   = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('profiles')
      .select('*')
      .order('updated_at', { ascending: false });

    if (filterRole !== 'all') q = q.eq('role', filterRole);

    const [{ data, error }, { data: bookingsData, error: bookingsError }] = await Promise.all([
      q,
      supabase.from('bookings').select('pro_id, status, total_price'),
    ]);
    if (error) console.error('[AdminUsers] fetch error:', error);
    if (bookingsError) console.error('[AdminUsers] bookings fetch error:', bookingsError);

    const stats: Record<string, ProStats> = {};
    for (const b of (bookingsData ?? []) as { pro_id: string; status: string; total_price: number | null }[]) {
      if (!stats[b.pro_id]) stats[b.pro_id] = { revenue: 0, total: 0, cancelled: 0 };
      stats[b.pro_id].total++;
      if (b.status === 'completed') stats[b.pro_id].revenue += b.total_price ?? 0;
      if (b.status === 'cancelled') stats[b.pro_id].cancelled++;
    }
    setProStats(stats);

    setUsers(data ?? []);
    setLoading(false);
  }, [filterRole]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter(u => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(s) ||
      u.location?.toLowerCase().includes(s)
    );
  });

  const toggleSuspend = async (user: UserRow) => {
    setActionId(user.id);
    await supabase.from('profiles').update({ is_suspended: !user.is_suspended, suspended_at: !user.is_suspended ? new Date().toISOString() : null }).eq('id', user.id);
    await fetchUsers();
    setActionId(null);
  };

  const toggleVerify = async (user: UserRow) => {
    setActionId(user.id);
    await supabase.from('profiles').update({ is_verified: !user.is_verified }).eq('id', user.id);
    await fetchUsers();
    setActionId(null);
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Supprimer définitivement ce compte ? Cette action est irréversible.')) return;
    setActionId(id);
    await supabase.from('profiles').delete().eq('id', id);
    await fetchUsers();
    setActionId(null);
  };

  const roleBadge = (role: string | null) => {
    if (role === 'pro')    return <span className="bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Pro</span>;
    if (role === 'client') return <span className="bg-pink-500/10 text-pink-500 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Client</span>;
    return <span className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">—</span>;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-accent)] mb-1">Administration</p>
          <h1 className="text-4xl font-black uppercase tracking-tight text-[var(--color-text-main)]">Utilisateurs</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{users.length} comptes enregistrés</p>
        </div>
        <button onClick={fetchUsers} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-all cursor-pointer text-[10px] font-black uppercase tracking-widest">
          <RefreshCw size={13} /> Actualiser
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl px-4 py-2.5 flex-1 min-w-[240px]">
          <Search size={14} className="text-[var(--color-text-muted)] shrink-0" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, ville…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] flex-1"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'pro', 'client'] as FilterRole[]).map(r => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${
                filterRole === r
                  ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-md'
                  : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
              }`}
            >
              {r === 'all' ? 'Tous' : r === 'pro' ? 'Pros' : 'Clients'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-3xl overflow-hidden">
        <HScroll bg="var(--color-bg-secondary)">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {['Utilisateur', 'Rôle', 'Ville', 'Activité', 'Note', 'Inscription', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-4 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-16"><Loader2 className="animate-spin mx-auto text-[var(--color-accent)]" size={24} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-[var(--color-text-muted)] text-sm italic">Aucun utilisateur trouvé</td></tr>
              ) : filtered.map(user => (
                <tr key={user.id} className={`border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-primary)]/50 transition-colors ${user.is_suspended ? 'opacity-50' : ''}`}>

                  {/* Nom */}
                  <td className="px-5 py-4">
                    <p className="text-sm font-bold text-[var(--color-text-main)]">{user.full_name || '—'}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)] font-mono">{user.id.substring(0, 8)}…</p>
                  </td>

                  {/* Rôle */}
                  <td className="px-5 py-4">{roleBadge(user.role)}</td>

                  {/* Ville */}
                  <td className="px-5 py-4 text-sm text-[var(--color-text-muted)]">{user.location || '—'}</td>

                  {/* Activité (pros uniquement) — flag au-delà de 1500€ ou 30 RDV, repère pour anticiper l'obligation légale de déclaration */}
                  <td className="px-5 py-4">
                    {user.role === 'pro' ? (() => {
                      const stats = proStats[user.id] ?? { revenue: 0, total: 0, cancelled: 0 };
                      const flagged = stats.revenue >= REVENUE_FLAG_THRESHOLD || stats.total >= BOOKINGS_FLAG_THRESHOLD;
                      return (
                        <div>
                          <div className="flex items-center gap-1.5">
                            {flagged && <Flag size={11} className="text-amber-500 shrink-0" />}
                            <span className={`text-sm font-bold ${flagged ? 'text-amber-500' : 'text-[var(--color-text-main)]'}`}>
                              {stats.revenue.toFixed(0)}€
                            </span>
                          </div>
                          <p className="text-[10px] text-[var(--color-text-muted)]">
                            {stats.total} RDV{stats.cancelled > 0 && ` · ${stats.cancelled} annulé(s)`}
                          </p>
                        </div>
                      );
                    })() : <span className="text-[var(--color-text-muted)]">—</span>}
                  </td>

                  {/* Note */}
                  <td className="px-5 py-4">
                    {user.avg_rating ? (
                      <span className="text-sm font-black text-yellow-500">★ {user.avg_rating.toFixed(1)}</span>
                    ) : <span className="text-[var(--color-text-muted)]">—</span>}
                  </td>

                  {/* Inscription */}
                  <td className="px-5 py-4 text-[11px] text-[var(--color-text-muted)]">
                    {new Date(user.updated_at).toLocaleDateString('fr-FR')}
                  </td>

                  {/* Statut */}
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      {user.is_verified && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full w-fit">Vérifié</span>
                      )}
                      {user.is_suspended && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full w-fit">Suspendu</span>
                      )}
                      {!user.is_verified && !user.is_suspended && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded-full w-fit">Normal</span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    {actionId === user.id ? (
                      <Loader2 size={16} className="animate-spin text-[var(--color-accent)]" />
                    ) : (
                      <div className="flex items-center gap-2">
                        {user.role === 'pro' && (
                          <button
                            onClick={() => toggleVerify(user)}
                            title={user.is_verified ? 'Retirer la vérification' : 'Vérifier le pro'}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center border-none cursor-pointer transition-all ${
                              user.is_verified
                                ? 'bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white'
                                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:bg-green-500/10 hover:text-green-500'
                            }`}
                          >
                            <UserCheck size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => toggleSuspend(user)}
                          title={user.is_suspended ? 'Réactiver' : 'Suspendre'}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center border-none cursor-pointer transition-all ${
                            user.is_suspended
                              ? 'bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white'
                              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:bg-orange-500/10 hover:text-orange-500'
                          }`}
                        >
                          <UserX size={14} />
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          title="Supprimer définitivement"
                          className="w-8 h-8 rounded-xl bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:bg-red-500 hover:text-white flex items-center justify-center border-none cursor-pointer transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </HScroll>
      </div>
    </div>
  );
};

export default AdminUsers;
