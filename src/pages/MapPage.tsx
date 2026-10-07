import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Map as GoogleMap, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import MapsProvider from '../components/MapsProvider';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { Star, User, Loader2, MapPin } from 'lucide-react';
import { useIsNative } from '../hooks/useIsNative';
import { canLoadMap, trackMapLoad } from '../lib/mapsQuota';
import { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR as DEFAULT_COLOR, VALID_MAIN_CATEGORIES } from '../lib/categoryColors';

interface MapPro {
  id: string;
  full_name:    string | null;
  avatar_url:   string | null;
  location:     string | null;
  latitude:     number;
  longitude:    number;
  store_name:   string | null;
  avg_rating:   number | null;
  review_count: number | null;
  services:     { category: string }[];
}

const PinMarker = ({ color, letter }: { color: string; letter: string }) => (
  <div style={{ position: 'relative', width: 38, height: 46, cursor: 'pointer' }}>
    <div style={{
      position: 'absolute', top: 0, left: 1, width: 36, height: 36,
      background: color, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)',
      border: '3px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    }} />
    <span style={{
      position: 'absolute', top: 6, left: 1, width: 36, textAlign: 'center',
      fontSize: 13, fontWeight: 900, color: 'white', fontFamily: 'system-ui,sans-serif',
      lineHeight: '24px', pointerEvents: 'none', textShadow: '0 1px 3px rgba(0,0,0,0.3)',
    }}>{letter.toUpperCase()}</span>
  </div>
);

const MapPageContent: React.FC = () => {
  const { t } = useTranslation();
  const isNative = useIsNative();
  const nativeHeight = 'calc(100dvh - 56px - 64px - env(safe-area-inset-top) - env(safe-area-inset-bottom))';

  const [pros, setPros]                     = useState<MapPro[]>([]);
  const [loading, setLoading]               = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedProId, setSelectedProId]   = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded]   = useState(false);

  useEffect(() => {
    if (!canLoadMap()) { setQuotaExceeded(true); setLoading(false); return; }
    trackMapLoad();

    supabase
      .from('profiles')
      .select('id, full_name, avatar_url, location, latitude, longitude, store_name, avg_rating, review_count, services(category)')
      .eq('show_on_map', true)
      .eq('role', 'pro')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .then(({ data, error }) => {
        if (!error && data) setPros(data as MapPro[]);
        setLoading(false);
      });
  }, []);

  const presentCategories = useMemo(() => {
    const cats = new Set<string>();
    pros.forEach(p => p.services.forEach(s => {
      if (s.category && VALID_MAIN_CATEGORIES.includes(s.category)) cats.add(s.category);
    }));
    return Array.from(cats);
  }, [pros]);

  const filteredPros = useMemo(
    () => activeCategory
      ? pros.filter(p => p.services.some(s => s.category === activeCategory))
      : pros,
    [pros, activeCategory]
  );

  const selectedPro = useMemo(
    () => filteredPros.find(p => p.id === selectedProId) ?? null,
    [filteredPros, selectedProId]
  );

  const handleMarkerClick = useCallback((id: string) => {
    setSelectedProId(prev => prev === id ? null : id);
  }, []);

  if (loading) return (
    <div className={`flex items-center justify-center bg-[var(--color-bg-primary)] ${isNative ? '' : 'h-[calc(100dvh-6rem)]'}`}
      style={isNative ? { height: nativeHeight } : undefined}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={36} className="animate-spin text-[var(--color-accent)]" />
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
          {t('map.loading')}
        </p>
      </div>
    </div>
  );

  if (quotaExceeded) return (
    <div className={`flex items-center justify-center bg-[var(--color-bg-primary)] ${isNative ? '' : 'h-[calc(100dvh-6rem)]'}`}
      style={isNative ? { height: nativeHeight } : undefined}>
      <div className="text-center px-8">
        <MapPin size={40} className="mx-auto mb-4 text-[var(--color-text-muted)]" />
        <p className="font-black text-[var(--color-text-main)] mb-2">{t('map.quota_title', 'Carte indisponible')}</p>
        <p className="text-sm text-[var(--color-text-muted)]">{t('map.quota_desc', 'Limite d\'utilisation atteinte pour aujourd\'hui. Réessayez demain.')}</p>
      </div>
    </div>
  );

  return (
    <div className={`relative overflow-hidden ${isNative ? '' : 'h-[calc(100dvh-4rem)] xl:h-[calc(100dvh-6rem)]'}`}
      style={isNative ? { height: nativeHeight } : undefined}>

      {/* Filtre flottant */}
      <div className="absolute left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-2 pointer-events-none px-4 w-full max-w-2xl"
        style={{ top: isNative ? 'calc(1rem + env(safe-area-inset-top))' : '1rem' }}>
        <div className="bg-[var(--color-bg-secondary)]/90 backdrop-blur-xl border border-[var(--color-border)] rounded-[2rem] px-6 py-4 shadow-2xl pointer-events-auto w-full">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--color-accent)] text-center mb-3">
            {t('map.badge')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button onClick={() => setActiveCategory(null)}
              className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-none cursor-pointer transition-all ${
                !activeCategory ? 'bg-[var(--color-text-main)] text-[var(--color-bg-primary)]'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
              }`}>
              {t('map.filter_all')}
            </button>
            {presentCategories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className="px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-none cursor-pointer transition-all"
                style={{
                  backgroundColor: activeCategory === cat ? (CATEGORY_COLORS[cat] || DEFAULT_COLOR) : 'var(--color-bg-tertiary)',
                  color: activeCategory === cat ? 'white' : 'var(--color-text-muted)',
                }}>
                {t(`categories.main.${cat}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-[var(--color-bg-secondary)]/80 backdrop-blur-md border border-[var(--color-border)] rounded-full px-5 py-1.5 pointer-events-auto shadow-lg">
          <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
            {t('map.pros_visible', { count: filteredPros.length })}
          </span>
        </div>
      </div>

      {filteredPros.length === 0 && (
        <div className="absolute inset-0 flex items-end justify-center z-[900] pb-16 pointer-events-none">
          <div className="bg-[var(--color-bg-secondary)]/95 backdrop-blur-md border border-[var(--color-border)] rounded-3xl px-8 py-5 shadow-xl">
            <p className="text-sm font-black italic text-[var(--color-text-muted)]">{t('map.no_pros')}</p>
          </div>
        </div>
      )}

      {/* Carte Google Maps */}
      <GoogleMap
        mapId="DEMO_MAP_ID"
        defaultCenter={{ lat: 45.1, lng: 15.2 }}
        defaultZoom={7}
        style={{ height: '100%', width: '100%' }}
        disableDefaultUI={false}
        gestureHandling="greedy"
        onClick={() => setSelectedProId(null)}
      >
        {filteredPros.map(pro => {
          const mainCat = pro.services[0]?.category ?? '';
          const color   = CATEGORY_COLORS[mainCat] || DEFAULT_COLOR;
          const label   = pro.store_name || pro.full_name || '?';
          const uniqCats = [...new Set(
            pro.services.map(s => s.category).filter((c): c is string => !!c && VALID_MAIN_CATEGORIES.includes(c))
          )];

          return (
            <React.Fragment key={pro.id}>
              <AdvancedMarker
                position={{ lat: pro.latitude, lng: pro.longitude }}
                onClick={() => handleMarkerClick(pro.id)}
              >
                <PinMarker color={color} letter={label.charAt(0)} />
              </AdvancedMarker>

              {selectedProId === pro.id && (
                <InfoWindow
                  position={{ lat: pro.latitude, lng: pro.longitude }}
                  onCloseClick={() => setSelectedProId(null)}
                  pixelOffset={[0, -50]}
                >
                  <div style={{ padding: '6px 2px', fontFamily: 'system-ui, sans-serif', minWidth: 200, maxWidth: 260 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      {pro.avatar_url ? (
                        <img src={pro.avatar_url} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} alt="" />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <User size={18} style={{ color }} />
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 900, fontSize: 13, color: '#111', margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {label}
                        </p>
                        {pro.store_name && pro.full_name && (
                          <p style={{ fontSize: 10, color: '#888', margin: '2px 0 0' }}>{pro.full_name}</p>
                        )}
                      </div>
                    </div>

                    {pro.avg_rating ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                        <Star size={11} style={{ fill: '#f59e0b', color: '#f59e0b' }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>{Number(pro.avg_rating).toFixed(1)}</span>
                        {pro.review_count ? <span style={{ fontSize: 10, color: '#999' }}>({pro.review_count})</span> : null}
                      </div>
                    ) : null}

                    {uniqCats.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                        {uniqCats.map(cat => (
                          <span key={cat} style={{
                            fontSize: 8, fontWeight: 900, textTransform: 'uppercase',
                            padding: '2px 8px', borderRadius: 999,
                            background: `${CATEGORY_COLORS[cat] || DEFAULT_COLOR}20`,
                            color: CATEGORY_COLORS[cat] || DEFAULT_COLOR,
                          }}>
                            {t(`categories.main.${cat}`)}
                          </span>
                        ))}
                      </div>
                    )}

                    {pro.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                        <MapPin size={9} style={{ color: '#aaa', flexShrink: 0 }} />
                        <span style={{ fontSize: 9, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {pro.location.split(',').slice(0, 2).join(',')}
                        </span>
                      </div>
                    )}

                    <Link to={`/profile/${pro.id}`} style={{
                      display: 'block', width: '100%', textAlign: 'center',
                      fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em',
                      color: 'white', background: color,
                      padding: '8px 0', borderRadius: 12, textDecoration: 'none',
                    }}>
                      {t('map.view_profile')}
                    </Link>
                  </div>
                </InfoWindow>
              )}
            </React.Fragment>
          );
        })}
      </GoogleMap>
    </div>
  );
};

const MapPage: React.FC = () => (
  <MapsProvider><MapPageContent /></MapsProvider>
);

export default MapPage;
