/**
 * Portals - Tests ReactDOM.createPortal()
 *
 * Validates that Domscribe handles:
 * - Elements rendered outside parent DOM hierarchy via portals
 * - Modal/tooltip patterns that use portals
 * - Resolution should point to component defining portal, not portal target
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CaptureIcon } from './CaptureIcon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  // Portal target - typically document.body or a dedicated container
  const portalTarget = document.getElementById('portal-root') || document.body;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          x
        </button>
        {children}
      </div>
    </div>,
    portalTarget,
  );
}

function Tooltip({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  const [isVisible, setIsVisible] = useState(false);

  const portalTarget = document.getElementById('portal-root') || document.body;

  return (
    <div
      className="tooltip-trigger"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible &&
        createPortal(
          <div className="tooltip-content">{text}</div>,
          portalTarget,
        )}
    </div>
  );
}

export function Portals() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDirectPortalOpen, setIsDirectPortalOpen] = useState(false);

  return (
    <div className="portals">
      <section>
        <h4>Modal Portal</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <button onClick={() => setIsModalOpen(true)}>Open Modal</button>
          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
            <h2>Modal Title</h2>
            <p>This content is rendered via createPortal()</p>
            <button onClick={() => setIsModalOpen(false)}>Close</button>
          </Modal>
        </div>
      </section>

      <section>
        <h4>Tooltip Portal</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <Tooltip text="This is a tooltip rendered via portal">
            <span className="tooltip-example">Hover me for tooltip</span>
          </Tooltip>
        </div>
      </section>

      <section>
        <h4>Direct Portal (No Wrapper Component)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <button onClick={() => setIsDirectPortalOpen(!isDirectPortalOpen)}>
            {isDirectPortalOpen ? 'Hide' : 'Show'} Direct Portal
          </button>
          <div className="nested-portal-container">
            {isDirectPortalOpen &&
              createPortal(
                <div className="portaled-content">
                  <p>Direct portal without wrapper component</p>
                  <button onClick={() => setIsDirectPortalOpen(false)}>
                    Close Portal
                  </button>
                </div>,
                document.getElementById('portal-root') || document.body,
              )}
          </div>
        </div>
      </section>

      {/* Portal root div (would typically be in index.html) */}
      <div id="portal-root" />
    </div>
  );
}
