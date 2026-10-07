import React, { useEffect, useState, useCallback } from 'react';
import HScroll from '../../components/ui/HScroll';
import { Search, CheckCircle, XCircle, Clock, RefreshCw, Loader2, ChevronRight, AlertTriangle, Eye, X, MapPin, Home, Store } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getCategoryColor } from '../../lib/categoryColors';

interface ServiceRow {
  id:                string;
  title:             string | null;
  category:          string | null;
  price:             number | null;
  location_type:     string | null;
  admin_status:      string;
  admin_note:        string | null;
  admin_reviewed_at: string | null;
  created_at:        string;
  user_id:           string;
  profiles:          { full_name: string | null } | null;
}

interface PreviewService extends ServiceRow {
  description:     string | null;
  cover_image_url: string | null;
}

type Tab = 'pending' | 'all';


const statusBadge = (status: string, createdAt: string) => {
  const isAutoApproved = status === 'pending' && new Date(createdAt) <= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const s = isAutoApproved ? 'auto_approved' : status;
  const map: Record<string, { label: string; cls: string }> = {
    pending:       { label: 'En attente',     cls: 'bg-orange-500/10 text-orange-400' },
    approved:      { label: 'Approuvée',      cls: 'bg-green-500/10 text-green-500'  },
    rejected:      { label: 'Rejetée',        cls: 'bg-red-500/10 text-red-400'      },
    auto_approved: { label: 'Auto-approuvée', cls: 'bg-blue-500/10 text-blue-400'    },
  };
  const { label, cls } = map[s] ?? map.pending;
  return <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
};

