import { describe, expect, it } from 'vitest';
import { normalizeSourceFile } from './source-file.js';
describe('source file namespaces', () => {
  it.each([
    ['/app/components/OAuth2.vue', '/app/components/OAuth2.vue'],
    ['file:///app/my%20components/OAuth2.vue', '/app/my components/OAuth2.vue'],
    ['/ @fs/foo.vue', '/ @fs/foo.vue'],
    ['/@fs//app/OAuth2.vue', '/app/OAuth2.vue'],
    ['C:\\app\\OAuth2.vue', 'C:/app/OAuth2.vue'],
    ['file:///C:/app/OAuth2.vue', 'C:/app/OAuth2.vue'],
  ])('normalizes %s without losing source identity', (input, expected) => {
    expect(normalizeSourceFile(input)).toBe(expected);
  });
  it.each([
    'OAuth2.vue',
    'src/OAuth2.vue',
    'https://example.com/OAuth2.vue',
    'file://other/app/OAuth2.vue',
    '/app/../other/OAuth2.vue',
  ])('refuses an unproved namespace %s', (input) => {
    expect(normalizeSourceFile(input)).toBeNull();
  });
});
