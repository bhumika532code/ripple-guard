from rippleguard_security import ZapAnalyzer


analyzer = ZapAnalyzer(
    "http://host.docker.internal:5000"
)

findings = analyzer.scan()

print("Found", len(findings), "ZAP findings.\n")

for finding in findings:
    print("Name:", finding.name)
    print("Severity:", finding.severity)
    print("Score:", finding.score)
    print("Confidence:", finding.confidence)
    print("URL:", finding.url)
    print("-" * 60)