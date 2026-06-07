/**
 * A003 — Tailwind border-radius annotation.
 *
 * Intent: "the button corners look square — make them rounded-full like the
 * rest of our action buttons".
 *
 * Demonstrates a conditional-class transformation: the `rounded` utility
 * needs to be swapped, not added. Runtime captureStyles will report
 * `border-radius: 4px` vs `border-radius: 9999px`.
 */
function ButtonShell({ rounded }: { rounded: string }) {
  return (
    <button
      type="button"
      data-testid="A003"
      className={`bg-brand-accent text-white px-6 py-2 font-medium ${rounded}`}
    >
      Continue
    </button>
  );
}

export function ButtonA003() {
  return <ButtonShell rounded="rounded" />;
}

export function ButtonA003Fixed() {
  return <ButtonShell rounded="rounded-full" />;
}
