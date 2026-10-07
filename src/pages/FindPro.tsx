import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { m, AnimatePresence, type Variants } from 'framer-motion';
import {
  Star, Search, MapPin, ShieldCheck, ChevronRight, SlidersHorizontal,
  ArrowRight, ArrowLeft, Languages, Sparkles, ChevronDown, ChevronUp,
  TrendingUp, Clock, Home, Store, X, Navigation, Loader2, Map as MapIcon, List
} from 'lucide-react';
import { Map as GoogleMap, AdvancedMarker, InfoWindow, useMapsLibrary } from '@vis.gl/react-google-maps';
import { canLoadMap, trackMapLoad, canUsePlaces, trackPlacesRequest } from '../lib/mapsQuota';
import MapsProvider from '../components/MapsProvider';
import ErrorBoundary from '../components/ErrorBoundary';
import { getCategoryColor, translateCategorySlug } from '../lib/categoryColors';
import AdvisorCTA from '../components/AdvisorCTA';
import SEO from '../components/SEO';
import { useModalBackButton } from '../hooks/useModalBackButton';
import { useIsAnyModalOpen } from '../lib/backButtonStack';
import { useIsNative } from '../hooks/useIsNative';

// ── Constants ──────────────────────────────────────────────────────────────────
const AVAILABLE_LANGUAGES = [
  { code: 'fr', flag: '🇫🇷' }, { code: 'en', flag: '🇬🇧' }, { code: 'hr', flag: '🇭🇷' },
  { code: 'de', flag: '🇩🇪' }, { code: 'es', flag: '🇪🇸' }, { code: 'it', flag: '🇮🇹' },
  { code: 'pt', flag: '🇵🇹' }, { code: 'nl', flag: '🇳🇱' }, { code: 'ru', flag: '🇷🇺' },
  { code: 'zh', flag: '🇨🇳' }, { code: 'ja', flag: '🇯🇵' }, { code: 'ar', flag: '🇸🇦' },
  { code: 'tr', flag: '🇹🇷' }, { code: 'pl', flag: '🇵🇱' }, { code: 'sv', flag: '🇸🇪' },
];
const DEFAULT_VISIBLE_LANGUAGES = 4;


// Insérer une AdvisorCTA toutes les N cards pro
const ADVISOR_EVERY = 3;

interface ProProfile {
  id: string;
  full_name?: string;
  store_name?: string | null;
  avatar_url?: string;
  location?: string;
  bio?: string | null;
  languages?: string[];
  avg_rating?: number;
  review_count?: number;
  latitude?: number | null;
  longitude?: number | null;
  show_on_map?: boolean | null;
}

interface AvailabilitySlotRow { day_of_week: number; slot_start: string; slot_end: string; }
interface PortfolioThumb { id: string; url: string; }

interface Service {
  id: string;
  title?: string;
  title_en?: string | null;
  title_de?: string | null;
  description?: string;
  description_en?: string | null;
  description_de?: string | null;
  original_lang?: string;
  price?: number;
  price_unit?: string;
  category?: string;
  subcategory?: string;
  sub_subcategory?: string;
  allow_home?: boolean;
  allow_store?: boolean;
  is_active?: boolean;
  created_at?: string;
  cover_image_url?: string | null;
  profiles?: ProProfile;
}

interface HintRow { category: string; subcategory: string; }


const groupServicesByPro = (services: Service[]) => {
  const map = new Map<string, { profile: ProProfile; services: Service[] }>();
  for (const service of services) {
    const proId = service.profiles?.id;
    if (!proId) continue;
    if (!map.has(proId)) map.set(proId, { profile: service.profiles as ProProfile, services: [] });
    map.get(proId)!.services.push(service);
  }
  return Array.from(map.values());
};

const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

type LocationFilter = 'all' | 'home' | 'store';
interface PlaceSuggestion { main: string; secondary: string; placeId: string; fullText: string; }
type CategoryHints = Record<string, { userTop: string[]; globalTop: string | null }>;

