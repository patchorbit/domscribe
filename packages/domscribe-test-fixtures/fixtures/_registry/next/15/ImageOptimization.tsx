/**
 * Image Optimization
 *
 * Demonstrates Next.js Image component patterns.
 * Uses standard <img> tags since next/image requires the Next.js server.
 * In a real Next.js fixture, these would use next/image.
 */

import { CaptureIcon } from './CaptureIcon';

export function ImageOptimization() {
  return (
    <div className="component-demo" data-testid="image-optimization">
      <h2>Image Optimization</h2>
      <p>
        Next.js Image component patterns (simulated with standard img tags).
      </p>

      <div className="demo-section">
        <div className="demo-box capture-widget">
          <CaptureIcon />
        </div>
        <div className="card-grid">
          <div className="demo-card" data-testid="img-responsive">
            <h3>Responsive Image</h3>
            <img
              src="https://picsum.photos/seed/domscribe1/400/300"
              alt="Responsive demo"
              width={400}
              height={300}
              loading="lazy"
              style={{ width: '100%', height: 'auto' }}
            />
          </div>

          <div className="demo-card" data-testid="img-fixed">
            <h3>Fixed Size Image</h3>
            <img
              src="https://picsum.photos/seed/domscribe2/200/200"
              alt="Fixed size demo"
              width={200}
              height={200}
              loading="lazy"
            />
          </div>

          <div className="demo-card" data-testid="img-priority">
            <h3>Priority Image (LCP)</h3>
            <img
              src="https://picsum.photos/seed/domscribe3/600/400"
              alt="Priority demo"
              width={600}
              height={400}
              style={{ width: '100%', height: 'auto' }}
            />
            <p className="info-text">
              In Next.js, priority images skip lazy loading for LCP
              optimization.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
