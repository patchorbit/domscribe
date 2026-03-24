import { ProcessNextPrompt } from './process-next.prompt.js';
import { CheckStatusPrompt } from './check-status.prompt.js';
import { ExploreComponentPrompt } from './explore-component.prompt.js';
import { FindAnnotationsPrompt } from './find-annotations.prompt.js';
import { MCP_PROMPTS } from './prompt.defs.js';

describe('ProcessNextPrompt', () => {
  it('should have correct metadata', () => {
    const prompt = new ProcessNextPrompt();

    expect(prompt.name).toBe(MCP_PROMPTS.PROCESS_NEXT);
    expect(prompt.description).toContain('Process');
  });

  it('should return user message with processing instructions', () => {
    const prompt = new ProcessNextPrompt();

    const messages = prompt.promptCallback({});

    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content.type).toBe('text');
    expect(messages[0].content.text).toContain('domscribe.annotation.process');
    expect(messages[0].content.text).toContain('domscribe.annotation.respond');
    expect(messages[0].content.text).toContain(
      'domscribe.annotation.updateStatus',
    );
  });
});

describe('CheckStatusPrompt', () => {
  it('should have correct metadata', () => {
    const prompt = new CheckStatusPrompt();

    expect(prompt.name).toBe(MCP_PROMPTS.CHECK_STATUS);
    expect(prompt.description).toContain('status');
  });

  it('should return user message with status check instructions', () => {
    const prompt = new CheckStatusPrompt();

    const messages = prompt.promptCallback({});

    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content.text).toContain('domscribe.status');
  });
});

describe('ExploreComponentPrompt', () => {
  it('should have correct metadata', () => {
    const prompt = new ExploreComponentPrompt();

    expect(prompt.name).toBe(MCP_PROMPTS.EXPLORE_COMPONENT);
  });

  it('should interpolate component name into message', () => {
    const prompt = new ExploreComponentPrompt();

    const messages = prompt.promptCallback({ componentName: 'Header' });

    expect(messages).toHaveLength(1);
    expect(messages[0].content.text).toContain('"Header"');
    expect(messages[0].content.text).toContain('componentName="Header"');
    expect(messages[0].content.text).toContain('domscribe.manifest.query');
  });
});

describe('FindAnnotationsPrompt', () => {
  it('should have correct metadata', () => {
    const prompt = new FindAnnotationsPrompt();

    expect(prompt.name).toBe(MCP_PROMPTS.FIND_ANNOTATIONS);
  });

  it('should include all provided filter args', () => {
    const prompt = new FindAnnotationsPrompt();

    const messages = prompt.promptCallback({
      query: 'button fix',
      file: 'Button.tsx',
      entryId: 'ds_123',
    });

    expect(messages[0].content.text).toContain('query: "button fix"');
    expect(messages[0].content.text).toContain('file: "Button.tsx"');
    expect(messages[0].content.text).toContain('entryId: "ds_123"');
  });

  it('should show no-filter message when no args provided', () => {
    const prompt = new FindAnnotationsPrompt();

    const messages = prompt.promptCallback({});

    expect(messages[0].content.text).toContain('No filters');
  });
});
