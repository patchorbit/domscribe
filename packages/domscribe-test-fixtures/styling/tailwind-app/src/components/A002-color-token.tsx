/**
 * A002 — Tailwind color-token annotation.
 *
 * Intent: "the alert is too generic — use the brand color from the design
 * system instead of `text-red-500`".
 *
 * The brand color is exposed both as a Tailwind theme extension
 * (`text-brand-accent`) AND as a `--color-accent` CSS var on `:root`. The
 * runtime captureStyles snapshot exposes both — agent should prefer the
 * token name (`brand.accent`) over the hex.
 */
import { type ReactNode } from 'react';

function AlertShell({
  children,
  color,
}: {
  children: ReactNode;
  color: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 border border-slate-200 rounded-md px-4 py-3 ${color}`}
      data-testid="A002"
    >
      <span aria-hidden>★</span>
      {children}
    </div>
  );
}

export function AlertA002() {
  // BEFORE: text-red-500 — generic Tailwind palette, not the design token.
  return (
    <AlertShell color="text-red-500 font-medium">
      Your trial expires in 3 days.
    </AlertShell>
  );
}

export function AlertA002Fixed() {
  // AFTER: text-brand-accent — resolves to var(--color-accent).
  return (
    <AlertShell color="text-brand-accent font-medium">
      Your trial expires in 3 days.
    </AlertShell>
  );
}
