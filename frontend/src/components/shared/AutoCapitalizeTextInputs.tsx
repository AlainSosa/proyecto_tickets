import { ReactNode, FormEvent } from 'react';

const excludedInputTypes = new Set([
  'email',
  'password',
  'search',
  'url',
  'tel',
  'number',
  'date',
  'datetime-local',
  'time',
  'month',
]);

function capitalizeFirstTextLetter(value: string) {
  return value.replace(/^(\s*)([a-záéíóúñü])/i, (_match, spaces: string, letter: string) => {
    return `${spaces}${letter.toLocaleUpperCase('es-ES')}`;
  });
}

function shouldSkip(element: HTMLInputElement | HTMLTextAreaElement) {
  if (element.dataset.noAutoCapitalize === 'true') return true;
  if (element instanceof HTMLInputElement && excludedInputTypes.has(element.type)) return true;
  if (element.readOnly || element.disabled) return true;
  return false;
}

export function AutoCapitalizeTextInputs({ children }: { children: ReactNode }) {
  const handleInputCapture = (event: FormEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    if (shouldSkip(target)) return;

    const nextValue = capitalizeFirstTextLetter(target.value);
    if (nextValue === target.value) return;

    const selectionStart = target.selectionStart;
    const selectionEnd = target.selectionEnd;
    target.value = nextValue;
    if (selectionStart !== null && selectionEnd !== null) {
      target.setSelectionRange(selectionStart, selectionEnd);
    }
  };

  return <div onInputCapture={handleInputCapture}>{children}</div>;
}
