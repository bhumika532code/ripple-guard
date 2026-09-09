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
exports.DependencyItem = exports.DependencyTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
// ============================================================================
// Sidebar TreeView — Collapsible dependency health panel
// ============================================================================
class DependencyTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.scanResult = null;
    }
    refresh(result) {
        this.scanResult = result;
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
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
    getPackageItems() {
        if (!this.scanResult) {
            return [];
        }
        const items = [];
        const vulnMap = new Map();
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
                const item = new DependencyItem(label, desc, vscode.TreeItemCollapsibleState.Collapsed, icon);
                // Children: individual CVEs + fix suggestion
                const children = [];
                for (let i = 0; i < vuln.vulnIds.length; i++) {
                    const cveItem = new DependencyItem(vuln.vulnIds[i], vuln.summaries[i]?.substring(0, 80) || '', vscode.TreeItemCollapsibleState.None, 'cve');
                    children.push(cveItem);
                }
                if (vuln.fixVersion) {
                    const fixItem = new DependencyItem(`💡 Fix: Upgrade to ${vuln.fixVersion}`, '', vscode.TreeItemCollapsibleState.None, 'fix');
                    children.push(fixItem);
                }
                item.children = children;
                items.push(item);
            }
            else {
                // Safe package
                const item = new DependencyItem(`${pkg.name}@${pkg.version}`, '✅ Safe', vscode.TreeItemCollapsibleState.None, 'safe');
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
exports.DependencyTreeProvider = DependencyTreeProvider;
class DependencyItem extends vscode.TreeItem {
    constructor(label, description, collapsibleState, iconType) {
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
exports.DependencyItem = DependencyItem;
//# sourceMappingURL=sidebar.js.map