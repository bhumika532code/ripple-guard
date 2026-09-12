import * as vscode from 'vscode';

// ============================================================================
// Status Bar — Persistent vulnerability indicator at the bottom of VS Code
// ============================================================================

let statusBarItem: vscode.StatusBarItem;

export function initStatusBar(context: vscode.ExtensionContext): vscode.StatusBarItem {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'webnode.scanNow';
  statusBarItem.tooltip = 'Click to scan dependencies';
  setIdle();
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
  return statusBarItem;
}

/**
 * Set the status bar to idle/scanning state.
 */
export function setScanning(): void {
  statusBarItem.text = '$(sync~spin) WebNode: Scanning...';
  statusBarItem.backgroundColor = undefined;
  statusBarItem.color = '#94a3b8';
}

/**
 * Set idle state (no data loaded yet).
 */
export function setIdle(): void {
  statusBarItem.text = '$(shield) WebNode Sentinel';
  statusBarItem.backgroundColor = undefined;
  statusBarItem.color = '#94a3b8';
}

/**
 * Update the status bar after a scan completes.
 */
export function updateStatusBar(vulnCount: number, totalPackages: number): void {
  if (vulnCount === 0) {
    statusBarItem.text = `$(shield) WebNode: ${totalPackages} packages — All safe`;
    statusBarItem.backgroundColor = undefined;
    statusBarItem.color = '#22c55e';
    statusBarItem.tooltip = `All ${totalPackages} dependencies are free of known vulnerabilities.`;
  } else {
    statusBarItem.text = `$(alert) WebNode: ${vulnCount} vulnerabilit${vulnCount === 1 ? 'y' : 'ies'}`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    statusBarItem.color = undefined;
    statusBarItem.tooltip = `${vulnCount} of ${totalPackages} dependencies have known vulnerabilities. Click to scan.`;
  }
}
