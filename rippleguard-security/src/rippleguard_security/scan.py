import uuid
from datetime import datetime

from rippleguard_security.logger import RippleGuardLogger
from rippleguard_security.dependency import DependencyAnalyzer
from rippleguard_security.taint import TaintAnalyzer
from rippleguard_security.zap import ZapAnalyzer
from rippleguard_security.trivy import TrivyAnalyzer
from rippleguard_security.risk import RiskEngine
from rippleguard_security.report import ReportGenerator


class RippleGuardScanner:

    def __init__(self, project_path, target_url=None):
        self.project_path = project_path
        self.target_url = target_url

        self.logger = RippleGuardLogger()
        self.report_generator = ReportGenerator()

        self.scan_id = (
            "RG-"
            + datetime.now().strftime("%Y%m%d")
            + "-"
            + uuid.uuid4().hex[:6].upper()
        )

    # ========================================
    # ZAP SCORE
    # ========================================

    def _calculate_zap_score(self, findings):

        if not findings:
            return 0.0

        return round(
            sum(finding.score for finding in findings)
            / len(findings),
            1
        )

    # ========================================
    # DEPENDENCY SCORE
    # ========================================

    def _calculate_dependency_score(self, graph):

        if graph is None or len(graph.nodes) == 0:
            return 0.0

        package_count = len(graph.nodes)

        if package_count >= 100:
            return 10.0

        if package_count >= 75:
            return 8.0

        if package_count >= 50:
            return 6.0

        if package_count >= 25:
            return 4.0

        return 2.0

    # ========================================
    # BLAST RADIUS SCORE
    # ========================================

    def _calculate_blast_radius_score(self, blast_radius):

        if blast_radius >= 20:
            return 10.0

        if blast_radius >= 10:
            return 8.0

        if blast_radius >= 5:
            return 6.0

        if blast_radius >= 1:
            return 3.0

        return 0.0

    # ========================================
    # TRIVY SCORE
    # ========================================

    def _calculate_trivy_score(self, findings):

        if not findings:
            return 0.0

        severity_scores = {
            "CRITICAL": 10,
            "HIGH": 8,
            "MEDIUM": 5,
            "LOW": 2,
            "UNKNOWN": 0
        }

        scores = []

        for finding in findings:

            severity = finding.severity.upper()

            scores.append(
                severity_scores.get(
                    severity,
                    0
                )
            )

        if not scores:
            return 0.0

        return round(
            sum(scores) / len(scores),
            1
        )

    # ========================================
    # MAIN SCAN
    # ========================================

    def run(self):

        self.logger.info(
            f"RippleGuard scan started. "
            f"Scan ID: {self.scan_id}"
        )

        taint_score = 0.0
        zap_score = 0.0
        dependency_score = 0.0
        blast_radius_score = 0.0
        trivy_score = 0.0

        results = {
            "scan_id": self.scan_id,
            "started_at": datetime.now().isoformat(),

            "dependency": None,
            "taint": None,
            "zap": None,
            "trivy": None,
            "risk": None,

            "log_file": str(
                self.logger.get_log_file()
            )
        }

        # ========================================
        # DEPENDENCY ANALYSIS
        # ========================================

        try:

            dependency_analyzer = DependencyAnalyzer(
                logger=self.logger
            )

            dependency_graph = dependency_analyzer.scan()

            dependency_score = (
                self._calculate_dependency_score(
                    dependency_graph
                )
            )

            results["dependency"] = {
                "packages": len(
                    dependency_graph.nodes
                ),
                "dependencies": len(
                    dependency_graph.edges
                )
            }

        except Exception as error:

            self.logger.error(
                f"Dependency analysis failed: {error}"
            )

            results["dependency"] = {
                "error": str(error)
            }

        # ========================================
        # TAINT ANALYSIS
        # ========================================

        try:

            taint_analyzer = TaintAnalyzer(
                self.project_path,
                logger=self.logger
            )

            taint_report = taint_analyzer.analyze()

            taint_score = taint_report.overall_score

            results["taint"] = {
                "overall_score":
                    taint_report.overall_score,

                "risk_level":
                    taint_report.risk_level,

                "total_findings":
                    taint_report.total_findings
            }

        except Exception as error:

            self.logger.error(
                f"Taint analysis failed: {error}"
            )

            results["taint"] = {
                "error": str(error)
            }

        # ========================================
        # ZAP ANALYSIS
        # ========================================

        if self.target_url:

            try:

                zap_analyzer = ZapAnalyzer(
                    self.target_url,
                    logger=self.logger
                )

                zap_findings = zap_analyzer.scan()

                zap_score = (
                    self._calculate_zap_score(
                        zap_findings
                    )
                )

                results["zap"] = {
                    "total_findings":
                        len(zap_findings),

                    "findings": [
                        {
                            "name": finding.name,
                            "severity": finding.severity,
                            "score": finding.score,
                            "confidence": finding.confidence,
                            "url": finding.url,
                            "description":
                                finding.description
                        }
                        for finding in zap_findings
                    ]
                }

            except Exception as error:

                self.logger.error(
                    f"ZAP analysis failed: {error}"
                )

                results["zap"] = {
                    "error": str(error)
                }

        else:

            self.logger.info(
                "ZAP scan skipped because "
                "no target URL was provided."
            )

            results["zap"] = {
                "skipped": True
            }

        # ========================================
        # TRIVY ANALYSIS
        # ========================================

        try:

            trivy_analyzer = TrivyAnalyzer(
                self.project_path,
                scan_type="fs",
                logger=self.logger
            )

            trivy_findings = trivy_analyzer.scan()

            trivy_score = (
                self._calculate_trivy_score(
                    trivy_findings
                )
            )

            results["trivy"] = {
                "scan_type": "filesystem",
                "total_findings":
                    len(trivy_findings),

                "findings": [
                    {
                        "target": finding.target,
                        "vulnerability_id":
                            finding.vulnerability_id,
                        "severity": finding.severity,
                        "package": finding.package,
                        "installed_version":
                            finding.installed_version,
                        "fixed_version":
                            finding.fixed_version,
                        "title": finding.title,
                        "description":
                            finding.description,
                        "category": finding.category
                    }
                    for finding in trivy_findings
                ]
            }

        except Exception as error:

            self.logger.error(
                f"Trivy analysis failed: {error}"
            )

            results["trivy"] = {
                "error": str(error)
            }

        # ========================================
        # RISK CALCULATION
        # ========================================

        self.logger.info(
            "Risk calculation started."
        )

        risk_engine = RiskEngine()

        risk_result = risk_engine.calculate(
            taint_score=taint_score,
            dast_score=zap_score,
            dependency_score=dependency_score,
            blast_radius_score=blast_radius_score
        )

        results["risk"] = {
            "overall_score":
                risk_result["overall_score"],

            "risk_level":
                risk_result["risk_level"],

            "components": {
                "taint_score": taint_score,
                "zap_score": zap_score,
                "dependency_score":
                    dependency_score,
                "blast_radius_score":
                    blast_radius_score,
                "trivy_score": trivy_score
            }
        }

        self.logger.info(
            f"Overall risk: "
            f"{risk_result['overall_score']}/10"
        )

        self.logger.info(
            f"Risk level: "
            f"{risk_result['risk_level']}"
        )

        self.logger.info(
            "Risk calculation completed."
        )

        # ========================================
        # SAVE REPORT
        # ========================================

        results["completed_at"] = (
            datetime.now().isoformat()
        )

        self.logger.info(
            f"RippleGuard scan completed. "
            f"Scan ID: {self.scan_id}"
        )

        report_file = (
            self.report_generator.save_json(
                results
            )
        )

        results["report_file"] = str(
            report_file
        )

        self.logger.info(
            f"JSON report saved: {report_file}"
        )

        return results