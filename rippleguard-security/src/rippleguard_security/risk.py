class RiskEngine:

    def calculate(
        self,
        taint_score=0.0,
        dast_score=0.0,
        dependency_score=0.0,
        blast_radius_score=0.0
    ):
        overall_score = (
            taint_score * 0.30
            + dast_score * 0.25
            + dependency_score * 0.25
            + blast_radius_score * 0.20
        )

        overall_score = round(overall_score, 1)

        return {
            "overall_score": overall_score,
            "risk_level": self.risk_level(overall_score)
        }

    def risk_level(self, score):

        if score >= 9:
            return "CRITICAL"

        if score >= 7:
            return "HIGH"

        if score >= 4:
            return "MEDIUM"

        return "LOW"