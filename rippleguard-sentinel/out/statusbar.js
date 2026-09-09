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
exports.initStatusBar = initStatusBar;
exports.setScanning = setScanning;
exports.setIdle = setIdle;
exports.updateStatusBar = updateStatusBar;
const vscode = __importStar(require("vscode"));
// ============================================================================
// Status Bar — Persistent vulnerability indicator at the bottom of VS Code
// ============================================================================
let statusBarItem;
function initStatusBar(context) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'rippleguard.scanNow';
    statusBarItem.tooltip = 'Click to scan dependencies';
    setIdle();
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    return statusBarItem;
}
/**
 * Set the status bar to idle/scanning state.
 */
function setScanning() {
    statusBarItem.text = '$(sync~spin) RippleGuard: Scanning...';
    statusBarItem.backgroundColor = undefined;
    statusBarItem.color = '#94a3b8';
}
/**
 * Set idle state (no data loaded yet).
 */
function setIdle() {
    statusBarItem.text = '$(shield) RippleGuard Sentinel';
    statusBarItem.backgroundColor = undefined;
    statusBarItem.color = '#94a3b8';
}
/**
 * Update the status bar after a scan completes.
 */
function updateStatusBar(vulnCount, totalPackages) {
    if (vulnCount === 0) {
        statusBarItem.text = `$(shield) RippleGuard: ${totalPackages} packages — All safe`;
        statusBarItem.backgroundColor = undefined;
        statusBarItem.color = '#22c55e';
        statusBarItem.tooltip = `All ${totalPackages} dependencies are free of known vulnerabilities.`;
    }
    else {
        statusBarItem.text = `$(alert) RippleGuard: ${vulnCount} vulnerabilit${vulnCount === 1 ? 'y' : 'ies'}`;
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        statusBarItem.color = undefined;
        statusBarItem.tooltip = `${vulnCount} of ${totalPackages} dependencies have known vulnerabilities. Click to scan.`;
    }
}
//# sourceMappingURL=statusbar.js.map