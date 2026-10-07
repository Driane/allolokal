import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// SUGGESTIONS : [Clé de traduction, catégorie cible, sous-catégorie optionnelle]
const SUGGESTIONS: [string, string, string?][] = [
  ['hero.suggestions.massage',      'wellbeing', 'massage'],
  ['hero.suggestions.hairdressing',  'beauty',    'hairdressing'],
  ['hero.suggestions.plumbing',      'home',      'plumbing'],
  ['hero.suggestions.baby_sitter',   'family',    'children'],
  ['hero.suggestions.private_chef',  'premium',   'cooking_meals'],
  ['hero.suggestions.sport_coach',   'wellbeing', 'sport_coaching'],
  ['hero.suggestions.housekeeping',  'cleaning',  'housekeeping'],
  ['hero.suggestions.gardening',     'home',      'gardening'],
  ['hero.suggestions.nails',         'beauty',    'nails'],
  ['hero.suggestions.electricity',   'home',      'electricity'],
  ['hero.suggestions.pets',          'family',    'pets'],
  ['hero.suggestions.events',        'premium',   'events'],
];

interface TypewriterSearchProps {
  onCategoryChange?: (category: string | null) => void;
}

const TypewriterSearch: React.FC<TypewriterSearchProps> = ({ onCategoryChange }) => {
  const navigate   = useNavigate();
  const { t, i18n } = useTranslation(); // On récupère i18n pour écouter le changement de langue
  const inputRef   = useRef<HTMLInputElement>(null);

  const [displayText, setDisplayText]     = useState('');
  const [isDeleting, setIsDeleting]       = useState(false);
  const [suggIndex, setSuggIndex]         = useState(0);
  const [charIndex, setCharIndex]         = useState(0);
  const [isPaused, setIsPaused]           = useState(false);
  const [isFocused, setIsFocused]         = useState(false);
  const [userInput, setUserInput]         = useState('');
  const [isUserTyping, setIsUserTyping]   = useState(false);

  const currentSugg = SUGGESTIONS[suggIndex];

  // Notifier la Navbar de la catégorie survolée
  const notifyCategory = useCallback((cat: string | null) => {
    onCategoryChange?.(cat);
  }, [onCategoryChange]);

  // Reset animation state on language change — batched by React 18, no cascading renders
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setDisplayText('');
    setCharIndex(0);
    setIsDeleting(false);
    setIsPaused(false);
  }, [i18n.language]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Typewriter engine
  useEffect(() => {
    if (isFocused || isUserTyping) return;

    const [translationKey, cat] = currentSugg;
    const text = t(translationKey); // Traduction dynamique du texte courant

    const tick = () => {
      if (isPaused) {
        setTimeout(() => setIsPaused(false), 1800);
        return;
      }

      if (!isDeleting) {
        if (charIndex < text.length) {
          setDisplayText(text.slice(0, charIndex + 1));
          setCharIndex(c => c + 1);
          if (charIndex === 0) notifyCategory(cat);
        } else {
          setIsPaused(true);
          setIsDeleting(true);
        }
      } else {
        if (charIndex > 0) {
          setDisplayText(text.slice(0, charIndex - 1));
          setCharIndex(c => c - 1);
        } else {
          setIsDeleting(false);
          setDisplayText('');
          notifyCategory(null);
          setSuggIndex(i => (i + 1) % SUGGESTIONS.length);
        }
      }
    };

    const speed = isPaused ? 0 : isDeleting ? 40 : 70;
    const timer = setTimeout(tick, speed);
    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, isPaused, isFocused, isUserTyping, currentSugg, notifyCategory, t]);

  // Navigation au submit
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = isUserTyping ? userInput : displayText;
    if (!query.trim()) return;

    if (!isUserTyping) {
      const [, cat, sub] = currentSugg;
      const params = new URLSearchParams({ category: cat });
      if (sub) params.set('sub', sub);
      navigate(`/findpro?${params.toString()}`);
    } else {
      navigate(`/findpro?search=${encodeURIComponent(userInput.trim())}`);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    notifyCategory(null);
  };

  const handleBlur = () => {
    if (!userInput) {
      setIsFocused(false);
      setIsUserTyping(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserInput(val);
    setIsUserTyping(val.length > 0);
  };

  const handleSuggestionClick = (sugg: [string, string, string?]) => {
    const [, cat, sub] = sugg;
    const params = new URLSearchParams({ category: cat });
    if (sub) params.set('sub', sub);
    navigate(`/findpro?${params.toString()}`);
  };

  const shownText = isFocused ? userInput : (isUserTyping ? userInput : displayText);
  const placeholder = isFocused ? t('hero.search_placeholder', 'massage, coiffure, plombier...') : '';

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative group">
        <div className={`absolute -inset-1 rounded-[2rem] transition-opacity duration-500 blur-xl ${
          isFocused
            ? 'opacity-60 bg-gradient-to-r from-[var(--color-accent)] to-purple-500'
            : 'opacity-20 bg-[var(--color-accent)]'
        }`} />

        <div className="relative flex items-center bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[1.75rem] shadow-2xl overflow-hidden">
          <Search
            size={20}
            className="absolute left-6 text-[var(--color-accent)] shrink-0 z-10"
          />

          <div className="flex-1 relative pl-14 pr-4 py-5">
            {!isFocused && !isUserTyping && (
              <div className="absolute inset-0 pl-14 pr-4 flex items-center pointer-events-none">
                <span className="text-[var(--color-text-main)] font-bold text-base">
                  {t('hero.search_prefix', 'Je cherche ')}{' '}
                </span>
                <span className="text-[var(--color-accent)] font-black text-base ml-1">
                  {displayText}
                  <span className="inline-block w-[2px] h-5 bg-[var(--color-accent)] ml-[1px] animate-pulse align-middle" />
                </span>
              </div>
            )}

            <input
              ref={inputRef}
              type="text"
              value={shownText}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              autoComplete="off"
              className={`w-full bg-transparent border-none outline-none font-bold text-base text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] ${
                !isFocused && !isUserTyping ? 'opacity-0' : 'opacity-100'
              }`}
            />
          </div>

          <button
            type="submit"
            className="shrink-0 mr-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-6 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center gap-2 border-none cursor-pointer"
          >
            <span className="hidden sm:inline">{t('hero.search_btn', 'Trouver')}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </form>

      {/* Suggestions rapides sous la barre — cachées sur mobile */}
      <div className="hidden sm:flex flex-wrap gap-2 justify-center mt-4">
        {SUGGESTIONS.slice(0, 6).map((sugg, i) => {
          const [translationKey, cat] = sugg;
          const COLORS: Record<string, string> = {
            beauty:   '#ec4899', home:     '#3b82f6', cleaning: '#22c55e',
            wellbeing:'#a855f7', family:   '#f97316', premium:  '#eab308',
          };
          return (
            <button
              key={i}
              onClick={() => handleSuggestionClick(sugg)}
              className="px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer hover:scale-105"
              style={{
                backgroundColor: `${COLORS[cat]}15`,
                borderColor:      `${COLORS[cat]}40`,
                color:             COLORS[cat],
              }}
            >
              {t(translationKey)} {/* Traduction ici aussi pour les boutons */}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TypewriterSearch;