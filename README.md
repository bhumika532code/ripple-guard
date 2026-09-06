# DomiNode

> **See the ripple. Understand the risk. Fix what matters.**

DomiNode is an AI-powered software supply-chain security platform that maps dependencies, detects vulnerabilities, analyzes their propagation, and helps developers understand what actually needs to be fixed.

Traditional vulnerability scanners tell you **what is vulnerable**.

DomiNode shows you **where it is, what depends on it, how the risk can spread, and what to fix first**.

---

## Why DomiNode?

Modern applications are built on thousands of open-source dependencies.

A typical application may look simple:

```text
Your Application
      │
      ├── Package A
      ├── Package B
      └── Package C
```

But those packages have their own dependencies:

```text
Your Application
      │
      ├── Package A
      │      └── Package D
      │             └── Package F
      │
      ├── Package B
      │      └── Package E
      │             └── Package F
      │
      └── Package C
```

Now imagine `Package F` contains a vulnerability.

The problem isn't simply:

```text
Package F → Vulnerable
```

The real question is:

```text
How did it reach my application?

Who depends on it?

How many components can it affect?

How far can the vulnerability propagate?

What is the smallest effective fix?
```

**DomiNode is built to answer those questions.**

---

# What DomiNode Does

DomiNode turns your dependency tree into a security graph.

```text
Project
   │
   ▼
Dependency Extraction
   │
   ▼
Dependency Graph
   │
   ▼
Vulnerability Intelligence
   │
   ▼
True Risk Analysis
   │
   ▼
Propagation Analysis
   │
   ▼
Remediation
```

Instead of treating every vulnerability as an isolated package-level problem, DomiNode analyzes the vulnerability in the context of the entire dependency graph.

---

# Core Features

## 1. Dependency Graph

DomiNode discovers both direct and transitive dependencies and represents them as a graph.

```text
                Application
                /         \
               /           \
        Dependency A    Dependency B
             │               │
             ▼               ▼
        Dependency C    Dependency D
             │
             ▼
       Vulnerable Package
```

This makes hidden dependency relationships visible.

---

## 2. Dynamic Dependency Resolution

DomiNode doesn't stop at the dependencies explicitly listed in your project.

It resolves the packages behind those dependencies using public package registries.

The resulting dependency structure is represented as a Directed Acyclic Graph (DAG).

This allows DomiNode to identify vulnerabilities buried deep inside the dependency tree.

---

## 3. Multi-Source Vulnerability Intelligence

DomiNode combines vulnerability information from multiple sources:

* OSV
* GitHub Advisory Database
* NVD
* Sonatype OSS Index

The results are merged and deduplicated using vulnerability identifiers and aliases.

This helps reduce blind spots that can occur when relying on a single vulnerability database.

---

# 4. True Risk Score

A vulnerability's published severity doesn't always describe its actual impact on your application.

DomiNode combines vulnerability severity with the package's position in the dependency graph.

Conceptually:

```text
True Risk
    =
Vulnerability Severity
    +
Graph Connectivity
    +
Potential Blast Radius
```

For example:

```text
Package A
Severity: Critical
Dependents: 1

Package B
Severity: Medium
Dependents: 40
```

A traditional scanner may prioritize Package A purely based on severity.

DomiNode also considers **how deeply connected the package is** and how many other components rely on it.

The result is a more contextual view of risk.

---

# 5. Ripple Effect Analysis

This is one of DomiNode's central ideas.

When a vulnerable package is compromised, DomiNode can simulate how the impact travels through the dependency graph.

```text
           Vulnerable Package
                    │
                    ▼
               Package A
                    │
              ┌─────┴─────┐
              ▼           ▼
          Package B    Package C
              │           │
              ▼           ▼
          Package D    Package E
               \         /
                \       /
                 ▼     ▼
                Application
```

DomiNode uses graph traversal and taint analysis to identify and visualize these propagation paths.

Instead of reading a static vulnerability list, developers can **follow the path of the risk**.

---

# 6. Vulnerability Severity

DomiNode provides a clear breakdown of vulnerabilities by severity.

```text
Critical
High
Medium
Low
```

This makes it easier to understand the overall security posture of a project and prioritize issues.

---

# 7. Attack Surface Analysis

DomiNode distinguishes between:

```text
Direct Dependencies
        │
        └── Dependencies explicitly used by your project

Transitive Dependencies
        │
        └── Dependencies pulled in by other dependencies
```

This provides visibility into how much of your application's attack surface comes from dependencies you directly chose versus dependencies introduced indirectly.

---

# 8. Dependency Trace Paths

DomiNode provides the dependency path leading from a vulnerable package toward the application.

Example:

```text
Application
    ↓
Express
    ↓
Package X
    ↓
Package Y
    ↓
Vulnerable Package
```

