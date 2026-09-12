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
exports.showDashboardPanel = showDashboardPanel;
exports.updateDashboardPanel = updateDashboardPanel;
const vscode = __importStar(require("vscode"));
// ============================================================================
// WebView Dashboard — Beautiful side panel with scores, vulns, and fixes
// ============================================================================
let currentPanel;
function showDashboardPanel(context, result) {
    const columnToShowIn = vscode.ViewColumn.Beside;
    if (currentPanel) {
        currentPanel.webview.html = getDashboardHtml(result);
        currentPanel.reveal(columnToShowIn);
        return;
    }
    currentPanel = vscode.window.createWebviewPanel('webnodeDashboard', '🛡️ WebNode Sentinel', columnToShowIn, { enableScripts: true });
    currentPanel.webview.html = getDashboardHtml(result);
    currentPanel.onDidDispose(() => {
        currentPanel = undefined;
    }, null, context.subscriptions);
}
function updateDashboardPanel(result) {
    if (currentPanel) {
        currentPanel.webview.html = getDashboardHtml(result);
    }
}
function getDashboardHtml(result) {
    const totalPkgs = result.totalCount;
    const vulnCount = result.vulnerabilities.length;
    const safeCount = result.safeCount;
    const safePercent = totalPkgs > 0 ? Math.round((safeCount / totalPkgs) * 100) : 100;
    // Calculate overall risk score (0-100)
    let maxSeverity = 0;
    for (const v of result.vulnerabilities) {
        if (v.highestSeverity > maxSeverity) {
            maxSeverity = v.highestSeverity;
        }
    }
    const riskScore = vulnCount > 0 ? Math.min(100, Math.round(maxSeverity * 10 + vulnCount * 5)) : 0;
    // Risk color
    let riskColor = '#22c55e';
    let riskLabel = 'Excellent';
    if (riskScore >= 70) {
        riskColor = '#ef4444';
        riskLabel = 'Critical';
    }
    else if (riskScore >= 40) {
        riskColor = '#f97316';
        riskLabel = 'High';
    }
    else if (riskScore >= 20) {
        riskColor = '#facc15';
        riskLabel = 'Medium';
    }
    else if (riskScore > 0) {
        riskColor = '#38bdf8';
        riskLabel = 'Low';
    }
    // Build vulnerability cards
    let vulnCardsHtml = '';
    if (result.vulnerabilities.length === 0) {
        vulnCardsHtml = `
      <div style="text-align:center; padding:30px 0;">
        <div style="font-size:40px; margin-bottom:10px;">✅</div>
        <div style="color:#22c55e; font-size:16px; font-weight:bold;">All Clear!</div>
        <div style="color:#94a3b8; font-size:12px; margin-top:5px;">No known vulnerabilities detected.</div>
      </div>
    `;
    }
    else {
        for (const v of result.vulnerabilities) {
            const sevColor = v.highestSeverity >= 7 ? '#ef4444' : v.highestSeverity >= 4 ? '#f97316' : '#facc15';
            const sevIcon = v.highestSeverity >= 7 ? '🔴' : v.highestSeverity >= 4 ? '🟠' : '🟡';
            vulnCardsHtml += `
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-left:3px solid ${sevColor}; border-radius:8px; padding:12px 14px; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-weight:bold; color:#f8fafc; font-size:13px;">${sevIcon} ${v.package.name}</span>
            <span style="background:${sevColor}22; color:${sevColor}; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:bold;">${v.severityLabel}</span>
          </div>
          <div style="color:#94a3b8; font-size:11px; margin-bottom:6px;">v${v.package.version} · ${v.vulnCount} CVE${v.vulnCount > 1 ? 's' : ''}</div>
          <div style="color:#cbd5e1; font-size:11px; margin-bottom:8px;">${v.vulnIds.slice(0, 3).join(', ')}${v.vulnIds.length > 3 ? ` +${v.vulnIds.length - 3} more` : ''}</div>
          ${v.fixVersion ? `
            <div style="background:rgba(34,197,94,0.1); border:1px solid rgba(34,197,94,0.2); border-radius:6px; padding:6px 10px; display:flex; align-items:center; gap:6px;">
              <span style="color:#22c55e; font-size:12px;">💡</span>
              <span style="color:#22c55e; font-size:11px; font-weight:bold;">Fix: Upgrade to v${v.fixVersion}</span>
            </div>
          ` : `
            <div style="color:#64748b; font-size:10px; font-style:italic;">No fix version available yet.</div>
          `}
        </div>
      `;
        }
    }
    // Build safe packages list
    let safePkgsHtml = '';
    const safePackages = result.packages.filter(p => !result.vulnerabilities.find(v => v.package.name === p.name));
    for (const pkg of safePackages) {
        safePkgsHtml += `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="color:#cbd5e1; font-size:11px;">✅ ${pkg.name}</span>
        <span style="color:#64748b; font-size:10px;">v${pkg.version}</span>
      </div>
    `;
    }
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      background: #0a0a0f;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 0;
      margin: 0;
      overflow-x: hidden;
    }
    .container { padding: 20px; }
    .header {
      text-align: center;
      padding: 20px 0 16px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 16px;
      font-weight: 700;
      margin: 0 0 4px;
      letter-spacing: 1px;
      color: #38bdf8;
    }
    .header .subtitle {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .score-ring {
      width: 120px;
      height: 120px;
      margin: 20px auto;
      position: relative;
    }
    .score-ring svg {
      transform: rotate(-90deg);
    }
    .score-ring .score-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }
    .score-ring .score-number {
      font-size: 28px;
      font-weight: 800;
      line-height: 1;
    }
    .score-ring .score-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 2px;
    }
    .stats-row {
      display: flex;
      gap: 8px;
      margin: 16px 0;
    }
    .stat-box {
      flex: 1;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px;
      padding: 10px;
      text-align: center;
    }
    .stat-box .stat-num {
      font-size: 20px;
      font-weight: 800;
      line-height: 1.2;
    }
    .stat-box .stat-label {
      font-size: 9px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin: 20px 0 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .ecosystem-badge {
      display: inline-block;
      background: rgba(56,189,248,0.1);
      color: #38bdf8;
      padding: 3px 10px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: bold;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ WEBNODE SENTINEL</h1>
      <div class="subtitle">Supply-Chain Security Report</div>
      <div class="ecosystem-badge">${result.ecosystem} Ecosystem</div>
    </div>

    <!-- Risk Score Ring -->
    <div class="score-ring">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="8"/>
        <circle cx="60" cy="60" r="50" fill="none" stroke="${riskColor}" stroke-width="8"
          stroke-dasharray="${(safePercent / 100) * 314} 314"
          stroke-linecap="round"/>
      </svg>
      <div class="score-text">
        <div class="score-number" style="color:${riskColor}">${safePercent}%</div>
        <div class="score-label" style="color:${riskColor}">${riskLabel}</div>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="stats-row">
      <div class="stat-box">
        <div class="stat-num" style="color:#f8fafc;">${totalPkgs}</div>
        <div class="stat-label">Total</div>
      </div>
      <div class="stat-box">
        <div class="stat-num" style="color:#22c55e;">${safeCount}</div>
        <div class="stat-label">Safe</div>
      </div>
      <div class="stat-box">
        <div class="stat-num" style="color:${vulnCount > 0 ? '#ef4444' : '#22c55e'};">${vulnCount}</div>
        <div class="stat-label">Vulnerable</div>
      </div>
    </div>

    <!-- Vulnerabilities Section -->
    <div class="section-title">Vulnerabilities & Fixes</div>
    ${vulnCardsHtml}

    <!-- Safe Packages -->
    <div class="section-title">Safe Packages</div>
    ${safePkgsHtml}

    <div style="text-align:center; margin-top:24px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.06);">
      <div style="color:#475569; font-size:9px; text-transform:uppercase; letter-spacing:2px;">Powered by OSV.dev · WebNode Security</div>
    </div>
  </div>
</body>
</html>`;
}
//# sourceMappingURL=dashboard.js.map