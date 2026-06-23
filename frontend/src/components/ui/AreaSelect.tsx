import { INSTITUTIONAL_AREAS } from '../../constants/institutionalAreas';

interface AreaSelectProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  includeEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
}

export function AreaSelect({ value, onChange, required = false, includeEmpty = false, emptyLabel = 'Todas las áreas', className = 'input' }: AreaSelectProps) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={className} required={required}>
      {includeEmpty && <option value="">{emptyLabel}</option>}
      {INSTITUTIONAL_AREAS.map((area) => (
        <option key={area} value={area}>{area}</option>
      ))}
    </select>
  );
}
