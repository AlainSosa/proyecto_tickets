import { Search, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
}: SearchInputProps) {
  const { t } = useLanguage();
  const inputPlaceholder = placeholder === 'Search...' ? t('search') : placeholder;

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={inputPlaceholder}
        data-no-auto-capitalize="true"
        className="input pl-10 pr-8"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-700"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
