import React from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme,type Theme } from '../../contexts/ThemeContext';

interface ThemeToggleProps {
  /** 'icon' : 3 boutons icônes compacts
   *  'pill' : sélecteur en pill avec labels (ProfilePage) */
  variant?: 'icon' | 'pill';
}

const options: { value: Theme; Icon: React.ElementType; label: string }[] = [
  { value: 'light',   Icon: Sun,      label: 'Blanc' },
  { value: 'dark',    Icon: Moon,     label: 'Gris'  },
  { value: 'premium', Icon: Sparkles, label: 'Noir'  },
];

/* ── Variante icônes (Navbar) ─────────────────────────────────────────────── */
const IconToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-1">
      {options.map(({ value, Icon, label }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            title={label}
            aria-label={`Thème ${label}`}
            className={`
              w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200
              ${isActive
                ? 'bg-[var(--color-accent)] text-white shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-tertiary)]'
              }
            `}
          >
            <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
          </button>
        );
      })}
    </div>
  );
};

/* ── Variante pill (ProfilePage / Settings) ───────────────────────────────── */
const PillToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-1.5">
        {options.map(({ value, Icon, label }) => {
          const isActive = theme === value;
          return (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest
                transition-all duration-200 border-none cursor-pointer flex-1 justify-center
                ${isActive
                  ? value === 'premium'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md'
                    : 'bg-[var(--color-accent)] text-white shadow-md'
                  : 'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-tertiary)]'
                }
              `}
            >
              <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ── Export principal ─────────────────────────────────────────────────────── */
const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'icon' }) => {
  return variant === 'pill' ? <PillToggle /> : <IconToggle />;
};

export default ThemeToggle;