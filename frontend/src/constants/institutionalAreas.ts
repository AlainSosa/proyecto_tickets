export const INSTITUTIONAL_AREAS = [
  'Gabinete',
  'Consulado',
  'Administración',
  'CCOM',
  'Fusileros',
  'Residencia',
] as const;

export type InstitutionalArea = typeof INSTITUTIONAL_AREAS[number];

export const DEFAULT_INSTITUTIONAL_AREA: InstitutionalArea = 'Administración';
