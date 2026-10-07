import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { confirmNative } from '../lib/nativeConfirm';
import { supabase } from '../lib/supabase';
import {
  Loader2, Sparkles, Euro, Tag, AlignLeft, Trash2, Clock, Lock, Info,
  ChevronDown, ChevronUp, Users, UserPlus, Layers, ListTree, Home, Store,
  ImagePlus, X as XIcon, Globe2, Navigation, Plus, Package
} from 'lucide-react';

interface ServiceInitialData {
  id?: string;
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
  cover_image_url?: string | null;
  title_en?: string | null;
  title_de?: string | null;
  description_en?: string | null;
  description_de?: string | null;
  travel_fee_free_km?: number | null;
  travel_fee_per_km?: number | null;
}

interface Addon { id?: string; name: string; price: string; }

interface ServiceFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: ServiceInitialData;
}

const LANG_TABS = ['hr', 'en', 'de'] as const;
type LangTab = typeof LANG_TABS[number];

const ServiceForm: React.FC<ServiceFormProps> = ({ onSuccess, onCancel, initialData }) => {
  const { t } = useTranslation();
  const [loading, setLoading]         = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [activeTabPrice, setActiveTabPrice] = useState<'home' | 'store'>('home');
  const [activeLangTab, setActiveLangTab]   = useState<LangTab>('hr');
  const [coverFile, setCoverFile]     = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(initialData?.cover_image_url ?? null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [addons, setAddons] = useState<Addon[]>([]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const categoryStructure: Record<string, Record<string, string[]>> = useMemo(() => ({
    beauty: {
      nails: ['manicure', 'pedicure', 'gel_acrylic', 'nail_art'],
      waxing: ['wax', 'thread', 'laser', 'pulsed_light'],
      hairdressing: ['cut', 'coloring', 'brushing', 'extensions'],
      makeup: ['events_weddings', 'lessons'],
      face_care: ['facial_treatments', 'eyelashes', 'microblading']
    },
    home: {
      plumbing: ['leak_repair', 'unclogging', 'sanitary'],
      electricity: ['small_jobs', 'outlets_cabling', 'home_automation'],
      painting_coatings: ['interior', 'exterior', 'parquet', 'tiling'],
      assembly_installation: ['furniture', 'tv_home_cinema', 'ac', 'locksmith'],
      gardening: ['mowing', 'hedge_trimming', 'pruning', 'planting'],
      pool_spa: ['maintenance', 'water_treatment', 'winterizing']
    },
    cleaning: {
      housekeeping: ['regular', 'deep_cleaning', 'move_out', 'windows', 'sofas_carpets'],
      ironing_laundry: ['ironing', 'folding_storage'],
      vehicles: ['car_wash', 'interior_car', 'polishing', 'boat'],
      disinfection: ['deep_clean', 'pest_control']
    },
    wellbeing: {
      massage: ['relaxing_swedish', 'sports', 'thai', 'californian', 'hot_stones', 'prenatal'],
      sport_coaching: ['fitness_coach', 'yoga', 'pilates', 'martial_arts'],
      paramedical_care: ['physiotherapy', 'osteopathy', 'nurse', 'sophrology', 'nutritionist']
    },
    family: {
      children: ['babysitter', 'regular_care', 'tutoring', 'private_lessons'],
      seniors: ['home_help', 'accompaniment', 'daily_care'],
      pets: ['pet_sitter', 'walking', 'grooming', 'training'],
      cooking_meals: ['private_chef', 'meal_prep', 'cooking_lessons']
    },
    premium: {
      transport: ['private_driver', 'airport_transfer', 'rental_with_driver'],
      events: ['photographer', 'videographer', 'private_dj', 'organization', 'decoration'],
      lifestyle: ['sommelier', 'personal_shopper', 'flowers', 'private_concierge']
    }
  }), []);

  const [formData, setFormData] = useState({
    title:                initialData?.title || '',
    category:             initialData?.category || '',
    subcategory:          initialData?.subcategory || '',
    sub_subcategory:      initialData?.sub_subcategory || '',
    description:          initialData?.description || '',
    price_home:           initialData?.price_home?.toString() || initialData?.price?.toString() || '',
    price_store:          initialData?.price_store?.toString() || '',
    unit:                 initialData?.price_unit || 'hour',
    allow_home:           initialData?.allow_home ?? true,
    allow_store:          initialData?.allow_store ?? false,
    title_en:             initialData?.title_en || '',
    title_de:             initialData?.title_de || '',
    description_en:       initialData?.description_en || '',
    description_de:       initialData?.description_de || '',
    travel_fee_free_km:   initialData?.travel_fee_free_km?.toString() || '',
    travel_fee_per_km:    initialData?.travel_fee_per_km?.toString() || '',
  });

  const isEditMode = !!initialData?.id;
  const editLocationType: 'home' | 'store' | null = isEditMode
    ? (initialData?.location_type === 'home' ? 'home' : initialData?.location_type === 'store' ? 'store' : null)
    : null;

  useEffect(() => {
    if (initialData) {
      setFormData({
        title:                initialData.title || '',
        category:             initialData.category || '',
        subcategory:          initialData.subcategory || '',
        sub_subcategory:      initialData.sub_subcategory || '',
        description:          initialData.description || '',
        price_home:           initialData.price_home?.toString() || initialData.price?.toString() || '',
        price_store:          initialData.price_store?.toString() || '',
        unit:                 initialData.price_unit || 'hour',
        allow_home:           initialData.allow_home ?? true,
        allow_store:          initialData.allow_store ?? false,
        title_en:             initialData.title_en || '',
        title_de:             initialData.title_de || '',
        description_en:       initialData.description_en || '',
        description_de:       initialData.description_de || '',
        travel_fee_free_km:   initialData.travel_fee_free_km?.toString() || '',
        travel_fee_per_km:    initialData.travel_fee_per_km?.toString() || '',
      });
      if (!initialData.allow_home && initialData.allow_store) setActiveTabPrice('store');

      // Charger les add-ons existants (mode édition)
      if (initialData.id) {
        supabase.from('service_addons').select('id, name, price').eq('service_id', initialData.id).order('created_at')
          .then(({ data }) => {
            if (data) setAddons(data.map(a => ({ id: a.id, name: a.name, price: String(a.price) })));
          });
      }
    }
  }, [initialData]);

  // Simulation — sans TVA sur frais
  const priceDetails = useMemo(() => {
    const currentPrice = activeTabPrice === 'home' ? formData.price_home : formData.price_store;
    const amount = parseFloat(currentPrice) || 0;
    if (amount <= 0) return null;
    const tvaRate  = 0.25;
    const tvaPro   = amount * tvaRate;
    const comm14   = amount * 0.14;
    const comm9    = amount * 0.09;
    return {
      ttc:   amount,
      tvaPro,
      comm14,
      net14: amount - tvaPro - comm14,
      comm9,
      net9:  amount - tvaPro - comm9,
    };
  }, [formData.price_home, formData.price_store, activeTabPrice]);

  const willCreateTwo = !isEditMode && formData.allow_home && formData.allow_store;

  const containsPhone = (text: string): boolean =>
    /(\+?\d[\s\-./()]*){7,}\d/.test(text);

  const phoneFields = [
    formData.title, formData.description,
    formData.title_en, formData.title_de,
    formData.description_en, formData.description_de,
    ...addons.map(a => a.name),
  ];

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!formData.allow_home && !formData.allow_store) {
      alert(t('service_form.error_no_location')); return;
    }
    if (phoneFields.some(containsPhone)) {
      alert(t('service_form.error_phone_number')); return;
    }
    setLoading(true);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error(t('errors.session_expired'));

      let finalCoverUrl: string | null = null;
      if (coverFile) {
        const ext = coverFile.name.split('.').pop();
        const filePath = `service-covers/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('portfolio').upload(filePath, coverFile);
        if (!uploadErr) {
          finalCoverUrl = supabase.storage.from('portfolio').getPublicUrl(filePath).data.publicUrl;
        }
      } else if (coverPreview) {
        finalCoverUrl = coverPreview;
      }

      const travelFreeKm = formData.travel_fee_free_km ? parseFloat(formData.travel_fee_free_km) : null;
      const travelPerKm  = formData.travel_fee_per_km  ? parseFloat(formData.travel_fee_per_km)  : null;

      const basePayload = {
        user_id:              user.id,
        title:                formData.title,
        category:             formData.category,
        subcategory:          formData.subcategory,
        sub_subcategory:      formData.sub_subcategory,
        description:          formData.description,
        price_unit:           formData.unit,
        is_active:            true,
        cover_image_url:      finalCoverUrl,
        title_en:             formData.title_en || null,
        title_de:             formData.title_de || null,
        description_en:       formData.description_en || null,
        description_de:       formData.description_de || null,
        travel_fee_free_km:   travelFreeKm,
        travel_fee_per_km:    travelPerKm,
      };

      let savedServiceId: string | null = initialData?.id ?? null;

      if (isEditMode) {
        const locType = editLocationType;
        const price = locType === 'home'
          ? parseFloat(formData.price_home) || 0
          : parseFloat(formData.price_store) || 0;

        const { error } = await supabase.from('services').update({
          ...basePayload,
          price,
          price_home:        locType === 'home'  ? price : null,
          price_store:       locType === 'store' ? price : null,
          allow_home:        locType === 'home',
          allow_store:       locType === 'store',
          location_type:     locType || 'home',
          admin_status:      'pending',
          admin_reviewed_at: null,
          admin_note:        null,
        }).eq('id', initialData!.id);
        if (error) throw error;

        // Save add-ons
        if (savedServiceId) {
          for (const addon of addons) {
            const addonPrice = parseFloat(addon.price) || 0;
            if (addon.id) {
              await supabase.from('service_addons').update({ name: addon.name, price: addonPrice }).eq('id', addon.id);
            } else if (addon.name.trim()) {
              await supabase.from('service_addons').insert({ service_id: savedServiceId, name: addon.name, price: addonPrice });
            }
          }
        }

      } else if (willCreateTwo) {
        const priceHome  = parseFloat(formData.price_home)  || 0;
        const priceStore = parseFloat(formData.price_store) || 0;
        const { error } = await supabase.from('services').insert([
          { ...basePayload, price: priceHome,  price_home: priceHome,  price_store: null,       allow_home: true,  allow_store: false, location_type: 'home'  },
          { ...basePayload, price: priceStore, price_home: null,       price_store: priceStore, allow_home: false, allow_store: true,  location_type: 'store' },
        ]);
        if (error) throw error;

      } else {
        const isHome  = formData.allow_home;
        const price   = parseFloat(isHome ? formData.price_home : formData.price_store) || 0;
        const locType = isHome ? 'home' : 'store';
        const { error } = await supabase.from('services').insert([{
          ...basePayload, price,
          price_home:    isHome ? price : null,
          price_store:   isHome ? null  : price,
          allow_home:    isHome,
          allow_store:   !isHome,
          location_type: locType,
        }]);
        if (error) throw error;
      }

      onSuccess();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    const ok = await confirmNative({ message: t('profile.confirm_delete_service'), danger: true });
    if (!ok) return;
    setDeleteLoading(true);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error(t('errors.session_expired'));
      const { error } = await supabase.from('services')
        .update({ is_active: false })
        .eq('id', initialData.id)
        .eq('user_id', user.id);
      if (error) throw error;
      onSuccess();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const inputClass = "bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl p-4 outline-none focus:border-[var(--color-accent)]/50 focus:bg-[var(--color-bg-secondary)] transition-all font-bold text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] w-full";

  const langFlag: Record<LangTab, string> = { hr: '🇭🇷', en: '🇬🇧', de: '🇩🇪' };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div className="space-y-6">

        {/* ── 1. CATÉGORIES ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Catégorie principale */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] flex items-center gap-2">
              <Tag size={12} /> {t('create_ad.label_category')}
            </label>
            <div className="relative">
              <select required className={`${inputClass} appearance-none cursor-pointer`}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: '', sub_subcategory: '' })}>
                <option value="">{t('common.select')}</option>
                {Object.keys(categoryStructure).map((cat) => (
                  <option key={cat} value={cat}>{t(`categories.main.${cat}`)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" size={16} />
            </div>
          </div>

          {/* Sous-catégorie */}
          <div className={`space-y-2 transition-all duration-300 ${!formData.category ? 'opacity-30 pointer-events-none' : ''}`}>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] flex items-center gap-2">
              <Layers size={12} /> {t('create_ad.label_subcategory')}
            </label>
            <div className="relative">
              <select required className={`${inputClass} appearance-none cursor-pointer`}
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value, sub_subcategory: '' })}>
                <option value="">{t('common.select')}</option>
                {formData.category && Object.keys(categoryStructure[formData.category]).map((sub) => (
                  <option key={sub} value={sub}>{t(`categories.sub.${sub}`)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" size={16} />
            </div>
          </div>

          {/* Spécialité */}
          <div className={`space-y-2 transition-all duration-300 ${!formData.subcategory ? 'opacity-30 pointer-events-none' : ''}`}>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] flex items-center gap-2">
              <ListTree size={12} /> {t('create_ad.label_sub_subcategory')}
            </label>
            <div className="relative">
              <select required className={`${inputClass} appearance-none cursor-pointer`}
                value={formData.sub_subcategory}
                onChange={(e) => setFormData({ ...formData, sub_subcategory: e.target.value })}>
                <option value="">{t('common.select')}</option>
                {formData.category && formData.subcategory && categoryStructure[formData.category][formData.subcategory].map((ssub) => (
                  <option key={ssub} value={ssub}>{t(`categories.items.${ssub}`)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" size={16} />
            </div>
          </div>
        </div>

        {/* ── 2. TITRE + DESCRIPTION avec onglets de langue ────── */}
        <div className="space-y-4">
          {/* Onglets langue */}
          <div className="flex items-center gap-1">
            <Globe2 size={13} className="text-[var(--color-text-muted)] mr-1" />
            {LANG_TABS.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setActiveLangTab(lang)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-none cursor-pointer transition-all ${
                  activeLangTab === lang
                    ? 'bg-[var(--color-accent)] text-white shadow-md'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
              >
                <span>{langFlag[lang]}</span>
                {lang === 'hr' ? 'HR' : lang === 'en' ? 'EN' : 'DE'}
              </button>
            ))}
            {activeLangTab !== 'hr' && (
              <span className="ml-2 text-[9px] font-bold text-[var(--color-text-muted)] italic">
                {t('service_form.translation_optional')} — {t('service_form.translation_hint')}
              </span>
            )}
          </div>

          {/* TITRE */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-accent)] flex items-center gap-2">
              <Sparkles size={12} /> {t('create_ad.label_title')} {langFlag[activeLangTab]}
            </label>
            {activeLangTab === 'hr' && (
              <input type="text" placeholder={t('create_ad.placeholder_title')} required
                className={inputClass} value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            )}
            {activeLangTab === 'en' && (
              <input type="text" placeholder={t('create_ad.placeholder_title')}
                className={inputClass} value={formData.title_en}
                onChange={(e) => setFormData({ ...formData, title_en: e.target.value })} />
            )}
            {activeLangTab === 'de' && (
              <input type="text" placeholder={t('create_ad.placeholder_title')}
                className={inputClass} value={formData.title_de}
                onChange={(e) => setFormData({ ...formData, title_de: e.target.value })} />
            )}
          </div>

          {/* DESCRIPTION */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] flex items-center gap-2">
              <AlignLeft size={12} /> {t('create_ad.label_description')} {langFlag[activeLangTab]}
            </label>
            {activeLangTab === 'hr' && (
              <textarea rows={4} placeholder={t('create_ad.placeholder_description')} required
                className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl p-4 outline-none focus:border-[var(--color-accent)]/50 focus:bg-[var(--color-bg-secondary)] transition-all font-medium italic text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] w-full resize-none"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            )}
            {activeLangTab === 'en' && (
              <textarea rows={4} placeholder={t('create_ad.placeholder_description')}
                className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl p-4 outline-none focus:border-[var(--color-accent)]/50 focus:bg-[var(--color-bg-secondary)] transition-all font-medium italic text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] w-full resize-none"
                value={formData.description_en}
                onChange={(e) => setFormData({ ...formData, description_en: e.target.value })} />
            )}
            {activeLangTab === 'de' && (
              <textarea rows={4} placeholder={t('create_ad.placeholder_description')}
                className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl p-4 outline-none focus:border-[var(--color-accent)]/50 focus:bg-[var(--color-bg-secondary)] transition-all font-medium italic text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] w-full resize-none"
                value={formData.description_de}
                onChange={(e) => setFormData({ ...formData, description_de: e.target.value })} />
            )}
          </div>
        </div>

        {/* ── 3. PHOTO DE COUVERTURE ────────────────────────────── */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] flex items-center gap-2">
            <ImagePlus size={12} /> {t('service_form.photo_section')}
          </label>
          <input type="file" accept="image/*" className="hidden" ref={coverInputRef} onChange={handleCoverChange} />
          {coverPreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-[var(--color-border)] aspect-video">
              <img src={coverPreview} className="w-full h-full object-cover" alt="" />
              <button type="button"
                onClick={() => { setCoverPreview(null); setCoverFile(null); }}
                className="absolute top-3 right-3 bg-black/70 hover:bg-red-600 text-white p-2 rounded-xl border-none cursor-pointer transition-colors">
                <XIcon size={14} />
              </button>
              <p className="absolute bottom-3 left-3 text-[9px] font-black uppercase tracking-widest text-white/60 bg-black/40 px-2 py-1 rounded-lg">
                {t('service_form.photo_hint')}
              </p>
            </div>
          ) : (
            <div onClick={() => coverInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-[var(--color-accent)]/50 transition-all group">
              <ImagePlus size={28} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                {t('service_form.photo_cta')}
              </p>
            </div>
          )}
        </div>

        {/* ── 4. TYPE DE LIEU (masqué en mode édition) ─────────── */}
        {!isEditMode && (
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] flex items-center gap-2">
              <Home size={12} /> {t('service_form.label_location_type')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div onClick={() => {
                  const v = !formData.allow_home;
                  setFormData({ ...formData, allow_home: v });
                  if (v) setActiveTabPrice('home');
                  else if (formData.allow_store) setActiveTabPrice('store');
                }}
                className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                  formData.allow_home
                    ? 'bg-[var(--color-accent-light)] border-[var(--color-accent)] shadow-lg'
                    : 'bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]'
                }`}>
                <div className={`p-3 rounded-xl transition-colors ${formData.allow_home ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'}`}>
                  <Home size={20} />
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-widest leading-none mb-1">{t('service_form.location_home')}</div>
                  <div className="text-[9px] opacity-60 font-bold uppercase">{t('service_form.location_home_desc')}</div>
                </div>
              </div>

              <div onClick={() => {
                  const v = !formData.allow_store;
                  setFormData({ ...formData, allow_store: v });
                  if (v) setActiveTabPrice('store');
                  else if (formData.allow_home) setActiveTabPrice('home');
                }}
                className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                  formData.allow_store
                    ? 'bg-[var(--color-accent-light)] border-[var(--color-accent)] shadow-lg'
                    : 'bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]'
                }`}>
                <div className={`p-3 rounded-xl transition-colors ${formData.allow_store ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'}`}>
                  <Store size={20} />
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-widest leading-none mb-1">{t('service_form.location_store')}</div>
                  <div className="text-[9px] opacity-60 font-bold uppercase">{t('service_form.location_store_desc')}</div>
                </div>
              </div>
            </div>

            {willCreateTwo && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-[var(--color-accent-light)] border border-[var(--color-accent)]/30">
                <Sparkles size={16} className="text-[var(--color-accent)] shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-[var(--color-accent)] leading-relaxed">
                  {t('service_form.dual_offer_info')}
                </p>
              </div>
            )}
          </div>
        )}

        {isEditMode && editLocationType && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]">
            {editLocationType === 'home' ? <Home size={16} className="text-[var(--color-accent)]" /> : <Store size={16} className="text-[var(--color-accent)]" />}
            <span className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
              {editLocationType === 'home' ? t('service_form.edit_home_offer') : t('service_form.edit_store_offer')}
            </span>
          </div>
        )}

        {/* ── 5. PRIX & SIMULATION ──────────────────────────────── */}
        <div className="space-y-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-3xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
              {t('service_form.pricing_config')}
            </label>
            <div className="flex bg-[var(--color-bg-primary)] p-1 rounded-xl border border-[var(--color-border)]">
              {(['hour', 'fixed'] as const).map((u) => (
                <button key={u} type="button" onClick={() => setFormData({ ...formData, unit: u })}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border-none cursor-pointer ${
                    formData.unit === u ? 'bg-[var(--color-accent)] text-white shadow-lg' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}>
                  {u === 'hour' ? <Clock size={12} /> : <Lock size={12} />}
                  {u === 'hour' ? t('common.per_hour') : t('common.fixed_price')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className={`space-y-2 transition-all duration-300 ${
              !formData.allow_home || (isEditMode && editLocationType === 'store') ? 'opacity-20 grayscale pointer-events-none' : ''
            }`}>
              <label className="text-[9px] font-black uppercase text-[var(--color-accent)] flex items-center gap-2">
                <Home size={12} /> {t('service_form.price_home_label')}
              </label>
              <div className="relative">
                <input type="number" min="0" step="0.01" placeholder="0.00"
                  disabled={!formData.allow_home}
                  className={inputClass} value={formData.price_home}
                  onFocus={() => setActiveTabPrice('home')}
                  onChange={(e) => setFormData({ ...formData, price_home: e.target.value })} />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none text-[var(--color-text-muted)]">
                  <span className="text-[10px] font-black uppercase">{formData.unit === 'hour' ? '/H' : 'FIXE'}</span>
                  <Euro size={14} />
                </div>
              </div>
            </div>

            <div className={`space-y-2 transition-all duration-300 ${
              !formData.allow_store || (isEditMode && editLocationType === 'home') ? 'opacity-20 grayscale pointer-events-none' : ''
            }`}>
              <label className="text-[9px] font-black uppercase text-[var(--color-accent)] flex items-center gap-2">
                <Store size={12} /> {t('service_form.price_store_label')}
              </label>
              <div className="relative">
                <input type="number" min="0" step="0.01" placeholder="0.00"
                  disabled={!formData.allow_store}
                  className={inputClass} value={formData.price_store}
                  onFocus={() => setActiveTabPrice('store')}
                  onChange={(e) => setFormData({ ...formData, price_store: e.target.value })} />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none text-[var(--color-text-muted)]">
                  <span className="text-[10px] font-black uppercase">{formData.unit === 'hour' ? '/H' : 'FIXE'}</span>
                  <Euro size={14} />
                </div>
              </div>
            </div>
          </div>

          {/* Simulation — sans TVA sur frais */}
          {priceDetails && (
            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <button type="button" onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)] bg-[var(--color-accent-light)] hover:opacity-90 p-4 rounded-2xl transition-all border-none cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--color-accent)] text-white rounded-lg"><Info size={14} /></div>
                  <span>
                    {t('service_form.simulation_for')}{' '}
                    <span className="text-[var(--color-text-main)] font-black">
                      {activeTabPrice === 'home' ? t('service_form.location_home') : t('service_form.location_store')}
                    </span>
                  </span>
                </div>
                {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showDetails && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                  {/* Nouveau client */}
                  <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl p-5">
                    <h5 className="text-[11px] font-black uppercase text-[var(--color-text-muted)] flex items-center gap-2 mb-4">
                      <UserPlus size={14} /> {t('service_form.new_client')}
                    </h5>
                    <div className="space-y-3 text-xs font-medium text-[var(--color-text-muted)] mb-5">
                      <div className="flex justify-between">
                        <span>{t('service_form.price_entered')}</span>
                        <span className="text-[var(--color-text-main)]">{priceDetails.ttc.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('service_form.your_tva')}</span>
                        <span className="text-red-400">-{priceDetails.tvaPro.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('service_form.probelo_fees')}</span>
                        <span className="text-red-400">-{priceDetails.comm14.toFixed(2)}€</span>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-[var(--color-border)] flex justify-between items-end">
                      <span className="text-[10px] font-black text-[var(--color-accent)] uppercase">{t('service_form.net_pocket')}</span>
                      <span className="text-2xl font-black text-[var(--color-text-main)]">{priceDetails.net14.toFixed(2)}€</span>
                    </div>
                  </div>

                  {/* Client fidèle */}
                  <div className="bg-[var(--color-accent-light)] border border-[var(--color-accent)]/20 rounded-2xl p-5">
                    <h5 className="text-[11px] font-black uppercase text-[var(--color-accent)] flex items-center gap-2 mb-4">
                      <Users size={14} /> {t('service_form.loyal_client')}
                    </h5>
                    <div className="space-y-3 text-xs font-medium text-[var(--color-text-muted)] mb-5">
                      <div className="flex justify-between">
                        <span>{t('service_form.price_entered')}</span>
                        <span className="text-[var(--color-text-main)]">{priceDetails.ttc.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('service_form.your_tva')}</span>
                        <span className="text-red-400">-{priceDetails.tvaPro.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('service_form.probelo_fees')}</span>
                        <span className="text-red-400">-{priceDetails.comm9.toFixed(2)}€</span>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-[var(--color-accent)]/20 flex justify-between items-end">
                      <span className="text-[10px] font-black text-[var(--color-accent)] uppercase">{t('service_form.net_pocket')}</span>
                      <span className="text-2xl font-black text-[var(--color-text-main)]">{priceDetails.net9.toFixed(2)}€</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 6. FRAIS DE DÉPLACEMENT (si domicile) ────────────── */}
        {(formData.allow_home || (isEditMode && editLocationType === 'home')) && (
          <div className="space-y-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-3xl p-6">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] flex items-center gap-2">
              <Navigation size={12} /> {t('service_form.travel_fee_section', 'Frais de déplacement')}
            </label>
            <p className="text-[9px] text-[var(--color-text-muted)] italic">
              {t('service_form.travel_fee_hint', 'Le client ne paye pas de frais dans le rayon gratuit. Au-delà, les frais s\'ajoutent automatiquement.')}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-accent)]">{t('service_form.travel_fee_free_km', 'Km gratuits')}</label>
                <div className="relative">
                  <input type="number" min="0" step="1" placeholder="Ex: 10"
                    className={inputClass} value={formData.travel_fee_free_km}
                    onChange={e => setFormData({ ...formData, travel_fee_free_km: e.target.value })} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[var(--color-text-muted)] pointer-events-none">km</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-accent)]">{t('service_form.travel_fee_per_km', '€ / km au-delà')}</label>
                <div className="relative">
                  <input type="number" min="0" step="0.01" placeholder="Ex: 0.30"
                    className={inputClass} value={formData.travel_fee_per_km}
                    onChange={e => setFormData({ ...formData, travel_fee_per_km: e.target.value })} />
                  <Euro size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 7. ADD-ONS ────────────── */}
        <div className="space-y-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] flex items-center gap-2">
                <Package size={12} /> {t('service_form.addons_section', 'Options & Add-ons')}
              </label>
              <button type="button"
                onClick={() => setAddons([...addons, { name: '', price: '' }])}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-accent-light)] border border-[var(--color-accent)]/30 rounded-xl text-[9px] font-black uppercase tracking-widest text-[var(--color-accent)] cursor-pointer hover:bg-[var(--color-accent)] hover:text-white transition-all">
                <Plus size={11} /> {t('service_form.addon_add', 'Ajouter')}
              </button>
            </div>
            {addons.length === 0 && (
              <p className="text-[9px] text-[var(--color-text-muted)] italic text-center py-2">
                {t('service_form.addon_empty', 'Aucun add-on — ex: Pose gel, Couleur, Brushing…')}
              </p>
            )}
            <div className="space-y-2">
              {addons.map((addon, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input type="text" placeholder={t('service_form.addon_name', 'Nom de l\'option')}
                    value={addon.name}
                    onChange={e => setAddons(addons.map((a, i) => i === idx ? { ...a, name: e.target.value } : a))}
                    className={`${inputClass} flex-1`} />
                  <div className="relative w-28 shrink-0">
                    <input type="number" min="0" step="0.01" placeholder="0.00"
                      value={addon.price}
                      onChange={e => setAddons(addons.map((a, i) => i === idx ? { ...a, price: e.target.value } : a))}
                      className={inputClass} />
                    <Euro size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
                  </div>
                  <button type="button"
                    onClick={async () => {
                      if (addon.id) {
                        await supabase.from('service_addons').delete().eq('id', addon.id);
                      }
                      setAddons(addons.filter((_, i) => i !== idx));
                    }}
                    className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl border-none cursor-pointer transition-all shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

      </div>

      {/* ── Footer actions ────────────────────────────────────────── */}
      <footer className="flex items-center justify-between pt-6 border-t border-[var(--color-border)]">
        <div>
          {initialData && (
            <button type="button" onClick={handleDelete} disabled={deleteLoading}
              className="group p-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl transition-all duration-300 border-none cursor-pointer disabled:opacity-50">
              {deleteLoading ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} className="group-hover:scale-110 transition-transform" />}
            </button>
          )}
        </div>
        <div className="flex items-center gap-6">
          <button type="button" onClick={onCancel}
            className="text-xs font-black uppercase text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors bg-transparent border-none cursor-pointer">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={loading}
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl disabled:opacity-50 flex items-center gap-3 border-none cursor-pointer">
            {loading
              ? (<><Loader2 size={16} className="animate-spin" />{t('common.publishing')}</>)
              : (<><Sparkles size={16} />
                  {willCreateTwo
                    ? t('create_ad.submit_plural')
                    : initialData ? t('common.save') : t('create_ad.submit')
                  }
                </>)
            }
          </button>
        </div>
      </footer>
    </form>
  );
};

export default ServiceForm;
