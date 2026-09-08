from rippleguard_security import RiskEngine


engine = RiskEngine()

result = engine.calculate(
    taint_score=9.0,
    dast_score=8.0,
    dependency_score=7.0,
    blast_radius_score=6.0
)

print("=" * 50)
print("RISK ENGINE TEST")
print("=" * 50)

print(f"Overall Score: {result['overall_score']} / 10")
print(f"Risk Level: {result['risk_level']}")