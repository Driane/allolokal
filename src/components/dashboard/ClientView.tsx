import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, MessageSquare, AlertCircle, Star, Heart, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DisputeModal from '../DisputeModal';
import ReviewModal from '../ReviewModal';
import { isWithinDisputeWindow } from '../../lib/disputes';

interface ClientBooking {
  id: string;
  booking_date: string;
  status: string;
  total_price?: number;
  services?: { title?: string; price?: number; category?: string };
  pro?: { id?: string; full_name?: string; avatar_url?: string; location?: string };
  reviews?: { id: string }[];
  pro_id: string;
  client_id: string;
  service_id: string;
  is_recurring?: boolean;
  recurrence_interval?: string | null;
}

interface ProFavorite {
  pro_id: string;
  profiles: {
    id?: string;
    full_name?: string;
    avatar_url?: string | null;
    location?: string | null;
    avg_rating?: number | null;
    review_count?: number | null;
  } | null;
}

// Interval labels resolved dynamically via t() at render time

const ClientView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [bookings,  setBookings]  = useState<ClientBooking[]>([]);
  const [favorites, setFavorites] = useState<ProFavorite[]>([]);
  const [loading, setLoading]     = useState(true);
  const [profile, setProfile]     = useState<{ full_name: string } | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [reviewBooking, setReviewBooking]         = useState<ClientBooking | null>(null);

  const fetchClientData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [profileRes, bookingsRes, favsRes] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', session.user.id).single(),
        supabase.from('bookings')
          .select(`*, services (title, price, category), pro:pro_id (full_name, avatar_url, location), reviews (id)`)
          .eq('client_id', session.user.id)
          .order('booking_date', { ascending: false }),
        supabase.from('favorites')
          .select('pro_id, profiles:pro_id (id, full_name, avatar_url, location, avg_rating, review_count)')
          .eq('client_id', session.user.id),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (bookingsRes.data) setBookings(bookingsRes.data);
      if (favsRes.data)     setFavorites(favsRes.data as unknown as ProFavorite[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClientData(); }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-10 h-10 border-4 border-[var(--color-accent-light)] border-t-[var(--color-accent)] rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--color-text-muted)]">{t('client.loading')}</p>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000 ease-out pt-10">

      {/* HEADER */}
      <div className="mb-16">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-[1px] w-8 bg-[var(--color-accent)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--color-accent)]">{t('client.badge')}</span>
          </div>
          <h1 className="text-5xl font-black text-[var(--color-text-main)] italic uppercase tracking-tight leading-[1.2]">
            {t('client.welcome')}, <span className="text-[var(--color-text-muted)]/40">{profile?.full_name?.split(' ')[0] || t('client.default_name')}</span>
          </h1>
        </div>
      </div>

      {/* MON ÉQUIPE — Favoris */}
      {favorites.length > 0 && (
        <div className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <Heart size={16} className="text-[var(--color-accent)] fill-[var(--color-accent)]" />
            <h2 className="text-xl font-black italic uppercase text-[var(--color-text-main)] tracking-tighter">
              {t('client.my_team', 'Mon Équipe')}
            </h2>
            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-2 py-1 rounded-lg">
              {favorites.length}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {favorites.map(fav => {
              const pro = fav.profiles;
              return (
                <Link key={fav.pro_id} to={`/profile/${fav.pro_id}`}
                  className="group flex flex-col items-center gap-3 p-5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[2rem] hover:border-[var(--color-accent)]/40 transition-all no-underline">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] overflow-hidden flex items-center justify-center text-[var(--color-text-muted)]">
                      {pro?.avatar_url
                        ? <img src={pro.avatar_url} className="w-full h-full object-cover" alt="" />
                        : <Users size={24} />}
                    </div>
                    {pro?.avg_rating && pro.avg_rating > 0 && (
                      <div className="absolute -bottom-2 -right-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] px-1.5 py-0.5 rounded-lg flex items-center gap-1 shadow">
                        <Star size={8} className="fill-yellow-500 text-yellow-500" />
                        <span className="text-[8px] font-black text-[var(--color-text-main)]">{Number(pro.avg_rating).toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-black uppercase tracking-tight text-[var(--color-text-main)] group-hover:text-[var(--color-accent)] transition-colors leading-tight">
                      {pro?.full_name}
                    </p>
                    {pro?.location && (
                      <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5 truncate max-w-[100px]">
                        {pro.location.split(',')[0]}
                      </p>
                    )}
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-accent)] bg-[var(--color-accent-light)] px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    {t('client.book_again', 'Réserver')}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* MES RÉSERVATIONS */}
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[3.5rem] p-6 md:p-10 backdrop-blur-sm">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          <h2 className="text-2xl font-black italic uppercase text-[var(--color-text-main)] tracking-tighter">{t('client.history_title')}</h2>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-text-muted)]">
            <p className="font-black uppercase text-[10px] tracking-widest italic">{t('client.no_bookings', 'Aucune réservation pour le moment')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const isPast    = new Date(booking.booking_date) < new Date();
              const canDispute = booking.status === 'confirmed' && isPast && isWithinDisputeWindow(booking.booking_date, booking.services?.category);
              const canReview  = booking.status === 'completed' && (!booking.reviews || booking.reviews.length === 0);

              return (
                <div key={booking.id}
                  className="relative flex flex-col lg:flex-row lg:items-center justify-between p-7 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-[2.5rem] hover:border-[var(--color-border-strong)] transition-all group overflow-hidden">

                  <div className="flex items-center gap-6 mb-6 lg:mb-0 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-secondary)] flex items-center justify-center text-[var(--color-text-main)] font-black border border-[var(--color-border)] overflow-hidden">
                      {booking.pro?.avatar_url
                        ? <img src={booking.pro.avatar_url} className="w-full h-full object-cover" alt="" />
                        : <span className="text-xl italic">{booking.pro?.full_name?.charAt(0)}</span>}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="text-[var(--color-text-main)] font-black text-xl italic uppercase leading-none tracking-tight group-hover:text-[var(--color-accent)] transition-colors">
                          {booking.services?.title}
                        </h4>
                        {booking.is_recurring && (
                          <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] border border-[var(--color-accent)]/20">
                            🔁 {booking.recurrence_interval
                              ? t(`booking.recurring_${booking.recurrence_interval}`, booking.recurrence_interval)
                              : t('booking.recurring_toggle', 'Récurrent')}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--color-text-muted)] font-bold italic">{booking.pro?.full_name}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 lg:gap-10 relative z-10">
                    <div className="flex flex-col gap-1">
                      <div className="text-[var(--color-text-main)] font-bold text-xs flex items-center gap-2 italic">
                        <Clock size={14} className="text-[var(--color-accent)]" />
                        {new Date(booking.booking_date).toLocaleDateString(i18n.language, { day: '2-digit', month: 'long' })}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-black text-[var(--color-text-main)] italic mr-2">{booking.total_price ?? booking.services?.price}€</div>

                      <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border flex items-center gap-2 ${
                        booking.status === 'completed' ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)] border-[var(--color-accent)]/20 italic' :
                        booking.status === 'disputed'  ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        booking.status === 'confirmed' ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20' :
                        'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] border-[var(--color-border)]'
                      }`}>
                        {t(`client.status.${booking.status}`)}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {canReview && (
                          <button onClick={() => setReviewBooking(booking)}
                            className="flex items-center gap-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border-none shadow-lg">
                            <Star size={14} className="fill-current" /> {t('client.actions.review', 'Noter')}
                          </button>
                        )}
                        {canDispute && (
                          <button onClick={() => setSelectedBookingId(booking.id)}
                            className="p-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all cursor-pointer">
                            <AlertCircle size={14} />
                          </button>
                        )}
                        {/* Messagerie uniquement si réservation non-annulée */}
                        {booking.status !== 'cancelled' && (
                          <button
                            onClick={() => navigate(`/messages?with=${booking.pro?.id}`)}
                            title={t('messages.contact_pro', 'Contacter le pro')}
                            className="w-11 h-11 rounded-xl bg-[var(--color-bg-secondary)] flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)] transition-all border border-[var(--color-border)] hover:border-[var(--color-accent)]/30 cursor-pointer">
                            <MessageSquare size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedBookingId && (
        <DisputeModal bookingId={selectedBookingId} onClose={() => setSelectedBookingId(null)} onSuccess={fetchClientData} reporterRole="client" />
      )}
      {reviewBooking && (
        <ReviewModal booking={reviewBooking} onClose={() => setReviewBooking(null)} onSuccess={fetchClientData} />
      )}
    </div>
  );
};

export default ClientView;
