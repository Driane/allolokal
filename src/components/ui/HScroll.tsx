import { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HScrollProps {
  children: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
  /** CSS color value for the fade gradient (match parent bg). Default: var(--color-bg-primary) */
  bg?: string;
}

const HScroll: React.FC<HScrollProps> = ({
  children,
  className = '',
  wrapperClassName = '',
  bg = 'var(--color-bg-primary)',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(false);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', sync); ro.disconnect(); };
  }, [sync]);

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' });
  };

  const chevronCls = 'pointer-events-auto flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] shadow-sm transition-colors shrink-0';

  return (
    <div className={`relative ${wrapperClassName}`}>
      <div ref={ref} className={`overflow-x-auto hscroll-hide-sb ${className}`}>
        {children}
      </div>

      {canLeft && (
        <div
          className="absolute left-0 top-0 bottom-0 flex items-center pointer-events-none z-10"
          style={{ width: 56, background: `linear-gradient(to right, ${bg} 35%, transparent)` }}
        >
          <button onClick={() => go(-1)} className={`${chevronCls} ml-1`} tabIndex={-1} aria-label="Défiler à gauche">
            <ChevronLeft size={11} />
          </button>
        </div>
      )}

      {canRight && (
        <div
          className="absolute right-0 top-0 bottom-0 flex items-center justify-end pointer-events-none z-10"
          style={{ width: 56, background: `linear-gradient(to left, ${bg} 35%, transparent)` }}
        >
          <button onClick={() => go(1)} className={`${chevronCls} mr-1`} tabIndex={-1} aria-label="Défiler à droite">
            <ChevronRight size={11} />
          </button>
        </div>
      )}
    </div>
  );
};

export default HScroll;
