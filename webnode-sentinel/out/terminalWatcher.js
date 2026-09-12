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
exports.initTerminalWatcher = initTerminalWatcher;
const vscode = __importStar(require("vscode"));
const osvClient_1 = require("./osvClient");
// ============================================================================
// Terminal Watcher — Intercepts install commands and warns about vulnerabilities
// ============================================================================
function initTerminalWatcher(context) {
    // Watch for terminal data (shell integration)
    context.subscriptions.push(vscode.window.onDidStartTerminalShellExecution(async (e) => {
        const commandLine = e.execution.commandLine;
        if (!commandLine) {
            return;
        }
        const cmdText = typeof commandLine === 'string' ? commandLine : commandLine.value;
        // Detect install commands
        const installMatch = parseInstallCommand(cmdText);
        if (!installMatch) {
            return;
        }
        const { packageName, ecosystem } = installMatch;
        // Query OSV for the package (latest version)
        try {
            const vulns = await (0, osvClient_1.queryOsv)(packageName, '', ecosystem);
            if (vulns.length > 0) {
                const highestScore = Math.max(...vulns.map(osvClient_1.getSeverityScore));
                const label = (0, osvClient_1.getSeverityLabel)(highestScore);
                const fixVersion = vulns.map(osvClient_1.getFixVersion).find(v => v !== null);
                const message = `⚠️ WebNode: "${packageName}" has ${vulns.length} known vulnerabilit${vulns.length === 1 ? 'y' : 'ies'} (${label}).`;
                const options = ['Dismiss'];
                if (fixVersion) {
                    options.unshift(`Install Safe Version (${fixVersion})`);
                }
                const choice = await vscode.window.showWarningMessage(message, ...options);
                if (choice && choice.startsWith('Install Safe Version') && fixVersion) {
                    // Open a new terminal with the corrected install command
                    const safeCmd = buildInstallCommand(packageName, fixVersion, ecosystem);
                    const terminal = vscode.window.createTerminal('WebNode Fix');
                    terminal.show();
                    terminal.sendText(safeCmd);
                }
            }
        }
        catch (err) {
            console.error('[WebNode] Terminal watcher error:', err);
        }
    }));
    // Fallback: watch for terminal creation and display a general notification
    context.subscriptions.push(vscode.window.onDidOpenTerminal((terminal) => {
        // Show a subtle reminder that Sentinel is active
        console.log(`[WebNode] Monitoring terminal: ${terminal.name}`);
    }));
}
/**
 * Parse an install command to extract the package name and ecosystem.
 */
function parseInstallCommand(cmd) {
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
function buildInstallCommand(packageName, version, ecosystem) {
    if (ecosystem === 'PyPI') {
        return `pip install ${packageName}==${version}`;
    }
    return `npm install ${packageName}@${version}`;
}
//# sourceMappingURL=terminalWatcher.js.map