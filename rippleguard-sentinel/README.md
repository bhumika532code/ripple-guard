# 🛡️ RippleGuard Sentinel

**Real-time supply-chain security guardian for VS Code.**

RippleGuard Sentinel monitors your project's dependency files and warns you about vulnerable packages *the moment* they are installed — like a spell-checker, but for supply-chain security.

## Features

### 📋 Inline Diagnostics
Vulnerable dependencies are highlighted with squiggly underlines directly in your `package.json`, `requirements.txt`, or `pom.xml`. Hover to see CVE details and severity scores.

### 🌳 Sidebar Panel
A collapsible tree view in the Explorer showing every dependency with its health status:
- ✅ Safe packages
- ⚠️ Packages with known vulnerabilities  
- 💡 One-click fix suggestions

### 📊 Status Bar
A persistent indicator at the bottom of VS Code showing your project's overall security posture. Turns green when all packages are safe, yellow/red when vulnerabilities are detected.

### 🖥️ Terminal Interception
When you run `npm install <pkg>`, `pip install <pkg>`, or `yarn add <pkg>`, Sentinel automatically checks the package against the OSV database and shows a warning popup if vulnerabilities are found — *before* the package lands in your project.

### 💡 Quick-Fix Code Actions
Click the lightbulb (💡) on any highlighted dependency to automatically upgrade it to the minimum safe version.

## Supported Ecosystems

| Ecosystem | Manifest File |
|-----------|--------------|
| Node.js (npm/yarn/pnpm) | `package.json` |
| Python (pip) | `requirements.txt` |
| Java (Maven) | `pom.xml` |

## How It Works

1. **On Activation**: Sentinel scans all manifest files in your workspace
2. **On File Save**: Automatically re-scans the saved manifest
3. **On Terminal Command**: Intercepts install commands and checks packages in real-time
4. **Data Source**: Queries the [OSV.dev](https://osv.dev) vulnerability database (the same database powering the RippleGuard web dashboard)

## Commands

| Command | Description |
|---------|-------------|
| `RippleGuard: Scan Dependencies Now` | Manually trigger a full workspace scan |
| `RippleGuard: Fix Vulnerable Package` | Shows guidance on applying fixes |

## Getting Started

1. Open a project that contains a `package.json`, `requirements.txt`, or `pom.xml`
2. The extension activates automatically and begins scanning
3. Check the status bar at the bottom for your vulnerability count
4. Click on the shield icon in the activity bar to see the full dependency tree

## Part of the RippleGuard Ecosystem

RippleGuard Sentinel is the developer-facing companion to the [RippleGuard Web Dashboard](https://github.com/rippleguard) — a full-stack supply-chain security intelligence platform featuring dependency graph visualization, taint analysis simulation, SBOM generation, and blockchain-backed audit provenance.

---

**Built with ❤️ by the RippleGuard Security Team**
