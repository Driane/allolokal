import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import {
  MapPin, Save, X, Camera, Loader2, Plus, Trash2, Search,
  Star, MessageSquare, Pencil, Eye, EyeOff, ChevronDown, AlertTriangle,
  Download, FileText, PauseCircle, AlertCircle, Crown, ArrowRight
} from 'lucide-react';
import ReviewList from '../components/ReviewList';
import SEO from '../components/SEO';
import ServiceForm from '../components/ServiceForm';
import HScroll from '../components/ui/HScroll';
import AvailabilityPage from './AvailabilityPage';
import ProView from '../components/dashboard/ProView';
import ClientView from '../components/dashboard/ClientView';
import { useModalBackButton } from '../hooks/useModalBackButton';
import { confirmNative } from '../lib/nativeConfirm';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import MapsProvider from '../components/MapsProvider';
import { canUsePlaces, trackPlacesRequest } from '../lib/mapsQuota';
import { getCategoryColor, translateCategorySlug } from '../lib/categoryColors';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface UserProfile {
  id: string;
  role?: string;
  full_name?: string;
  avatar_url?: string;
  location?: string;
  bio?: string;
  latitude?: number | null;
  longitude?: number | null;
  languages?: string[];
  avg_rating?: number;
  review_count?: number;
  show_on_map?: boolean;
  store_name?: string | null;
  phone?: string | null;
  is_suspended?: boolean;
  onboarding_complete?: boolean;
  subscription_tier?: 'essential' | 'flex' | 'plus';
}

interface ProfileService {
  id: string;
  title?: string;
  category?: string;
  subcategory?: string;
  sub_subcategory?: string;
  description?: string;
  price?: number;
  price_home?: number;
  price_store?: number;
  price_unit?: string;
  allow_home?: boolean;
  allow_store?: boolean;
  location_type?: string;
  is_active?: boolean;
  is_enabled?: boolean;
  cover_image_url?: string | null;
}

interface PortfolioImage { id: string; url: string; user_id?: string; caption?: string | null; type?: 'standard' | 'before' | 'after' | null; }

interface LocationSuggestion { display_name: string; lat: string; lon: string; secondary?: string; placeId?: string; }


interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles?: { full_name?: string; avatar_url?: string };
  pro_reply?: string | null;
  pro_replied_at?: string | null;
}

const AVAILABLE_LANGUAGES = [
  { code: 'hr', flag: '🇭🇷' }, { code: 'fr', flag: '🇫🇷' }, { code: 'en', flag: '🇬🇧' },
  { code: 'es', flag: '🇪🇸' }, { code: 'de', flag: '🇩🇪' }, { code: 'it', flag: '🇮🇹' },
  { code: 'pt', flag: '🇵🇹' }, { code: 'ar', flag: '🇸🇦' }, { code: 'zh', flag: '🇨🇳' },
  { code: 'ja', flag: '🇯🇵' }, { code: 'ko', flag: '🇰🇷' }, { code: 'ru', flag: '🇷🇺' },
  { code: 'nl', flag: '🇳🇱' }, { code: 'pl', flag: '🇵🇱' }, { code: 'tr', flag: '🇹🇷' },
  { code: 'sv', flag: '🇸🇪' }, { code: 'ro', flag: '🇷🇴' }, { code: 'hu', flag: '🇭🇺' },
  { code: 'cs', flag: '🇨🇿' }, { code: 'hi', flag: '🇮🇳' }, { code: 'fa', flag: '🇮🇷' },
];

const getLanguageByCode = (code: string) => AVAILABLE_LANGUAGES.find((l) => l.code === code);

// ── LanguagePicker ─────────────────────────────────────────────────────────────
interface LanguagePickerProps { selected: string[]; onChange: (langs: string[]) => void; }

