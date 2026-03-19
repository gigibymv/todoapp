/**
 * Centralised context/label colour utilities.
 * Default contexts use CSS tokens (Tailwind classes).
 * Custom labels use an inline HSL derived from the stored color string.
 */

export interface CustomLabel {
  id: string;
  name: string;
  color: string; // HSL string e.g. "271 69% 49%"
}

/** Tailwind bg class for dot indicators */
export function contextDotClass(ctx: string): string {
  const map: Record<string, string> = {
    work: 'bg-gigi-work',
    school: 'bg-gigi-school',
    personal: 'bg-gigi-personal',
    admin: 'bg-gigi-admin',
  };
  return map[ctx] ?? '';
}

/** Tailwind border-l class for timeline items */
export function contextBorderClass(ctx: string): string {
  const map: Record<string, string> = {
    work: 'border-l-gigi-work',
    school: 'border-l-gigi-school',
    personal: 'border-l-gigi-personal',
    admin: 'border-l-gigi-admin',
  };
  return map[ctx] ?? 'border-l-muted-foreground/30';
}

/** Tailwind border-l + bg/5 classes for calendar items */
export function contextCalClass(ctx: string): string {
  const map: Record<string, string> = {
    work: 'border-l-gigi-work bg-gigi-work/5',
    school: 'border-l-gigi-school bg-gigi-school/5',
    personal: 'border-l-gigi-personal bg-gigi-personal/5',
    admin: 'border-l-gigi-admin bg-gigi-admin/5',
  };
  return map[ctx] ?? 'border-l-foreground/20 bg-secondary';
}

/** For custom labels: returns an inline style object with the colour */
export function customLabelStyle(color: string) {
  return { backgroundColor: `hsl(${color} / 1)` };
}

/** Resolve label display name from defaults + custom list */
export function labelName(ctx: string, customLabels: CustomLabel[]): string {
  const defaults: Record<string, string> = {
    work: 'Work', school: 'School', admin: 'Admin', personal: 'Personal',
  };
  if (defaults[ctx]) return defaults[ctx];
  return customLabels.find(l => l.id === ctx)?.name ?? ctx;
}

/** A deterministic palette for newly created custom labels */
const PALETTE = [
  '199 80% 44%',
  '340 75% 55%',
  '160 60% 40%',
  '45 90% 50%',
  '280 65% 50%',
  '20 80% 52%',
];

export function nextPaletteColor(existing: CustomLabel[]): string {
  return PALETTE[existing.length % PALETTE.length];
}
