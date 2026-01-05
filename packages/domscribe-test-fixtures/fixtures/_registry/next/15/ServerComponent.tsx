/**
 * Server Component Pattern
 *
 * Demonstrates Next.js React Server Components (RSC).
 * Server components are the default in Next.js App Router.
 * They render on the server and send HTML to the client.
 */

// Note: No 'use client' directive — this is a server component by default

import { CaptureIcon } from './CaptureIcon';

interface User {
  id: number;
  name: string;
  email: string;
}

// Simulated server-side data fetching
const users: User[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
  { id: 3, name: 'Charlie', email: 'charlie@example.com' },
];

export function ServerComponent() {
  return (
    <div className="component-demo" data-testid="server-component">
      <h2>Server Component</h2>
      <p>This component renders on the server (zero client JS).</p>

      <div className="demo-box capture-widget">
        <CaptureIcon />
        <div className="card-grid">
          {users.map((user) => (
            <div
              key={user.id}
              className="demo-card"
              data-testid={`user-${user.id}`}
            >
              <h3>{user.name}</h3>
              <p>{user.email}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="info-box">
        <p>
          Server Components have no client-side Fiber — props/state live on the
          server. Domscribe captures them at build time via manifest data.
        </p>
      </div>
    </div>
  );
}