const LanguagePicker: React.FC<LanguagePickerProps> = ({ selected, onChange }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (code: string) => {
    onChange(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code]);
  };

  const filtered = AVAILABLE_LANGUAGES.filter(
    (l) => !selected.includes(l.code) && t(`languages.list.${l.code}`).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 min-h-[2rem]">
        {selected.length === 0 ? (
          <span className="text-[var(--color-text-muted)] text-xs italic">{t('languages.picker.empty')}</span>
        ) : (
          selected.map((code) => {
            const lang = getLanguageByCode(code);
            if (!lang) return null;
            return (
              <span key={code} className="flex items-center gap-2 bg-[var(--color-accent-light)] border border-[var(--color-accent)]/40 text-[var(--color-accent)] text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl">
                <span>{lang.flag}</span>
                <span>{t(`languages.list.${code}`)}</span>
                <button type="button" onClick={() => toggle(code)} className="ml-1 text-[var(--color-accent)] hover:text-[var(--color-text-main)] transition-colors bg-transparent border-none cursor-pointer p-0 leading-none">
                  <X size={12} />
                </button>
              </span>
            );
          })
        )}
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl p-4 text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/50 transition-all cursor-pointer"
        >
          <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <Plus size={14} /> {t('languages.picker.add_button')}
          </span>
          <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute z-50 w-full mt-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-3 border-b border-[var(--color-border)]">
              <div className="relative">
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('languages.picker.search_placeholder')}
                  className="w-full bg-[var(--color-bg-tertiary)] rounded-xl px-4 py-2 pl-9 text-[var(--color-text-main)] text-sm outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)]/50"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-4 text-center text-[var(--color-text-muted)] text-xs">{t('languages.picker.no_results')}</div>
              ) : (
                filtered.map((lang) => (
                  <button key={lang.code} type="button" onClick={() => { toggle(lang.code); setSearch(''); }}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[var(--color-accent-light)] transition-all text-left cursor-pointer border-none bg-transparent border-b border-[var(--color-border)] last:border-none">
                    <span className="text-lg">{lang.flag}</span>
                    <span className="text-sm text-[var(--color-text-main)] font-medium">{t(`languages.list.${lang.code}`)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── ProfilePage ────────────────────────────────────────────────────────────────
const ProfilePageContent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [services, setServices] = useState<ProfileService[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioImage[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState('about');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canMessage, setCanMessage]       = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm]   = useState('');
  const [deleting, setDeleting]             = useState(false);
  useModalBackButton(showDeleteModal, () => setShowDeleteModal(false));

const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [pendingCaption, setPendingCaption] = useState('');
  const [pendingType, setPendingType] = useState<'standard' | 'before' | 'after'>('standard');
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const [portfolioFilter, setPortfolioFilter] = useState<'all' | 'standard' | 'before' | 'after'>('all');
  useModalBackButton(!!pendingFile, () => { setPendingFile(null); setPendingPreview(null); setPendingCaption(''); setPendingType('standard'); });
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  useModalBackButton(isServiceModalOpen, () => setIsServiceModalOpen(false));
  const [editingService, setEditingService] = useState<ProfileService | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [savingField, setSavingField] = useState(false);

  const [suggestions, setSuggestions]           = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions]   = useState(false);
  const [locationError, setLocationError]        = useState<'quota' | 'error' | null>(null);
  const locationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const placesLib = useMapsLibrary('places');
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  useEffect(() => {
    if (placesLib) {
      geocoderRef.current = new window.google.maps.Geocoder();
      sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
    }
  }, [placesLib]);

  const [formData, setFormData] = useState({
    full_name: '', location: '', bio: '', phone: '',
    latitude: null as number | null, longitude: null as number | null,
    languages: [] as string[],
    show_on_map: false, store_name: '',
  });

  const availableTabs = useMemo(() => {
    if (profile?.role === 'pro') {
      if (isOwner) return ['dashboard', 'agenda', 'planning', 'about', 'services', 'portfolio', 'reviews', 'comptabilite'];
      return ['about', 'services', 'portfolio', 'reviews'];
    }
    if (isOwner) return ['dashboard', 'about', 'comptabilite'];
    return ['about'];
  }, [profile?.role, isOwner]);

  const handleDeleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account', {});
      if (error) throw error;
      await supabase.auth.signOut();
      navigate('/');
    } catch (err) {
      alert(t('profile.delete_error', 'Erreur lors de la suppression. Veuillez réessayer.'));
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user.id ?? null;
      if (uid === id) setIsOwner(true);
      setCurrentUserId(uid);

      const { data: prof, error: profError } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (profError) throw profError;

      setProfile(prof);
      setFormData({ full_name: prof.full_name || '', location: prof.location || '', bio: prof.bio || '', phone: prof.phone || '', latitude: prof.latitude || null, longitude: prof.longitude || null, languages: prof.languages || [], show_on_map: prof.show_on_map || false, store_name: prof.store_name || '' });

      if (prof.role === 'pro') {
        const [servs, photos, revs] = await Promise.all([
          supabase.from('services').select('*').eq('user_id', id).eq('is_active', true).order('created_at', { ascending: false }),
          supabase.from('portfolio_images').select('*').eq('user_id', id).order('created_at', { ascending: false }),
          supabase.from('reviews').select('*, profiles:client_id(full_name, avatar_url)').eq('pro_id', id).order('created_at', { ascending: false }),
        ]);
        setServices(servs.data || []);
        setPortfolio(photos.data || []);
        setReviews(revs.data || []);

        if (uid === id) {
          const { count } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('pro_id', id).eq('status', 'pending');
          setPendingCount(count ?? 0);
        }

        // Vérifier si le visiteur a une réservation active avec ce pro
        if (uid && uid !== id) {
          const { data: activeBookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('client_id', uid)
            .eq('pro_id', id)
            .neq('status', 'cancelled')
            .limit(1);
          setCanMessage((activeBookings?.length ?? 0) > 0);
        }
      }
    } catch (err) {
      console.error(err); navigate('/findpro');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && availableTabs.includes(tab)) {
      setActiveTab(tab);
      if (tab !== 'about') window.scrollTo({ top: 450, behavior: 'smooth' });
    }
  }, [searchParams, availableTabs]);

  useEffect(() => {
    if (searchParams.get('openModal') === 'true' && isOwner) {
      setIsServiceModalOpen(true); setActiveTab('services');
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('openModal');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, isOwner, setSearchParams]);

  const handleLocationChange = (value: string) => {
    setFormData(prev => ({ ...prev, location: value, latitude: null, longitude: null }));
    setShowSuggestions(false);
    setLocationError(null);

    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);

    if (value.trim().length < 3) { setSuggestions([]); return; }

    locationDebounceRef.current = setTimeout(async () => {
      if (!placesLib) return;
      if (!canUsePlaces()) {
        setSuggestions([]);
        setLocationError('quota');
        return;
      }
      setIsSearchingLocation(true);
      trackPlacesRequest();
      if (!sessionTokenRef.current) sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
      try {
        const { suggestions: raw } = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: value,
          sessionToken: sessionTokenRef.current,
        });
        setSuggestions(
          raw
            .filter(s => s.placePrediction)
            .map(s => ({
              display_name: s.placePrediction!.text.text,
              lat: '',
              lon: '',
              placeId: s.placePrediction!.placeId,
              secondary: s.placePrediction!.secondaryText?.text,
            }))
        );
        setShowSuggestions(true);
      } catch (err) {
        console.warn('[Places API] fetchAutocompleteSuggestions failed:', err);
        setSuggestions([]);
        setLocationError('error');
      } finally {
        setIsSearchingLocation(false);
      }
    }, 350);
  };

  const selectSuggestion = (suggestion: LocationSuggestion) => {
    setSuggestions([]);
    setShowSuggestions(false);
    setLocationError(null);
    // La session se termine à la sélection : renouveler le token pour la prochaine recherche
    if (placesLib) sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
    if (suggestion.placeId && geocoderRef.current) {
      geocoderRef.current.geocode({ placeId: suggestion.placeId }, (results, status) => {
        if (status === window.google.maps.GeocoderStatus.OK && results && results[0]) {
          const loc = results[0].geometry.location;
          setFormData(prev => ({
            ...prev,
            location:  suggestion.display_name,
            latitude:  loc.lat(),
            longitude: loc.lng(),
          }));
        } else {
          console.warn('[Geocoder] geocode failed:', status);
          setFormData(prev => ({ ...prev, location: suggestion.display_name }));
        }
      });
    } else {
      setFormData(prev => ({
        ...prev,
        location:  suggestion.display_name,
        latitude:  parseFloat(suggestion.lat),
        longitude: parseFloat(suggestion.lon),
      }));
    }
  };

  const validateFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) { alert(t('profile.errors.invalid_format')); return false; }
    if (file.size > MAX_FILE_SIZE) { alert(t('profile.errors.file_too_large')); return false; }
    return true;
  };

  const handleAvatarClick = () => isOwner && avatarInputRef.current?.click();

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      if (!validateFile(file)) return;
      setUploading(true);
      const filePath = `${id}/avatar-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', id);
      if (updateError) throw updateError;
      setProfile({ ...profile, avatar_url: publicUrl } as UserProfile);
    } catch (err: unknown) { alert(t('profile.errors.upload_failed') + (err instanceof Error ? err.message : '')); }
    finally { setUploading(false); }
  };

  const uploadPortfolio = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!validateFile(file)) return;
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
    setPendingCaption('');
    setPendingType('standard');
    e.target.value = '';
  };

  const submitPortfolioUpload = async () => {
    if (!pendingFile) return;
    setPortfolioUploading(true);
    try {
      const filePath = `${id}/work-${Date.now()}.${pendingFile.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('portfolio').upload(filePath, pendingFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('portfolio').getPublicUrl(filePath);
      const { data: newImage, error: dbError } = await supabase.from('portfolio_images')
        .insert([{ user_id: id, url: publicUrl, caption: pendingCaption.trim() || null, type: pendingType }])
        .select().single();
      if (dbError) throw dbError;
      setPortfolio([newImage, ...portfolio]);
      setPendingFile(null);
      setPendingPreview(null);
      setPendingCaption('');
      setPendingType('standard');
    } catch (err: unknown) {
      alert(t('profile.errors.portfolio_failed') + (err instanceof Error ? err.message : ''));
    } finally {
      setPortfolioUploading(false);
    }
  };

  const deletePortfolioImage = async (imgId: string) => {
    if (!await confirmNative({ message: t('profile.confirm_delete_image'), danger: true })) return;
    const { error } = await supabase.from('portfolio_images').delete().eq('id', imgId);
    if (!error) setPortfolio(portfolio.filter(p => p.id !== imgId));
  };

  const saveField = async () => {
    setSavingField(true);
    try {
      const payload = {
        full_name:   formData.full_name,
        location:    formData.location,
        bio:         formData.bio,
        phone:       formData.phone || null,
        latitude:    formData.latitude,
        longitude:   formData.longitude,
        languages:   formData.languages,
        show_on_map: formData.show_on_map,
        store_name:  formData.store_name || null,
      };
      const { error } = await supabase.from('profiles').update(payload).eq('id', id);
      if (error) throw error;
      setProfile(prev => prev ? { ...prev, ...formData } as UserProfile : prev);
      setEditingField(null);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message
        ?? (err as { error_description?: string })?.error_description
        ?? JSON.stringify(err);
      alert(t('profile.errors.save_failed', { message: msg }));
    } finally {
      setSavingField(false);
    }
  };

  const cancelField = () => {
    setFormData({
      full_name: profile?.full_name || '', location: profile?.location || '',
      bio: profile?.bio || '', phone: profile?.phone || '',
      latitude: profile?.latitude || null, longitude: profile?.longitude || null,
      languages: profile?.languages || [], show_on_map: profile?.show_on_map || false,
      store_name: profile?.store_name || '',
    });
    setEditingField(null);
  };

  const saveToggle = async (key: 'show_on_map', value: boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    try {
      const { error } = await supabase.from('profiles').update({ [key]: value }).eq('id', id);
      if (error) throw error;
      setProfile(prev => prev ? { ...prev, [key]: value } : prev);
    } catch {
      setFormData(prev => ({ ...prev, [key]: !value }));
    }
  };

  const handleExportCSV = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('bookings')
      .select('booking_date, status, total_price, services(title), profiles!client_id(full_name)')
      .eq('pro_id', user.id)
      .order('booking_date', { ascending: false });
    if (!data) return;
    const rows = [
      ['Date', 'Client', 'Service', 'Montant (€)', 'Statut'],
      ...data.map((b: Record<string, unknown>) => [
        new Date(b.booking_date as string).toLocaleDateString('fr-FR'),
        (b.profiles as Record<string, unknown>)?.full_name ?? '',
        (b.services as Record<string, unknown>)?.title ?? '',
        b.total_price != null ? Number(b.total_price).toFixed(2) : '',
        b.status ?? '',
      ]),
    ];
    const csv = rows.map(r => r.map((v: unknown) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `allolokal-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!await confirmNative({ message: t('pro.alerts.confirm_soft_delete'), danger: true })) return;
    try {
      const { error } = await supabase.from('services').update({ is_active: false }).eq('id', serviceId);
      if (error) throw error;
      setServices(prev => prev.filter(s => s.id !== serviceId));
    } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Erreur'); }
  };

  const handleToggleServiceStatus = async (serviceId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('services').update({ is_enabled: !currentStatus }).eq('id', serviceId);
      if (error) throw error;
      setServices(prev => prev.map(s => s.id === serviceId ? { ...s, is_enabled: !currentStatus } : s));
    } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Erreur'); }
  };

  const openServiceModal = (service: ProfileService | null = null) => { setEditingService(service); setIsServiceModalOpen(true); };

  if (loading) return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-main)]">
      <SEO
        title={profile.full_name ?? 'Profil professionnel'}
        description={profile.bio
          ? `${profile.bio.slice(0, 140)}…`
          : `Découvrez le profil de ${profile.full_name} sur AlloLokal et réservez ses services en quelques clics.`
        }
        image={profile.avatar_url ?? undefined}
        url={`/profile/${profile.id}`}
        type="profile"
      />
      {/* Cover */}
      <div className="h-[170px] w-full bg-gradient-to-br from-[var(--color-accent)]/30 to-[var(--color-bg-primary)] relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5"></div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-24 pb-20 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">

            {/* CARTE PROFIL — compact */}
            <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl px-4 py-3 mb-6 shadow-xl">
              <div className="flex items-center gap-3">

                {/* Avatar petit */}
                <div className="relative group cursor-pointer shrink-0" onClick={handleAvatarClick}>
                  <div className="w-11 h-11 rounded-xl bg-[var(--color-accent)] overflow-hidden flex items-center justify-center text-lg font-black text-white">
                    {uploading ? <Loader2 className="animate-spin" size={16} />
                      : profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                      : profile.full_name?.charAt(0)}
                  </div>
                  {(profile.avg_rating ?? 0) > 0 && (
                    <div className="absolute -bottom-1.5 -right-1.5 bg-[var(--color-bg-primary)] text-[var(--color-text-main)] px-1.5 py-0.5 rounded-lg font-black text-[9px] flex items-center gap-0.5 shadow-md z-20 leading-none">
                      <Star size={9} className="fill-[var(--color-text-main)] shrink-0" /> {profile.avg_rating}
                    </div>
                  )}
                  {isOwner && !uploading && (
                    <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10">
                      <Camera size={14} className="text-white" />
                    </div>
                  )}
                  <input type="file" ref={avatarInputRef} onChange={uploadAvatar} className="hidden" accept="image/*" />
                </div>

                {/* Nom + adresse */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-sm font-black uppercase tracking-tight text-[var(--color-text-main)] truncate leading-tight">
                    {profile.full_name}
                  </h1>
                  <div className="flex items-center gap-1 text-[var(--color-text-muted)] text-xs mt-0.5">
                    <MapPin size={11} className="text-[var(--color-accent)] shrink-0" />
                    <span className="truncate">{profile.location || t('profile.no_location')}</span>
                  </div>
                </div>

                {/* Bouton Contacter */}
                {!isOwner && profile.role === 'pro' && canMessage && (
                  <button
                    onClick={() => navigate(`/messages?with=${profile.id}`)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[var(--color-accent)] hover:opacity-90 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-opacity border-none cursor-pointer">
                    <MessageSquare size={12} /> {t('profile.contact_pro', 'Message')}
                  </button>
                )}
              </div>
            </div>

            {/* BANNIÈRES D'ACTIONS — pro owner uniquement */}
            {isOwner && profile.role === 'pro' && (
              <div className="flex flex-col gap-2 mb-6">
                {!profile.onboarding_complete && (
                  <button onClick={() => navigate('/onboarding')}
                    className="flex items-center gap-4 px-6 py-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl hover:bg-amber-500/20 transition-all text-left w-full cursor-pointer">
                    <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">{t('pro.banners.stripe_title', 'Paiements non configurés')}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{t('pro.banners.stripe_desc', 'Finalisez votre compte Stripe pour recevoir des paiements')}</p>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl shrink-0 whitespace-nowrap">{t('pro.banners.stripe_cta', 'Configurer →')}</span>
                  </button>
                )}
                {pendingCount > 0 && (
                  <button onClick={() => setActiveTab('dashboard')}
                    className="flex items-center gap-4 px-6 py-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl hover:bg-blue-500/20 transition-all text-left w-full cursor-pointer">
                    <AlertCircle size={16} className="text-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                        {t('pro.banners.pending_title', '{{count}} réservation(s) en attente', { count: pendingCount })}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">{t('pro.banners.pending_desc', 'Confirmez ou refusez ces demandes')}</p>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-xl shrink-0 whitespace-nowrap">{t('pro.banners.pending_cta', 'Voir →')}</span>
                  </button>
                )}
                {!profile.avatar_url && (
                  <button onClick={handleAvatarClick}
                    className="flex items-center gap-4 px-6 py-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl hover:border-[var(--color-accent)]/40 transition-all text-left w-full cursor-pointer">
                    <Camera size={16} className="text-[var(--color-accent)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]">{t('pro.banners.photo_title', 'Ajoutez une photo de profil')}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{t('pro.banners.photo_desc', 'Les profils avec photo reçoivent 3× plus de réservations')}</p>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-accent)] bg-[var(--color-accent-light)] border border-[var(--color-accent)]/30 px-3 py-1.5 rounded-xl shrink-0 whitespace-nowrap">{t('pro.banners.photo_cta', 'Ajouter →')}</span>
                  </button>
                )}
                {services.length === 0 && (
                  <button onClick={() => openServiceModal()}
                    className="flex items-center gap-4 px-6 py-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl hover:bg-emerald-500/20 transition-all text-left w-full cursor-pointer">
                    <Plus size={16} className="text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{t('pro.banners.service_title', 'Créez votre premier service')}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{t('pro.banners.service_desc', 'Publiez une offre pour apparaître dans les résultats')}</p>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl shrink-0 whitespace-nowrap">{t('pro.banners.service_cta', 'Créer →')}</span>
                  </button>
                )}
              </div>
            )}

            {/* ONGLETS */}
            {availableTabs.length > 1 && (
              <HScroll
                wrapperClassName="mb-8 border-b border-[var(--color-border)]"
                className="flex gap-10 px-6"
                bg="var(--color-bg-secondary)"
              >
                {availableTabs.map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`py-6 font-black uppercase text-[10px] tracking-[0.3em] transition-all relative whitespace-nowrap bg-transparent border-none cursor-pointer ${activeTab === tab ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                  >
                    {String(t(`profile.tabs.${tab}`, tab.charAt(0).toUpperCase() + tab.slice(1)))}
                    {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-1 bg-[var(--color-accent)] rounded-full"></div>}
                  </button>
                ))}
              </HScroll>
            )}

            {/* CONTENU ONGLETS */}
            <div className="min-h-[400px]">

              {/* About */}
              {activeTab === 'about' && (() => {
                const fieldHeader = (label: string, field: string) => (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]">{label}</span>
                    {isOwner && (
                      editingField === field ? (
                        <div className="flex gap-2">
                          <button onClick={cancelField} className="p-1.5 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] bg-transparent border-none cursor-pointer"><X size={14} /></button>
                          <button onClick={saveField} disabled={savingField} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-accent)] hover:opacity-80 text-white rounded-xl text-[9px] font-black uppercase tracking-widest border-none cursor-pointer disabled:opacity-50">
                            {savingField ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setEditingField(field)} className="p-1.5 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-tertiary)] bg-transparent border-none cursor-pointer transition-all"><Pencil size={13} /></button>
                      )
                    )}
                  </div>
                );
                return (
                  <div className="space-y-3 animate-in fade-in duration-500">

                    {/* Présentation */}
                    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[2rem] p-6">
                      {fieldHeader(t('profile.form.bio'), 'bio')}
                      {editingField === 'bio' ? (
                        <textarea
                          className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl p-4 h-32 text-[var(--color-text-main)] outline-none italic focus:border-[var(--color-accent)]/50 transition-colors resize-none text-sm"
                          value={formData.bio}
                          onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                          autoFocus
                        />
                      ) : (
                        <p className="text-[var(--color-text-muted)] leading-relaxed italic">
                          {profile.bio || <span className="opacity-40">{t('profile.no_details')}</span>}
                        </p>
                      )}
                    </div>

                    {/* Nom complet */}
                    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[2rem] p-6">
                      {fieldHeader(t('profile.form.name'), 'full_name')}
                      {editingField === 'full_name' ? (
                        <input
                          className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl p-4 text-[var(--color-text-main)] outline-none focus:border-[var(--color-accent)]/50 transition-colors text-sm"
                          value={formData.full_name}
                          onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                          autoFocus
                        />
                      ) : (
                        <p className="font-bold text-[var(--color-text-main)]">{profile.full_name || <span className="text-[var(--color-text-muted)] opacity-40">—</span>}</p>
                      )}
                    </div>

                    {/* Localisation */}
                    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[2rem] p-6">
                      {fieldHeader(t('profile.form.location'), 'location')}
                      {editingField === 'location' ? (
                        <div className="relative">
                          <div className="relative">
                            <input
                              className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl p-4 pr-10 text-[var(--color-text-main)] outline-none focus:border-[var(--color-accent)]/50 transition-colors text-sm"
                              placeholder="Ex : Split, Hrvatska…"
                              value={formData.location}
                              onChange={e => handleLocationChange(e.target.value)}
                              onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                              autoComplete="off"
                              autoFocus
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                              {isSearchingLocation ? <Loader2 size={16} className="animate-spin text-[var(--color-accent)]" /> : <MapPin size={16} />}
                            </div>
                          </div>
                          {formData.latitude && formData.longitude && !showSuggestions && (
                            <p className="text-[9px] font-bold text-green-500 flex items-center gap-1 mt-1.5 ml-1"><MapPin size={9} /> Position GPS enregistrée</p>
                          )}
                          {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden">
                              {suggestions.map((s, i) => {
                                const [primary, ...rest] = s.display_name.split(' — ');
                                return (
                                  <button key={i} type="button" onMouseDown={e => { e.preventDefault(); selectSuggestion(s); }}
                                    className="w-full text-left px-4 py-3 hover:bg-[var(--color-accent-light)] border-b border-[var(--color-border)] last:border-none transition-colors bg-transparent cursor-pointer">
                                    <div className="flex items-start gap-2">
                                      <MapPin size={12} className="text-[var(--color-accent)] shrink-0 mt-0.5" />
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-[var(--color-text-main)] truncate">{primary}</p>
                                        {rest.length > 0 && <p className="text-[10px] text-[var(--color-text-muted)] truncate">{rest.join(' — ')}</p>}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {locationError === 'quota' && (
                            <p className="text-[10px] font-bold text-amber-500 flex items-center gap-1 mt-1.5 ml-1">
                              <AlertTriangle size={10} /> Limite de suggestions atteinte pour aujourd'hui
                            </p>
                          )}
                          {locationError === 'error' && (
                            <p className="text-[10px] font-bold text-[var(--color-error)] flex items-center gap-1 mt-1.5 ml-1">
                              <AlertTriangle size={10} /> Recherche d'adresse indisponible — réessayez
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="flex items-center gap-2 text-[var(--color-text-muted)]">
                          <MapPin size={14} className="text-[var(--color-accent)] shrink-0" />
                          {profile.location || <span className="opacity-40">—</span>}
                        </p>
                      )}
                    </div>

                    {/* Téléphone — owner only */}
                    {isOwner && (
                      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[2rem] p-6">
                        {fieldHeader(t('profile.form.phone', 'Téléphone'), 'phone')}
                        {editingField === 'phone' ? (
                          <>
                            <input
                              type="tel"
                              className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl p-4 text-[var(--color-text-main)] outline-none focus:border-[var(--color-accent)]/50 transition-colors text-sm"
                              placeholder="+385 91 234 5678"
                              value={formData.phone}
                              onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                              autoFocus
                            />
                            <p className="text-[9px] text-[var(--color-text-muted)] mt-1.5 ml-1">{t('profile.form.phone_hint', 'Visible uniquement par vous.')}</p>
                          </>
                        ) : (
                          <p className="text-[var(--color-text-muted)]">{profile.phone || <span className="opacity-40">—</span>}</p>
                        )}
                      </div>
                    )}

                    {/* Langues */}
                    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[2rem] p-6">
                      {fieldHeader(t('languages.form_label', 'Langues parlées'), 'languages')}
                      {editingField === 'languages' ? (
                        <LanguagePicker
                          selected={formData.languages}
                          onChange={langs => setFormData(prev => ({ ...prev, languages: langs }))}
                        />
                      ) : (
                        profile.languages && profile.languages.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {profile.languages.map((code: string) => {
                              const lang = getLanguageByCode(code);
                              if (!lang) return null;
                              return (
                                <div key={code} className="flex items-center gap-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl px-4 py-2">
                                  <span className="text-xl">{lang.flag}</span>
                                  <span className="text-sm font-bold text-[var(--color-text-main)]">{t(`languages.list.${code}`)}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[var(--color-text-muted)] opacity-40 text-sm">—</p>
                        )
                      )}
                    </div>

                    {/* Apparaître sur la carte — pro + owner */}
                    {profile.role === 'pro' && isOwner && (
                      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[2rem] p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)] mb-0.5">{t('profile.show_on_map')}</p>
                            <p className="text-[11px] text-[var(--color-text-muted)]">{t('profile.show_on_map_desc')}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => saveToggle('show_on_map', !formData.show_on_map)}
                            className="relative w-12 h-7 rounded-full border-none cursor-pointer shrink-0 transition-colors duration-200"
                            style={{ backgroundColor: formData.show_on_map ? 'var(--color-accent)' : 'var(--color-border-strong)' }}
                          >
                            <div className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-200"
                              style={{ left: formData.show_on_map ? '22px' : '2px' }} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Nom de la boutique — pro + owner + show_on_map */}
                    {profile.role === 'pro' && isOwner && formData.show_on_map && (
                      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[2rem] p-6">
                        {fieldHeader(t('profile.store_name'), 'store_name')}
                        {editingField === 'store_name' ? (
                          <input
                            className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl p-4 text-[var(--color-text-main)] outline-none focus:border-[var(--color-accent)]/50 transition-colors text-sm"
                            value={formData.store_name}
                            placeholder={t('profile.store_name_placeholder')}
                            onChange={e => setFormData(prev => ({ ...prev, store_name: e.target.value }))}
                            maxLength={80}
                            autoFocus
                          />
                        ) : (
                          <p className="text-[var(--color-text-muted)]">{profile.store_name || <span className="opacity-40">—</span>}</p>
                        )}
                      </div>
                    )}

                  </div>
                );
              })()}

              {/* Services */}
              {profile.role === 'pro' && activeTab === 'services' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
                  {isOwner && (
                    <button onClick={() => openServiceModal()} className="group p-8 bg-transparent border-2 border-dashed border-[var(--color-border)] rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-accent-light)] transition-all cursor-pointer">
                      <Plus className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)]" size={32} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)]">
                        {t('pro.services.add_button')}
                      </span>
                    </button>
                  )}
                  {services.map(s => (
                    <div key={s.id} className={`group bg-[var(--color-bg-secondary)] rounded-[2.5rem] border transition-all relative overflow-hidden ${s.is_enabled === false ? 'border-red-500/20 opacity-60' : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/30'}`}>
                      {/* Cover image */}
                      {s.cover_image_url && (
                        <div className="h-36 overflow-hidden">
                          <img src={s.cover_image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                        </div>
                      )}
                      <div className="p-8 relative">
                        {isOwner && (
                          <div className="absolute top-4 right-4 flex gap-2">
                            <button onClick={() => openServiceModal(s)} className="p-2 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-accent)] text-[var(--color-text-muted)] hover:text-white rounded-xl transition-all border-none cursor-pointer"><Pencil size={14} /></button>
                            <button onClick={() => handleToggleServiceStatus(s.id, s.is_enabled ?? true)} className={`p-2 bg-[var(--color-bg-tertiary)] rounded-xl transition-all border-none cursor-pointer ${s.is_enabled === false ? 'text-emerald-500 hover:bg-emerald-600 hover:text-white' : 'text-orange-500 hover:bg-orange-600 hover:text-white'}`}>
                              {s.is_enabled === false ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                            <button onClick={() => handleDeleteService(s.id)} className="p-2 bg-[var(--color-bg-tertiary)] hover:bg-red-600 text-[var(--color-text-muted)] hover:text-white rounded-xl transition-all border-none cursor-pointer"><Trash2 size={14} /></button>
                          </div>
                        )}
                        <div className="flex flex-col gap-1.5">
                          {(() => {
                            const catColor = getCategoryColor(s.category);
                            return (
                              <span
                                className="self-start text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full"
                                style={{ color: catColor, background: `${catColor}1a` }}
                              >
                                {String(t(`categories.main.${s.category?.toLowerCase()}`, s.category || ''))}
                              </span>
                            );
                          })()}
                          {s.subcategory && (
                            <span className="text-[var(--color-text-muted)] text-[8px] font-bold uppercase tracking-widest">
                              {String(t(`categories.sub.${s.subcategory?.toLowerCase()}`, s.subcategory || ''))}
                              {s.sub_subcategory && ` • ${translateCategorySlug(t, i18n, s.sub_subcategory.toLowerCase(), 'items')}`}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-xl mt-4 mb-4 uppercase italic text-[var(--color-text-main)] flex items-center gap-2">
                          {s.title}
                          {s.is_enabled === false && (
                            <span className="text-[8px] bg-red-500/10 text-red-500 px-2 py-1 rounded-md uppercase">{t('pro.services.status_paused')}</span>
                          )}
                        </h4>
                        <div className="text-3xl font-black text-[var(--color-text-main)]">{s.price}€<span className="text-[var(--color-text-muted)] text-sm ml-1">/h</span></div>
                        {!isOwner && s.is_enabled !== false && (
                          <button
                            onClick={() => navigate(`/booking/${s.id}`)}
                            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] border-none cursor-pointer text-white transition-all"
                            style={{ backgroundColor: 'var(--color-accent)' }}
                          >
                            {t('find.btn_book', 'Réserver')} <ArrowRight size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Portfolio */}
              {profile.role === 'pro' && activeTab === 'portfolio' && (
                <>
                  {/* Filter bar */}
                  {portfolio.length > 0 && (
                    <div className="flex items-center gap-2 mb-6 flex-wrap">
                      {(['all', 'standard', 'before', 'after'] as const).map(f => (
                        <button key={f} onClick={() => setPortfolioFilter(f)}
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer ${
                            portfolioFilter === f
                              ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                              : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                          }`}>
                          {f === 'all' ? `${t('profile.portfolio.filter_all', 'Tout')} (${portfolio.length})` : f === 'standard' ? `⭐ ${t('profile.portfolio.type_standard', 'Standard')}` : f === 'before' ? `📷 ${t('profile.portfolio.type_before', 'Avant')}` : `✨ ${t('profile.portfolio.type_after', 'Après')}`}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
                    {isOwner && (
                      <div onClick={() => portfolioInputRef.current?.click()} className="aspect-square rounded-[2.5rem] bg-[var(--color-bg-secondary)] border-2 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center gap-4 hover:border-[var(--color-accent)]/50 cursor-pointer transition-all">
                        <Plus className="text-[var(--color-text-muted)]" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{t('profile.portfolio.add_title')}</span>
                        <input type="file" ref={portfolioInputRef} onChange={uploadPortfolio} className="hidden" accept="image/*" />
                      </div>
                    )}
                    {portfolio
                      .filter(img => portfolioFilter === 'all' || img.type === portfolioFilter || (!img.type && portfolioFilter === 'standard'))
                      .map((img) => (
                      <div key={img.id} className="group relative rounded-[2.5rem] overflow-hidden border border-[var(--color-border)]">
                        <div className="aspect-square">
                          <img src={img.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Portfolio" />
                        </div>
                        {/* Type badge */}
                        {img.type && img.type !== 'standard' && (
                          <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border backdrop-blur-sm ${
                            img.type === 'before'
                              ? 'bg-amber-500/80 border-amber-400/50 text-white'
                              : 'bg-emerald-500/80 border-emerald-400/50 text-white'
                          }`}>
                            {img.type === 'before' ? `📷 ${t('profile.portfolio.type_before', 'Avant')}` : `✨ ${t('profile.portfolio.type_after', 'Après')}`}
                          </div>
                        )}
                        {img.caption && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                            <p className="text-white text-[11px] font-semibold italic leading-snug">{img.caption}</p>
                          </div>
                        )}
                        {isOwner && (
                          <button onClick={() => deletePortfolioImage(img.id)} className="absolute top-4 right-4 p-3 bg-red-600/90 rounded-2xl opacity-0 group-hover:opacity-100 transition-all border-none cursor-pointer text-white"><Trash2 size={16} /></button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Modal caption + type */}
                  {pendingFile && (
                    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 pt-20 xl:pt-28 bg-black/80 backdrop-blur-md overflow-y-auto">
                      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl">
                        <h3 className="text-base font-black italic uppercase tracking-tighter text-[var(--color-text-main)] mb-5">{t('profile.portfolio.add_title')}</h3>
                        {pendingPreview && (
                          <div className="aspect-video rounded-2xl overflow-hidden mb-5 border border-[var(--color-border)]">
                            <img src={pendingPreview} className="w-full h-full object-cover" alt="" />
                          </div>
                        )}

                        {/* Type selector */}
                        <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2 block">
                          {t('profile.portfolio.type_label', 'Type de photo')}
                        </label>
                        <div className="grid grid-cols-3 gap-2 mb-5">
                          {([
                            { value: 'standard', label: t('profile.portfolio.type_standard', 'Standard'), emoji: '⭐' },
                            { value: 'before',   label: t('profile.portfolio.type_before', 'Avant'),    emoji: '📷' },
                            { value: 'after',    label: t('profile.portfolio.type_after', 'Après'),    emoji: '✨' },
                          ] as const).map(opt => (
                            <button key={opt.value} type="button" onClick={() => setPendingType(opt.value)}
                              className={`flex flex-col items-center gap-1 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer ${
                                pendingType === opt.value
                                  ? 'bg-[var(--color-accent-light)] border-[var(--color-accent)] text-[var(--color-accent)]'
                                  : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]'
                              }`}>
                              <span className="text-base">{opt.emoji}</span>
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 block">
                          {t('profile.portfolio.caption_label')}
                        </label>
                        <input
                          type="text" value={pendingCaption}
                          onChange={e => setPendingCaption(e.target.value)}
                          placeholder={t('profile.portfolio.caption_placeholder')}
                          maxLength={120}
                          className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl px-4 py-3 text-[var(--color-text-main)] text-sm outline-none focus:border-[var(--color-accent)]/50 transition-colors mb-6"
                        />
                        <div className="flex gap-3">
                          <button type="button"
                            onClick={() => { setPendingFile(null); setPendingPreview(null); setPendingCaption(''); setPendingType('standard'); }}
                            className="flex-1 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest text-[var(--color-text-muted)] border border-[var(--color-border)] bg-transparent cursor-pointer">
                            {t('common.cancel')}
                          </button>
                          <button type="button" onClick={submitPortfolioUpload} disabled={portfolioUploading}
                            className="flex-1 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white bg-[var(--color-accent)] border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                            {portfolioUploading ? <Loader2 size={14} className="animate-spin" /> : t('profile.portfolio.publish_btn')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Reviews */}
              {profile.role === 'pro' && activeTab === 'reviews' && (
                <div className="animate-in fade-in duration-500">
                  <div className="flex items-end gap-4 border-b border-[var(--color-border)] pb-8 mb-8">
                    <h2 className="text-3xl font-black italic uppercase tracking-tight text-[var(--color-text-main)]">
                      {t('profile.reviews.title_part1')} <span className="text-[var(--color-accent)]">{t('profile.reviews.title_part2')}</span>
                    </h2>
                    <span className="text-[var(--color-text-muted)] font-black mb-1">({profile.review_count || 0})</span>
                  </div>
                  <ReviewList
                    reviews={reviews}
                    proId={id}
                    currentUserId={currentUserId}
                    onReplyAdded={fetchData}
                  />
                </div>
              )}

              {/* Dashboard — pro owner : réservations reçues */}
              {isOwner && profile.role === 'pro' && activeTab === 'dashboard' && (
                <div className="animate-in fade-in duration-500">
                  <ProView view="manage" />
                </div>
              )}

              {/* Agenda — pro owner : calendrier */}
              {isOwner && profile.role === 'pro' && activeTab === 'agenda' && (
                <div className="animate-in fade-in duration-500">
                  <ProView view="calendar" />
                </div>
              )}

              {/* Planning — pro owner : gestion des disponibilités */}
              {isOwner && profile.role === 'pro' && activeTab === 'planning' && (
                <div className="animate-in fade-in duration-500">
                  <AvailabilityPage embedded />
                </div>
              )}

              {/* Dashboard — client owner : historique réservations */}
              {isOwner && profile.role !== 'pro' && activeTab === 'dashboard' && (
                <div className="animate-in fade-in duration-500">
                  <ClientView />
                </div>
              )}

              {/* Gestion — owner only */}
              {isOwner && activeTab === 'comptabilite' && (
                <div className="animate-in fade-in duration-500 space-y-8">
                  <div className="border-b border-[var(--color-border)] pb-8">
                    <h2 className="text-3xl font-black italic uppercase tracking-tight text-[var(--color-text-main)]">
                      Gestion <span className="text-[var(--color-accent)]">& Export</span>
                    </h2>
                  </div>

                  {/* Palier d'abonnement */}
                  {profile.role === 'pro' && (
                    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[2.5rem] p-10">
                      <div className="flex items-start gap-6">
                        <div className="w-14 h-14 bg-[var(--color-accent-light)] border border-[var(--color-accent)]/30 rounded-2xl flex items-center justify-center shrink-0">
                          <Crown className="text-[var(--color-accent)]" size={24} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-black uppercase tracking-tight text-[var(--color-text-main)] mb-2">
                            Plan actuel : <span className="text-[var(--color-accent)] capitalize">{profile.subscription_tier || 'essential'}</span>
                          </h3>
                          <p className="text-sm text-[var(--color-text-muted)] italic mb-6 leading-relaxed">
                            Le palier d'abonnement détermine votre taux de commission par réservation.
                          </p>
                          <button
                            onClick={() => navigate('/pricing')}
                            className="flex items-center gap-3 px-6 py-3.5 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] text-[var(--color-text-main)] rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer border-none"
                          >
                            Voir les paliers disponibles
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Export CSV */}
                  <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[2.5rem] p-10">
                    <div className="flex items-start gap-6">
                      <div className="w-14 h-14 bg-[var(--color-accent-light)] border border-[var(--color-accent)]/30 rounded-2xl flex items-center justify-center shrink-0">
                        <FileText className="text-[var(--color-accent)]" size={24} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-black uppercase tracking-tight text-[var(--color-text-main)] mb-2">
                          Export des réservations
                        </h3>
                        <p className="text-sm text-[var(--color-text-muted)] italic mb-6 leading-relaxed">
                          Téléchargez l'historique complet de vos réservations au format CSV — compatible Excel, Google Sheets et tout logiciel de comptabilité.
                        </p>
                        <button
                          onClick={handleExportCSV}
                          className="flex items-center gap-3 px-6 py-3.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer border-none"
                        >
                          <Download size={14} />
                          Télécharger le CSV
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Suspendre le compte */}
                  <div className="bg-[var(--color-bg-secondary)] border border-orange-500/20 rounded-[2.5rem] p-10">
                    <div className="flex items-start gap-6">
                      <div className="w-14 h-14 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex items-center justify-center shrink-0">
                        <PauseCircle className="text-orange-500" size={24} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-black uppercase tracking-tight text-[var(--color-text-main)] mb-2">
                          Suspendre temporairement mon compte
                        </h3>
                        <p className="text-sm text-[var(--color-text-muted)] italic mb-6 leading-relaxed">
                          Masque votre profil et vos offres le temps d'une absence. Vos données, avis et réservations sont conservés. Vous pouvez réactiver à tout moment.
                        </p>
                        <button
                          onClick={async () => {
                            if (!await confirmNative({ message: 'Suspendre votre compte ? Votre profil sera masqué jusqu\'à réactivation.', danger: true })) return;
                            const { error } = await supabase.from('profiles').update({ is_suspended: true, suspended_at: new Date().toISOString() }).eq('id', id);
                            if (error) { alert('Erreur : ' + error.message); return; }
                            setProfile(prev => prev ? { ...prev, is_suspended: true } : prev);
                            alert('Compte suspendu. Pour réactiver, contactez le support ou reconnectez-vous.');
                          }}
                          className="flex items-center gap-3 px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer border-none"
                        >
                          <PauseCircle size={14} />
                          Suspendre mon compte
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Supprimer le compte */}
                  <div className="bg-[var(--color-bg-secondary)] border border-red-500/20 rounded-[2.5rem] p-10">
                    <div className="flex items-start gap-6">
                      <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center shrink-0">
                        <Trash2 className="text-red-500" size={24} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-black uppercase tracking-tight text-red-500 mb-2">
                          Zone dangereuse
                        </h3>
                        <p className="text-sm text-[var(--color-text-muted)] italic mb-6 leading-relaxed">
                          La suppression de votre compte est irréversible. Toutes vos données seront définitivement effacées.
                        </p>
                        <button
                          onClick={() => setShowDeleteModal(true)}
                          className="flex items-center gap-3 px-6 py-3.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer border border-red-500/30 hover:border-red-500"
                        >
                          <Trash2 size={14} />
                          {t('profile.delete_account')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL CONFIRMATION SUPPRESSION ───────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[300] flex items-start justify-center p-4 pt-20 xl:pt-28 pb-10 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div className="bg-[var(--color-bg-secondary)] w-full max-w-md rounded-[2.5rem] p-8 border border-red-500/30 shadow-2xl">
            <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-5">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <h3 className="text-xl font-black italic uppercase tracking-tighter text-[var(--color-text-main)] mb-3">
              {t('profile.delete_title', 'Supprimer mon compte ?')}
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-3">
              {t('profile.delete_warning', 'Cette action est irréversible. Vos données personnelles seront effacées, vos services dépubliés et vous ne pourrez plus vous connecter.')}
            </p>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">
              {t('profile.delete_bookings_note', 'L\'historique de vos réservations sera conservé de manière anonymisée pour les obligations légales.')}
            </p>

            <label className="block text-[10px] font-black uppercase tracking-widest text-red-500 mb-2">
              {t('profile.delete_confirm_label', 'Tapez') + ' '}
              <span className="font-black">{t('profile.delete_word', 'SUPPRIMER')}</span>
              {' ' + t('profile.delete_confirm_label_suffix', 'pour confirmer')}
            </label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={t('profile.delete_word', 'SUPPRIMER')}
              className="w-full bg-[var(--color-bg-primary)] border border-red-500/30 rounded-2xl px-5 py-4 text-[var(--color-text-main)] outline-none focus:border-red-500 transition-colors text-sm mb-6 font-black tracking-wider"
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); }}
                className="flex-1 py-3.5 rounded-2xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer bg-transparent">
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== t('profile.delete_word', 'SUPPRIMER') || deleting}
                className="flex-1 py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {t('profile.delete_confirm_btn', 'Supprimer définitivement')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SERVICE */}
      {isServiceModalOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setIsServiceModalOpen(false); }}
        >
          <div className="min-h-full flex items-start justify-center px-4 sm:px-6 pt-20 xl:pt-28 pb-10">
            <div className="bg-[var(--color-bg-primary)] w-full max-w-2xl p-10 rounded-[3rem] border border-[var(--color-border)] relative">
              <button onClick={() => setIsServiceModalOpen(false)} className="absolute top-8 right-8 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border-none bg-transparent cursor-pointer">
                <X size={28} />
              </button>
              <h2 className="text-4xl font-black italic uppercase text-[var(--color-text-main)] mb-8 tracking-tighter pr-12">
                {editingService ? t('pro.modal.edit_title') : t('pro.modal.title_start')}
                <span className="text-[var(--color-accent)]"> {t('pro.modal.title_end')}</span>
              </h2>
              <ServiceForm
                initialData={editingService ?? undefined}
                onSuccess={() => { setIsServiceModalOpen(false); fetchData(); }}
                onCancel={() => setIsServiceModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProfilePage: React.FC = () => (
  <MapsProvider><ProfilePageContent /></MapsProvider>
);

export default ProfilePage;