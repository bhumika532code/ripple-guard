from webnode_security import TrivyAnalyzer


print("=" * 60)
print("WEBNODE TRIVY FILESYSTEM SCAN")
print("=" * 60)


analyzer = TrivyAnalyzer(
    "test_project",
    scan_type="fs"
)


findings = analyzer.scan()


print()
print(f"Found {len(findings)} Trivy findings.")
print()


for finding in findings:

    print("Vulnerability ID:", finding.vulnerability_id)
    print("Severity:", finding.severity)
    print("Category:", finding.category)
    print("Target:", finding.target)
    print("Package:", finding.package)
    print("Installed Version:", finding.installed_version)
    print("Fixed Version:", finding.fixed_version)
    print("Title:", finding.title)

    print("-" * 50)


print()
print("Trivy scan completed.")