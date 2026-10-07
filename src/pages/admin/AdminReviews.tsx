import React, { useEffect, useState, useCallback } from 'react';
import { Search, Trash2, RefreshCw, Loader2, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ReviewRow {
  id:          string;
  rating:      number;
  comment:     string | null;
  created_at:  string;
  client:      { full_name: string | null } | null;
  pro:         { full_name: string | null } | null;
}

const AdminReviews: React.FC = () => {
  const [reviews, setReviews]   = useState<ReviewRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at, client:profiles!reviews_client_id_fkey(full_name), pro:profiles!reviews_pro_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(300);
    setReviews((data as unknown as ReviewRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const deleteReview = async (id: string) => {
    if (!confirm('Supprimer cet avis définitivement ?')) return;
    setActionId(id);
    await supabase.from('reviews').delete().eq('id', id);
    await fetchReviews();
    setActionId(null);
  };

  const filtered = reviews.filter(r => {
    if (filterRating !== null && r.rating !== filterRating) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.comment?.toLowerCase().includes(s) ||
      r.client?.full_name?.toLowerCase().includes(s) ||
      r.pro?.full_name?.toLowerCase().includes(s)
    );
  });

  const avgRating = reviews.length
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(2)
    : '—';

  const starDist = [5, 4, 3, 2, 1].map(n => ({
    star: n,
    count: reviews.filter(r => r.rating === n).length,
    pct:   reviews.length ? Math.round((reviews.filter(r => r.rating === n).length / reviews.length) * 100) : 0,
  }));

  return (
    <div className="p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-accent)] mb-1">Administration</p>
          <h1 className="text-4xl font-black uppercase tracking-tight text-[var(--color-text-main)]">Avis clients</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{reviews.length} avis · moyenne {avgRating} / 5</p>
        </div>
        <button onClick={fetchReviews} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-all cursor-pointer text-[10px] font-black uppercase tracking-widest">
          <RefreshCw size={13} /> Actualiser
        </button>
      </div>

      {/* Distribution */}
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-3xl p-6 mb-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-4">Distribution des notes</p>
        <div className="space-y-2">
          {starDist.map(({ star, count, pct }) => (
            <button
              key={star}
              onClick={() => setFilterRating(filterRating === star ? null : star)}
              className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer border-none text-left ${filterRating === star ? 'bg-[var(--color-accent)]/10' : 'bg-transparent hover:bg-[var(--color-bg-primary)]'}`}
            >
              <div className="flex items-center gap-0.5 w-20 shrink-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={10} className={i < star ? 'text-yellow-400 fill-yellow-400' : 'text-[var(--color-border)]'} />
                ))}
              </div>
              <div className="flex-1 h-2 bg-[var(--color-bg-primary)] rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[10px] font-black text-[var(--color-text-muted)] w-16 text-right tabular-nums">{count} avis</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl px-4 py-2.5 mb-5">
        <Search size={14} className="text-[var(--color-text-muted)] shrink-0" />
        <input
          type="text"
          placeholder="Rechercher dans les commentaires, par client ou pro…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] flex-1"
        />
        {filterRating !== null && (
          <button onClick={() => setFilterRating(null)} className="text-[9px] font-black uppercase tracking-widest text-[var(--color-accent)] border-none bg-transparent cursor-pointer shrink-0">
            Effacer filtre
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[var(--color-accent)]" size={24} /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-16 text-[var(--color-text-muted)] text-sm italic">Aucun avis trouvé</p>
        ) : filtered.map(review => (
          <div key={review.id} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-5 flex items-start gap-4 hover:border-[var(--color-accent)]/30 transition-all">

            {/* Note */}
            <div className="flex flex-col items-center gap-1 shrink-0 w-12">
              <span className="text-2xl font-black text-yellow-400">{review.rating}</span>
              <div className="flex flex-col gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`w-1.5 h-1 rounded-full ${i < review.rating ? 'bg-yellow-400' : 'bg-[var(--color-border)]'}`} />
                ))}
              </div>
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-black text-[var(--color-text-main)]">{review.client?.full_name || 'Anonyme'}</span>
                <span className="text-[var(--color-text-muted)] text-[10px]">→</span>
                <span className="text-[10px] font-black text-[var(--color-accent)]">{review.pro?.full_name || '—'}</span>
                <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">
                  {new Date(review.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-muted)] italic leading-relaxed">
                {review.comment || <span className="opacity-50">Aucun commentaire</span>}
              </p>
            </div>

            {/* Supprimer */}
            <div className="shrink-0">
              {actionId === review.id ? (
                <Loader2 size={16} className="animate-spin text-[var(--color-accent)]" />
              ) : (
                <button
                  onClick={() => deleteReview(review.id)}
                  className="w-8 h-8 rounded-xl bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:bg-red-500 hover:text-white flex items-center justify-center border-none cursor-pointer transition-all"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminReviews;
