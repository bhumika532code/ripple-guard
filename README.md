# WebNode

WebNode is a next-generation software supply chain security platform that moves beyond traditional, flat vulnerability scanning. We visualize dependencies as a dynamic, interconnected web, allowing teams to see exactly how vulnerabilities propagate, measure the true blast radius of a compromised package, and deploy mathematically optimal remediation strategies—all certified securely on the blockchain.

---

## 🚀 Core Features

### 1. Dependency Graph Visualization
**Description:** A highly interactive, dynamic 3D web mapping your entire software architecture.
**Technical Implementation:** WebNode parses `package.json` (and other manifests) using custom AST parsers to build a precise Directed Acyclic Graph (DAG) in memory. The graph is rendered on the frontend using D3.js and HTML5 Canvas, employing force-directed physics simulations for smooth node organization.

### 2. Multi-Ecosystem Support
**Description:** Native support for modern JavaScript/TypeScript, Python, and Java architectures.
**Technical Implementation:** The backend utilizes regex-based lockfile parsing combined with ecosystem-specific dependency resolvers (like pipdeptree logic for Python and Maven dependency plugins for Java) to normalize disparate architectures into a unified JSON format.

---

## 🌟 Unique Features

### 1. All Databases + Kali Tools + OWASP Integration
**Description:** We don't just rely on one source. WebNode cross-references vulnerabilities against a massive array of global databases and standard offensive security tooling.
**Technical Implementation:** The analysis engine concurrently polls the Google OSV API, NVD (National Vulnerability Database), OSS Index, and OWASP Top 10 mappings. It also simulates attacks using logic derived from standard Kali Linux toolsets (like WPScan or Nikto logic) mapped to CVE signatures.

### 2. Research-Based Intel Section
**Description:** Deep-dive security analysis offering context, not just CVE numbers.
**Technical Implementation:** The threat intelligence engine pulls unstructured vulnerability descriptions and utilizes a locally-run NLP model to extract attack vectors, generating human-readable "Threat Briefings" and mitigation steps directly in the dashboard.

### 3. Real-Time View Logs (Telemetry)
**Description:** Watch the engine think in real-time as it scans your architecture.
**Technical Implementation:** A WebSocket connection streams stdout/stderr from the backend Node.js scanning process directly to a glassmorphic terminal UI on the frontend, rendering a realistic "hacker-style" typing animation as nodes are traversed.

### 4. Instant SBOM Generation
**Description:** Generate a compliance-ready Software Bill of Materials in one click.
**Technical Implementation:** The graph DAG is deterministically traversed to serialize all node metadata (licenses, versions, authors) into the CycloneDX and SPDX JSON standards, which are heavily required by modern enterprise compliance frameworks.

### 5. Blockchain Provenance Attestation (Immutable Trust)
**Description:** Generate an unhackable digital receipt of your security posture to prove your code is safe.
**Technical Implementation:** WebNode generates deterministic cryptographic hashes (SHA-256) of both the pre-patch and post-patch dependency manifests. These hashes are sealed to the Polygon Testnet via Web3 smart contracts (Solidity), creating a public, immutable, and time-stamped attestation on the blockchain.

### 6. AI Remediation & Prioritization Logic
**Description:** Legacy scanners tell you to fix 4 packages. We find the root cause and tell you to fix 1. 
**Technical Implementation:** The engine uses Topological Sorting and Breadth-First Search (BFS) to map execution paths. By calculating Node Centrality and Path Depth, WebNode identifies the "choke point" dependencies. Fixing the root node automatically resolves vulnerabilities in the 3 downstream nodes, drastically reducing developer fatigue.

### 7. "Fix It For U" (Auto-Remediation)
**Description:** One-click automated patching of vulnerable dependencies.
**Technical Implementation:** The backend modifies the `package.json` in memory and executes `npm install` (or equivalent package manager commands) programmatically. It verifies the patch by re-running a fast topological scan, ensuring the semantic upgrade didn't break the build tree.

### 8. Native IDE Extension
**Description:** Bring the full power of WebNode directly into your code editor.
**Technical Implementation:** Built using the VS Code Extension API and TypeScript. It utilizes the Language Server Protocol (LSP) to scan manifests in real-time, providing inline diagnostic squigglies, hover-over threat intelligence, and a mini-dashboard within the IDE sidebar.

---

## 💎 Pro Features

* **Comprehensive PDF Audits:** Generate beautiful, technical audit reports for stakeholders and compliance officers.
* **AI Chat Assistant:** Interactive threat-modeling chatbot capable of explaining complex CVEs.
* **Unlimited Repositories:** Scale across your entire enterprise organization.
* **Semgrep SAST Integration:** Static Application Security Testing for your custom source code, not just dependencies.
* **Private Blockchain Nodes:** For enterprises requiring utmost data sovereignty.

---

## 📈 Market Strategy

The DevSecOps market is flooded with legacy scanners (like Snyk, Dependabot, or BlackDuck) that cause immense "alert fatigue" by generating massive, unreadable lists of vulnerabilities. 

**Our Go-To-Market Strategy:**
We position WebNode as the "Anti-Alert-Fatigue" tool. By focusing heavily on the **AI Prioritization Logic** (showing teams they only need to fix 1 package instead of 4) and the **Blast Radius Visualization**, we immediately prove ROI by saving hundreds of developer hours. The addition of **Blockchain Attestation** makes it an incredibly sticky product for Fintech, Healthcare, and Web3 startups that require strict, verifiable compliance.

---

## 🇮🇳 Accessibility & Feasibility Among Indian Developers

India boasts one of the fastest-growing developer and startup ecosystems in the world. However, Indian startups are highly price-sensitive and often avoid massive enterprise contracts (like Snyk).

* **Pricing Strategy:** 
  * **Community Tier:** ₹0 (Free for up to 3 repos, basic scanning) to hook developers.
  * **Pro Tier:** ₹1,499 - ₹1,999 (~$18-$24) / developer / month. Highly affordable for Indian startups (SMEs) while offering premium features like AI Prioritization.
* **Feasibility:** WebNode is designed to be lightweight. The VS Code extension works seamlessly on lower-spec machines common among students and junior developers in India, running the heavy graph algorithms efficiently without slowing down their IDE.
* **Adoption Engine:** By targeting Indian engineering colleges and hackathons with the VS Code extension, WebNode can build a massive grassroots user base.

---

## 🔌 VS Code Extension Guide

WebNode Sentinel brings supply chain security directly to where you write code.

### How to Run Locally:
1. Open the `webnode-sentinel` folder in a new VS Code window.
2. Open the terminal and run `npm install`.
3. Press **F5** (or `Run` > `Start Debugging`). 
4. A new "Extension Development Host" window will open with the extension installed.

### How to Use:
1. Open any project with a `package.json` in the Extension Host window.
2. The extension automatically monitors your manifest files.
3. Open the Command Palette (`Ctrl + Shift + P`) and type **WebNode** to see available commands (e.g., *Scan Dependencies Now*).
4. Click the **WebNode** icon in the bottom status bar to instantly launch the Threat Intelligence Dashboard inside your editor!