const AdminServices: React.FC = () => {
  const [services, setServices]     = useState<ServiceRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<Tab>('pending');
  const [search, setSearch]         = useState('');
  const [actionId, setActionId]     = useState<string | null>(null);
  const [rejectId, setRejectId]     = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [pendingCount, setPendingCount]   = useState(0);
  const [previewService, setPreviewService] = useState<PreviewService | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    let q = supabase
      .from('services')
      .select('id, title, category, price, location_type, admin_status, admin_note, admin_reviewed_at, created_at, user_id, profiles!services_user_id_fkey(full_name)')
      .order('created_at', { ascending: false });

    if (tab === 'pending') {
      q = q.eq('admin_status', 'pending').gt('created_at', thirtyDaysAgo);
    }

    const { data } = await q;
    setServices((data as unknown as ServiceRow[]) ?? []);

    // Count pending for badge
    const { count } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('admin_status', 'pending')
      .gt('created_at', thirtyDaysAgo);
    setPendingCount(count ?? 0);
    setLoading(false);
  }, [tab]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const openPreview = async (id: string) => {
    setPreviewLoading(true);
    setPreviewService(null);
    const { data } = await supabase
      .from('services')
      .select('id, title, category, price, location_type, admin_status, admin_note, admin_reviewed_at, created_at, user_id, description, cover_image_url, profiles!services_user_id_fkey(full_name)')
      .eq('id', id)
      .single();
    setPreviewService((data as unknown as PreviewService) ?? null);
    setPreviewLoading(false);
  };

  const approve = async (id: string) => {
    setActionId(id);
    await supabase.from('services').update({
      admin_status: 'approved',
      admin_reviewed_at: new Date().toISOString(),
    }).eq('id', id);
    await fetchServices();
    setActionId(null);
  };

  const reject = async () => {
    if (!rejectId) return;
    setActionId(rejectId);
    await supabase.from('services').update({
      admin_status: 'rejected',
      admin_reviewed_at: new Date().toISOString(),
      admin_note: rejectNote || 'Non conforme aux conditions d\'utilisation',
    }).eq('id', rejectId);
    setRejectId(null);
    setRejectNote('');
    await fetchServices();
    setActionId(null);
  };

  const filtered = services.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.title?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q) || s.profiles?.full_name?.toLowerCase().includes(q);
  });

  const daysUntilAutoApprove = (createdAt: string) => {
    const created = new Date(createdAt).getTime();
    const expiry  = created + 30 * 24 * 60 * 60 * 1000;
    const days    = Math.ceil((expiry - Date.now()) / (24 * 60 * 60 * 1000));
    return Math.max(0, days);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-accent)] mb-1">Administration</p>
          <h1 className="text-4xl font-black uppercase tracking-tight text-[var(--color-text-main)]">Annonces</h1>
        </div>
        <button onClick={fetchServices} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-all cursor-pointer text-[10px] font-black uppercase tracking-widest">
          <RefreshCw size={13} /> Actualiser
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('pending')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${
            tab === 'pending'
              ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-md'
              : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)]'
          }`}
        >
          <AlertTriangle size={13} />
          À vérifier
          {pendingCount > 0 && (
            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${tab === 'pending' ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}>
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('all')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${
            tab === 'all'
              ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-md'
              : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)]'
          }`}
        >
          Toutes les annonces
        </button>
      </div>

      {/* Info auto-approve */}
      {tab === 'pending' && (
        <div className="flex items-center gap-3 bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 mb-5">
          <Clock size={14} className="text-blue-400 shrink-0" />
          <p className="text-[11px] text-blue-300/80 italic">
            Les annonces sans action admin depuis <strong>30 jours</strong> sont automatiquement approuvées et disparaissent de cette liste.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl px-4 py-2.5 mb-5">
        <Search size={14} className="text-[var(--color-text-muted)] shrink-0" />
        <input
          type="text"
          placeholder="Rechercher par titre, catégorie, pro…"
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
                {['Annonce', 'Pro', 'Catégorie', 'Prix', 'Publié le', 'Statut', tab === 'pending' ? 'Expire dans' : '', 'Actions'].filter(Boolean).map(h => (
                  <th key={h} className="text-left px-5 py-4 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-16"><Loader2 className="animate-spin mx-auto text-[var(--color-accent)]" size={24} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-[var(--color-text-muted)] text-sm italic">
                    {tab === 'pending' ? '✅ Aucune annonce en attente de vérification' : 'Aucune annonce trouvée'}
                  </td>
                </tr>
              ) : filtered.map(service => {
                const catColor = getCategoryColor(service.category);
                const days = tab === 'pending' ? daysUntilAutoApprove(service.created_at) : null;
                return (
                  <tr key={service.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-primary)]/50 transition-colors">

                    {/* Titre */}
                    <td className="px-5 py-4 max-w-[200px]">
                      <p className="text-sm font-bold text-[var(--color-text-main)] truncate">{service.title || '(sans titre)'}</p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">{service.location_type === 'home' ? 'À domicile' : service.location_type === 'store' ? 'En boutique' : 'Les deux'}</p>
                    </td>

                    {/* Pro */}
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-[var(--color-text-main)]">{service.profiles?.full_name || '—'}</p>
                    </td>

                    {/* Catégorie */}
                    <td className="px-5 py-4">
                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: `${catColor}18`, color: catColor }}>
                        {service.category || '—'}
                      </span>
                    </td>

                    {/* Prix */}
                    <td className="px-5 py-4 text-sm font-black text-[var(--color-text-main)]">
                      {service.price != null ? `${service.price} €` : '—'}
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 text-[11px] text-[var(--color-text-muted)]">
                      {new Date(service.created_at).toLocaleDateString('fr-FR')}
                    </td>

                    {/* Statut */}
                    <td className="px-5 py-4">
                      {statusBadge(service.admin_status, service.created_at)}
                      {service.admin_note && (
                        <p className="text-[10px] text-red-400 mt-1 italic truncate max-w-[120px]" title={service.admin_note}>{service.admin_note}</p>
                      )}
                    </td>

                    {/* Expiration (tab pending only) */}
                    {tab === 'pending' && (
                      <td className="px-5 py-4">
                        <span className={`text-[10px] font-black ${days !== null && days <= 5 ? 'text-orange-400' : 'text-[var(--color-text-muted)]'}`}>
                          {days !== null ? `${days}j` : '—'}
                        </span>
                      </td>
                    )}

                    {/* Actions */}
                    <td className="px-5 py-4">
                      {actionId === service.id ? (
                        <Loader2 size={16} className="animate-spin text-[var(--color-accent)]" />
                      ) : tab === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openPreview(service.id)}
                            title="Voir l'annonce complète"
                            className="w-8 h-8 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white flex items-center justify-center border-none cursor-pointer transition-all"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => approve(service.id)}
                            title="Approuver"
                            className="w-8 h-8 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white flex items-center justify-center border-none cursor-pointer transition-all"
                          >
                            <CheckCircle size={14} />
                          </button>
                          <button
                            onClick={() => setRejectId(service.id)}
                            title="Rejeter"
                            className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center border-none cursor-pointer transition-all"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openPreview(service.id)}
                          title="Voir l'annonce complète"
                          className="w-8 h-8 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white flex items-center justify-center border-none cursor-pointer transition-all"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </HScroll>
      </div>

      {/* Modal prévisualisation annonce */}
      {(previewLoading || previewService) && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm overflow-y-auto flex items-start justify-center pt-20 xl:pt-28 pb-10 px-4">
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">

            {/* Header modal */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--color-border)]">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-accent)]">Aperçu de l'annonce</p>
              <button
                onClick={() => setPreviewService(null)}
                className="w-8 h-8 rounded-xl bg-[var(--color-bg-primary)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors border-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {previewLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-[var(--color-accent)]" />
              </div>
            ) : previewService && (
              <div>
                {/* Cover image */}
                {previewService.cover_image_url ? (
                  <div className="w-full h-56 overflow-hidden">
                    <img src={previewService.cover_image_url} alt="cover" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-32 flex items-center justify-center bg-[var(--color-bg-primary)]">
                    <p className="text-[var(--color-text-muted)] text-xs italic">Aucune photo de couverture</p>
                  </div>
                )}

                <div className="px-8 py-6 space-y-5">
                  {/* Titre + statut */}
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-2xl font-black text-[var(--color-text-main)] leading-tight">
                      {previewService.title || '(sans titre)'}
                    </h2>
                    {statusBadge(previewService.admin_status, previewService.created_at)}
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap gap-3">
                    {/* Catégorie */}
                    {previewService.category && (() => {
                      const c = getCategoryColor(previewService.category);
                      return (
                        <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full" style={{ background: `${c}18`, color: c }}>
                          {previewService.category}
                        </span>
                      );
                    })()}

                    {/* Lieu */}
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] bg-[var(--color-bg-primary)] px-3 py-1 rounded-full">
                      {previewService.location_type === 'home' && <><Home size={11} /> À domicile</>}
                      {previewService.location_type === 'store' && <><Store size={11} /> En boutique</>}
                      {previewService.location_type === 'both' && <><MapPin size={11} /> Les deux</>}
                      {!previewService.location_type && '—'}
                    </span>

                    {/* Prix */}
                    {previewService.price != null && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-main)] bg-[var(--color-accent-light)] px-3 py-1 rounded-full">
                        {previewService.price} €
                      </span>
                    )}
                  </div>

                  {/* Pro */}
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                    <span className="text-[9px] font-black uppercase tracking-widest">Pro :</span>
                    <span className="text-[var(--color-text-main)] font-bold">{previewService.profiles?.full_name || '—'}</span>
                  </div>

                  {/* Description */}
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Description</p>
                    <p className="text-sm text-[var(--color-text-main)] leading-relaxed whitespace-pre-wrap">
                      {previewService.description || <span className="italic text-[var(--color-text-muted)]">Aucune description</span>}
                    </p>
                  </div>

                  {/* Note de rejet si existante */}
                  {previewService.admin_note && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
                      <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-1">Note de rejet</p>
                      <p className="text-sm text-red-300/80 italic">{previewService.admin_note}</p>
                    </div>
                  )}

                  {/* Actions rapides (si pending) */}
                  {previewService.admin_status === 'pending' && (
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={async () => {
                          await approve(previewService.id);
                          setPreviewService(null);
                        }}
                        className="flex-1 py-3 rounded-2xl bg-green-500 hover:bg-green-600 text-white text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border-none shadow-lg flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={14} /> Approuver
                      </button>
                      <button
                        onClick={() => { setPreviewService(null); setRejectId(previewService.id); }}
                        className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border-none shadow-lg flex items-center justify-center gap-2"
                      >
                        <XCircle size={14} /> Rejeter
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal rejet */}
      {rejectId && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-20 xl:pt-28 pb-10 overflow-y-auto">
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black uppercase tracking-tight text-[var(--color-text-main)] mb-2">Rejeter l'annonce</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">Indiquez un motif (optionnel). Il sera visible par le pro.</p>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="Ex : Photos manquantes, description insuffisante, catégorie incorrecte…"
              rows={3}
              className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl px-4 py-3 text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)] transition-colors resize-none mb-5"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectId(null); setRejectNote(''); }}
                className="flex-1 py-3 rounded-2xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer bg-transparent"
              >
                Annuler
              </button>
              <button
                onClick={reject}
                className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border-none shadow-lg"
              >
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminServices;
