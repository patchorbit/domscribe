/**
 * A104 — styled-components typography fix (font-size + line-height).
 *
 * Intent: "the callout text is unreadable — make it bigger (16px) with
 * comfortable line-height (1.5)".
 *
 * Demonstrates a multi-property typography change. The runtime
 * captureStyles snapshot reports the resolved font-size and line-height,
 * which is what the agent needs to confirm the after-state lines up.
 */
import styled from 'styled-components';

const CalloutSmall = styled.p`
  font-size: 11px;
  line-height: 1;
  color: var(--color-fg);
  background: #fefce8;
  padding: 12px 16px;
  border-radius: 6px;
  max-width: 320px;
  margin: 0;
`;

const CalloutReadable = styled.p`
  font-size: 16px;
  line-height: 1.5;
  color: var(--color-fg);
  background: #fefce8;
  padding: 12px 16px;
  border-radius: 6px;
  max-width: 320px;
  margin: 0;
`;

export function CalloutA104() {
  return (
    <CalloutSmall data-testid="A104">
      Pro tip — you can press <code>?</code> at any time to see all keyboard
      shortcuts.
    </CalloutSmall>
  );
}

export function CalloutA104Fixed() {
  return (
    <CalloutReadable data-testid="A104">
      Pro tip — you can press <code>?</code> at any time to see all keyboard
      shortcuts.
    </CalloutReadable>
  );
}
