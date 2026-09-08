import json
from pathlib import Path


class ReportGenerator:

    def __init__(self, report_directory="reports"):
        self.report_directory = Path(report_directory)

        self.report_directory.mkdir(
            parents=True,
            exist_ok=True
        )

    def save_json(self, results):

        scan_id = results["scan_id"]

        report_file = (
            self.report_directory
            / f"{scan_id}.json"
        )

        with open(
            report_file,
            "w",
            encoding="utf-8"
        ) as file:

            json.dump(
                results,
                file,
                indent=4
            )

        return report_file