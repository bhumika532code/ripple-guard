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