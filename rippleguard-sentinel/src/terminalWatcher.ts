import * as vscode from 'vscode';
import { queryOsv, getSeverityScore, getSeverityLabel, getFixVersion } from './osvClient';

// ============================================================================
// Terminal Watcher — Intercepts install commands and warns about vulnerabilities
// ============================================================================

export function initTerminalWatcher(context: vscode.ExtensionContext): void {
  // Watch for terminal data (shell integration)
  context.subscriptions.push(
    vscode.window.onDidStartTerminalShellExecution(async (e) => {
      const commandLine = e.execution.commandLine;
      if (!commandLine) { return; }

      const cmdText = typeof commandLine === 'string' ? commandLine : commandLine.value;
      
      // Detect install commands
      const installMatch = parseInstallCommand(cmdText);
      if (!installMatch) { return; }

      const { packageName, ecosystem } = installMatch;

      // Query OSV for the package (latest version)
      try {
        const vulns = await queryOsv(packageName, '', ecosystem);

        if (vulns.length > 0) {
          const highestScore = Math.max(...vulns.map(getSeverityScore));
          const label = getSeverityLabel(highestScore);
          const fixVersion = vulns.map(getFixVersion).find(v => v !== null);

          const message = `⚠️ RippleGuard: "${packageName}" has ${vulns.length} known vulnerabilit${vulns.length === 1 ? 'y' : 'ies'} (${label}).`;

          const options = ['Dismiss'];
          if (fixVersion) {
            options.unshift(`Install Safe Version (${fixVersion})`);
          }

          const choice = await vscode.window.showWarningMessage(message, ...options);

          if (choice && choice.startsWith('Install Safe Version') && fixVersion) {
            // Open a new terminal with the corrected install command
            const safeCmd = buildInstallCommand(packageName, fixVersion, ecosystem);
            const terminal = vscode.window.createTerminal('RippleGuard Fix');
            terminal.show();
            terminal.sendText(safeCmd);
          }
        }
      } catch (err) {
        console.error('[RippleGuard] Terminal watcher error:', err);
      }
    })
  );

  // Fallback: watch for terminal creation and display a general notification
  context.subscriptions.push(
    vscode.window.onDidOpenTerminal((terminal) => {
      // Show a subtle reminder that Sentinel is active
      console.log(`[RippleGuard] Monitoring terminal: ${terminal.name}`);
    })
  );
}

/**
 * Parse an install command to extract the package name and ecosystem.
 */
function parseInstallCommand(cmd: string): { packageName: string; ecosystem: string } | null {
  const trimmed = cmd.trim();

  // npm install <pkg>, npm i <pkg>, npm add <pkg>
  const npmMatch = trimmed.match(/^(?:npm|npx)\s+(?:install|i|add)\s+([a-zA-Z0-9@._/-]+)/);
  if (npmMatch) {
    return { packageName: npmMatch[1].replace(/@[\d.]+$/, ''), ecosystem: 'npm' };
  }

  // yarn add <pkg>
  const yarnMatch = trimmed.match(/^yarn\s+add\s+([a-zA-Z0-9@._/-]+)/);
  if (yarnMatch) {
    return { packageName: yarnMatch[1].replace(/@[\d.]+$/, ''), ecosystem: 'npm' };
  }

  // pip install <pkg>
  const pipMatch = trimmed.match(/^pip3?\s+install\s+([a-zA-Z0-9._-]+)/);
  if (pipMatch) {
    return { packageName: pipMatch[1], ecosystem: 'PyPI' };
  }

  // pnpm add <pkg>
  const pnpmMatch = trimmed.match(/^pnpm\s+(?:add|install|i)\s+([a-zA-Z0-9@._/-]+)/);
  if (pnpmMatch) {
    return { packageName: pnpmMatch[1].replace(/@[\d.]+$/, ''), ecosystem: 'npm' };
  }

  return null;
}

/**
 * Build an install command for the safe version.
 */
function buildInstallCommand(packageName: string, version: string, ecosystem: string): string {
  if (ecosystem === 'PyPI') {
    return `pip install ${packageName}==${version}`;
  }
  return `npm install ${packageName}@${version}`;
}
