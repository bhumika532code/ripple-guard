from dataclasses import dataclass
from typing import Optional


@dataclass
class SecurityFinding:
    rule: str
    severity: str
    score: int
    file: str
    line: int
    message: str
    category: Optional[str] = None


@dataclass
class TaintReport:
    findings: list[SecurityFinding]
    overall_score: float
    risk_level: str
    total_findings: int


@dataclass
class ZapFinding:
    name: str
    severity: str
    score: int
    confidence: str
    url: str
    description: str = ""


@dataclass
class TrivyFinding:
    target: str
    vulnerability_id: str
    severity: str
    package: str = ""
    installed_version: str = ""
    fixed_version: str = ""
    title: str = ""
    description: str = ""
    category: str = ""