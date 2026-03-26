/**
 * Types and data definitions for the init wizard.
 * @module @domscribe/relay/cli/init/types
 */

/**
 * Supported coding agent identifiers.
 */
export type AgentId =
  | 'claude-code'
  | 'copilot'
  | 'gemini'
  | 'kiro'
  | 'cursor'
  | 'other';

/**
 * Framework + bundler combination identifiers.
 */
export type FrameworkId =
  | 'next'
  | 'nuxt'
  | 'react-vite'
  | 'react-webpack'
  | 'vue-vite'
  | 'vue-webpack'
  | 'other-vite'
  | 'other-webpack';

/**
 * Supported package manager identifiers.
 */
export type PackageManagerId = 'npm' | 'pnpm' | 'yarn' | 'bun';

/**
 * Agent install strategy.
 */
export type AgentInstallType = 'command' | 'manual';

/**
 * Configuration for a coding agent in the wizard.
 */
export interface AgentConfig {
  readonly id: AgentId;
  readonly label: string;
  readonly hint?: string;
  readonly installType: AgentInstallType;
  /** Shell commands to run sequentially (for installType: 'command'). */
  readonly commands?: readonly string[];
  /** Text to display for manual installs. */
  readonly manualInstructions?: string;
}

/**
 * Configuration for a framework + bundler choice in the wizard.
 */
export interface FrameworkConfig {
  readonly id: FrameworkId;
  readonly label: string;
  readonly package: string;
  readonly configFile: string;
}

/**
 * Options passed to the init wizard.
 */
export interface InitOptions {
  readonly force: boolean;
  readonly dryRun: boolean;
  readonly agent?: AgentId;
  readonly framework?: FrameworkId;
  readonly pm?: PackageManagerId;
  readonly appRoot?: string;
}

const MCP_CONFIG = `{
  "mcpServers": {
    "domscribe": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@domscribe/mcp"]
    }
  }
}`;

/**
 * All supported coding agents.
 */
export const AGENTS: readonly AgentConfig[] = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    installType: 'command',
    commands: [
      'claude plugin marketplace add patchorbit/domscribe',
      'claude plugin install domscribe@domscribe',
    ],
  },
  {
    id: 'copilot',
    label: 'GitHub Copilot',
    installType: 'command',
    commands: ['copilot plugin install patchorbit/domscribe'],
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    installType: 'command',
    commands: [
      'gemini extensions install https://github.com/patchorbit/domscribe',
    ],
  },
  {
    id: 'kiro',
    label: 'Amazon Kiro',
    installType: 'manual',
    manualInstructions:
      'Open the Powers panel → Add power from GitHub → enter https://github.com/patchorbit/domscribe',
  },
  {
    id: 'cursor',
    label: 'Cursor',
    hint: 'coming soon',
    installType: 'manual',
    manualInstructions: `Cursor plugin support is coming soon.\n\nFor now, add this MCP config to .cursor/mcp.json:\n\n${MCP_CONFIG}`,
  },
  {
    id: 'other',
    label: 'Other (manual MCP setup)',
    installType: 'manual',
    manualInstructions: `Run:\n  npx skills add patchorbit/domscribe\n\nThen add this MCP config to your agent:\n\n${MCP_CONFIG}`,
  },
] as const;

/**
 * All supported framework + bundler combinations.
 */
export const FRAMEWORKS: readonly FrameworkConfig[] = [
  {
    id: 'next',
    label: 'Next.js',
    package: '@domscribe/next',
    configFile: 'next.config.ts',
  },
  {
    id: 'nuxt',
    label: 'Nuxt',
    package: '@domscribe/nuxt',
    configFile: 'nuxt.config.ts',
  },
  {
    id: 'react-vite',
    label: 'React + Vite',
    package: '@domscribe/react',
    configFile: 'vite.config.ts',
  },
  {
    id: 'react-webpack',
    label: 'React + Webpack',
    package: '@domscribe/react',
    configFile: 'webpack.config.js',
  },
  {
    id: 'vue-vite',
    label: 'Vue + Vite',
    package: '@domscribe/vue',
    configFile: 'vite.config.ts',
  },
  {
    id: 'vue-webpack',
    label: 'Vue + Webpack',
    package: '@domscribe/vue',
    configFile: 'webpack.config.js',
  },
  {
    id: 'other-vite',
    label: 'Other (Vite)',
    package: '@domscribe/transform',
    configFile: 'vite.config.ts',
  },
  {
    id: 'other-webpack',
    label: 'Other (Webpack)',
    package: '@domscribe/transform',
    configFile: 'webpack.config.js',
  },
] as const;

/**
 * All supported package managers.
 */
export const PACKAGE_MANAGERS: readonly {
  readonly id: PackageManagerId;
  readonly label: string;
  readonly installCmd: string;
}[] = [
  { id: 'npm', label: 'npm', installCmd: 'npm install -D' },
  { id: 'pnpm', label: 'pnpm', installCmd: 'pnpm add -D' },
  { id: 'yarn', label: 'yarn', installCmd: 'yarn add -D' },
  { id: 'bun', label: 'bun', installCmd: 'bun add -D' },
] as const;

/**
 * Valid agent IDs for flag validation.
 */
export const AGENT_IDS: readonly AgentId[] = AGENTS.map((a) => a.id);

/**
 * Valid framework IDs for flag validation.
 */
export const FRAMEWORK_IDS: readonly FrameworkId[] = FRAMEWORKS.map(
  (f) => f.id,
);

/**
 * Valid package manager IDs for flag validation.
 */
export const PACKAGE_MANAGER_IDS: readonly PackageManagerId[] =
  PACKAGE_MANAGERS.map((p) => p.id);
