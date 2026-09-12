import subprocess
import json

from webnode_security.models import SecurityFinding


class SemgrepAnalyzer:

    def __init__(self, project_path, config="auto"):
        self.project_path = project_path
        self.config = config

    def scan(self):
        command = [
            "semgrep",
            "scan",
            "--config",
            self.config,
            self.project_path,
            "--json"
        ]

        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace"
        )

        if result.returncode not in (0, 1):
            raise RuntimeError(
                f"Semgrep failed:\n{result.stderr}"
            )

        data = json.loads(result.stdout)

        findings = []

        for result_item in data.get("results", []):

            extra = result_item.get("extra", {})
            start = result_item.get("start", {})

            severity = extra.get("severity", "UNKNOWN").upper()

            severity_scores = {
                "CRITICAL": 10,
                "ERROR": 9,
                "HIGH": 8,
                "WARNING": 5,
                "MEDIUM": 5,
                "LOW": 2,
                "INFO": 1,
            }

            score = severity_scores.get(severity, 0)

            severity = extra.get("severity", "UNKNOWN").upper()

            severity_scores = {
                "CRITICAL": 10,
                "ERROR": 9,
                "HIGH": 8,
                "WARNING": 5,
                "MEDIUM": 5,
                "LOW": 2,
                "INFO": 1,
            }

            score = severity_scores.get(severity, 0)

            finding = SecurityFinding(
                rule=result_item.get("check_id", "unknown"),
                severity=severity,
                score=score,
                file=result_item.get("path", "unknown"),
                line=start.get("line", 0),
                message=extra.get("message", ""),
                category=None
            )

            findings.append(finding)

        return findings