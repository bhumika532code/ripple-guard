from webnode_security import WebNodeScanner


scanner = WebNodeScanner(
    project_path="test_project",
    target_url="http://host.docker.internal:5000"
)

results = scanner.run()

print("\n" + "=" * 60)
print("WEBNODE SCAN")
print("=" * 60)

print("\nScan ID:")
print(results["scan_id"])

print("\nDependency Analysis:")
print(results["dependency"])

print("\nTaint Analysis:")
print(results["taint"])

print("\nZAP Analysis:")
print(
    f"Findings: {results['zap'].get('total_findings', 0)}"
)

print("\nOverall Risk:")
print(
    f"{results['risk']['overall_score']} / 10"
)

print(
    f"Risk Level: {results['risk']['risk_level']}"
)

print("\nRisk Components:")

for name, score in results["risk"]["components"].items():
    print(f"- {name}: {score}")

print("\nLog File:")
print(results["log_file"])

print("\nScan completed.")