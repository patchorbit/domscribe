/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { ElementTracker } from './element-tracker.js';

describe('repeated source instances', () => {
  let tracker: ElementTracker | undefined;
  afterEach(() => {
    tracker?.dispose();
    document.body.innerHTML = '';
  });
  it('refuses to choose an arbitrary sibling with the same source ID', () => {
    document.body.innerHTML =
      '<button data-ds="aB3dEf7h">Lyra</button><button data-ds="aB3dEf7h">Vega</button>';
    tracker = new ElementTracker();
    tracker.observeDOM();
    expect(tracker.getElement('aB3dEf7h')).toBeNull();
  });
  it('keeps the remaining sibling when another is removed', async () => {
    document.body.innerHTML =
      '<button data-ds="aB3dEf7h">Lyra</button><button data-ds="aB3dEf7h">Vega</button>';
    tracker = new ElementTracker();
    tracker.observeDOM();
    document.querySelector('button')!.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(tracker.getElement('aB3dEf7h')?.textContent).toBe('Vega');
  });
  it('does not lose a moved element or leave it registered under an old source ID', async () => {
    document.body.innerHTML =
      '<button data-ds="aB3dEf7h">Lyra</button><button data-ds="aB3dEf7h">Vega</button>';
    tracker = new ElementTracker();
    tracker.observeDOM();
    const lyra = document.querySelector('button')!;
    document.body.append(lyra);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(tracker.getElement('aB3dEf7h')).toBeNull();
    lyra.setAttribute('data-ds', 'nEw1d123');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(tracker.getElement('aB3dEf7h')?.textContent).toBe('Vega');
    expect(tracker.getElement('nEw1d123')).toBe(lyra);
  });
});
