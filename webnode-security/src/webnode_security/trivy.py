import json
import subprocess
from pathlib import Path

from webnode_security.models import TrivyFinding
from webnode_security.logger import WebNodeLogger


class TrivyAnalyzer:

    def __init__(self, target, scan_type="fs", logger=None):
        self.target = target
        self.scan_type = scan_type
        self.logger = logger or WebNodeLogger()

    def scan(self):

        self.logger.info(
            f"Trivy {self.scan_type} scan started: {self.target}"
        )

        if self.scan_type == "fs":
            data = self._run_filesystem_scan()

        elif self.scan_type == "config":
            data = self._run_config_scan()

        elif self.scan_type == "image":
            data = self._run_image_scan()

        else:
            raise ValueError(
                "scan_type must be 'fs', 'config', or 'image'"
            )

        findings = self._parse_findings(data)

        self.logger.info(
            f"Trivy scan completed. "
            f"Findings discovered: {len(findings)}"
        )

        for finding in findings:

            self.logger.warning(
                f"Trivy detected {finding.vulnerability_id} "
                f"({finding.severity}) "
                f"in {finding.package or finding.target}"
            )

        return findings

    # ========================================
    # FILESYSTEM SCAN
    # ========================================

    def _run_filesystem_scan(self):

        target_path = Path(self.target).resolve()

        command = [
            "docker",
            "run",
            "--rm",
            "-v",
            f"{target_path}:/scan:ro",
            "aquasec/trivy:0.74.0",
            "fs",
            "--format",
            "json",
            "--scanners",
            "vuln,secret",
            "/scan"
        ]

        return self._run_command(command)

    # ========================================
    # CONFIG / IaC SCAN
    # ========================================

    def _run_config_scan(self):

        target_path = Path(self.target).resolve()

        command = [
            "docker",
            "run",
            "--rm",
            "-v",
            f"{target_path}:/scan:ro",
            "aquasec/trivy:0.74.0",
            "config",
            "--format",
            "json",
            "/scan"
        ]

        return self._run_command(command)

    # ========================================
    # CONTAINER IMAGE SCAN
    # ========================================

    def _run_image_scan(self):

        command = [
            "docker",
            "run",
            "--rm",
            "-v",
            "/var/run/docker.sock:/var/run/docker.sock",
            "aquasec/trivy:0.74.0",
            "image",
            "--format",
            "json",
            self.target
        ]

        return self._run_command(command)

    # ========================================
    # RUN DOCKER COMMAND
    # ========================================

    def _run_command(self, command):

        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace"
        )

        if result.returncode not in (0, 1):

            self.logger.error(
                f"Trivy scan failed:\n{result.stderr}"
            )

            raise RuntimeError(
                f"Trivy scan failed:\n{result.stderr}"
            )

        if not result.stdout.strip():
            return {}

        try:
            return json.loads(result.stdout)

        except json.JSONDecodeError as error:

            self.logger.error(
                f"Could not parse Trivy JSON output: {error}"
            )

            raise RuntimeError(
                "Trivy returned invalid JSON output."
            )

    # ========================================
    # PARSE FINDINGS
    # ========================================

    def _parse_findings(self, data):

        findings = []

        for result in data.get("Results", []):

            target = result.get(
                "Target",
                self.target
            )

            # --------------------------------
            # Vulnerabilities
            # --------------------------------

            for vulnerability in result.get(
                "Vulnerabilities",
                []
            ):

                finding = TrivyFinding(
                    target=target,
                    vulnerability_id=vulnerability.get(
                        "VulnerabilityID",
                        "UNKNOWN"
                    ),
                    severity=vulnerability.get(
                        "Severity",
                        "UNKNOWN"
                    ),
                    package=vulnerability.get(
                        "PkgName",
                        ""
                    ),
                    installed_version=vulnerability.get(
                        "InstalledVersion",
                        ""
                    ),
                    fixed_version=vulnerability.get(
                        "FixedVersion",
                        ""
                    ),
                    title=vulnerability.get(
                        "Title",
                        ""
                    ),
                    description=vulnerability.get(
                        "Description",
                        ""
                    ),
                    category="Vulnerability"
                )

                findings.append(finding)

            # --------------------------------
            # Misconfigurations
            # --------------------------------

            for misconfiguration in result.get(
                "Misconfigurations",
                []
            ):

                finding = TrivyFinding(
                    target=target,
                    vulnerability_id=misconfiguration.get(
                        "ID",
                        "UNKNOWN"
                    ),
                    severity=misconfiguration.get(
                        "Severity",
                        "UNKNOWN"
                    ),
                    title=misconfiguration.get(
                        "Title",
                        ""
                    ),
                    description=misconfiguration.get(
                        "Description",
                        ""
                    ),
                    category="Misconfiguration"
                )

                findings.append(finding)

            # --------------------------------
            # Secrets
            # --------------------------------

            for secret in result.get(
                "Secrets",
                []
            ):

                finding = TrivyFinding(
                    target=target,
                    vulnerability_id=secret.get(
                        "RuleID",
                        "UNKNOWN"
                    ),
                    severity=secret.get(
                        "Severity",
                        "UNKNOWN"
                    ),
                    title=secret.get(
                        "Title",
                        ""
                    ),
                    category="Secret"
                )

                findings.append(finding)

        return findings