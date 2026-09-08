import json
import subprocess
import sys

import networkx as nx
from rippleguard_security.logger import RippleGuardLogger

class DependencyAnalyzer:

    def __init__(self, logger=None):
        self.graph = nx.DiGraph()
        self.logger = logger or RippleGuardLogger()

    def scan(self):

        self.logger.info("Dependency analysis started.")

        command = [
            sys.executable,
            "-m",
            "pipdeptree",
            "--json-tree"
        ]

        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace"
        )

        if result.returncode != 0:
            raise RuntimeError(
                f"pipdeptree failed:\n{result.stderr}"
            )

        data = json.loads(result.stdout)

        self.graph.clear()

        for package in data:
            self._add_package(package)

        self.logger.info(
            f"Dependency graph created. Packages discovered: {len(self.graph.nodes)}"
        )

        self.logger.info("Dependency analysis completed.")

        return self.graph

    def _add_package(self, package):
        package_name = package.get("key")
        package_version = package.get("installed_version")

        if not package_name:
            return

        self.graph.add_node(
            package_name,
            version=package_version
        )

        for dependency in package.get("dependencies", []):
            dependency_name = dependency.get("key")
            dependency_version = dependency.get("installed_version")

            if not dependency_name:
                continue

            self.graph.add_node(
                dependency_name,
                version=dependency_version
            )

            self.graph.add_edge(
                package_name,
                dependency_name
            )

            self._add_dependency(
                dependency
            )

    def _add_dependency(self, dependency):

        dependency_name = dependency.get("key")
        dependency_version = dependency.get("installed_version")

        if not dependency_name:
            return

        self.graph.add_node(
            dependency_name,
            version=dependency_version
        )

        for child in dependency.get("dependencies", []):
            child_name = child.get("key")
            child_version = child.get("installed_version")

            if not child_name:
                continue

            self.graph.add_node(
                child_name,
                version=child_version
            )

            self.graph.add_edge(
                dependency_name,
                child_name
            )

            self._add_dependency(child)

    def blast_radius(self, package_name):
        if package_name not in self.graph:
            return {
                "package": package_name,
                "affected_packages": [],
                "blast_radius": 0
            }

        affected = nx.ancestors(
            self.graph,
            package_name
        )

        return {
            "package": package_name,
            "affected_packages": sorted(affected),
            "blast_radius": len(affected)
        }

    def propagation_paths(self, package_name):
        if package_name not in self.graph:
            return []

        paths = []

        affected_packages = nx.ancestors(
            self.graph,
            package_name
        )

        for affected in affected_packages:
            try:
                paths_to_package = nx.all_simple_paths(
                    self.graph,
                    affected,
                    package_name
                )

                for path in paths_to_package:
                    paths.append(path)

            except nx.NetworkXNoPath:
                continue

        return paths

    def analyze_package(self, package_name):
        if package_name not in self.graph:
            return {
                "package": package_name,
                "version": None,
                "blast_radius": 0,
                "affected_packages": [],
                "propagation_paths": []
            }

        blast = self.blast_radius(package_name)
        paths = self.propagation_paths(package_name)

        return {
            "package": package_name,
            "version": self.graph.nodes[package_name].get("version"),
            "blast_radius": blast["blast_radius"],
            "affected_packages": blast["affected_packages"],
            "propagation_paths": paths
        }