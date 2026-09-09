import * as vscode from 'vscode';
import { ScanResult, VulnResult } from './scanner';

// ============================================================================
// Diagnostics Provider — Inline squiggly warnings on vulnerable dependencies
// ============================================================================

let diagnosticCollection: vscode.DiagnosticCollection;

export function initDiagnostics(context: vscode.ExtensionContext): vscode.DiagnosticCollection {
  diagnosticCollection = vscode.languages.createDiagnosticCollection('rippleguard');
  context.subscriptions.push(diagnosticCollection);
  return diagnosticCollection;
}

/**
 * Update the diagnostics for a scanned manifest file.
 * This places squiggly underlines on vulnerable dependency lines.
 */
export function updateDiagnostics(scanResult: ScanResult): void {
  const uri = vscode.Uri.file(scanResult.filePath);
  const diagnostics: vscode.Diagnostic[] = [];

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
    } else if (vuln.highestSeverity >= 4.0) {
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
    diagnostic.source = 'RippleGuard Sentinel';
    diagnostic.code = vuln.vulnIds[0] || 'OSV';

    diagnostics.push(diagnostic);
  }

  diagnosticCollection.set(uri, diagnostics);
}

/**
 * Clear diagnostics for a specific file.
 */
export function clearDiagnostics(filePath: string): void {
  const uri = vscode.Uri.file(filePath);
  diagnosticCollection.delete(uri);
}

/**
 * Register Code Action provider for quick-fix suggestions.
 */
export function registerCodeActions(context: vscode.ExtensionContext, scanResults: Map<string, ScanResult>): void {
  const provider = vscode.languages.registerCodeActionsProvider(
    [{ language: 'json' }, { language: 'plaintext' }],
    {
      provideCodeActions(document, range, context) {
        const actions: vscode.CodeAction[] = [];
        const result = scanResults.get(document.uri.fsPath);
        if (!result) { return actions; }

        for (const vuln of result.vulnerabilities) {
          if (vuln.package.line === range.start.line && vuln.fixVersion) {
            const action = new vscode.CodeAction(
              `🛡️ Upgrade ${vuln.package.name} to ${vuln.fixVersion}`,
              vscode.CodeActionKind.QuickFix
            );

            const edit = new vscode.WorkspaceEdit();
            const lineText = document.lineAt(vuln.package.line).text;
            const newText = lineText.replace(vuln.package.version, vuln.fixVersion);
            edit.replace(
              document.uri,
              new vscode.Range(vuln.package.line, 0, vuln.package.line, lineText.length),
              newText
            );

            action.edit = edit;
            action.isPreferred = true;
            action.diagnostics = context.diagnostics.filter(
              d => d.source === 'RippleGuard Sentinel' && d.range.start.line === vuln.package.line
            );

            actions.push(action);
          }
        }

        return actions;
      },
    }
  );

  context.subscriptions.push(provider);
}
