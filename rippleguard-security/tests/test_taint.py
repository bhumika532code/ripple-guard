from rippleguard_security import TaintAnalyzer


analyzer = TaintAnalyzer("test_project")

report = analyzer.analyze()

print("Total Findings:", report.total_findings)
print("Overall Risk:", report.overall_score, "/ 10")
print("Risk Level:", report.risk_level)

print("\nFindings:\n")

for finding in report.findings:
    print("Category:", finding.category)
    print("Severity:", finding.severity)
    print("Score:", finding.score)
    print("File:", finding.file)
    print("Line:", finding.line)
    print("Message:", finding.message)
    print("-" * 50)