// ── Component ──────────────────────────────────────────────────────────────────
const FindProContent: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // Retourne le titre/description dans la langue active, avec fallback HR + drapeau
  const localizedField = (
    service: Service,
    field: 'title' | 'description'
  ): { text: string; showFlag: boolean } => {
    const lang = i18n.language;
    if (field === 'title') {
      if (lang === 'en' && service.title_en) return { text: service.title_en, showFlag: false };
      if (lang === 'de' && service.title_de) return { text: service.title_de, showFlag: false };
      return { text: service.title ?? '', showFlag: lang !== 'hr' && !!service.title };
    }
    if (lang === 'en' && service.description_en) return { text: service.description_en, showFlag: false };
    if (lang === 'de' && service.description_de) return { text: service.description_de, showFlag: false };
    return { text: service.description ?? '', showFlag: lang !== 'hr' && !!service.description };
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCategory = searchParams.get('category');
  const urlSub      = searchParams.get('sub');
  const urlItem     = searchParams.get('item');

  const [allServices, setAllServices]         = useState<Service[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [loadingMore, setLoadingMore]         = useState(false);
  const [hasMore, setHasMore]                 = useState(false);
  const loadOffsetRef                         = useRef(0);
  const mapContainerRef                       = useRef<HTMLDivElement>(null);
  const locationDebounceRef                   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationSessionRef                    = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const locationGeocoderRef                   = useRef<google.maps.Geocoder | null>(null);
  const PAGE_SIZE                             = 30;
  const [searchQuery, setSearchQuery]         = useState('');
  const [locationQuery, setLocationQuery]     = useState(() => searchParams.get('city') ?? '');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [showAllLanguages, setShowAllLanguages]   = useState(false);
  const [locationFilter, setLocationFilter]   = useState<LocationFilter>('all');
  const [minPrice, setMinPrice]               = useState(0);
  const [maxPrice, setMaxPrice]               = useState(200);
  const [absoluteMaxPrice, setAbsoluteMaxPrice] = useState(200);
  const [sortBy, setSortBy]                   = useState('Recommended');
  const [targetCoords, setTargetCoords]       = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius]                   = useState(20);
  const [geoLoading, setGeoLoading]           = useState(false);
  const [userFavorites, setUserFavorites]     = useState<string[]>([]);
  const [currentUserId, setCurrentUserId]     = useState<string | null>(null);
  const [hoveredCat, setHoveredCat]           = useState<string | null>(null);
  const [categoryHints, setCategoryHints]     = useState<CategoryHints>({});
  // Description étendue par offre
  const [expandedDesc, setExpandedDesc]       = useState<Set<string>>(new Set());
  const [filtersOpen,  setFiltersOpen]        = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [targetCoordsLabel, setTargetCoordsLabel]      = useState('');
  const placesLib = useMapsLibrary('places');
  useModalBackButton(filtersOpen, () => setFiltersOpen(false));
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [viewMode, setViewMode]               = useState<'split' | 'map'>('split');
  const anyModalOpen = useIsAnyModalOpen();
  const isNative = useIsNative();
  const [nextAvailableByPro, setNextAvailableByPro] = useState<Record<string, string | null>>({});
  // Filtre plage horaire — jour + créneau horaire recherché
  const [timeFilterDate, setTimeFilterDate]   = useState('');
  const [timeFilterStart, setTimeFilterStart] = useState('');
  const [timeFilterEnd, setTimeFilterEnd]     = useState('');
  const [timeFilterProIds, setTimeFilterProIds] = useState<string[] | null>(null);
  const [geoSortError, setGeoSortError]         = useState(false);
  // Panneau "Je veux en savoir plus" sous chaque profil (façon Treatwell)
  const [expandedProInfo, setExpandedProInfo] = useState<Set<string>>(new Set());
  const [proExtraInfo, setProExtraInfo] = useState<Record<string, { slots: AvailabilitySlotRow[]; photos: PortfolioThumb[] } | 'loading'>>({});

  const [selectedMapProId, setSelectedMapProId] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const categoryStructure: Record<string, Record<string, string[]>> = useMemo(() => ({
    beauty:   { nails: ['manicure','pedicure','gel_acrylic','nail_art'], waxing: ['wax','thread','laser','pulsed_light'], hairdressing: ['cut','coloring','brushing','extensions'], makeup: ['events_weddings','lessons','eyelashes','microblading'], face_care: ['facial_treatments'] },
    home:     { plumbing: ['leak_repair','unclogging','sanitary'], electricity: ['small_jobs','outlets_cabling','home_automation'], painting_coatings: ['interior','exterior','parquet','tiling'], assembly_installation: ['furniture','tv_home_cinema','ac','locksmith'], gardening: ['mowing','hedge_trimming','pruning','planting'], pool_spa: ['maintenance','water_treatment','winterizing'] },
    cleaning: { housekeeping: ['regular','deep_cleaning','move_out','windows','sofas_carpets'], ironing_laundry: ['ironing','folding_storage'], vehicles: ['car_wash','interior_car','polishing','boat'], disinfection: ['deep_clean','pest_control'] },
    wellbeing:{ massage: ['relaxing_swedish','sports','thai','californian','hot_stones','prenatal'], sport_coaching: ['fitness_coach','yoga','pilates','martial_arts'], paramedical_care: ['physiotherapy','osteopathy','nurse','sophrology','nutritionist'] },
    family:   { children: ['babysitter','regular_care','tutoring','private_lessons'], seniors: ['home_help','accompaniment','daily_care'], pets: ['pet_sitter','walking','grooming','training'] },
    premium:  { cooking_meals: ['private_chef','meal_prep','cooking_lessons','sommelier'], transport: ['private_driver','airport_transfer','rental_with_driver'], events: ['photographer','videographer','private_dj','organization','decoration','flowers'], lifestyle: ['personal_shopper','private_concierge'] },
  }), []);

  const activeColor = getCategoryColor(urlCategory);
  const moreFiltersCount =
    (searchQuery !== '' ? 1 : 0) +
    (urlCategory ? 1 : 0) +
    (locationFilter !== 'all' ? 1 : 0) +
    selectedLanguages.length +
    (minPrice > 0 || maxPrice < absoluteMaxPrice ? 1 : 0);
  const visibleLanguages = showAllLanguages ? AVAILABLE_LANGUAGES : AVAILABLE_LANGUAGES.slice(0, DEFAULT_VISIBLE_LANGUAGES);
  const hiddenSelectedCount = selectedLanguages.filter(c => !AVAILABLE_LANGUAGES.slice(0, DEFAULT_VISIBLE_LANGUAGES).map(l => l.code).includes(c)).length;
  const groupedPros = useMemo(() => {
    let grouped = groupServicesByPro(allServices);
    if (timeFilterProIds) {
      const allowed = new Set(timeFilterProIds);
      grouped = grouped.filter(g => g.profile?.id && allowed.has(g.profile.id));
    }
    // Favoris en tête (décorrélé de fetchServices pour éviter un re-fetch à chaque toggle)
    grouped = [...grouped].sort((a, b) => {
      const aF = userFavorites.includes(a.profile?.id ?? '') ? 1 : 0;
      const bF = userFavorites.includes(b.profile?.id ?? '') ? 1 : 0;
      return bF - aF;
    });
    if (sortBy === 'Availability') {
      return [...grouped].sort((a, b) => {
        const da = nextAvailableByPro[a.profile?.id ?? ''];
        const db = nextAvailableByPro[b.profile?.id ?? ''];
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da < db ? -1 : da > db ? 1 : 0;
      });
    }
    if (sortBy === 'Distance' && targetCoords) {
      return [...grouped].sort((a, b) => {
        const da = a.profile?.latitude != null && a.profile?.longitude != null
          ? haversineKm(targetCoords.lat, targetCoords.lng, a.profile.latitude, a.profile.longitude)
          : Infinity;
        const db = b.profile?.latitude != null && b.profile?.longitude != null
          ? haversineKm(targetCoords.lat, targetCoords.lng, b.profile.latitude, b.profile.longitude)
          : Infinity;
        return da - db;
      });
    }
    return grouped;
  }, [allServices, sortBy, nextAvailableByPro, timeFilterProIds, userFavorites, targetCoords]);


  // Distance haversine par pro — calculée uniquement quand sortBy === 'Distance'
  const distanceByProId = useMemo<Record<string, number>>(() => {
    if (!targetCoords || sortBy !== 'Distance') return {};
    return Object.fromEntries(
      groupedPros
        .filter(({ profile }) => profile?.id && profile.latitude != null && profile.longitude != null)
        .map(({ profile }) => [
          profile.id,
          haversineKm(targetCoords.lat, targetCoords.lng, profile.latitude!, profile.longitude!),
        ])
    );
  }, [targetCoords, sortBy, groupedPros]);

  // Récupère "prochaine date dispo" groupé par pro, uniquement quand le tri par disponibilité est actif
  const proIdsKey = useMemo(() => groupedPros.map(g => g.profile?.id).filter(Boolean).join(','), [groupedPros]);
  useEffect(() => {
    if (sortBy !== 'Availability' || !proIdsKey) return;
    const ids = proIdsKey.split(',');
    const missing = ids.filter(id => !(id in nextAvailableByPro));
    if (missing.length === 0) return;
    supabase.rpc('get_next_available_dates', { p_pro_ids: missing }).then(({ data, error }) => {
      if (error) { console.error(error); return; }
      setNextAvailableByPro(prev => {
        const next = { ...prev };
        for (const row of (data ?? []) as { pro_id: string; next_available_date: string | null }[]) {
          next[row.pro_id] = row.next_available_date;
        }
        return next;
      });
    });
  }, [sortBy, proIdsKey, nextAvailableByPro]);

  // Filtre plage horaire — recharge la liste des pros éligibles quand la plage change
  useEffect(() => {
    if (!timeFilterDate) { setTimeFilterProIds(null); return; }
    supabase.rpc('get_available_pro_ids_in_range', {
      p_date_from: timeFilterDate,
      p_date_to: timeFilterDate,
      p_time_start: timeFilterStart || null,
      p_time_end: timeFilterEnd || null,
    }).then(({ data, error }) => {
      if (error) { console.error(error); setTimeFilterProIds(null); return; }
      setTimeFilterProIds((data ?? []).map((r: { pro_id: string }) => r.pro_id));
    });
  }, [timeFilterDate, timeFilterStart, timeFilterEnd]);

  // Suggestions de recherche : catégories + sous-catégories + items traduits
  type Suggestion = { label: string; sub?: string; params: Record<string, string>; color: string };
  const allSuggestions = useMemo((): Suggestion[] => {
    const list: Suggestion[] = [];
    for (const [cat, subs] of Object.entries(categoryStructure)) {
      const color = getCategoryColor(cat);
      list.push({ label: t(`categories.main.${cat}`, cat), color, params: { category: cat } });
      for (const [sub, items] of Object.entries(subs)) {
        list.push({ label: t(`categories.sub.${sub}`, sub), sub: t(`categories.main.${cat}`, cat), color, params: { category: cat, sub } });
        for (const item of items) {
          list.push({ label: t(`categories.items.${item}`, item), sub: t(`categories.sub.${sub}`, sub), color, params: { category: cat, sub, item } });
        }
      }
    }
    return list;
  }, [categoryStructure, t]);

  const searchSuggestions = useMemo((): Suggestion[] => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 3) return [];
    return allSuggestions.filter(s => s.label.toLowerCase().includes(q)).slice(0, 7);
  }, [searchQuery, allSuggestions]);

  const fetchCategoryHints = useCallback(async (userId: string | null) => {
    try {
      const { data: globalData } = await supabase.rpc('get_global_top_subcategories');
      let userData: HintRow[] = [];
      if (userId) { const { data } = await supabase.rpc('get_user_top_subcategories', { p_user_id: userId }); userData = (data as HintRow[]) || []; }
      const hints: CategoryHints = {};
      for (const cat of Object.keys(categoryStructure)) {
        const userTop = userData.filter(r => r.category === cat).map(r => r.subcategory).slice(0, 2);
        const globalTop = ((globalData || []) as HintRow[]).filter(r => r.category === cat && !userTop.includes(r.subcategory)).map(r => r.subcategory)[0] ?? null;
        hints[cat] = { userTop, globalTop };
      }
      setCategoryHints(hints);
    } catch (err) { console.error(err); }
  }, [categoryStructure]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
      if (uid) {
        setCurrentUserId(uid);
        const { data: favs } = await supabase.from('favorites').select('pro_id').eq('client_id', uid);
        if (favs) setUserFavorites(favs.map(f => f.pro_id));
      }
      const { data } = await supabase.from('services').select('price').eq('is_active', true).order('price', { ascending: false }).limit(1);
      if (data?.length) { setAbsoluteMaxPrice(data[0].price); setMaxPrice(data[0].price); }
      await fetchCategoryHints(uid);
    };
    init();
  }, [fetchCategoryHints]);

  const toggleLanguage = (code: string) =>
    setSelectedLanguages(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);

  const handleToggleFavorite = async (e: React.MouseEvent, proId: string) => {
    e.stopPropagation();
    if (!currentUserId) { alert(t('auth.login_required', 'Connectez-vous pour ajouter des favoris')); return; }
    const isFav = userFavorites.includes(proId);
    if (isFav) {
      const { error } = await supabase.from('favorites').delete().eq('client_id', currentUserId).eq('pro_id', proId);
      if (!error) setUserFavorites(prev => prev.filter(id => id !== proId));
    } else {
      const { error } = await supabase.from('favorites').insert({ client_id: currentUserId, pro_id: proId });
      if (!error) setUserFavorites(prev => [...prev, proId]);
    }
  };

  const fetchServices = useCallback(async (isLoadMore = false) => {
    if (!isLoadMore) {
      setLoading(true); setAllServices([]); setHasMore(false);
      loadOffsetRef.current = 0;
    } else {
      setLoadingMore(true);
    }
    const offset = loadOffsetRef.current;

    const earlyEmpty = () => {
      if (!isLoadMore) { setAllServices([]); setHasMore(false); setLoading(false); }
      else { setLoadingMore(false); }
    };

    try {
      let rawData: Service[];

      if (targetCoords) {
        const { data: rpcData, error } = await supabase
          .rpc('get_services_with_distance', {
            user_lat: targetCoords.lat, user_lng: targetCoords.lng, radius_km: radius,
            search_query: searchQuery, selected_category: urlCategory,
            selected_subcategory: urlSub ?? (urlItem && !urlSub ? urlItem : null),
            selected_sub_subcategory: urlSub && urlItem ? urlItem : null,
            max_price: maxPrice, min_price: minPrice,
          })
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw error;
        type RpcRow = Service & ProProfile & { user_id: string };
        rawData = (rpcData as RpcRow[])?.map(item => ({
          ...item,
          profiles: { id: item.user_id, full_name: item.full_name, avatar_url: item.avatar_url, location: item.location, bio: item.bio, languages: item.languages, avg_rating: item.avg_rating, review_count: item.review_count, latitude: item.latitude, longitude: item.longitude }
        })) ?? [];
      } else {
        // Construire la liste de proIds (lieu + langues) côté serveur
        let proIds: string[] | null = null;

        if (locationQuery.trim()) {
          const locQ = locationQuery.trim().replace(/[%_]/g, '');
          const { data: locProfiles } = await supabase.from('profiles').select('id').ilike('location', `%${locQ}%`);
          proIds = (locProfiles ?? []).map((p: { id: string }) => p.id);
          if (proIds.length === 0) { earlyEmpty(); return; }
        }

        if (selectedLanguages.length > 0) {
          const { data: langProfiles } = await supabase.from('profiles').select('id').contains('languages', selectedLanguages);
          const langIds = (langProfiles ?? []).map((p: { id: string }) => p.id);
          if (langIds.length === 0) { earlyEmpty(); return; }
          proIds = proIds ? proIds.filter(id => langIds.includes(id)) : langIds;
          if (proIds.length === 0) { earlyEmpty(); return; }
        }

        let query = supabase
          .from('services')
          .select(`*, profiles:user_id (id, full_name, avatar_url, location, bio, languages, avg_rating, review_count, latitude, longitude, store_name, show_on_map)`)
          .eq('is_active', true);
        if (proIds)            query = query.in('user_id', proIds);
        if (searchQuery.trim()) {
          const sq = searchQuery.trim().replace(/[%_]/g, '');
          query = query.or(`title.ilike.%${sq}%,description.ilike.%${sq}%,title_en.ilike.%${sq}%,title_de.ilike.%${sq}%,description_en.ilike.%${sq}%,description_de.ilike.%${sq}%`);
        }
        if (urlCategory) query = query.eq('category', urlCategory);
        if (urlSub)      query = query.eq('subcategory', urlSub);
        if (urlItem)     query = query.eq('sub_subcategory', urlItem);
        query = query.gte('price', minPrice).lte('price', maxPrice);
        if (locationFilter === 'home')  query = query.eq('allow_home', true);
        if (locationFilter === 'store') query = query.eq('allow_store', true);
        // Tri serveur
        if (sortBy === 'PriceLowHigh') query = query.order('price', { ascending: true });
        else                           query = query.order('created_at', { ascending: false });
        query = query.range(offset, offset + PAGE_SIZE - 1);

        const { data: standardData, error } = await query;
        if (error) throw error;
        rawData = standardData ?? [];
      }

      const hasMoreData = rawData.length === PAGE_SIZE;
      setHasMore(hasMoreData);
      loadOffsetRef.current = offset + rawData.length;

      if (!isLoadMore) {
        setAllServices(rawData);
      } else {
        setAllServices(prev => {
          const seen = new Set(prev.map(s => s.id));
          return [...prev, ...rawData.filter(s => !seen.has(s.id))];
        });
      }
    } catch (err) { console.error(err); }
    finally {
      if (!isLoadMore) setLoading(false);
      else setLoadingMore(false);
    }
  }, [urlCategory, urlSub, urlItem, minPrice, maxPrice, sortBy, searchQuery, locationQuery, targetCoords, radius, selectedLanguages, locationFilter]);

  useEffect(() => {
    loadOffsetRef.current = 0;
    const t = setTimeout(() => fetchServices(false), 300);
    return () => clearTimeout(t);
  }, [fetchServices]);

  // Initialise le geocoder et le session token dès que la lib Places est prête
  useEffect(() => {
    if (!placesLib) return;
    locationGeocoderRef.current = new window.google.maps.Geocoder();
    locationSessionRef.current  = new placesLib.AutocompleteSessionToken();
  }, [placesLib]);

  // Scroll vers la carte quand on bascule en vue "map" depuis le bas de la liste
  useEffect(() => {
    if (viewMode !== 'map' || !mapContainerRef.current) return;
    const el = mapContainerRef.current;
    requestAnimationFrame(() => {
      const navH = isNative ? 56 : 64;
      const top = el.getBoundingClientRect().top + window.scrollY - navH;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    });
  }, [viewMode, isNative]);

  const handleSelectCategory = (cat: string) => { setSearchQuery(''); setSearchParams({ category: cat }); };
  const handleSelectSub = (sub: string) => {
    if (!urlCategory) return;
    setSearchQuery('');
    if (urlSub === sub) setSearchParams({ category: urlCategory });
    else setSearchParams({ category: urlCategory, sub });
  };
  const handleSelectItem = (item: string) => {
    if (!urlCategory || !urlSub) return;
    setSearchQuery('');
    if (urlItem === item) setSearchParams({ category: urlCategory, sub: urlSub });
    else setSearchParams({ category: urlCategory, sub: urlSub, item });
  };
  const resetCategory = () => { setSearchParams({}); setSearchQuery(''); setLocationQuery(''); setSelectedLanguages([]); setLocationFilter('all'); setTargetCoords(null); setSortBy('Recommended'); setTimeFilterDate(''); setTimeFilterStart(''); setTimeFilterEnd(''); };
  const navigateToSubcategory = (cat: string, sub: string) => setSearchParams({ category: cat, sub });

  const toggleDesc = (serviceId: string) => {
    setExpandedDesc(prev => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId); else next.add(serviceId);
      return next;
    });
  };

  const toggleProInfo = (proId?: string) => {
    if (!proId) return;
    setExpandedProInfo(prev => {
      const next = new Set(prev);
      if (next.has(proId)) { next.delete(proId); return next; }
      next.add(proId);
      return next;
    });
    if (!proExtraInfo[proId]) {
      setProExtraInfo(prev => ({ ...prev, [proId]: 'loading' }));
      Promise.all([
        supabase.from('availability_slots').select('day_of_week, slot_start, slot_end').eq('pro_id', proId).order('day_of_week'),
        supabase.from('portfolio_images').select('id, url').eq('user_id', proId).order('created_at', { ascending: false }).limit(6),
      ]).then(([slotsRes, photosRes]) => {
        setProExtraInfo(prev => ({
          ...prev,
          [proId]: {
            slots: (slotsRes.data ?? []) as AvailabilitySlotRow[],
            photos: (photosRes.data ?? []) as PortfolioThumb[],
          },
        }));
      });
    }
  };

  const DAY_LABELS = [0, 1, 2, 3, 4, 5, 6].map(dow =>
    new Date(2024, 0, 7 + dow).toLocaleDateString(i18n.language, { weekday: 'short' })
  );

  const pageTitle = useMemo(() => {
    if (urlItem)     return t(`categories.items.${urlItem}`, urlItem);
    if (urlSub)      return t(`categories.sub.${urlSub}`, urlSub);
    if (urlCategory) return t(`categories.main.${urlCategory}`, urlCategory);
    return t('find.title', 'PROS DISPONIBLES');
  }, [urlCategory, urlSub, urlItem, t]);

  const containerVariants: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
  const cardVariants: Variants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100, damping: 15 } }, exit: { scale: 0.95, opacity: 0 } };

  const CategoryHintPills = ({ cat, color }: { cat: string; color: string }) => {
    const hints = categoryHints[cat];
    if (!hints || (!hints.userTop.length && !hints.globalTop)) return null;
    return (
      <div className="flex flex-wrap gap-1.5 mt-2 pl-5">
        {hints.userTop.map(sub => (
          <button key={`u-${sub}`} onClick={e => { e.stopPropagation(); navigateToSubcategory(cat, sub); }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-all opacity-80 hover:opacity-100 cursor-pointer bg-transparent"
            style={{ borderColor: `${color}40`, color, backgroundColor: `${color}10` }}>
            <Clock size={7} />{t(`categories.sub.${sub}`, sub)}
          </button>
        ))}
        {hints.globalTop && (
          <button key={`g-${hints.globalTop}`} onClick={e => { e.stopPropagation(); navigateToSubcategory(cat, hints.globalTop!); }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-all opacity-70 hover:opacity-100 cursor-pointer bg-transparent"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-tertiary)' }}>
            <TrendingUp size={7} />{t(`categories.sub.${hints.globalTop}`, hints.globalTop)}
          </button>
        )}
      </div>
    );
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      alert(t('find.geo_not_supported', 'La géolocalisation n\'est pas disponible sur ce navigateur.'));
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setTargetCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setTargetCoordsLabel('');
        setLocationQuery('');
        setGeoLoading(false);
      },
      () => {
        alert(t('find.geo_denied', 'Accès à la position refusé. Vérifiez vos paramètres de confidentialité.'));
        setGeoLoading(false);
      },
      { timeout: 10000 }
    );
  };


  const handleSortChange = (value: string) => {
    setGeoSortError(false);
    if (value !== 'Distance' || targetCoords) { setSortBy(value); return; }
    if (!navigator.geolocation) { setGeoSortError(true); return; }
    setSortBy('Distance');
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setTargetCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setTargetCoordsLabel('');
        setLocationQuery('');
        setGeoLoading(false);
      },
      () => { setGeoLoading(false); setGeoSortError(true); setSortBy('Recommended'); },
      { timeout: 10000 }
    );
  };

  const handleLocationFocus = () => {
    if (placesLib && !locationSessionRef.current) {
      locationSessionRef.current = new placesLib.AutocompleteSessionToken();
    }
  };

  const handleLocationQueryChange = (value: string) => {
    setLocationQuery(value);
    setShowLocationDropdown(false);
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    if (value.trim().length < 2) { setLocationSuggestions([]); return; }
    if (!placesLib) return; // Fallback : filtre texte seul, pas d'autocomplétion
    locationDebounceRef.current = setTimeout(async () => {
      if (!canUsePlaces()) { setLocationSuggestions([]); return; }
      if (!locationSessionRef.current) locationSessionRef.current = new placesLib.AutocompleteSessionToken();
      trackPlacesRequest();
      try {
        const { suggestions } = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: value,
          sessionToken: locationSessionRef.current,
          includedRegionCodes: ['hr'],
          includedPrimaryTypes: ['locality', 'administrative_area_level_1', 'administrative_area_level_2', 'administrative_area_level_3'],
        });
        setLocationSuggestions(
          suggestions.filter(s => s.placePrediction).map(s => ({
            main:      s.placePrediction!.text.text.split(', ')[0].trim(),
            secondary: s.placePrediction!.secondaryText?.text ?? '',
            placeId:   s.placePrediction!.placeId,
            fullText:  s.placePrediction!.text.text,
          }))
        );
        setShowLocationDropdown(true);
      } catch { setLocationSuggestions([]); }
    }, 350);
  };

  const handleSelectLocationSuggestion = (s: PlaceSuggestion) => {
    setShowLocationDropdown(false);
    setLocationSuggestions([]);
    if (placesLib) locationSessionRef.current = new placesLib.AutocompleteSessionToken();
    if (locationGeocoderRef.current) {
      locationGeocoderRef.current.geocode({ placeId: s.placeId }, (results, status) => {
        if (status === window.google.maps.GeocoderStatus.OK && results?.[0]) {
          const loc = results[0].geometry.location;
          setTargetCoords({ lat: loc.lat(), lng: loc.lng() });
          setTargetCoordsLabel(s.fullText);
          setLocationQuery('');
        } else {
          setLocationQuery(s.main); // Fallback : au moins le texte
        }
      });
    } else {
      setLocationQuery(s.main);
    }
  };

  const locationFilterOptions: { value: 'home' | 'store'; icon: React.ReactNode; labelKey: string }[] = [
    { value: 'home',  icon: <Home  size={12} />, labelKey: 'service_form.location_home'  },
    { value: 'store', icon: <Store size={12} />, labelKey: 'service_form.location_store' },
  ];

  // ── Contenu des filtres (partagé entre sidebar desktop et drawer mobile) ───
  const FiltersContent = () => (
    <>
      <h3 className="text-[11px] font-black uppercase tracking-[0.3em] mb-8 flex items-center gap-3 text-[var(--color-accent)]">
        <SlidersHorizontal size={14} /> {t('find.filters')}
      </h3>

      {/* Search */}
      <div className="mb-6">
        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-4 block">{t('find.search_label')}</label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] z-10" size={18} />
          <input type="text" value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl py-4 pl-12 pr-4 text-xs focus:border-[var(--color-accent)]/50 outline-none transition-all placeholder:text-[var(--color-text-muted)] text-[var(--color-text-main)]"
            placeholder={t('find.search_placeholder')} />
          {/* Dropdown suggestions */}
          {showSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl shadow-2xl z-50 overflow-hidden">
              {searchSuggestions.map((s, i) => (
                <button key={i} type="button"
                  onMouseDown={() => { setSearchParams(s.params); setSearchQuery(''); setShowSuggestions(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--color-bg-tertiary)] transition-colors border-none bg-transparent cursor-pointer border-b border-[var(--color-border)] last:border-none">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="flex-1 min-w-0">
                    <span className="text-[11px] font-black text-[var(--color-text-main)] block truncate">{s.label}</span>
                    {s.sub && <span className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-widest">{s.sub}</span>}
                  </span>
                  <ChevronRight size={12} className="text-[var(--color-text-muted)] shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Location */}
      <div className="mb-8">
        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-4 block">{t('find.location_label', 'Localisation')}</label>

        {/* Champ ville avec autocomplétion Places (masqué si position active) */}
        {!targetCoords && (
          <div className="relative mb-3">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-accent)] pointer-events-none z-10" size={18} />
            <input
              type="text"
              value={locationQuery}
              onChange={e => handleLocationQueryChange(e.target.value)}
              onFocus={handleLocationFocus}
              onBlur={() => setTimeout(() => setShowLocationDropdown(false), 200)}
              className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl py-4 pl-12 pr-4 text-xs focus:border-[var(--color-accent)]/50 outline-none transition-all placeholder:text-[var(--color-text-muted)] text-[var(--color-text-main)]"
              placeholder={t('find.location_placeholder', placesLib ? 'Ville en Croatie...' : 'Ville ou région...')}
            />
            {showLocationDropdown && locationSuggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-xl">
                {locationSuggestions.map((s, i) => (
                  <button key={i} onMouseDown={() => handleSelectLocationSuggestion(s)}
                    className="w-full text-left px-4 py-3 hover:bg-[var(--color-bg-tertiary)] transition-colors border-none cursor-pointer bg-transparent flex flex-col gap-0.5"
                    style={{ borderBottom: i < locationSuggestions.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <span className="text-[11px] font-black text-[var(--color-text-main)]">{s.main}</span>
                    {s.secondary && <span className="text-[9px] text-[var(--color-text-muted)]">{s.secondary}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Géolocalisation */}
        {targetCoords ? (
          <div className="flex items-center gap-2 mb-3 p-3 rounded-2xl bg-[var(--color-accent-light)] border border-[var(--color-accent)]/30">
            <Navigation size={13} className="text-[var(--color-accent)] shrink-0" />
            <span className="text-[10px] font-black text-[var(--color-accent)] flex-1 uppercase tracking-widest truncate">
              {targetCoordsLabel || t('find.geo_active', 'Position GPS active')}
            </span>
            <button
              onClick={() => { setTargetCoords(null); setTargetCoordsLabel(''); setSortBy(prev => prev === 'Distance' ? 'Recommended' : prev); }}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] bg-transparent border-none cursor-pointer p-0"
            ><X size={14} /></button>
          </div>
        ) : (
          <button
            onClick={handleGeolocate}
            disabled={geoLoading}
            className="w-full flex items-center justify-center gap-2 mb-3 px-4 py-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)] transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer disabled:opacity-50"
          >
            {geoLoading ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
            {geoLoading ? t('find.geo_loading', 'Localisation...') : t('find.geo_btn', 'Utiliser ma position')}
          </button>
        )}

        {/* Rayon — toujours visible, actif si GPS activé */}
        <div className={`mb-4 transition-opacity ${targetCoords ? 'opacity-100' : 'opacity-50'}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">
              {t('find.radius_label', 'Experts dans un rayon de')}
            </span>
            <span className="text-sm font-black text-[var(--color-text-main)]">{radius} km</span>
          </div>
          <div className="relative h-10 flex items-center">
            <div className="absolute top-1/2 -translate-y-1/2 h-1.5 w-full bg-[var(--color-border)] rounded-full" />
            <div className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full z-20 pointer-events-none"
              style={{ width: `${(radius / 100) * 100}%`, backgroundColor: targetCoords ? 'var(--color-accent)' : 'var(--color-text-muted)', boxShadow: targetCoords ? `0 0 10px var(--color-accent-light)` : 'none' }} />
            <input
              type="range" min="1" max="100" value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              className="absolute w-full appearance-none bg-transparent z-10 single-range-input"
            />
          </div>
          <div className="flex justify-between text-[9px] text-[var(--color-text-muted)] mt-1">
            <span>1 km</span><span>100 km</span>
          </div>
        </div>
      </div>

      {/* Lieu de prestation */}
      <div className="mb-8 pt-8 border-t border-[var(--color-border)]">
        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-4 block">{t('service_form.location_label')}</label>
        <div className="flex gap-2">
          {locationFilterOptions.map(({ value, icon, labelKey }) => {
            const isActive = locationFilter === value;
            return (
              <m.button key={value} onClick={() => setLocationFilter(isActive ? 'all' : value)} whileTap={{ scale: 0.95 }}
                className="flex-1 flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl text-[8px] font-black uppercase tracking-widest border transition-all cursor-pointer"
                style={isActive
                  ? { backgroundColor: 'var(--color-accent-light)', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }
                  : { backgroundColor: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = `${activeColor}50`; e.currentTarget.style.color = 'var(--color-text-main)'; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; } }}
              >
                {icon}{t(labelKey)}
              </m.button>
            );
          })}
        </div>
      </div>

      {/* Plage horaire recherchée */}
      <div className="mb-8 pt-8 border-t border-[var(--color-border)]">
        <div className="flex justify-between items-center mb-4">
          <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">
            {t('find.time_filter_label', 'Disponible le')}
          </label>
          {timeFilterDate && (
            <button onClick={() => { setTimeFilterDate(''); setTimeFilterStart(''); setTimeFilterEnd(''); }}
              className="text-[9px] font-black uppercase bg-transparent border-none cursor-pointer" style={{ color: activeColor }}>
              {t('find.reset_filters')}
            </button>
          )}
        </div>
        <input type="date" value={timeFilterDate} min={new Date().toISOString().slice(0, 10)}
          onChange={e => setTimeFilterDate(e.target.value)}
          className="w-full mb-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl py-3 px-4 text-xs focus:border-[var(--color-accent)]/50 outline-none transition-all text-[var(--color-text-main)]" />
        <div className={`flex gap-2 transition-opacity ${timeFilterDate ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          <input type="time" value={timeFilterStart} onChange={e => setTimeFilterStart(e.target.value)}
            className="w-1/2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl py-3 px-4 text-xs outline-none text-[var(--color-text-main)]" />
          <input type="time" value={timeFilterEnd} onChange={e => setTimeFilterEnd(e.target.value)}
            className="w-1/2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl py-3 px-4 text-xs outline-none text-[var(--color-text-main)]" />
        </div>
        <p className="text-[9px] text-[var(--color-text-muted)] mt-2 leading-relaxed">
          {t('find.time_filter_hint', 'Heures optionnelles — laissez vide pour ne filtrer que par jour.')}
        </p>
      </div>

      {/* Catégories */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-5">
          <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">{t('find.categories_label')}</label>
          {(urlCategory || searchQuery || locationQuery || selectedLanguages.length || locationFilter !== 'all' || timeFilterDate) && (
            <button onClick={resetCategory} className="text-[9px] font-black uppercase bg-transparent border-none cursor-pointer" style={{ color: activeColor }}>
              {t('find.reset_filters')}
            </button>
          )}
        </div>
        <div className="flex flex-col">
          <AnimatePresence mode="wait">
            {!urlCategory ? (
              <m.div key="lvl1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col">
                {Object.keys(categoryStructure).map(cat => {
                  const color = getCategoryColor(cat);
                  const isHovered = hoveredCat === cat;
                  return (
                    <div key={cat} className="mb-3">
                      <button onClick={() => handleSelectCategory(cat)}
                        onMouseEnter={() => setHoveredCat(cat)} onMouseLeave={() => setHoveredCat(null)}
                        className="w-full flex justify-between items-center text-left px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer bg-transparent"
                        style={{ borderColor: isHovered ? `${color}70` : 'var(--color-border)', color: isHovered ? color : 'var(--color-text-muted)', boxShadow: isHovered ? `0 0 20px ${color}15` : 'none' }}>
                        <span className="flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full shrink-0 transition-opacity" style={{ backgroundColor: color, opacity: isHovered ? 1 : 0.5 }} />
                          {t(`categories.main.${cat}`, cat)}
                        </span>
                        <ChevronRight size={14} style={{ color: isHovered ? color : 'var(--color-text-muted)' }} />
                      </button>
                      <CategoryHintPills cat={cat} color={color} />
                    </div>
                  );
                })}
              </m.div>
            ) : !urlSub ? (
              <m.div key="lvl2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex flex-col gap-2">
                <button onClick={() => setSearchParams({})} className="flex items-center gap-2 text-[9px] font-black mb-2 uppercase bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity" style={{ color: activeColor }}>
                  <ArrowLeft size={12} /><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeColor }} />{t(`categories.main.${urlCategory}`, urlCategory)}
                </button>
                {Object.keys(categoryStructure[urlCategory] ?? {}).map(sub => {
                  const isSelected = urlSub === sub;
                  return (
                    <button key={sub} onClick={() => handleSelectSub(sub)}
                      className="flex justify-between items-center text-left px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer"
                      style={isSelected ? { backgroundColor: `${activeColor}25`, borderColor: `${activeColor}80`, color: activeColor } : { backgroundColor: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                      onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = `${activeColor}50`; e.currentTarget.style.color = 'var(--color-text-main)'; } }}
                      onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; } }}>
                      {t(`categories.sub.${sub}`, sub)}
                      {(categoryStructure[urlCategory]?.[sub]?.length ?? 0) > 0 && <ChevronRight size={14} />}
                    </button>
                  );
                })}
              </m.div>
            ) : (
              <m.div key="lvl3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex flex-col gap-2">
                <button onClick={() => setSearchParams({ category: urlCategory })} className="flex items-center gap-2 text-[9px] font-black mb-2 uppercase bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity" style={{ color: activeColor }}>
                  <ArrowLeft size={12} /><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeColor }} />{t(`categories.sub.${urlSub}`, urlSub)}
                </button>
                {(categoryStructure[urlCategory]?.[urlSub] ?? []).map(item => {
                  const isSelected = urlItem === item;
                  return (
                    <button key={item} onClick={() => handleSelectItem(item)}
                      className="text-left px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer"
                      style={isSelected ? { backgroundColor: `${activeColor}25`, borderColor: `${activeColor}80`, color: activeColor } : { backgroundColor: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                      onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = `${activeColor}50`; e.currentTarget.style.color = 'var(--color-text-main)'; } }}
                      onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; } }}>
                      {t(`categories.items.${item}`, item)}
                    </button>
                  );
                })}
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Langues */}
      <div className="mb-8 pt-8 border-t border-[var(--color-border)]">
        <div className="flex justify-between items-center mb-5">
          <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-2">
            <Languages size={14} className="text-[var(--color-accent)]" />{t('languages.filter_title', 'Langues parlées')}
          </label>
          {hiddenSelectedCount > 0 && !showAllLanguages && (
            <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-[var(--color-accent-light)] text-[var(--color-accent)] border border-[var(--color-accent)]/30">+{hiddenSelectedCount}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {visibleLanguages.map(lang => (
              <m.button key={lang.code} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}
                onClick={() => toggleLanguage(lang.code)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold transition-all border cursor-pointer ${
                  selectedLanguages.includes(lang.code)
                    ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]'
                }`}>
                <span className="text-sm">{lang.flag}</span>{t(`languages.list.${lang.code}`, lang.code)}
              </m.button>
            ))}
          </AnimatePresence>
        </div>
        <m.button onClick={() => setShowAllLanguages(p => !p)} whileTap={{ scale: 0.97 }}
          className="mt-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors bg-transparent border-none cursor-pointer w-full justify-center py-2 rounded-xl hover:bg-[var(--color-bg-tertiary)]">
          {showAllLanguages ? <><ChevronUp size={12} />{t('languages.show_less')}</> : <><ChevronDown size={12} />{t('languages.show_more', { count: AVAILABLE_LANGUAGES.length - DEFAULT_VISIBLE_LANGUAGES })}</>}
        </m.button>
      </div>

      {/* Budget */}
      <div className="pt-8 border-t border-[var(--color-border)] flex flex-col">
        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-5 block">{t('find.budget_range')}</label>
        <div className="flex justify-between items-center mb-10">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase mb-1">{t('find.min_price')}</span>
            <span className="text-2xl font-black text-[var(--color-text-main)]">{minPrice}€</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase mb-1">{t('find.max_price')}</span>
            <span className="text-2xl font-black" style={{ color: activeColor }}>{maxPrice}€</span>
          </div>
        </div>
        <div className="relative h-10 flex items-center mt-2 px-1">
          <div className="absolute top-1/2 -translate-y-1/2 h-1.5 w-[calc(100%-8px)] bg-[var(--color-border)] rounded-full z-0" />
          <div className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full z-50 pointer-events-none transition-all"
            style={{ left: `${(minPrice / absoluteMaxPrice) * 100}%`, width: `${((maxPrice - minPrice) / absoluteMaxPrice) * 100}%`, backgroundColor: 'var(--color-accent)', boxShadow: '0 0 15px var(--color-accent-light)' }} />
          <input type="range" min="0" max={absoluteMaxPrice} value={minPrice}
            onChange={e => setMinPrice(Math.min(Number(e.target.value), maxPrice - 5))}
            className="absolute w-full appearance-none bg-transparent pointer-events-none z-30 dual-range-input" />
          <input type="range" min="0" max={absoluteMaxPrice} value={maxPrice}
            onChange={e => setMaxPrice(Math.max(Number(e.target.value), minPrice + 5))}
            className="absolute w-full appearance-none bg-transparent pointer-events-none z-20 dual-range-input" />
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-main)] font-sans">
      <SEO
        title={urlCategory ? `${t(`categories.main.${urlCategory}`, urlCategory)} — Pros disponibles` : 'Trouver un professionnel'}
        description={urlCategory
          ? `Trouvez et réservez les meilleurs professionnels en ${t(`categories.main.${urlCategory}`, urlCategory).toLowerCase()} près de chez vous sur AlloLokal.`
          : 'Parcourez des centaines de professionnels qualifiés — beauté, ménage, bien-être, jardinage et plus — et réservez en quelques clics.'
        }
        url={urlCategory ? `/findpro?category=${urlCategory}` : '/findpro'}
      />

      {/* ── DRAWER FILTRES MOBILE ─────────────────────────────────────────────── */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setFiltersOpen(false)} />
      )}
      <div className={`fixed top-0 left-0 h-full w-[min(380px,92vw)] z-[501] lg:hidden bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] overflow-y-auto transition-transform duration-300 ease-out ${filtersOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-bg-secondary)] z-10">
          <span className="text-[11px] font-black uppercase tracking-widest text-[var(--color-accent)] flex items-center gap-2"><SlidersHorizontal size={14} /> {t('find.filters')}</span>
          <button onClick={() => setFiltersOpen(false)} className="w-8 h-8 rounded-xl bg-[var(--color-bg-tertiary)] flex items-center justify-center border-none cursor-pointer text-[var(--color-text-muted)]">
            <X size={16} />
          </button>
        </div>
        <div className="p-6" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
          {FiltersContent()}
        </div>
      </div>

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 py-8 lg:py-12">
        <div className="flex flex-col lg:flex-row gap-12">

          {/* ═══════════════ SIDEBAR DESKTOP ═══════════════ */}
          <aside className="hidden lg:block w-full lg:w-[360px] shrink-0">
            <m.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              className="bg-[var(--color-bg-secondary)] backdrop-blur-xl border border-[var(--color-border)] p-8 lg:p-10 rounded-[2.5rem] shadow-2xl sticky top-28">
              {FiltersContent()}
            </m.div>
          </aside>

          {/* ═══════════════ MAIN ═══════════════ */}
          <main className={`min-w-0 relative z-10 ${viewMode === 'map' ? 'hidden' : 'lg:w-[45%] lg:shrink-0'}`}>
            <m.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="flex flex-col sm:flex-row sm:flex-wrap justify-between items-start sm:items-end mb-6 lg:mb-8 gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-5xl font-black italic uppercase tracking-tighter mb-3 text-[var(--color-text-main)]">{pageTitle}</h2>
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: activeColor }} />
                  <p className="text-[11px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.4em]">
                    {groupedPros.length} {t('find.results_count')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex flex-col gap-1 flex-1 sm:flex-none">
                  <div className="bg-[var(--color-bg-secondary)] px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl border border-[var(--color-border)] flex items-center gap-3 sm:gap-4 backdrop-blur-xl">
                    <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest hidden sm:inline">{t('find.sort_label')}</span>
                    <select value={sortBy} onChange={e => handleSortChange(e.target.value)}
                      className="bg-transparent text-[10px] font-black uppercase outline-none cursor-pointer border-none py-1 flex-1 sm:flex-none" style={{ color: activeColor }}>
                      <option value="Recommended" className="bg-[var(--color-bg-primary)] text-[var(--color-text-main)]">⭐ {t('find.sort_recommended')}</option>
                      <option value="PriceLowHigh" className="bg-[var(--color-bg-primary)] text-[var(--color-text-main)]">💰 {t('find.sort_price_asc')}</option>
                      <option value="Availability" className="bg-[var(--color-bg-primary)] text-[var(--color-text-main)]">🗓️ {t('find.sort_availability', 'Disponibilité')}</option>
                      <option value="Distance" className="bg-[var(--color-bg-primary)] text-[var(--color-text-main)]">📍 {t('find.sort_distance', 'Proximité')}</option>
                    </select>
                  </div>
                  {geoSortError && (
                    <p className="text-[9px] text-[var(--color-text-muted)] text-center leading-tight px-2">
                      {t('find.sort_distance_hint')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setViewMode(v => v === 'map' ? 'split' : 'map')}
                  className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all"
                  style={viewMode === 'map'
                    ? { background: activeColor, color: '#fff', borderColor: activeColor }
                    : { background: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
                >
                  {viewMode === 'map' ? <><List size={13} /> Liste</> : <><MapIcon size={13} /> Carte</>}
                </button>
              </div>
            </m.div>

            {/* ── BARRE RAPIDE MOBILE (lg:hidden) ────────────────────────────── */}
            <div className="lg:hidden mb-3 flex flex-col gap-2">

              {/* Champ ville + autocomplétion */}
              {targetCoords ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-[var(--color-accent-light)] border border-[var(--color-accent)]/30">
                  <Navigation size={13} className="text-[var(--color-accent)] shrink-0" />
                  <span className="text-[10px] font-black text-[var(--color-accent)] flex-1 uppercase tracking-widest truncate">
                    {targetCoordsLabel || t('find.geo_active', 'Position GPS active')}
                  </span>
                  <button
                    onClick={() => { setTargetCoords(null); setTargetCoordsLabel(''); setSortBy(prev => prev === 'Distance' ? 'Recommended' : prev); }}
                    className="bg-transparent border-none cursor-pointer p-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                  ><X size={13} /></button>
                </div>
              ) : (
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-accent)] pointer-events-none z-10" size={14} />
                  <input
                    type="text"
                    value={locationQuery}
                    onChange={e => handleLocationQueryChange(e.target.value)}
                    onFocus={handleLocationFocus}
                    onBlur={() => setTimeout(() => setShowLocationDropdown(false), 200)}
                    className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl py-2.5 pl-9 pr-10 text-xs focus:border-[var(--color-accent)]/50 outline-none placeholder:text-[var(--color-text-muted)] text-[var(--color-text-main)]"
                    placeholder={t('find.location_placeholder', 'Ville...')}
                  />
                  <button
                    onClick={handleGeolocate}
                    disabled={geoLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] bg-transparent border-none cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {geoLoading ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
                  </button>
                  {showLocationDropdown && locationSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-xl">
                      {locationSuggestions.map((s, i) => (
                        <button key={i} onMouseDown={() => handleSelectLocationSuggestion(s)}
                          className="w-full text-left px-4 py-3 hover:bg-[var(--color-bg-tertiary)] transition-colors border-none cursor-pointer bg-transparent flex flex-col gap-0.5"
                          style={{ borderBottom: i < locationSuggestions.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                          <span className="text-[11px] font-black text-[var(--color-text-main)]">{s.main}</span>
                          {s.secondary && <span className="text-[9px] text-[var(--color-text-muted)]">{s.secondary}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Filtre date — "Disponible le" */}
              <div className="flex items-center gap-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl px-3 py-2.5">
                <Clock size={12} className="text-[var(--color-text-muted)] shrink-0" />
                <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest shrink-0">
                  {t('find.time_filter_label', 'Disponible le')}
                </span>
                <input
                  type="date"
                  value={timeFilterDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setTimeFilterDate(e.target.value)}
                  className="flex-1 bg-transparent text-xs outline-none text-[var(--color-text-main)] min-w-0 cursor-pointer"
                />
                {timeFilterDate && (
                  <button
                    onClick={() => { setTimeFilterDate(''); setTimeFilterStart(''); setTimeFilterEnd(''); }}
                    className="shrink-0 bg-transparent border-none cursor-pointer p-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                  ><X size={12} /></button>
                )}
              </div>

              {/* Bouton "+ de filtres" → ouvre le drawer */}
              <button
                onClick={() => setFiltersOpen(true)}
                className="flex items-center justify-center gap-2 py-2 px-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all w-full"
                style={moreFiltersCount > 0
                  ? { borderColor: `${activeColor}50`, color: activeColor, backgroundColor: `${activeColor}08` }
                  : { borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', backgroundColor: 'transparent' }}
              >
                <SlidersHorizontal size={12} />
                {t('find.more_filters', '+ de filtres')}
                {moreFiltersCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-black text-white shrink-0"
                    style={{ backgroundColor: activeColor }}>
                    {moreFiltersCount}
                  </span>
                )}
                <ChevronDown size={12} />
              </button>
            </div>

            {/* FAB carte/liste — mobile uniquement, le bouton desktop ci-dessus gère lg+ */}
            {!anyModalOpen && (
              <button
                onClick={() => setViewMode(v => v === 'map' ? 'split' : 'map')}
                className="lg:hidden fixed right-4 z-[40] w-14 h-14 rounded-full shadow-2xl border-none cursor-pointer flex items-center justify-center"
                style={{ background: activeColor, color: '#fff', bottom: isNative ? 'calc(64px + env(safe-area-inset-bottom) + 16px)' : '1.5rem' }}
              >
                {viewMode === 'map' ? <List size={22} /> : <MapIcon size={22} />}
              </button>
            )}

            {/* AdvisorCTA en haut si 0 résultats */}
            {!loading && groupedPros.length === 0 && urlCategory && (
              <AdvisorCTA category={urlCategory} variant="banner" />
            )}

            <m.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-5">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <m.div key={`sk-${i}`} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-3xl h-[200px] animate-pulse" />
                  ))
                ) : groupedPros.length === 0 ? (
                  <m.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-32 text-center">
                    <p className="text-3xl font-black uppercase tracking-tight mb-3 text-[var(--color-text-main)]">{t('find.no_results_title', 'Aucun pro trouvé')}</p>
                    <p className="text-sm text-[var(--color-text-muted)] mb-6">
                      {timeFilterDate
                        ? t('find.no_results_time_filter', 'Aucun pro disponible sur ce créneau. Essayez une autre date/heure, ou élargissez votre recherche.')
                        : t('find.no_results_subtitle', 'Ajustez vos filtres ou votre budget')}
                    </p>
                    {timeFilterDate && (
                      <button
                        onClick={() => { setTimeFilterDate(''); setTimeFilterStart(''); setTimeFilterEnd(''); }}
                        className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-none cursor-pointer transition-all"
                        style={{ background: activeColor, color: '#fff' }}
                      >
                        {t('find.clear_time_filter', 'Effacer le filtre horaire')}
                      </button>
                    )}
                  </m.div>
                ) : (
                  groupedPros.map(({ profile, services: proServices }, proIdx) => {
                    const isFavorite = userFavorites.includes(profile?.id);
                    const rating = profile?.avg_rating;
                    const reviewCount = profile?.review_count || 0;

                    return (
                      <m.div key={profile?.id} layout className="flex flex-col gap-5">
                        {/* AdvisorCTA card insérée toutes les ADVISOR_EVERY pros (sauf en position 0) */}
                        {proIdx > 0 && proIdx % ADVISOR_EVERY === 0 && urlCategory && (
                          <m.div variants={cardVariants}>
                            <AdvisorCTA category={urlCategory} variant="card" />
                          </m.div>
                        )}

                        <m.div variants={cardVariants} initial="hidden" animate="visible" layout
                          className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-3xl overflow-hidden shadow-xl hover:border-[var(--color-border-strong)] transition-all duration-300">

                          {/* EN-TÊTE PRO */}
                          <div className="p-4 pb-4 sm:p-7 sm:pb-5 flex items-start justify-between gap-3 sm:gap-4 border-b border-[var(--color-border)]">
                            <div className="flex gap-5 min-w-0">
                              <div className="relative shrink-0">
                                <div className="w-14 h-14 rounded-2xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] flex items-center justify-center text-xl font-black overflow-hidden">
                                  {profile?.avatar_url
                                    ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
                                    : <span className="text-[var(--color-text-muted)]">{profile?.full_name?.charAt(0)}</span>}
                                </div>
                                <div className="absolute -bottom-2 -right-2">
                                  {rating && rating > 0 ? (
                                    <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] px-1.5 py-0.5 rounded-lg flex items-center gap-1 shadow">
                                      <Star size={9} className="text-yellow-500 fill-yellow-500" />
                                      <span className="text-[9px] font-black text-[var(--color-text-main)]">{Number(rating).toFixed(1)}</span>
                                    </div>
                                  ) : (
                                    <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] px-1.5 py-0.5 rounded-lg flex items-center gap-1">
                                      <Sparkles size={9} className="text-[var(--color-text-muted)]" />
                                      <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase">{t('find.new_badge')}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="min-w-0">
                                <h4 className="font-black text-lg text-[var(--color-text-main)] uppercase tracking-tight flex items-center gap-2 truncate cursor-pointer hover:text-[var(--color-accent)] transition-colors"
                                  onClick={() => navigate(`/profile/${profile?.id}`)}>
                                  {profile?.full_name}
                                  <ShieldCheck size={16} className="text-[var(--color-border-strong)] shrink-0" />
                                </h4>
                                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <MapPin size={12} className="text-[var(--color-text-muted)] shrink-0" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] truncate">
                                      {profile?.location?.split(',')[0] || t('common.default_location')}
                                    </span>
                                  </div>
                                  {sortBy === 'Distance' && profile?.id && distanceByProId[profile.id] != null && (
                                    <span className="flex items-center gap-1 text-[10px] font-black text-[var(--color-accent)] uppercase tracking-widest shrink-0">
                                      <Navigation size={10} className="shrink-0" />
                                      {distanceByProId[profile.id].toLocaleString(i18n.language, { maximumFractionDigits: 1 })} km
                                    </span>
                                  )}
                                  {reviewCount > 0 && (
                                    <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">
                                      {reviewCount} {t('reviews', 'avis')}
                                    </span>
                                  )}
                                  <div className="flex gap-1">
                                    {profile?.languages?.slice(0, 5).map((lang: string) => (
                                      <span key={lang} className="text-xs">{AVAILABLE_LANGUAGES.find(l => l.code === lang)?.flag}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <button onClick={e => handleToggleFavorite(e, profile?.id)}
                              className={`shrink-0 p-2.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                                isFavorite
                                  ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                                  : 'bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-main)]'
                              }`}>
                              <Star size={16} className={isFavorite ? 'fill-yellow-500' : ''} />
                            </button>
                          </div>

                          {/* OFFRES avec description */}
                          <div className="divide-y divide-[var(--color-border)]">
                            {proServices.map((service, idx) => {
                              const serviceColor = getCategoryColor(service.category);
                              const categoryLabel = service.sub_subcategory
                                ? translateCategorySlug(t, i18n, service.sub_subcategory, 'items')
                                : service.subcategory
                                ? translateCategorySlug(t, i18n, service.subcategory, 'sub')
                                : translateCategorySlug(t, i18n, service.category ?? '', 'main');
                              const isExpanded = expandedDesc.has(service.id);
                              const localDesc = localizedField(service, 'description').text;
                              const hasDesc = !!localDesc.trim();

                              return (
                                <m.div key={service.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}
                                  className="px-4 sm:px-7 py-4 group/service hover:bg-[var(--color-bg-tertiary)] transition-colors">

                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                      {service.cover_image_url ? (
                                        <div className="w-12 h-10 rounded-xl overflow-hidden shrink-0 border border-[var(--color-border)]">
                                          <img src={service.cover_image_url} className="w-full h-full object-cover" alt="" />
                                        </div>
                                      ) : (
                                        <div className="w-1 h-10 rounded-full shrink-0 opacity-70 group-hover/service:opacity-100 transition-opacity" style={{ backgroundColor: serviceColor }} />
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                          <span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: serviceColor }}>{categoryLabel as string}</span>
                                          {service.allow_home  && <Home  size={10} className="opacity-40 group-hover/service:opacity-100 transition-opacity text-[var(--color-text-main)] shrink-0" />}
                                          {service.allow_store && <Store size={10} className="opacity-40 group-hover/service:opacity-100 transition-opacity text-[var(--color-text-main)] shrink-0" />}
                                        </div>
                                        <h5 className="text-sm font-black uppercase tracking-tight text-[var(--color-text-main)] truncate flex items-center gap-1.5">
                                          <span className="truncate">{localizedField(service, 'title').text}</span>
                                          {localizedField(service, 'title').showFlag && (
                                            <span title="Original en croate" className="text-[11px] shrink-0">🇭🇷</span>
                                          )}
                                        </h5>

                                        {/* Description — 2 lignes max, expand au clic */}
                                        {hasDesc && (
                                          <div className="mt-1">
                                            <p className={`text-[11px] text-[var(--color-text-muted)] italic leading-relaxed transition-all ${isExpanded ? '' : 'line-clamp-2'}`}>
                                              {localizedField(service, 'description').text}
                                            </p>
                                            {(localizedField(service, 'description').text.length) > 80 && (
                                              <button onClick={() => toggleDesc(service.id)}
                                                className="text-[9px] font-black uppercase tracking-widest mt-0.5 bg-transparent border-none cursor-pointer transition-colors"
                                                style={{ color: serviceColor }}>
                                                {isExpanded ? t('find.show_less') : t('find.show_more_desc')}
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                                      <div className="text-right">
                                        <div className="flex items-baseline gap-0.5 justify-end">
                                          <span className="text-base sm:text-xl font-black text-[var(--color-text-main)]">{service.price}</span>
                                          <span className="text-[10px] font-black uppercase" style={{ color: serviceColor }}>
                                            {service.price_unit === 'fixed' ? '€' : '€/h'}
                                          </span>
                                        </div>
                                        <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">
                                          {service.price_unit === 'fixed' ? t('find.fixed_price') : t('find.hourly_rate')}
                                        </span>
                                      </div>
                                      <m.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                        onClick={() => navigate(`/booking/${service.id}`)}
                                        className="px-3 sm:px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.1em] border-none cursor-pointer flex items-center gap-1.5 text-black transition-all shrink-0"
                                        style={{ backgroundColor: serviceColor }}
                                        onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.filter = ''; }}>
                                        <span className="hidden sm:inline">{t('find.btn_book')}</span>
                                        <ArrowRight size={12} />
                                      </m.button>
                                    </div>
                                  </div>
                                </m.div>
                              );
                            })}
                          </div>

                          {/* Je veux en savoir plus — façon Treatwell */}
                          <div className="border-t border-[var(--color-border)] px-4 sm:px-7 py-3">
                            <button
                              onClick={() => toggleProInfo(profile?.id)}
                              className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest bg-transparent border-none cursor-pointer transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                            >
                              {expandedProInfo.has(profile?.id ?? '') ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              {t('find.more_info', 'Je veux en savoir plus')}
                            </button>

                            {expandedProInfo.has(profile?.id ?? '') && (
                              <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                className="mt-4 grid sm:grid-cols-2 gap-6 overflow-hidden">
                                {proExtraInfo[profile?.id ?? ''] === 'loading' || !proExtraInfo[profile?.id ?? ''] ? (
                                  <div className="col-span-2 flex justify-center py-6">
                                    <Loader2 size={18} className="animate-spin text-[var(--color-text-muted)]" />
                                  </div>
                                ) : (() => {
                                  const info = proExtraInfo[profile!.id] as { slots: AvailabilitySlotRow[]; photos: PortfolioThumb[] };
                                  const slotsByDay = new Map<number, AvailabilitySlotRow[]>();
                                  info.slots.forEach(s => {
                                    if (!slotsByDay.has(s.day_of_week)) slotsByDay.set(s.day_of_week, []);
                                    slotsByDay.get(s.day_of_week)!.push(s);
                                  });
                                  return (
                                    <>
                                      {/* Adresse + bio */}
                                      <div>
                                        <h6 className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">{t('find.info_address', 'Adresse')}</h6>
                                        <p className="text-xs text-[var(--color-text-main)] flex items-center gap-1.5 mb-4">
                                          <MapPin size={12} className="text-[var(--color-text-muted)] shrink-0" /> {profile?.location || '—'}
                                        </p>
                                        {profile?.bio && (
                                          <>
                                            <h6 className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">{t('find.info_about', 'À propos')}</h6>
                                            <p className="text-xs text-[var(--color-text-muted)] italic leading-relaxed mb-4">{profile.bio}</p>
                                          </>
                                        )}
                                        {profile?.languages && profile.languages.length > 0 && (
                                          <>
                                            <h6 className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">{t('find.info_languages', 'Langues parlées')}</h6>
                                            <p className="text-xs text-[var(--color-text-main)]">
                                              {profile.languages.map(code => t(`languages.list.${code}`, code)).join(', ')}
                                            </p>
                                          </>
                                        )}
                                      </div>

                                      {/* Horaires d'ouverture */}
                                      <div>
                                        <h6 className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">{t('find.info_hours', "Horaires d'ouverture")}</h6>
                                        <div className="space-y-1 mb-4">
                                          {DAY_LABELS.map((label, dow) => {
                                            const daySlots = slotsByDay.get(dow);
                                            return (
                                              <div key={dow} className="flex justify-between text-[11px]">
                                                <span className="text-[var(--color-text-muted)] capitalize">{label}</span>
                                                <span className={daySlots ? 'text-[var(--color-text-main)] font-bold' : 'text-[var(--color-text-muted)] opacity-50'}>
                                                  {daySlots ? daySlots.map(s => `${s.slot_start.substring(0,5)}–${s.slot_end.substring(0,5)}`).join(', ') : t('find.info_closed', 'Fermé')}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {/* Galerie photos */}
                                        {info.photos.length > 0 && (
                                          <>
                                            <h6 className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">{t('find.info_photos', 'Photos')}</h6>
                                            <div className="flex gap-2 flex-wrap">
                                              {info.photos.map(photo => (
                                                <img key={photo.id} src={photo.url} alt="" className="w-14 h-14 rounded-xl object-cover border border-[var(--color-border)]" />
                                              ))}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </>
                                  );
                                })()}
                              </m.div>
                            )}
                          </div>
                        </m.div>
                      </m.div>
                    );
                  })
                )}
              </AnimatePresence>

              {/* AdvisorCTA en bas si des résultats existent */}
              {!loading && groupedPros.length > 0 && urlCategory && (
                <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                  <AdvisorCTA category={urlCategory} variant="card" />
                </m.div>
              )}

              {/* Bouton "Voir plus" */}
              {!loading && hasMore && (
                <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center pt-4">
                  <button
                    onClick={() => fetchServices(true)}
                    disabled={loadingMore}
                    className="flex items-center gap-3 px-8 py-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)] font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loadingMore
                      ? <><Loader2 size={14} className="animate-spin" /> {t('find.loading_more', 'Chargement...')}</>
                      : <>{t('find.load_more', 'Voir plus de pros')} <ChevronDown size={14} /></>
                    }
                  </button>
                </m.div>
              )}

              {/* Fin des résultats */}
              {!loading && !hasMore && groupedPros.length > 0 && (
                <p className="text-center text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50 py-4">
                  {t('find.end_of_results', '— Fin des résultats —')}
                </p>
              )}
            </m.div>
          </main>

          {/* ═══════════════ CARTE ═══════════════ */}
            <div ref={mapContainerRef} className={`${viewMode === 'map' ? 'block w-full' : 'hidden lg:block flex-1 min-w-0 sticky self-start'} rounded-[2.5rem] overflow-hidden border border-[var(--color-border)] shadow-2xl relative`}
              style={isNative
                ? { top: 'calc(56px + env(safe-area-inset-top))', height: 'calc(100vh - 56px - 64px - env(safe-area-inset-top) - env(safe-area-inset-bottom))' }
                : { top: '7rem', height: 'calc(100vh - 8rem)' }}>
              {viewMode === 'map' && (
                <button
                  onClick={() => setViewMode('split')}
                  className="absolute top-4 right-4 z-[1000] flex items-center gap-2 px-4 py-2.5 rounded-2xl border-none cursor-pointer text-[10px] font-black uppercase tracking-widest shadow-xl transition-all"
                  style={{ background: activeColor, color: '#fff' }}
                >
                  <List size={13} /> {t('find.back_to_list', 'Retour à la liste')}
                </button>
              )}
              {canLoadMap() || mapLoaded ? (
                // Boundary dédié : un crash de la carte (ex. incompatibilité API Google /
                // AdvancedMarker) ne doit jamais rendre la page FindPro inaccessible
                <ErrorBoundary fallback={
                  <div className="w-full h-full flex items-center justify-center bg-[var(--color-bg-secondary)]">
                    <p className="text-xs text-[var(--color-text-muted)] text-center px-6">
                      {t('map.load_error', 'La carte est momentanément indisponible.')}
                    </p>
                  </div>
                }>
                <GoogleMap
                  mapId="DEMO_MAP_ID"
                  defaultCenter={{ lat: 45.1, lng: 15.2 }}
                  defaultZoom={7}
                  style={{ width: '100%', height: '100%' }}
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  onClick={() => setSelectedMapProId(null)}
                  onTilesLoaded={() => { if (!mapLoaded) { trackMapLoad(); setMapLoaded(true); } }}
                >
                  {groupedPros
                    .filter(({ profile }) => { const ok = !!(profile?.latitude && profile?.longitude); return ok; })
                    .map(({ profile, services: proServices }) => {
                      const cat = proServices[0]?.category ?? '';
                      const color = getCategoryColor(cat);
                      const letter = (profile?.store_name ?? profile?.full_name ?? '?').charAt(0);
                      return (
                        <React.Fragment key={profile.id}>
                          <AdvancedMarker
                            position={{ lat: profile.latitude!, lng: profile.longitude! }}
                            onClick={() => setSelectedMapProId(prev => prev === profile.id ? null : profile.id)}
                          >
                            <div style={{ position: 'relative', width: 32, height: 40, cursor: 'pointer' }}>
                              <div style={{ position: 'absolute', top: 0, left: 1, width: 30, height: 30, background: color, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', border: '2px solid rgba(255,255,255,0.9)', boxShadow: '0 3px 10px rgba(0,0,0,0.35)' }} />
                              <span style={{ position: 'absolute', top: 5, left: 1, width: 30, textAlign: 'center', fontSize: 11, fontWeight: 900, color: 'white', fontFamily: 'system-ui,sans-serif', lineHeight: '20px', pointerEvents: 'none' }}>{letter.toUpperCase()}</span>
                            </div>
                          </AdvancedMarker>

                          {selectedMapProId === profile.id && (
                            <InfoWindow
                              position={{ lat: profile.latitude!, lng: profile.longitude! }}
                              onCloseClick={() => setSelectedMapProId(null)}
                              pixelOffset={[0, -44]}
                            >
                              <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 160 }}>
                                <p style={{ fontWeight: 900, fontSize: 13, margin: '0 0 4px' }}>
                                  {profile.store_name || profile.full_name}
                                </p>
                                {profile.location && (
                                  <p style={{ fontSize: 11, color: '#888', margin: '0 0 6px' }}>{profile.location}</p>
                                )}
                                {profile.avg_rating ? (
                                  <p style={{ fontSize: 11, margin: '0 0 8px' }}>⭐ {Number(profile.avg_rating).toFixed(1)}</p>
                                ) : null}
                                <a href={`/profile/${profile.id}`}
                                  style={{ display: 'inline-block', padding: '6px 14px', background: activeColor, color: '#fff', borderRadius: 8, fontSize: 11, fontWeight: 900, textDecoration: 'none' }}>
                                  {t('map.view_profile', 'Voir le profil')} →
                                </a>
                              </div>
                            </InfoWindow>
                          )}
                        </React.Fragment>
                      );
                    })}
                </GoogleMap>
                </ErrorBoundary>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--color-bg-secondary)]">
                  <p className="text-xs text-[var(--color-text-muted)] text-center px-6">
                    {t('map.quota_desc', 'Limite d\'utilisation de la carte atteinte pour aujourd\'hui.')}
                  </p>
                </div>
              )}
            </div>
        </div>
      </div>

      <style>{`
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
};

const FindPro: React.FC = () => (
  <MapsProvider><FindProContent /></MapsProvider>
);

export default FindPro;