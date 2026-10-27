/**
 * Domscribe CLI
 *
 * Commands:
 *   serve   - Start the relay server (foreground or daemon)
 *   stop    - Stop a running daemon
 *   status  - Check relay status
 *   mcp     - Start MCP adapter for agent integration
 */
import { Command } from 'commander';
import { RELAY_VERSION } from '../version.js';
import { InitCommand } from './commands/init.command.js';
import { ServeCommand } from './commands/serve.command.js';
import { StopCommand } from './commands/stop.command.js';
import { StatusCommand } from './commands/status.command.js';
import { IssueCommand } from './commands/issue.command.js';
import { McpCommand } from './commands/mcp.command.js';

const program = new Command();

program
  .name('domscribe')
  .description(
    'Domscribe Relay - Local development server for UI-aware dev tooling',
  )
  .version(RELAY_VERSION);

/**
 * serve command - Start the relay server
 */
program.addCommand(ServeCommand);

/**
 * stop command - Stop a running daemon
 */
program.addCommand(StopCommand);

/**
 * status command - Check relay status
 */
program.addCommand(StatusCommand);

/**
 * mcp command - Start MCP adapter for agent integration
 */
program.addCommand(McpCommand);

/**
 * init command - Initialize Domscribe for a coding agent
 */
program.addCommand(InitCommand);

export { program };

program.addCommand(IssueCommand);
