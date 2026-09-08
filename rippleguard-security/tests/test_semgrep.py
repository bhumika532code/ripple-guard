from rippleguard_security import SemgrepAnalyzer


analyzer = SemgrepAnalyzer("test_project")

findings = analyzer.scan()

print(f"Found {len(findings)} security findings.\n")

for finding in findings:
    print("Rule:", finding.rule)
    print("Severity:", finding.severity)
    print("File:", finding.file)
    print("Line:", finding.line)
    print("Message:", finding.message)
    print("-" * 50)
    print("Score:", finding.score)