/**
 * Metadata API
 *
 * Demonstrates Next.js Metadata API patterns.
 * In a real Next.js app, metadata is exported from page/layout files.
 * Here we simulate the pattern for fixture testing.
 */

import { CaptureIcon } from './CaptureIcon';

export const metadata = {
  title: 'Domscribe Test Fixture',
  description: 'Next.js test fixture for Domscribe transform validation',
  openGraph: {
    title: 'Domscribe Test Fixture',
    description: 'Testing Domscribe transforms in Next.js',
    type: 'website',
  },
};

export function Metadata() {
  return (
    <div className="component-demo" data-testid="metadata">
      <h2>Metadata API</h2>
      <p>Next.js Metadata API for SEO and social sharing.</p>

      <div className="demo-section">
        <div className="demo-box capture-widget">
          <CaptureIcon />
        </div>
        <div className="demo-card" data-testid="metadata-display">
          <h3>Page Metadata</h3>
          <dl>
            <dt>Title:</dt>
            <dd data-testid="meta-title">{metadata.title}</dd>

            <dt>Description:</dt>
            <dd data-testid="meta-description">{metadata.description}</dd>

            <dt>OG Title:</dt>
            <dd data-testid="meta-og-title">{metadata.openGraph.title}</dd>

            <dt>OG Type:</dt>
            <dd data-testid="meta-og-type">{metadata.openGraph.type}</dd>
          </dl>
        </div>

        <div className="info-box">
          <p>
            In Next.js, metadata is exported as a static object or generated
            dynamically via <code>generateMetadata()</code>. Domscribe captures
            these at build time.
          </p>
        </div>
      </div>
    </div>
  );
}
