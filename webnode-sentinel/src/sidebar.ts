import * as vscode from 'vscode';
import { ScanResult, VulnResult } from './scanner';

// ============================================================================
// Sidebar TreeView — Collapsible dependency health panel
// ============================================================================

export class DependencyTreeProvider implements vscode.TreeDataProvider<DependencyItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<DependencyItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private scanResult: ScanResult | null = null;

  refresh(result: ScanResult): void {
    this.scanResult = result;
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: DependencyItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: DependencyItem): DependencyItem[] {
    if (!this.scanResult) {
      return [new DependencyItem('Upload a manifest to scan...', '', vscode.TreeItemCollapsibleState.None, 'info')];
    }

    // Top level: show each package
    if (!element) {
      return this.getPackageItems();
    }

    // Second level: show vulnerability details for a package
    return element.children || [];
  }

  private getPackageItems(): DependencyItem[] {
    if (!this.scanResult) { return []; }

    const items: DependencyItem[] = [];
    const vulnMap = new Map<string, VulnResult>();

    for (const v of this.scanResult.vulnerabilities) {
      vulnMap.set(v.package.name, v);
    }

    for (const pkg of this.scanResult.packages) {
      const vuln = vulnMap.get(pkg.name);

      if (vuln) {
        // Vulnerable package
        const icon = vuln.highestSeverity >= 7.0 ? 'critical' : 'warning';
        const label = `${pkg.name}@${pkg.version}`;
        const desc = `⚠️ ${vuln.vulnCount} CVE${vuln.vulnCount > 1 ? 's' : ''} (${vuln.severityLabel})`;

        const item = new DependencyItem(
          label, desc,
          vscode.TreeItemCollapsibleState.Collapsed,
          icon
        );

        // Children: individual CVEs + fix suggestion
        const children: DependencyItem[] = [];
        for (let i = 0; i < vuln.vulnIds.length; i++) {
          const cveItem = new DependencyItem(
            vuln.vulnIds[i],
            vuln.summaries[i]?.substring(0, 80) || '',
            vscode.TreeItemCollapsibleState.None,
            'cve'
          );
          children.push(cveItem);
        }

        if (vuln.fixVersion) {
          const fixItem = new DependencyItem(
            `💡 Fix: Upgrade to ${vuln.fixVersion}`,
            '',
            vscode.TreeItemCollapsibleState.None,
            'fix'
          );
          children.push(fixItem);
        }

        item.children = children;
        items.push(item);
      } else {
        // Safe package
        const item = new DependencyItem(
          `${pkg.name}@${pkg.version}`,
          '✅ Safe',
          vscode.TreeItemCollapsibleState.None,
          'safe'
        );
        items.push(item);
      }
    }

    // Sort: vulnerable packages first
    items.sort((a, b) => {
      const aVuln = a.iconType === 'critical' || a.iconType === 'warning' ? 0 : 1;
      const bVuln = b.iconType === 'critical' || b.iconType === 'warning' ? 0 : 1;
      return aVuln - bVuln;
    });

    return items;
  }
}

export class DependencyItem extends vscode.TreeItem {
  children?: DependencyItem[];
  iconType: string;

  constructor(
    label: string,
    description: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    iconType: string
  ) {
    super(label, collapsibleState);
    this.description = description;
    this.iconType = iconType;

    // Set icon based on status
    switch (iconType) {
      case 'critical':
        this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
        break;
      case 'warning':
        this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'));
        break;
      case 'safe':
        this.iconPath = new vscode.ThemeIcon('pass', new vscode.ThemeColor('testing.iconPassed'));
        break;
      case 'cve':
        this.iconPath = new vscode.ThemeIcon('bug');
        break;
      case 'fix':
        this.iconPath = new vscode.ThemeIcon('lightbulb', new vscode.ThemeColor('editorLightBulb.foreground'));
        break;
      case 'info':
        this.iconPath = new vscode.ThemeIcon('info');
        break;
    }
  }
}
