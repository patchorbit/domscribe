/**
 * A103 — styled-components pill-style border-radius.
 *
 * Intent: "the toggle is too boxy — round the corners to a full pill
 * (border-radius: 9999px)".
 */
import styled from 'styled-components';

const ToggleBoxy = styled.button`
  background: var(--color-accent);
  color: white;
  padding: 8px 20px;
  font-weight: 600;
  border: none;
  border-radius: 4px;
  cursor: pointer;
`;

const TogglePill = styled.button`
  background: var(--color-accent);
  color: white;
  padding: 8px 20px;
  font-weight: 600;
  border: none;
  border-radius: 9999px;
  cursor: pointer;
`;

export function ToggleA103() {
  return (
    <ToggleBoxy data-testid="A103" type="button">
      Enabled
    </ToggleBoxy>
  );
}

export function ToggleA103Fixed() {
  return (
    <TogglePill data-testid="A103" type="button">
      Enabled
    </TogglePill>
  );
}
