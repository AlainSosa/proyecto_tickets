import { Languages } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export function LanguageToggle({ variant = 'light' }: { variant?: 'light' | 'solid' }) {
  const { toggleLanguage, t } = useLanguage();
  const isSolid = variant === 'solid';

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      title={t('languageLabel')}
      aria-label={t('languageLabel')}
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
        isSolid
          ? 'bg-white/10 text-white hover:bg-white/20'
          : 'border border-slate-200 bg-white text-primary-900 shadow-sm hover:bg-brand-50 hover:text-brand-700'
      }`}
    >
      <Languages className="h-4 w-4" />
      {t('languageLabel')}
    </button>
  );
}
