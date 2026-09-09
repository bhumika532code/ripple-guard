import * as vscode from 'vscode';
import * as path from 'path';
import { scanManifest, detectEcosystem, ScanResult } from './scanner';
import { initDiagnostics, updateDiagnostics, clearDiagnostics, registerCodeActions } from './diagnostics';
import { DependencyTreeProvider } from './sidebar';
import { initStatusBar, setScanning, updateStatusBar } from './statusbar';
import { initTerminalWatcher } from './terminalWatcher';
import { showDashboardPanel, updateDashboardPanel } from './dashboard';

// ============================================================================
// RippleGuard Sentinel — Main Extension Entry Point
// ============================================================================

// Global state
const scanResults = new Map<string, ScanResult>();
let treeProvider: DependencyTreeProvider;
let extensionContext: vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
  console.log('[RippleGuard Sentinel] Extension activated!');
  extensionContext = context;

  // --- 1. Initialize UI components ---
  initDiagnostics(context);
  const statusBar = initStatusBar(context);

  // --- 2. Initialize sidebar TreeView ---
  treeProvider = new DependencyTreeProvider();
  vscode.window.registerTreeDataProvider('rippleguardDependencies', treeProvider);

  // --- 3. Register commands ---
  context.subscriptions.push(
    vscode.commands.registerCommand('rippleguard.scanNow', async () => {
      await scanWorkspace();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('rippleguard.fixPackage', () => {
      vscode.window.showInformationMessage('Use the 💡 lightbulb on a highlighted dependency to apply the fix.');
    })
  );

  // --- 4. Register Code Action provider ---
  registerCodeActions(context, scanResults);

  // --- 5. Initialize terminal watcher ---
  initTerminalWatcher(context);

  // --- 6. Set up file watchers ---
  const manifestGlobs = [
    '**/package.json', '**/requirements.txt', '**/pom.xml',
    '**/go.mod', '**/Cargo.toml', '**/Gemfile',
    '**/composer.json', '**/pubspec.yaml', '**/pyproject.toml',
    '**/*.csproj'
  ];

  for (const glob of manifestGlobs) {
    const watcher = vscode.workspace.createFileSystemWatcher(glob);

    watcher.onDidChange((uri) => {
      console.log(`[RippleGuard] File changed: ${uri.fsPath}`);
      scanFile(uri.fsPath);
    });

    watcher.onDidCreate((uri) => {
      console.log(`[RippleGuard] File created: ${uri.fsPath}`);
      scanFile(uri.fsPath);
    });

    watcher.onDidDelete((uri) => {
      console.log(`[RippleGuard] File deleted: ${uri.fsPath}`);
      scanResults.delete(uri.fsPath);
      clearDiagnostics(uri.fsPath);
    });

    context.subscriptions.push(watcher);
  }

  // --- 7. Also scan when a document is saved ---
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (detectEcosystem(doc.uri.fsPath)) {
        scanFile(doc.uri.fsPath);
      }
    })
  );

  // --- 8. Scan when a document is opened (for single-file mode) ---
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (detectEcosystem(doc.uri.fsPath)) {
        scanFile(doc.uri.fsPath);
      }
    })
  );

  // --- 9. Scan when active editor changes ---
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && detectEcosystem(editor.document.uri.fsPath)) {
        scanFile(editor.document.uri.fsPath);
      }
    })
  );

  // --- 10. Run initial scan ---
  // Scan workspace if a folder is open, otherwise scan the active file
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    scanWorkspace();
  } else {
    // Single file mode: scan whatever is currently open
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && detectEcosystem(activeEditor.document.uri.fsPath)) {
      scanFile(activeEditor.document.uri.fsPath);
    }
  }
}

/**
 * Scan a single manifest file and update all UI components.
 */
async function scanFile(filePath: string): Promise<void> {
  const ecosystem = detectEcosystem(filePath);
  if (!ecosystem) { return; }

  // Skip node_modules, .venv, etc.
  if (filePath.includes('node_modules') || filePath.includes('.venv') || filePath.includes('__pycache__')) {
    return;
  }

  try {
    setScanning();
    const result = await scanManifest(filePath);
    scanResults.set(filePath, result);

    // Update inline diagnostics
    updateDiagnostics(result);

    // Update sidebar
    treeProvider.refresh(result);

    // Update status bar (aggregate across all scanned files)
    updateAggregateStatus();

    // Show/update the dashboard WebView panel
    showDashboardPanel(extensionContext, result);

    // Show notification for critical vulnerabilities on first scan
    const criticalVulns = result.vulnerabilities.filter(v => v.highestSeverity >= 9.0);
    if (criticalVulns.length > 0) {
      vscode.window.showWarningMessage(
        `🔴 RippleGuard: ${criticalVulns.length} CRITICAL vulnerabilit${criticalVulns.length === 1 ? 'y' : 'ies'} detected in ${path.basename(filePath)}!`,
        'Show Details'
      ).then(choice => {
        if (choice === 'Show Details') {
          vscode.commands.executeCommand('rippleguardDependencies.focus');
        }
      });
    }
  } catch (err) {
    console.error(`[RippleGuard] Scan failed for ${filePath}:`, err);
  }
}

/**
 * Scan all manifest files in the workspace.
 */
async function scanWorkspace(): Promise<void> {
  const manifests = await vscode.workspace.findFiles(
    '{**/package.json,**/requirements.txt,**/pom.xml}',
    '{**/node_modules/**,**/.venv/**,**/venv/**,**/dist/**,**/build/**}'
  );

  if (manifests.length === 0) {
    vscode.window.showInformationMessage('RippleGuard: No manifest files found in this workspace.');
    return;
  }

  for (const uri of manifests) {
    await scanFile(uri.fsPath);
  }
}

/**
 * Aggregate vulnerability counts across all scanned files.
 */
function updateAggregateStatus(): void {
  let totalVulns = 0;
  let totalPackages = 0;

  for (const result of scanResults.values()) {
    totalVulns += result.vulnerabilities.length;
    totalPackages += result.totalCount;
  }

  updateStatusBar(totalVulns, totalPackages);
}

export function deactivate() {
  console.log('[RippleGuard Sentinel] Extension deactivated.');
}
