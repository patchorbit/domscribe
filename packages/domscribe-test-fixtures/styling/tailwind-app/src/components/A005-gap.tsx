/**
 * A005 — Tailwind layout-gap annotation.
 *
 * Intent: "the items in the panel are touching — add gap-4 so they
 * breathe".
 *
 * Tests layout-spacing fixes (flexbox gap). Runtime captureStyles will
 * record `gap: normal` vs `gap: 16px`.
 */
function PanelShell({ gap }: { gap: string }) {
  return (
    <div
      data-testid="A005"
      className={`flex bg-slate-50 border border-slate-200 rounded-md p-4 w-72 ${gap}`}
    >
      <span className="bg-brand-accent text-white rounded px-3 py-1">New</span>
      <span className="bg-slate-200 text-brand rounded px-3 py-1">Beta</span>
      <span className="bg-slate-200 text-brand rounded px-3 py-1">Pro</span>
    </div>
  );
}

export function PanelA005() {
  return <PanelShell gap="" />;
}

export function PanelA005Fixed() {
  return <PanelShell gap="gap-4" />;
}
