from webnode_security import DependencyAnalyzer


analyzer = DependencyAnalyzer()

graph = analyzer.scan()

print("Dependency scan completed.")

print("\nPackages:", graph.number_of_nodes())
print("Dependencies:", graph.number_of_edges())

print("\nDependency relationships:\n")

for source, target in graph.edges():
    source_version = graph.nodes[source].get("version")
    target_version = graph.nodes[target].get("version")

    print(
        f"{source} ({source_version})"
        f" -> "
        f"{target} ({target_version})"
    )


# Test blast radius
package = "jinja2"

result = analyzer.blast_radius(package)

print("\n" + "=" * 50)
print("BLAST RADIUS ANALYSIS")
print("=" * 50)

print("\nTarget package:", result["package"])
print("Blast radius:", result["blast_radius"])

print("\nAffected packages:")

for affected in result["affected_packages"]:
    print("-", affected)

print("\n" + "=" * 50)
print("PROPAGATION PATHS")
print("=" * 50)

paths = analyzer.propagation_paths(package)

for path in paths:
    print(" -> ".join(path))

print("\n" + "=" * 50)
print("PACKAGE ANALYSIS")
print("=" * 50)

analysis = analyzer.analyze_package("jinja2")

print("Package:", analysis["package"])
print("Version:", analysis["version"])
print("Blast Radius:", analysis["blast_radius"])

print("\nAffected Packages:")
for affected in analysis["affected_packages"]:
    print("-", affected)

print("\nPropagation Paths:")
for path in analysis["propagation_paths"]:
    print(" -> ".join(path))