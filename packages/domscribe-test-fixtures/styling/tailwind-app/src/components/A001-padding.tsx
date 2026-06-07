/**
 * A001 — Tailwind padding annotation.
 *
 * Intent: "the card padding is too tight, make it match the design (32px / p-8)".
 *
 * The pair shows the classic Tailwind utility-class fix: bump `p-2` to `p-8`.
 * The runtime captureStyles snapshot will record `padding: 8px` vs `32px` —
 * the ground truth that lets an agent confirm the change took without
 * having to re-render mentally.
 */
import { type ReactNode } from 'react';

function CardShell({
  children,
  padding,
  testid,
}: {
  children: ReactNode;
  padding: string;
  testid: string;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-md w-64">
      <div className={padding} data-testid={testid}>
        {children}
      </div>
    </div>
  );
}

const CARD_BODY = (
  <>
    <p className="font-semibold text-slate-900">Order #1042</p>
    <p className="text-slate-600">Two items · ships Friday</p>
  </>
);

export function CardA001() {
  // BEFORE: p-2 — visibly cramped against the slate background.
  return (
    <CardShell padding="p-2" testid="A001">
      {CARD_BODY}
    </CardShell>
  );
}

export function CardA001Fixed() {
  return (
    <CardShell padding="p-8" testid="A001">
      {CARD_BODY}
    </CardShell>
  );
}
