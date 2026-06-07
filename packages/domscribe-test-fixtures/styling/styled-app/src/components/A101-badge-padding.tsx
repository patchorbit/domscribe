/**
 * A101 — styled-components badge padding.
 *
 * Intent: "the New badge is too cramped — bump the padding so it has
 * more room around the label".
 *
 * Demonstrates the CSS-in-JS case where the runtime className is a
 * generated hash (`sc-1a2b3c`) — the only path back to the `styled.span`
 * source block is via the build-time styleSource on the manifest entry.
 */
import styled from 'styled-components';

const BadgeTight = styled.span`
  background: var(--color-accent);
  color: white;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 4px;
`;

const BadgeRoomy = styled.span`
  background: var(--color-accent);
  color: white;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 4px;
`;

export function BadgeA101() {
  return <BadgeTight data-testid="A101">NEW</BadgeTight>;
}

export function BadgeA101Fixed() {
  return <BadgeRoomy data-testid="A101">NEW</BadgeRoomy>;
}
