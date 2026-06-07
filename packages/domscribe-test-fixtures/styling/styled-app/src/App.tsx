/**
 * styled-components fixture — entry point.
 *
 * Mirrors the Tailwind app's hash-route structure. Each annotation has
 * a /before and /after that render the original and canonical-fixed version
 * of the same component. CSS-in-JS classes are runtime-generated hashes,
 * so the falsifier cannot rely on className for source attribution — the
 * MCP tool's build-time `styleSource` (Task A's domain) is the only path
 * back to the `styled.X` source block for those.
 */
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { BadgeA101, BadgeA101Fixed } from './components/A101-badge-padding';
import { HeroA102, HeroA102Fixed } from './components/A102-hero-background';
import {
  ToggleA103,
  ToggleA103Fixed,
} from './components/A103-toggle-border-radius';
import {
  CalloutA104,
  CalloutA104Fixed,
} from './components/A104-callout-typography';
import { StackA105, StackA105Fixed } from './components/A105-stack-gap';

const Centered = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
`;

interface Route {
  id: string;
  Component: () => JSX.Element;
}

const routes: Record<string, Route> = {
  'A101/before': { id: 'A101-before', Component: BadgeA101 },
  'A101/after': { id: 'A101-after', Component: BadgeA101Fixed },
  'A102/before': { id: 'A102-before', Component: HeroA102 },
  'A102/after': { id: 'A102-after', Component: HeroA102Fixed },
  'A103/before': { id: 'A103-before', Component: ToggleA103 },
  'A103/after': { id: 'A103-after', Component: ToggleA103Fixed },
  'A104/before': { id: 'A104-before', Component: CalloutA104 },
  'A104/after': { id: 'A104-after', Component: CalloutA104Fixed },
  'A105/before': { id: 'A105-before', Component: StackA105 },
  'A105/after': { id: 'A105-after', Component: StackA105Fixed },
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
      <div style={{ padding: 32 }}>
        <h1>styled-components styling fixture</h1>
        <ul>
          {Object.keys(routes).map((path) => (
            <li key={path}>
              <a href={`#${path}`}>#{path}</a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <Centered data-route={route.id}>
      <route.Component />
    </Centered>
  );
}
