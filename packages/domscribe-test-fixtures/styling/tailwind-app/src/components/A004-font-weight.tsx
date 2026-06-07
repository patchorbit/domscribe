/**
 * A004 — Tailwind typography (font-weight) annotation.
 *
 * Intent: "the section heading is too light — bump it to font-bold to
 * match the page hierarchy".
 */
function HeadingShell({ weight }: { weight: string }) {
  return (
    <h2 data-testid="A004" className={`text-2xl text-brand ${weight}`}>
      Recent activity
    </h2>
  );
}

export function HeadingA004() {
  return <HeadingShell weight="font-normal" />;
}

export function HeadingA004Fixed() {
  return <HeadingShell weight="font-bold" />;
}
