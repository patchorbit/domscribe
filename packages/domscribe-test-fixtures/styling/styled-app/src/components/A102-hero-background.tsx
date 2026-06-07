/**
 * A102 — styled-components hero background swap to token.
 *
 * Intent: "the hero is using a hardcoded color — switch to the surface
 * token (var(--color-surface)) so it tracks the theme".
 *
 * captureStyles runtime snapshot reports both the resolved background-color
 * AND the --color-surface var, letting the agent confirm the token is in
 * scope at this element.
 */
import styled from 'styled-components';

const HeroHardcoded = styled.section`
  background: #e0f2fe;
  color: var(--color-fg);
  padding: 24px 32px;
  border-radius: 8px;
  width: 320px;
`;

const HeroTokenized = styled.section`
  background: var(--color-surface);
  color: var(--color-fg);
  padding: 24px 32px;
  border-radius: 8px;
  width: 320px;
`;

const HERO_CONTENT = (
  <>
    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Welcome back</h2>
    <p style={{ margin: '4px 0 0', fontSize: 14 }}>
      Pick up where you left off.
    </p>
  </>
);

export function HeroA102() {
  return <HeroHardcoded data-testid="A102">{HERO_CONTENT}</HeroHardcoded>;
}

export function HeroA102Fixed() {
  return <HeroTokenized data-testid="A102">{HERO_CONTENT}</HeroTokenized>;
}
