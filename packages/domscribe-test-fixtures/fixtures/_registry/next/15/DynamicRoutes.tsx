'use client';

/**
 * Dynamic Routes
 *
 * Demonstrates Next.js dynamic routing patterns.
 * Simulates [slug] and [...catchAll] route patterns.
 */

import { useState } from 'react';
import { CaptureIcon } from './CaptureIcon';

interface Route {
  path: string;
  params: Record<string, string>;
}

const routes: Route[] = [
  { path: '/blog/hello-world', params: { slug: 'hello-world' } },
  { path: '/blog/nextjs-tutorial', params: { slug: 'nextjs-tutorial' } },
  {
    path: '/docs/getting-started/install',
    params: { slug: 'getting-started', section: 'install' },
  },
];

export function DynamicRoutes() {
  const [activeRoute, setActiveRoute] = useState<Route>(routes[0]);

  return (
    <div className="component-demo" data-testid="dynamic-routes">
      <h2>Dynamic Routes</h2>
      <p>Simulated Next.js dynamic route patterns.</p>

      <div className="demo-section">
        <div className="demo-box capture-widget">
          <CaptureIcon />
        </div>
        <div className="route-list">
          {routes.map((route) => (
            <button
              key={route.path}
              className={`btn ${activeRoute.path === route.path ? 'btn-primary' : 'btn-secondary'}`}
              data-testid={`route-${route.params.slug}`}
              onClick={() => setActiveRoute(route)}
            >
              {route.path}
            </button>
          ))}
        </div>

        <div className="route-details" data-testid="route-details">
          <h3>Active Route: {activeRoute.path}</h3>
          <dl>
            {Object.entries(activeRoute.params).map(([key, value]) => (
              <div key={key}>
                <dt>{key}:</dt>
                <dd data-testid={`param-${key}`}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
