from datetime import datetime
from pathlib import Path


class RippleGuardLogger:

    def __init__(self, log_directory="logs"):
        self.log_directory = Path(log_directory)
        self.log_directory.mkdir(
            parents=True,
            exist_ok=True
        )

        timestamp = datetime.now().strftime(
            "%Y%m%d_%H%M%S"
        )

        self.log_file = (
            self.log_directory
            / f"rippleguard_{timestamp}.log"
        )

    def _write(self, level, message):
        timestamp = datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )

        line = (
            f"[{timestamp}] "
            f"{level.upper():<7} "
            f"{message}\n"
        )

        with open(
            self.log_file,
            "a",
            encoding="utf-8"
        ) as file:
            file.write(line)

    def info(self, message):
        self._write("INFO", message)

    def warning(self, message):
        self._write("WARNING", message)

    def error(self, message):
        self._write("ERROR", message)

    def get_log_file(self):
        return self.log_file