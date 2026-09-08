from pathlib import Path

from rippleguard_security.semgrep.analyzer import SemgrepAnalyzer
from rippleguard_security.logger import RippleGuardLogger


class TaintAnalyzer:

    def __init__(self, project_path, logger=None):
        self.project_path = project_path
        self.logger = logger or RippleGuardLogger()

        self.rules_path = (
                Path(__file__).parent
                / "rules"
        )

    def scan(self):
        self.logger.info("Taint analysis started.")
        all_findings = []

        rule_files = [
            "taint.yml",
            "command_injection.yml",
            "path_traversal.yml"
        ]

        for rule_file in rule_files:

            rule_path = self.rules_path / rule_file

            analyzer = SemgrepAnalyzer(
                self.project_path,
                str(rule_path)
            )

            findings = analyzer.scan()

            for finding in findings:
                finding.category = self._get_category(
                    finding.rule
                )

                self.logger.warning(
                    f"{finding.category} detected in "
                    f"{finding.file} at line {finding.line}"
                )

            all_findings.extend(findings)
        self.logger.info(
            f"Taint analysis completed. Findings discovered: {len(all_findings)}"
        )
        return all_findings

    def _get_category(self, rule):
        if "sql" in rule.lower():
            return "SQL Injection"

        if "command" in rule.lower():
            return "Command Injection"

        if "path" in rule.lower():
            return "Path Traversal"

        return "Taint Analysis"

    def risk_score(self, findings):
        if not findings:
            return 0.0

        total_score = sum(
            finding.score for finding in findings
        )

        return round(
            total_score / len(findings),
            1
        )

    def risk_level(self, score):
        if score >= 9:
            return "CRITICAL"

        if score >= 7:
            return "HIGH"

        if score >= 4:
            return "MEDIUM"

        return "LOW"

    def analyze(self):
        findings = self.scan()

        score = self.risk_score(findings)
        level = self.risk_level(score)

        from rippleguard_security.models import TaintReport

        return TaintReport(
            findings=findings,
            overall_score=score,
            risk_level=level,
            total_findings=len(findings)
        )