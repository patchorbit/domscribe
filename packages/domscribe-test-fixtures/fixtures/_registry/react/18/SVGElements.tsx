/**
 * SVGElements - Tests SVG namespace elements
 *
 * Validates that Domscribe handles:
 * - SVG elements (<svg>, <path>, <circle>, <rect>, etc.)
 * - SVG namespace vs HTML namespace
 * - Nested SVG structures
 * - SVG with dynamic attributes
 */

import { useState } from 'react';
import { CaptureIcon } from './CaptureIcon';

export function SVGElements() {
  const [radius, setRadius] = useState(30);

  return (
    <div className="svg-elements">
      <section>
        <h4>Basic SVG Shapes</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <svg width="200" height="200" className="basic-svg">
            <circle cx="50" cy="50" r="40" fill="blue" className="svg-circle" />
            <rect
              x="120"
              y="10"
              width="60"
              height="60"
              fill="red"
              className="svg-rect"
            />
            <line
              x1="0"
              y1="100"
              x2="200"
              y2="100"
              stroke="green"
              strokeWidth="2"
            />
            <ellipse cx="50" cy="150" rx="40" ry="20" fill="purple" />
          </svg>
        </div>
      </section>

      <section>
        <h4>SVG Path Elements</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <svg width="200" height="100" className="path-svg">
            <path
              d="M10 10 L90 90 L10 90 Z"
              fill="orange"
              stroke="black"
              strokeWidth="2"
              className="svg-path"
            />
            <path
              d="M110 10 Q 150 50, 190 10"
              fill="none"
              stroke="blue"
              strokeWidth="2"
            />
          </svg>
        </div>
      </section>

      <section>
        <h4>Dynamic SVG (State-Driven)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div className="dynamic-svg">
            <input
              type="range"
              min="10"
              max="50"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            />
            <svg width="200" height="100">
              <circle
                cx="100"
                cy="50"
                r={radius}
                fill="teal"
                className="dynamic-circle"
              />
            </svg>
          </div>
        </div>
      </section>

      <section>
        <h4>SVG Groups (g element)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <svg width="200" height="200" className="grouped-svg">
            <g transform="translate(50, 50)" className="svg-group">
              <circle cx="0" cy="0" r="30" fill="yellow" />
              <circle cx="40" cy="0" r="30" fill="cyan" />
            </g>
            <g transform="translate(50, 120)" className="svg-group-2">
              <rect x="0" y="0" width="30" height="30" fill="magenta" />
              <rect x="40" y="0" width="30" height="30" fill="lime" />
            </g>
          </svg>
        </div>
      </section>

      <section>
        <h4>SVG Text Element</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <svg width="200" height="50" className="text-svg">
            <text x="10" y="30" fill="black" fontSize="20" className="svg-text">
              SVG Text
            </text>
          </svg>
        </div>
      </section>

      <section>
        <h4>SVG Defs & Use (Reusable Elements)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <svg width="200" height="100" className="defs-svg">
            <defs>
              <circle id="my-circle" r="20" fill="pink" />
            </defs>
            <use href="#my-circle" x="50" y="50" />
            <use href="#my-circle" x="100" y="50" />
            <use href="#my-circle" x="150" y="50" />
          </svg>
        </div>
      </section>

      <section>
        <h4>Polygon & Polyline</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <svg width="200" height="100" className="polygon-svg">
            <polygon
              points="50,10 90,90 10,90"
              fill="brown"
              className="svg-polygon"
            />
            <polyline
              points="110,10 150,50 190,10 190,90"
              fill="none"
              stroke="navy"
              strokeWidth="2"
              className="svg-polyline"
            />
          </svg>
        </div>
      </section>
    </div>
  );
}
