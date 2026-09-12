import json
import subprocess
from pathlib import Path

from webnode_security.models import ZapFinding
from webnode_security.logger import WebNodeLogger

class ZapAnalyzer:

    def __init__(self, target_url, logger=None):
        self.target_url = target_url
        self.logger = logger or WebNodeLogger()

    def scan(self):
        self.logger.info(
            f"ZAP scan started against {self.target_url}"
        )

        report_dir = Path("zap_reports")
        report_dir.mkdir(exist_ok=True)

        report_file = report_dir / "zap_report.json"

        command = [
            "docker",
            "run",
            "--rm",
            "-v",
            f"{report_dir.resolve()}:/zap/wrk/:rw",
            "ghcr.io/zaproxy/zaproxy:stable",
            "zap-full-scan.py",
            "-t",
            self.target_url,
            "-J",
            "zap_report.json",
        ]

        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace"
        )

        if result.returncode not in (0, 1, 2):
            self.logger.error("ZAP scan failed.")

            raise RuntimeError(
                f"ZAP scan failed:\n{result.stderr}"
            )

        if not report_file.exists():
            self.logger.error(
                "ZAP finished but no JSON report was created."
            )

            raise RuntimeError(
                "ZAP finished but no JSON report was created."
            )

        with open(report_file, "r", encoding="utf-8") as file:
            data = json.load(file)

        findings = self._parse_findings(data)

        self.logger.info(
            f"ZAP scan completed. Findings discovered: {len(findings)}"
        )

        return findings

    def _parse_findings(self, data):
        findings = []

        for site in data.get("site", []):
            site_url = site.get("@name", self.target_url)

            for alert in site.get("alerts", []):
                risk_code = int(alert.get("riskcode", 0))

                severity, score = self._get_risk(risk_code)

                finding = ZapFinding(
                    name=alert.get("name", "Unknown"),
                    severity=severity,
                    score=score,
                    confidence=alert.get("confidence", "Unknown"),
                    url=site_url,
                    description=alert.get("desc", "")
                )

                findings.append(finding)

                self.logger.warning(
                    f"ZAP detected {finding.name} "
                    f"({finding.severity}) at {finding.url}"
                )

        return findings

    def _get_risk(self, risk_code):
        risk_levels = {
            3: ("HIGH", 8),
            2: ("MEDIUM", 5),
            1: ("LOW", 2),
            0: ("INFO", 1),
        }

        return risk_levels.get(
            risk_code,
            ("UNKNOWN", 0)
        )