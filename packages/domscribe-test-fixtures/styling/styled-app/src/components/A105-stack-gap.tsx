/**
 * A105 — styled-components flex-gap annotation.
 *
 * Intent: "the cards in the stack are touching — add gap: 12px so they
 * have consistent spacing".
 */
import styled from 'styled-components';

const StackTight = styled.div`
  display: flex;
  flex-direction: column;
  width: 240px;
`;

const StackSpaced = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 240px;
`;

const Card = styled.div`
  background: var(--color-surface);
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px 16px;
  color: var(--color-fg);
`;

const CARDS = (
  <>
    <Card>Q3 metrics</Card>
    <Card>Onboarding queue</Card>
    <Card>Retention dashboard</Card>
  </>
);

export function StackA105() {
  return <StackTight data-testid="A105">{CARDS}</StackTight>;
}

export function StackA105Fixed() {
  return <StackSpaced data-testid="A105">{CARDS}</StackSpaced>;
}
