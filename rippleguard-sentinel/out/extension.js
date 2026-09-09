"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const scanner_1 = require("./scanner");
const diagnostics_1 = require("./diagnostics");
const sidebar_1 = require("./sidebar");
const statusbar_1 = require("./statusbar");
const terminalWatcher_1 = require("./terminalWatcher");
const dashboard_1 = require("./dashboard");
// ============================================================================
// RippleGuard Sentinel — Main Extension Entry Point
// ============================================================================
// Global state
const scanResults = new Map();
let treeProvider;
let extensionContext;
function activate(context) {
    console.log('[RippleGuard Sentinel] Extension activated!');
    extensionContext = context;
    // --- 1. Initialize UI components ---
    (0, diagnostics_1.initDiagnostics)(context);
    const statusBar = (0, statusbar_1.initStatusBar)(context);
    // --- 2. Initialize sidebar TreeView ---
    treeProvider = new sidebar_1.DependencyTreeProvider();
    vscode.window.registerTreeDataProvider('rippleguardDependencies', treeProvider);
    // --- 3. Register commands ---
    context.subscriptions.push(vscode.commands.registerCommand('rippleguard.scanNow', async () => {
        await scanWorkspace();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('rippleguard.fixPackage', () => {
        vscode.window.showInformationMessage('Use the 💡 lightbulb on a highlighted dependency to apply the fix.');
    }));
    // --- 4. Register Code Action provider ---
    (0, diagnostics_1.registerCodeActions)(context, scanResults);
    // --- 5. Initialize terminal watcher ---
    (0, terminalWatcher_1.initTerminalWatcher)(context);
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
            (0, diagnostics_1.clearDiagnostics)(uri.fsPath);
        });
        context.subscriptions.push(watcher);
    }
    // --- 7. Also scan when a document is saved ---
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((doc) => {
        if ((0, scanner_1.detectEcosystem)(doc.uri.fsPath)) {
            scanFile(doc.uri.fsPath);
        }
    }));
    // --- 8. Scan when a document is opened (for single-file mode) ---
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument((doc) => {
        if ((0, scanner_1.detectEcosystem)(doc.uri.fsPath)) {
            scanFile(doc.uri.fsPath);
        }
    }));
    // --- 9. Scan when active editor changes ---
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && (0, scanner_1.detectEcosystem)(editor.document.uri.fsPath)) {
            scanFile(editor.document.uri.fsPath);
        }
    }));
    // --- 10. Run initial scan ---
    // Scan workspace if a folder is open, otherwise scan the active file
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        scanWorkspace();
    }
    else {
        // Single file mode: scan whatever is currently open
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && (0, scanner_1.detectEcosystem)(activeEditor.document.uri.fsPath)) {
            scanFile(activeEditor.document.uri.fsPath);
        }
    }
}
/**
 * Scan a single manifest file and update all UI components.
 */
async function scanFile(filePath) {
    const ecosystem = (0, scanner_1.detectEcosystem)(filePath);
    if (!ecosystem) {
        return;
    }
    // Skip node_modules, .venv, etc.
    if (filePath.includes('node_modules') || filePath.includes('.venv') || filePath.includes('__pycache__')) {
        return;
    }
    try {
        (0, statusbar_1.setScanning)();
        const result = await (0, scanner_1.scanManifest)(filePath);
        scanResults.set(filePath, result);
        // Update inline diagnostics
        (0, diagnostics_1.updateDiagnostics)(result);
        // Update sidebar
        treeProvider.refresh(result);
        // Update status bar (aggregate across all scanned files)
        updateAggregateStatus();
        // Show/update the dashboard WebView panel
        (0, dashboard_1.showDashboardPanel)(extensionContext, result);
        // Show notification for critical vulnerabilities on first scan
        const criticalVulns = result.vulnerabilities.filter(v => v.highestSeverity >= 9.0);
        if (criticalVulns.length > 0) {
            vscode.window.showWarningMessage(`🔴 RippleGuard: ${criticalVulns.length} CRITICAL vulnerabilit${criticalVulns.length === 1 ? 'y' : 'ies'} detected in ${path.basename(filePath)}!`, 'Show Details').then(choice => {
                if (choice === 'Show Details') {
                    vscode.commands.executeCommand('rippleguardDependencies.focus');
                }
            });
        }
    }
    catch (err) {
        console.error(`[RippleGuard] Scan failed for ${filePath}:`, err);
    }
}
/**
 * Scan all manifest files in the workspace.
 */
async function scanWorkspace() {
    const manifests = await vscode.workspace.findFiles('{**/package.json,**/requirements.txt,**/pom.xml}', '{**/node_modules/**,**/.venv/**,**/venv/**,**/dist/**,**/build/**}');
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
function updateAggregateStatus() {
    let totalVulns = 0;
    let totalPackages = 0;
    for (const result of scanResults.values()) {
        totalVulns += result.vulnerabilities.length;
        totalPackages += result.totalCount;
    }
    (0, statusbar_1.updateStatusBar)(totalVulns, totalPackages);
}
function deactivate() {
    console.log('[RippleGuard Sentinel] Extension deactivated.');
}
//# sourceMappingURL=extension.js.map