This gives developers the context needed to understand where the vulnerability originated.

---

# AI-Powered Remediation

Finding vulnerabilities is only part of the problem.

The harder question is:

> **What should I actually change?**

DomiNode's planned AI remediation capabilities analyze the dependency tree to identify the minimum direct dependency upgrades that can resolve multiple transitive vulnerabilities.

Example:

```text
Application
     │
     ▼
Express
     │
     ▼
Lodash
     │
     ▼
Vulnerable
```

Instead of manually attempting to modify a transitive dependency:

```text
Update Lodash
```

DomiNode can trace the dependency tree backward and identify whether upgrading the direct dependency can automatically resolve the vulnerable version.

```text
Upgrade Direct Dependency
          │
          ▼
New Dependency Tree
          │
          ▼
Safe Transitive Version
          │
          ▼
Multiple Vulnerabilities Resolved
```

The goal is:

**Minimum changes → Maximum security impact**

---

# OSV Intelligence

DomiNode integrates with OSV to retrieve detailed vulnerability information.

This can include:

* Introduced versions
* Fixed versions
* Vulnerable version ranges
* Attack information
* Vulnerability descriptions
* Relevant metadata

The objective is to provide developers with the context required to understand both the vulnerability and its remediation.

---

# Security Reports

DomiNode provides downloadable analysis reports.

The project is designed to provide both:

### Technical Report

A detailed security analysis containing dependency and vulnerability information.

### User-Friendly Report

A simplified summary that can be shared with collaborators and stakeholders.

---

# Supported Ecosystems

DomiNode is designed to analyze projects across multiple package ecosystems.

| Ecosystem       | Support |
| --------------- | :-----: |
| npm             |   Yes   |
| PyPI            |   Yes   |
| Maven           |   Yes   |
| Go              |   Yes   |
| More ecosystems | Planned |

---

# Architecture

```text
                    ┌──────────────┐
                    │    Project   │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    Parser    │
                    └──────┬───────┘
                           │
                           ▼
                 ┌────────────────────┐
                 │ Dependency Resolver│
                 └──────────┬─────────┘
                            │
                            ▼
                 ┌────────────────────┐
                 │  Dependency Graph  │
                 └──────────┬─────────┘
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
       ┌──────────┐   ┌──────────┐   ┌──────────┐
       │   OSV    │   │   NVD    │   │   GHSA   │
       └────┬─────┘   └────┬─────┘   └────┬─────┘
            │              │              │
            └──────────────┼──────────────┘
                           ▼
                 ┌────────────────────┐
                 │ Threat Intelligence│
                 └──────────┬─────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
           True Risk    Taint       Remediation
             Score      Analysis      Engine
                │           │           │
                └───────────┼───────────┘
                            ▼
                     Security Report
```

---

# DomiNode vs Traditional Scanners

| Capability                | Traditional Scanner | DomiNode |
| ------------------------- | :-----------------: | :------: |
| Vulnerability Detection   |         Yes         |    Yes   |
| Dependency Analysis       |         Yes         |    Yes   |
| Transitive Dependencies   |       Limited       |    Yes   |
| Dependency Graph          |       Limited       |    Yes   |
| Blast Radius              |          No         |    Yes   |
| Contextual Risk           |       Limited       |    Yes   |
| Propagation Analysis      |          No         |    Yes   |
| Taint Analysis            |          No         |    Yes   |
| Multi-Source Intelligence |         Some        |    Yes   |
| Dependency Trace          |       Limited       |    Yes   |
| AI Remediation            |       Limited       |  Planned |
| Security Reports          |         Yes         |    Yes   |

---

# Getting Started

> Setup commands depend on the current implementation of the repository.

Clone the repository:

```bash
git clone <repository-url>
cd dominode
```

Install the project dependencies:

```bash
<install-command>
```

Configure the required environment variables:

```bash
<environment-configuration>
```

Start DomiNode:

```bash
<start-command>
```

---

# Roadmap

## Security Analysis

* [x] Dependency graph generation
* [x] Direct dependency analysis
* [x] Transitive dependency analysis
* [x] Multi-source vulnerability intelligence
* [x] True Risk Score
* [x] Propagation analysis
* [x] Taint analysis
* [x] Vulnerability severity distribution
* [x] Dependency trace paths
* [x] Security reports

## DomiNode Pro

* [ ] AI-powered remediation
* [ ] Automated pull requests
* [ ] CI/CD security gates
* [ ] Compliance exports
* [ ] Security certification
* [ ] Enterprise security workflows

---

# Research

DomiNode's approach is informed by academic research into software supply-chain security.

The project documentation references three major research papers that contributed to the design of its security analysis approach.

Research references will be added here as the project documentation is finalized.

---

