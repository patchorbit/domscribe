/**
 * Tailwind styling fixture — entry point.
 *
 * Each annotation has a deterministic route under /A###/before and /A###/after.
 * The "before" route renders the component as initially shipped; "after"
 * renders the canonical correct fix. The falsifier diffs an
 * agent-edit-applied screenshot against the /after route's baseline.
 *
 * Routing is hash-based and self-contained — no react-router dependency
 * keeps the fixture surface small (pixel-diff stability is inversely
 * proportional to surface area).
 */
import { useEffect, useState } from 'react';
import { CardA001, CardA001Fixed } from './components/A001-padding';
import { AlertA002, AlertA002Fixed } from './components/A002-color-token';
import { ButtonA003, ButtonA003Fixed } from './components/A003-rounded';
import { HeadingA004, HeadingA004Fixed } from './components/A004-font-weight';
import { PanelA005, PanelA005Fixed } from './components/A005-gap';

interface Route {
  id: string;
  Component: () => JSX.Element;
}

const routes: Record<string, Route> = {
  'A001/before': { id: 'A001-before', Component: CardA001 },
  'A001/after': { id: 'A001-after', Component: CardA001Fixed },
  'A002/before': { id: 'A002-before', Component: AlertA002 },
  'A002/after': { id: 'A002-after', Component: AlertA002Fixed },
  'A003/before': { id: 'A003-before', Component: ButtonA003 },
  'A003/after': { id: 'A003-after', Component: ButtonA003Fixed },
  'A004/before': { id: 'A004-before', Component: HeadingA004 },
  'A004/after': { id: 'A004-after', Component: HeadingA004Fixed },
  'A005/before': { id: 'A005-before', Component: PanelA005 },
  'A005/after': { id: 'A005-after', Component: PanelA005Fixed },
};

export function App() {
  const [hash, setHash] = useState(() => window.location.hash.slice(1));

  useEffect(() => {
    const onChange = () => setHash(window.location.hash.slice(1));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const route = routes[hash];

  if (!route) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Tailwind styling fixture</h1>
        <ul className="space-y-1">
          {Object.keys(routes).map((path) => (
            <li key={path}>
              <a className="text-blue-600 underline" href={`#${path}`}>
                #{path}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      data-route={route.id}
      className="min-h-screen flex items-center justify-center bg-white"
    >
      <route.Component />
    </div>
  );
}
