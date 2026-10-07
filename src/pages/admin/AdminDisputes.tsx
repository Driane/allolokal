import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  AlertTriangle, RefreshCw, Loader2, CheckCircle, XCircle,
  Clock, User, Briefcase, MessageSquare, ChevronDown, ChevronUp,
} from 'lucide-react';

interface DisputedBooking {
  id:                   string;
  total_price:          number | null;
  booking_date:         string | null;
  dispute_reason:       string | null;
  disputed_at:          string | null;
  status:               string;
  dispute_resolution:   string | null;
  dispute_admin_note:   string | null;
  dispute_resolved_at:  string | null;
  client:               { full_name: string | null; avatar_url: string | null } | null;
  pro:                  { full_name: string | null; store_name: string | null } | null;
  service:              { title: string | null } | null;
}

const VERDICT: Record<string, { label: string; cls: string }> = {
  client_won: { label: 'Client remboursé', cls: 'bg-blue-500/10 text-blue-400'     },
  pro_won:    { label: 'Pro payé',          cls: 'bg-green-500/10 text-green-400'   },
  closed:     { label: 'Fermé sans action', cls: 'bg-gray-500/10 text-gray-400'     },
};

const AdminDisputes: React.FC = () => {
  const [disputes, setDisputes]     = useState<DisputedBooking[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<'open' | 'resolved'>('open');
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [notes, setNotes]           = useState<Record<string, string>>({});
  const [resolving, setResolving]   = useState<string | null>(null);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id, total_price, booking_date, dispute_reason, disputed_at, status,
        dispute_resolution, dispute_admin_note, dispute_resolved_at,
        client:client_id(full_name, avatar_url),
        pro:pro_id(full_name, store_name),
        service:service_id(title)
      `)
      .eq('status', 'disputed')
      .order('disputed_at', { ascending: false });

    // Also fetch resolved
    const { data: resolved } = await supabase
      .from('bookings')
      .select(`
        id, total_price, booking_date, dispute_reason, disputed_at, status,
        dispute_resolution, dispute_admin_note, dispute_resolved_at,
        client:client_id(full_name, avatar_url),
        pro:pro_id(full_name, store_name),
        service:service_id(title)
      `)
      .in('status', ['cancelled', 'completed'])
      .not('dispute_resolution', 'is', null)
      .order('dispute_resolved_at', { ascending: false })
      .limit(50);

    if (error) console.error(error);
    setDisputes([...(data ?? []), ...(resolved ?? [])] as unknown as DisputedBooking[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  const resolve = async (bookingId: string, verdict: 'client_won' | 'pro_won' | 'closed') => {
    const note = notes[bookingId]?.trim();
    if (!note) { alert('Veuillez rédiger une note de résolution.'); return; }

    setResolving(bookingId);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Statut final selon le verdict
      const newStatus = verdict === 'pro_won' ? 'completed' : 'cancelled';

      const { error } = await supabase
        .from('bookings')
        .update({
          status:               newStatus,
          dispute_resolution:   verdict,
          dispute_admin_note:   note,
          dispute_resolved_at:  new Date().toISOString(),
          dispute_resolved_by:  user?.id ?? null,
        })
        .eq('id', bookingId);

      if (error) throw error;

      // Notifier via Edge Function (non bloquant)
      supabase.functions.invoke('send-dispute-emails', {
        body: { booking_id: bookingId, verdict, admin_note: note }
      }).catch(console.error);

      setDisputes(prev => prev.map(d =>
        d.id === bookingId
          ? { ...d, status: newStatus, dispute_resolution: verdict, dispute_admin_note: note, dispute_resolved_at: new Date().toISOString() }
          : d
      ));
      setExpanded(null);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la résolution.');
    } finally {
      setResolving(null);
    }
  };

  const open     = disputes.filter(d => d.status === 'disputed');
  const resolved = disputes.filter(d => d.status !== 'disputed');
  const shown    = tab === 'open' ? open : resolved;

  const daysSince = (iso: string | null) => {
    if (!iso) return '—';
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return days === 0 ? "aujourd'hui" : `il y a ${days}j`;
  };

  // Approximation simple : jours ouvrés (lun-ven) écoulés depuis l'ouverture du litige.
  // Objectif interne de traitement = 5 jours ouvrés (cf. process décidé avec l'associée).
  const businessDaysSince = (iso: string | null) => {
    if (!iso) return 0;
    let count = 0;
    const start = new Date(iso);
    const cursor = new Date(start);
    while (cursor < new Date()) {
      cursor.setDate(cursor.getDate() + 1);
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) count++;
    }
    return count;
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-accent)] mb-1">Administration</p>
          <h1 className="text-4xl font-black uppercase tracking-tight text-[var(--color-text-main)] flex items-center gap-4">
            Litiges
            {open.length > 0 && (
              <span className="text-sm bg-red-500 text-white px-3 py-1 rounded-full font-black">
                {open.length} en cours
              </span>
            )}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Chaque litige suspend le paiement du pro jusqu'à décision.
          </p>
        </div>
        <button onClick={fetchDisputes}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-all cursor-pointer text-[10px] font-black uppercase tracking-widest">
          <RefreshCw size={13} /> Actualiser
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([['open', 'En cours', open.length], ['resolved', 'Résolus', resolved.length]] as const).map(([value, label, count]) => (
          <button key={value} onClick={() => setTab(value)}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border cursor-pointer transition-all ${
              tab === value
                ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)]/40'
            }`}>
            {label} {count > 0 && `(${count})`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--color-accent)]" />
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle size={40} className="text-emerald-500 mx-auto mb-4 opacity-40" />
          <p className="text-[var(--color-text-muted)] font-black uppercase tracking-widest text-[10px]">
            {tab === 'open' ? 'Aucun litige en cours' : 'Aucun litige résolu'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map(d => {
            const isOpen     = d.status === 'disputed';
            const isExpanded = expanded === d.id;
            const verdict    = d.dispute_resolution ? VERDICT[d.dispute_resolution] : null;

            return (
              <div key={d.id}
                className={`bg-[var(--color-bg-secondary)] border rounded-3xl overflow-hidden transition-all ${
                  isOpen ? 'border-red-500/30' : 'border-[var(--color-border)]'
                }`}>

                {/* Summary row */}
                <div className="px-7 py-5 flex items-center gap-6 cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : d.id)}>

                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isOpen ? 'bg-red-500/10' : 'bg-[var(--color-bg-tertiary)]'}`}>
                    <AlertTriangle size={18} className={isOpen ? 'text-red-500' : 'text-[var(--color-text-muted)]'} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className="font-black text-[var(--color-text-main)] text-sm truncate">
                        {d.service?.title ?? 'Service inconnu'}
                      </span>
                      {verdict && (
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${verdict.cls}`}>
                          {verdict.label}
                        </span>
                      )}
                      {isOpen && (
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                          En cours
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
                        <User size={11} /> {d.client?.full_name ?? '—'}
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
                        <Briefcase size={11} /> {d.pro?.store_name ?? d.pro?.full_name ?? '—'}
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
                        <Clock size={11} /> Signalé {daysSince(d.disputed_at)}
                      </span>
                      {isOpen && (
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          businessDaysSince(d.disputed_at) >= 5 ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {businessDaysSince(d.disputed_at) >= 5
                            ? 'Délai 5j ouvrés dépassé'
                            : `${5 - businessDaysSince(d.disputed_at)}j ouvrés restants`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xl font-black text-[var(--color-text-main)]">
                      {d.total_price != null ? `${d.total_price} €` : '—'}
                    </p>
                    <p className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-widest">En jeu</p>
                  </div>

                  {isExpanded ? <ChevronUp size={16} className="text-[var(--color-text-muted)] shrink-0" /> : <ChevronDown size={16} className="text-[var(--color-text-muted)] shrink-0" />}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-7 pb-7 border-t border-[var(--color-border)] pt-5 space-y-5">

                    {/* Raison du litige */}
                    <div className="bg-[var(--color-bg-primary)] border border-red-500/20 rounded-2xl p-5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-2 flex items-center gap-2">
                        <MessageSquare size={11} /> Motif du litige
                      </p>
                      <p className="text-sm text-[var(--color-text-main)] leading-relaxed italic">
                        "{d.dispute_reason ?? 'Aucun motif renseigné'}"
                      </p>
                      {d.booking_date && (
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-3">
                          Prestation du {new Date(d.booking_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                      )}
                    </div>

                    {isOpen ? (
                      /* ── Panel de résolution ── */
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
                            Note de décision <span className="text-red-400">*</span>
                            <span className="ml-2 normal-case font-normal">— visible par le client et le pro</span>
                          </label>
                          <textarea
                            value={notes[d.id] ?? ''}
                            onChange={e => setNotes(prev => ({ ...prev, [d.id]: e.target.value }))}
                            placeholder="Après examen des éléments fournis par les deux parties..."
                            rows={3}
                            className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl px-5 py-4 text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)] transition-colors resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <button
                            onClick={() => resolve(d.id, 'client_won')}
                            disabled={resolving === d.id}
                            className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 cursor-pointer transition-all disabled:opacity-50">
                            {resolving === d.id ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                            <span className="text-[9px] font-black uppercase tracking-widest text-center">
                              Rembourser le client
                            </span>
                            <span className="text-[8px] text-blue-300/70 text-center">Status → annulé</span>
                          </button>

                          <button
                            onClick={() => resolve(d.id, 'pro_won')}
                            disabled={resolving === d.id}
                            className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-green-500/30 bg-green-500/5 hover:bg-green-500/10 text-green-400 cursor-pointer transition-all disabled:opacity-50">
                            {resolving === d.id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                            <span className="text-[9px] font-black uppercase tracking-widest text-center">
                              Donner raison au pro
                            </span>
                            <span className="text-[8px] text-green-300/70 text-center">Status → terminé</span>
                          </button>

                          <button
                            onClick={() => resolve(d.id, 'closed')}
                            disabled={resolving === d.id}
                            className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] cursor-pointer transition-all disabled:opacity-50">
                            <XCircle size={18} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-center">
                              Fermer sans action
                            </span>
                            <span className="text-[8px] text-[var(--color-text-muted)]/70 text-center">Status → annulé</span>
                          </button>
                        </div>

                        <p className="text-[9px] text-[var(--color-text-muted)] italic">
                          ⚠️ "Rembourser le client" marque la réservation pour remboursement. Le virement Stripe devra être effectué manuellement depuis le dashboard Stripe jusqu'à l'activation du remboursement automatique.
                        </p>
                      </div>
                    ) : (
                      /* ── Résolution affichée ── */
                      <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl p-5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
                          Décision rendue le {d.dispute_resolved_at ? new Date(d.dispute_resolved_at).toLocaleDateString('fr-FR') : '—'}
                        </p>
                        <p className="text-sm text-[var(--color-text-main)] leading-relaxed">
                          {d.dispute_admin_note ?? 'Aucune note.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminDisputes;
