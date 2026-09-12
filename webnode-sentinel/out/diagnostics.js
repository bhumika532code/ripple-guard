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
exports.initDiagnostics = initDiagnostics;
exports.updateDiagnostics = updateDiagnostics;
exports.clearDiagnostics = clearDiagnostics;
exports.registerCodeActions = registerCodeActions;
const vscode = __importStar(require("vscode"));
// ============================================================================
// Diagnostics Provider — Inline squiggly warnings on vulnerable dependencies
// ============================================================================
let diagnosticCollection;
function initDiagnostics(context) {
    diagnosticCollection = vscode.languages.createDiagnosticCollection('webnode');
    context.subscriptions.push(diagnosticCollection);
    return diagnosticCollection;
}
/**
 * Update the diagnostics for a scanned manifest file.
 * This places squiggly underlines on vulnerable dependency lines.
 */
function updateDiagnostics(scanResult) {
    const uri = vscode.Uri.file(scanResult.filePath);
    const diagnostics = [];
    for (const vuln of scanResult.vulnerabilities) {
        const line = vuln.package.line;
        const lineText = vuln.package.lineText;
        // Find the package name in the line to highlight precisely
        const nameStart = lineText.indexOf(vuln.package.name);
        const startCol = nameStart >= 0 ? nameStart : 0;
        const endCol = nameStart >= 0 ? nameStart + vuln.package.name.length : lineText.length;
        const range = new vscode.Range(line, startCol, line, endCol);
        // Choose severity based on CVSS score
        let severity = vscode.DiagnosticSeverity.Information;
        if (vuln.highestSeverity >= 7.0) {
            severity = vscode.DiagnosticSeverity.Error;
        }
        else if (vuln.highestSeverity >= 4.0) {
            severity = vscode.DiagnosticSeverity.Warning;
        }
        // Build the diagnostic message
        let message = `⚠️ ${vuln.package.name}@${vuln.package.version} has ${vuln.vulnCount} known vulnerabilit${vuln.vulnCount === 1 ? 'y' : 'ies'}`;
        message += ` (${vuln.severityLabel})`;
        message += `\n\nCVEs: ${vuln.vulnIds.join(', ')}`;
        if (vuln.fixVersion) {
            message += `\n\n💡 Safe version: ${vuln.fixVersion}`;
        }
        if (vuln.summaries.length > 0) {
            message += `\n\n${vuln.summaries[0]}`;
        }
        const diagnostic = new vscode.Diagnostic(range, message, severity);
        diagnostic.source = 'WebNode Sentinel';
        diagnostic.code = vuln.vulnIds[0] || 'OSV';
        diagnostics.push(diagnostic);
    }
    diagnosticCollection.set(uri, diagnostics);
}
/**
 * Clear diagnostics for a specific file.
 */
function clearDiagnostics(filePath) {
    const uri = vscode.Uri.file(filePath);
    diagnosticCollection.delete(uri);
}
/**
 * Register Code Action provider for quick-fix suggestions.
 */
function registerCodeActions(context, scanResults) {
    const provider = vscode.languages.registerCodeActionsProvider([{ language: 'json' }, { language: 'plaintext' }], {
        provideCodeActions(document, range, context) {
            const actions = [];
            const result = scanResults.get(document.uri.fsPath);
            if (!result) {
                return actions;
            }
            for (const vuln of result.vulnerabilities) {
                if (vuln.package.line === range.start.line && vuln.fixVersion) {
                    const action = new vscode.CodeAction(`🛡️ Upgrade ${vuln.package.name} to ${vuln.fixVersion}`, vscode.CodeActionKind.QuickFix);
                    const edit = new vscode.WorkspaceEdit();
                    const lineText = document.lineAt(vuln.package.line).text;
                    const newText = lineText.replace(vuln.package.version, vuln.fixVersion);
                    edit.replace(document.uri, new vscode.Range(vuln.package.line, 0, vuln.package.line, lineText.length), newText);
                    action.edit = edit;
                    action.isPreferred = true;
                    action.diagnostics = context.diagnostics.filter(d => d.source === 'WebNode Sentinel' && d.range.start.line === vuln.package.line);
                    actions.push(action);
                }
            }
            return actions;
        },
    });
    context.subscriptions.push(provider);
}
//# sourceMappingURL=diagnostics.js.map