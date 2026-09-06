# DomiNode

<p align="center">
  <strong>See the ripple. Understand the risk. Fix what matters.</strong>
</p>

<p align="center">
  AI-powered software supply-chain security through dependency graphs, threat intelligence, and propagation analysis.
</p>

<p align="center">

![Status](https://img.shields.io/badge/status-in%20development-orange)
![Security](https://img.shields.io/badge/focus-supply%20chain%20security-blue)
![Analysis](https://img.shields.io/badge/analysis-dependency%20graph-purple)
![AI](https://img.shields.io/badge/AI-powered-black)

</p>

---

## 🚨 The Problem

Modern applications aren't built from scratch.

They are built on top of thousands of open-source packages — and those packages depend on other packages.

A single vulnerable dependency can create a much larger problem:

```text
                YOUR APPLICATION
                       │
              ┌────────┴────────┐
              ▼                 ▼
         Dependency A      Dependency B
              │                 │
              ▼                 ▼
         Dependency C      Dependency D
              │
              ▼
       ⚠ Vulnerable Package
              │
              ▼
        Ripple Effect
```

The deeper the dependency, the harder it is to see.

Traditional scanners are good at answering:

> **"Which packages are vulnerable?"**

But developers also need to know:

> **"How did it get here?"**
> **"What can it affect?"**
> **"How far can it propagate?"**
> **"What should I fix first?"**

That's where **DomiNode** comes in.

---

# 🧠 What is DomiNode?

**DomiNode** is an advanced, AI-powered dependency graph visualizer and threat intelligence platform.

Instead of presenting vulnerabilities as a flat list, DomiNode builds a map of your software supply chain and analyzes vulnerabilities **in context**.

It combines:

* 🔗 Dependency graph resolution
* 🌐 Transitive dependency discovery
* 🛡️ Multi-source vulnerability intelligence
* 🎯 Context-aware risk scoring
* 🌊 Vulnerability propagation simulation
* 🧠 AI-assisted remediation
* 📊 Security analytics
* 📑 Detailed security reports

> **DomiNode doesn't just tell you that a vulnerability exists. It shows you the ripple it can create.**

---

# ⚡ How It Works

### 01 — Upload

Upload your project or dependency files.

DomiNode detects the ecosystem and extracts the project's direct dependencies.

```text
Project
  │
  ├── package.json
  ├── requirements.txt
  ├── pom.xml
  ├── go.mod
  └── ...
```

---

### 02 — Build the Dependency Graph

DomiNode resolves direct and transitive dependencies to construct a dependency graph.

```text
Application
     │
     ├──────────────┐
     ▼              ▼
   React          Express
     │              │
     ▼              ▼
  Package A       Package B
                      │
                      ▼
               ⚠ Vulnerable
```

The result is a representation of the hidden structure behind your application.

---

### 03 — Find Vulnerabilities

DomiNode queries multiple vulnerability intelligence sources.

Currently referenced sources include:

* **OSV**
* **GitHub Advisory Database**
* **NVD**
* **Sonatype OSS Index**

The results are merged and deduplicated to improve coverage.

---

### 04 — Calculate True Risk

A vulnerability's published severity doesn't always tell the complete story.

DomiNode considers the vulnerability **and where the affected package sits in the dependency graph**.

```text
              Vulnerability Severity
                         +
                    Blast Radius
                         ↓
                  TRUE RISK SCORE
```

A moderately severe vulnerability in a highly connected package may represent greater systemic risk than a critical vulnerability affecting an isolated dependency.

---

### 05 — Simulate the Ripple

DomiNode uses graph traversal and taint analysis to visualize how a compromised dependency can propagate through the dependency tree.

```text
      ⚠ COMPROMISED
           │
           ▼
       Package A
           │
           ▼
       Package B
           │
           ▼
       Package C
           │
           ▼
    YOUR APPLICATION
```

Instead of reading a static report, you can **see the propagation path**.

---

# 🎯 Core Features

## 🔗 Dependency Graph

Visualize your complete dependency structure instead of looking at isolated package names.

**Direct dependencies → Transitive dependencies → Application**

---

## 🌊 Ripple / Propagation Analysis

Trace how a compromised dependency can move through the software supply chain.

DomiNode performs taint analysis using graph traversal and highlights propagation paths hop-by-hop.

---

## 🎯 True Risk Score

Traditional severity:

```text
CVSS = 6.5
```

DomiNode asks:

```text
How connected is this package?
How many packages depend on it?
How close is it to the application?
What is its potential blast radius?
```

The result is a risk assessment based on the vulnerability **and its position within the dependency graph**.

---

## 👀 Hidden Risk

DomiNode identifies situations where the systemic risk of a dependency may be significantly greater than its reported vulnerability severity.

The objective is to surface risks that a simple vulnerability list can hide.

---

## 🛡️ Multi-Source Threat Intelligence

DomiNode brings together information from multiple vulnerability databases.

```text
             ┌──────────────┐
             │     OSV      │
             └──────┬───────┘
                    │
 ┌──────────────────┼──────────────────┐
 │                  │                  │
 ▼                  ▼                  ▼
GHSA               NVD            OSS Index
 │                  │                  │
 └──────────────────┼──────────────────┘
                    ▼
          DomiNode Intelligence
                    │
                    ▼
          Deduplicated Findings
```

---

# 🧠 AI Remediation

Finding vulnerabilities is only half the job.

DomiNode's planned Pro functionality includes **Dependency Tree-Based Remediation (DTR)**.

Instead of telling developers to manually update a deeply nested package, DomiNode traces the dependency graph backwards to identify the direct dependency that can resolve the issue.

### Example

```text
Application
     │
     ▼
Express 4.16
     │
     ▼
Lodash
     │
     ▼
⚠ Vulnerable
```

Rather than manually modifying the transitive dependency:

```text
❌ Update Lodash directly
```

DomiNode can identify a higher-level remediation:

```text
✅ Upgrade Express
        ↓
Safe Lodash version
        ↓
Multiple vulnerabilities resolved
```

The goal:

> **Minimum changes. Maximum security impact.**

---

# 📊 Security Dashboard

DomiNode provides visibility into the overall security posture of a project.

### Vulnerability Severity

```text
Critical   ████████
High       █████████████
Medium     ████████████████
Low        █████
```

### Attack Surface

Understand the difference between:

```text
Direct Dependencies
        vs
Transitive Dependencies
```

### Dependency Trace

Follow the exact path:

```text
Application
   ↓
Direct Dependency
   ↓
Transitive Dependency
   ↓
Vulnerable Package
```

---

# 🔬 Research-Backed Approach

DomiNode's design is informed by academic research into software supply-chain security.

The project documentation references three major research papers and uses that research to inform its approach to:

* Dependency relationships
* Supply-chain threats
* Vulnerability propagation
* Risk analysis
* Security remediation

The goal isn't to build another vulnerability scanner.

The goal is to improve how vulnerability **context and propagation** are understood.

---

# 🏗️ Architecture

```text
                    ┌─────────────────┐
                    │     USER        │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   DOMINODE UI   │
                    │                 │
                    │ Graph / Risk /  │
                    │ Reports / Intel │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    BACKEND      │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
    ┌──────────┐      ┌──────────────┐   ┌─────────────┐
    │  Parser  │      │ Dependency   │   │  Threat     │
    │  Engine  │      │  Resolver    │   │ Intelligence│
    └────┬─────┘      └──────┬───────┘   └──────┬──────┘
         │                   │                  │
         │                   ▼                  ▼
         │             ┌─────────────┐    ┌─────────────┐
         │             │ Dependency  │    │ OSV / GHSA  │
         │             │ Graph / DAG │    │ NVD / OSS   │
         │             └──────┬──────┘    └─────────────┘
         │                    │
         └────────────────────┼────────────────────┐
                              ▼                    │
                     ┌────────────────┐            │
                     │  Risk Engine   │            │
                     └───────┬────────┘            │
                             │                     │
                ┌────────────┼────────────┐        │
                ▼            ▼            ▼        │
          ┌──────────┐ ┌──────────┐ ┌──────────┐  │
          │  True    │ │  Taint   │ │ AI Fixes │  │
          │  Risk    │ │ Analysis │ │          │  │
          └──────────┘ └──────────┘ └──────────┘  │
                                                  │
                              ┌───────────────────┘
                              ▼
                       ┌───────────────┐
                       │    REPORTS    │
                       └───────────────┘
```

---

# 🌐 Ecosystem Support

DomiNode is designed to analyze projects across multiple package ecosystems.

Current project scope includes:

| Ecosystem        | Dependency Analysis |
| ---------------- | ------------------- |
| npm              | ✅                   |
| PyPI             | ✅                   |
| Maven            | ✅                   |
| Go               | ✅                   |
| Other ecosystems | 🔄 Expanding        |

---

# 📋 What You Get

After analyzing a project, DomiNode provides:

### 🔴 Vulnerability Intelligence

Detailed findings categorized by severity.

### 🕸️ Dependency Graph

A visual representation of direct and transitive dependencies.

### 🌊 Propagation Paths

The route a vulnerability can take through the dependency graph.

### 🎯 True Risk Score

Risk based on both vulnerability severity and graph structure.

### 👀 Hidden Risk Indicators

Flags for vulnerabilities whose systemic impact may exceed their isolated score.

### 📊 Attack Surface Analysis

Visibility into direct versus transitive dependency exposure.

### 📑 Reports

Downloadable technical and simplified security reports.

---

# 🆚 Why DomiNode?

|                                  | Traditional Scanner | DomiNode |
| -------------------------------- | ------------------: | -------: |
| Vulnerability detection          |                   ✅ |        ✅ |
| Dependency analysis              |                   ✅ |        ✅ |
| Transitive dependency visibility |             Limited |        ✅ |
| Dependency graph                 |         ❌ / Limited |        ✅ |
| Blast-radius analysis            |                   ❌ |        ✅ |
| True Risk Score                  |                   ❌ |        ✅ |
| Propagation simulation           |                   ❌ |        ✅ |
| Taint analysis                   |                   ❌ |        ✅ |
| Multi-source intelligence        |                Some |        ✅ |
| Explainable risk                 |             Limited |        ✅ |
| AI remediation                   |             Limited |   🚀 Pro |
| Detailed reports                 |                   ✅ |        ✅ |

---

# 🚀 Getting Started

> **Repository setup instructions will depend on the implementation.**

Clone the repository:

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_REPOSITORY_DIRECTORY>
```

Install dependencies according to the project's configured ecosystem.

For example:

```bash
npm install
```

or:

```bash
pip install -r requirements.txt
```

Start the application using the project's development command.

```bash
npm run dev
```

> Replace these commands with the exact commands configured in the repository.

---

# 🗺️ Roadmap

### Core

* [x] Dependency graph concept
* [x] Transitive dependency analysis
* [x] Multi-source vulnerability intelligence
* [x] True Risk Score concept
* [x] Propagation / taint analysis concept
* [x] Security reporting

### Next

* [ ] Expanded ecosystem support
* [ ] Improved graph visualization
* [ ] Advanced attack-path analysis
* [ ] Continuous dependency monitoring
* [ ] More detailed remediation recommendations

### DomiNode Pro

* [ ] AI-powered dependency remediation
* [ ] Automated AI pull requests
* [ ] CI/CD pipeline security blocks
* [ ] Compliance exports
* [ ] Security certification
* [ ] Enterprise security workflows

---

# 💎 DomiNode Pro

The free experience is designed around **visibility and diagnosis**.

DomiNode Pro extends that into **automated remediation and enterprise security workflows**.

```text
              FREE
                │
                ▼
       See the vulnerabilities
                │
                ▼
        Understand the risk
                │
                ▼
         See the propagation
                │
                ▼
             PRO
                │
                ▼
       Automate the response
```

Planned Pro capabilities include:

* AI remediation
* Automated pull requests
* CI/CD security gates
* Compliance reporting
* Enterprise workflows

---

# 🤝 Contributing

Contributions are welcome.

If you have an idea, improvement, bug fix, or security research that could make DomiNode better:

```bash
git checkout -b feature/your-feature
```

Make your changes, test them, and open a pull request.

For larger changes, open an issue first so the approach can be discussed.

---

# 🔐 Security

If you discover a security issue in DomiNode, please report it responsibly.

Security vulnerabilities should not be disclosed publicly before the maintainers have had an opportunity to investigate.

> Add your project's security contact or `SECURITY.md` process here.

---

# 📄 License

Add the project's license here.

Example:

```text
MIT License
```

---

# 👥 Team

### Team Card Board Box

**DomiNode**

---

<p align="center">
  <strong>Why just tell you when we can show you?</strong>
</p>

<p align="center">
  <i>Map the dependency. See the ripple. Fix the risk.</i>
</p>
